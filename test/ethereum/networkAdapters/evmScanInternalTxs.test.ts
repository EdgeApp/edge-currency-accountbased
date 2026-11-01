import { assert } from 'chai'
import { describe, it } from 'mocha'

import type { EthereumEngine } from '../../../src/ethereum/EthereumEngine'
import { BlockscoutAdapter } from '../../../src/ethereum/networkAdapters/BlockscoutAdapter'
import {
  EvmScanAdapter,
  EvmScanAdapterConfig
} from '../../../src/ethereum/networkAdapters/EvmScanAdapter'

type EngineFetch = EthereumEngine['engineFetch']

const ADDRESS = '0x3e339531147F9bBf5438a0357E59Da4CaaEaD2Ef'
const PARAMS = { startBlock: 100, startDate: 0, tokenId: null }

// The field set Etherscan V2 returns for `txlistinternal` on chain 4663:
const INTERNAL_ROW = {
  blockNumber: '103175719',
  contractAddress: '',
  errCode: '',
  from: '0x1111111111111111111111111111111111111111',
  gas: '21000',
  gasUsed: '0',
  hash: '0xabc',
  input: '',
  isError: '0',
  timeStamp: '1790000000',
  to: ADDRESS,
  traceId: '0_1',
  transactionIndex: '1',
  type: 'call',
  value: '5000'
}

describe('EvmScanAdapter broadcast', function () {
  it('is on without the config flag', function () {
    assert.isNotNull(makeAdapter(async () => fail()).broadcast)
    assert.isNotNull(
      makeAdapter(async () => fail(), { broadcastDisabled: false }).broadcast
    )
  })

  it('is off when the config opts out', function () {
    assert.isNull(
      makeAdapter(async () => fail(), { broadcastDisabled: true }).broadcast
    )
  })
})

describe('EvmScanAdapter fetchInternalTxs', function () {
  it('is off without the config flag', function () {
    assert.isNull(makeAdapter(async () => fail()).fetchInternalTxs)
    assert.isNull(
      makeAdapter(async () => fail(), {
        internalTxsSupport: false
      }).fetchInternalTxs
    )
  })

  it('stays on for Blockscout, which has no flag', function () {
    const adapter = new BlockscoutAdapter(
      makeEngine(async () => fail()),
      {
        type: 'blockscout',
        servers: ['https://robinhoodchain.blockscout.com']
      }
    )
    assert.isNotNull(adapter.fetchInternalTxs)
  })

  it('returns internal rows as a tuple that includes internals', async function () {
    const urls: string[] = []
    const adapter = makeAdapter(
      async uri => {
        urls.push(String(uri))
        return urls.length === 1
          ? fakeResponse({
              message: 'OK',
              result: [INTERNAL_ROW],
              status: '1'
            })
          : fakeResponse({
              message: 'No transactions found',
              result: [],
              status: '0'
            })
      },
      { internalTxsSupport: true }
    )

    const update = await adapter.fetchInternalTxs?.(PARAMS)

    assert.include(urls[0], 'https://api.etherscan.io/v2/api?chainid=4663')
    assert.include(urls[0], 'action=txlistinternal')
    assert.include(urls[0], 'startblock=100')
    assert.equal(update?.blockHeight, 103175719)
    assert.equal(update?.server, 'https://api.etherscan.io')

    const tuple = update?.tokenTxs?.get(null)
    assert.equal(tuple?.includesInternal, true)
    assert.equal(tuple?.edgeTransactions.length, 1)
    assert.equal(tuple?.edgeTransactions[0].txid, '0xabc')
    assert.equal(tuple?.edgeTransactions[0].nativeAmount, '5000')
  })

  it('counts an address with no internal rows as complete', async function () {
    const adapter = makeAdapter(
      async () =>
        fakeResponse({
          message: 'No transactions found',
          result: [],
          status: '0'
        }),
      { internalTxsSupport: true }
    )

    const update = await adapter.fetchInternalTxs?.(PARAMS)

    const tuple = update?.tokenTxs?.get(null)
    assert.equal(tuple?.includesInternal, true)
    assert.equal(tuple?.edgeTransactions.length, 0)
  })

  it('rejects at once on a key without chain access', async function () {
    let calls = 0
    const adapter = makeAdapter(
      async () => {
        ++calls
        return fakeResponse({
          message: 'NOTOK',
          result:
            'Free API access is not supported for this chain. Please upgrade your api plan for full chain coverage.',
          status: '0'
        })
      },
      { internalTxsSupport: true }
    )

    let error: unknown
    try {
      await adapter.fetchInternalTxs?.(PARAMS)
    } catch (e: unknown) {
      error = e
    }

    // One rejection per server with no backoff, so the waterfall moves on:
    assert.instanceOf(error, Error)
    assert.equal(calls, 1)
  })
})

function makeAdapter(
  engineFetch: EngineFetch,
  config: Partial<EvmScanAdapterConfig> = {}
): EvmScanAdapter {
  return new EvmScanAdapter(makeEngine(engineFetch), {
    type: 'evmscan',
    servers: ['https://api.etherscan.io'],
    ...config
  })
}

function makeEngine(engineFetch: EngineFetch): EthereumEngine {
  return {
    allTokensMap: {},
    currencyInfo: {
      currencyCode: 'ETH',
      denominations: [{ multiplier: '1000000000000000000', name: 'ETH' }]
    },
    engineFetch,
    error: () => undefined,
    initOptions: { etherscanApiKey: 'test-api-key' },
    log: Object.assign(() => undefined, { warn: () => undefined }),
    networkInfo: { chainParams: { chainId: 4663 } },
    walletId: 'test-wallet',
    walletLocalData: { publicKey: ADDRESS },
    warn: () => undefined
  } as unknown as EthereumEngine
}

function fakeResponse(json: unknown): Awaited<ReturnType<EngineFetch>> {
  return { json: async () => json, ok: true } as unknown as Awaited<
    ReturnType<EngineFetch>
  >
}

function fail(): never {
  throw new Error('No request expected')
}
