import { assert } from 'chai'
import { describe, it } from 'mocha'

import type { EthereumEngine } from '../../../src/ethereum/EthereumEngine'
import { EvmScanAdapter } from '../../../src/ethereum/networkAdapters/EvmScanAdapter'
import { RateLimitError } from '../../../src/ethereum/networkAdapters/networkAdapterTypes'

type EngineFetch = EthereumEngine['engineFetch']

describe('EvmScanAdapter rate limit retries', function () {
  it('gives up on a throttled explorer instead of retrying forever', async function () {
    this.timeout(20000)

    let calls = 0
    const adapter = makeAdapter(async () => {
      ++calls
      return fakeResponse({
        message: 'NOTOK',
        result: 'Max calls per sec rate limit reached (5/sec)',
        status: '0'
      })
    })

    const error = await rejectionOf(adapter.fetchNonce())
    assert.instanceOf(error, RateLimitError)
    // The first call, the backoff's own first call, then three retries:
    assert.equal(calls, 5)
  })

  it('returns once the explorer stops throttling', async function () {
    this.timeout(20000)

    let calls = 0
    const adapter = makeAdapter(async () => {
      ++calls
      return calls < 3
        ? fakeResponse({
            message: 'NOTOK',
            result: 'Max rate limit reached',
            status: '0'
          })
        : fakeResponse({ id: 1, jsonrpc: '2.0', result: '0x5' })
    })

    const update = await adapter.fetchNonce()
    assert.equal(update.newNonce, '5')
    assert.equal(calls, 3)
  })
})

function makeAdapter(engineFetch: EngineFetch): EvmScanAdapter {
  const engine = {
    currencyInfo: { currencyCode: 'HYPE' },
    engineFetch,
    initOptions: { etherscanApiKey: 'test-api-key' },
    log: Object.assign(() => undefined, { warn: () => undefined }),
    networkInfo: { chainParams: { chainId: 999 } },
    walletLocalData: {
      publicKey: '0x3e339531147F9bBf5438a0357E59Da4CaaEaD2Ef'
    },
    warn: () => undefined
  } as unknown as EthereumEngine
  return new EvmScanAdapter(engine, {
    type: 'evmscan',
    servers: ['https://api.etherscan.io']
  })
}

function fakeResponse(json: unknown): Awaited<ReturnType<EngineFetch>> {
  return { json: async () => json, ok: true } as unknown as Awaited<
    ReturnType<EngineFetch>
  >
}

async function rejectionOf(promise: Promise<unknown>): Promise<Error> {
  try {
    await promise
  } catch (error: unknown) {
    if (error instanceof Error) return error
    throw error
  }
  throw new Error('Expected the request to reject')
}
