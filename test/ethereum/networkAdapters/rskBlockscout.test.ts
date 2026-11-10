import { assert } from 'chai'
import { describe, it } from 'mocha'

import { EthereumEngine } from '../../../src/ethereum/EthereumEngine'
import { currencyInfo, networkInfo } from '../../../src/ethereum/info/rskInfo'
import {
  BlockscoutAdapter,
  BlockscoutAdapterConfig
} from '../../../src/ethereum/networkAdapters/BlockscoutAdapter'

type EngineFetch = EthereumEngine['engineFetch']

const API_KEY = 'test-api-key'
const HOSTED = 'https://api.blockscout.com'
const INSTANCE = 'https://rootstock.blockscout.com'
const WALLET_ADDRESS = '0x3e339531147f9bbf5438a0357e59da4caaead2ef'

const txRow = {
  blockNumber: '8572214',
  timeStamp: '1770000000',
  hash: '0x4f1b1e7e8ad9a0ae7c9f02c5b0a0f3a7e6e8f0a1d2c3b4a5968778695a4b3c2d',
  nonce: '0',
  from: '0x036639f209f2ebcde65a3f7896d05a4941d20373',
  to: WALLET_ADDRESS,
  value: '53556430837528',
  gas: '21000',
  gasPrice: '59240000',
  gasUsed: '21000',
  isError: '0'
}

describe('Rootstock history source', function () {
  it('keeps both servers on a build with a key', function () {
    const { adapter, warnings } = makeAdapter(API_KEY, async () => {
      throw new Error('The constructor should not fetch')
    })

    assert.deepEqual(adapter.config.servers, [HOSTED, INSTANCE])
    assert.lengthOf(warnings, 0)
  })

  it('falls back to the instance alone on a build without a key', function () {
    const { adapter, warnings } = makeAdapter(undefined, async () => {
      throw new Error('The constructor should not fetch')
    })

    assert.deepEqual(adapter.config.servers, [INSTANCE])
    assert.lengthOf(warnings, 1)
  })

  it('finishes a native sync while the instance answers 429', async function () {
    const { adapter, urls } = makeAdapter(API_KEY, throttledInstanceFetch)

    // `serialServers` shuffles the list, so repeat to reach both orders:
    for (let attempt = 0; attempt < 8; ++attempt) {
      const fetchTxs = adapter.fetchTxs
      const fetchInternalTxs = adapter.fetchInternalTxs
      if (fetchTxs == null || fetchInternalTxs == null) {
        throw new Error('Expected the adapter to fetch history')
      }

      const params = { startBlock: 0, startDate: 0, tokenId: null }
      const txs = await fetchTxs(params)
      assert.lengthOf(txs.tokenTxs?.get(null)?.edgeTransactions ?? [], 1)
      assert.equal(txs.server, HOSTED)

      const internalTxs = await fetchInternalTxs(params)
      assert.isTrue(internalTxs.tokenTxs?.get(null)?.includesInternal)
      assert.lengthOf(
        internalTxs.tokenTxs?.get(null)?.edgeTransactions ?? [],
        0
      )
    }

    // The hosted API takes the chain and the key in the query string:
    const hostedUrl = urls.find(url => url.startsWith(HOSTED))
    assert.include(hostedUrl, '/v2/api?chain_id=30&')
    assert.include(hostedUrl, `&apikey=${API_KEY}`)
  })
})

function rootstockBlockscoutConfig(): BlockscoutAdapterConfig {
  for (const config of networkInfo.networkAdapterConfigs) {
    if (config.type === 'blockscout') return config
  }
  throw new Error('Expected Rootstock to list a Blockscout adapter')
}

function makeAdapter(
  blockscoutApiKey: string | undefined,
  engineFetch: EngineFetch
): { adapter: BlockscoutAdapter; urls: string[]; warnings: string[] } {
  const urls: string[] = []
  const warnings: string[] = []
  const engine = {
    allTokensMap: {},
    currencyInfo,
    engineFetch: async (
      ...args: Parameters<EngineFetch>
    ): ReturnType<EngineFetch> => {
      urls.push(String(args[0]))
      return await engineFetch(...args)
    },
    error: () => undefined,
    initOptions: { blockscoutApiKey },
    log: Object.assign(() => undefined, { warn: () => undefined }),
    networkInfo,
    walletId: 'test-wallet-id',
    walletLocalData: { publicKey: WALLET_ADDRESS },
    warn(message: string) {
      warnings.push(message)
    }
  } as unknown as EthereumEngine
  const adapter = new BlockscoutAdapter(engine, rootstockBlockscoutConfig())
  return { adapter, urls, warnings }
}

/**
 * The instance throttles everything, as its 10 request budget does in the
 * field. The hosted API serves one transaction on the first page of `txlist`
 * and nothing else.
 */
const throttledInstanceFetch: EngineFetch = async uri => {
  const url = String(uri)
  if (url.startsWith(INSTANCE)) {
    return {
      ok: false,
      status: 429,
      text: async () => 'Too Many Requests'
    } as unknown as Awaited<ReturnType<EngineFetch>>
  }
  const hasRow = url.includes('action=txlist&') && url.includes('&page=1&')
  return {
    json: async () =>
      hasRow
        ? { message: 'OK', result: [txRow], status: '1' }
        : { message: 'No transactions found', result: [], status: '0' },
    ok: true
  } as unknown as Awaited<ReturnType<EngineFetch>>
}
