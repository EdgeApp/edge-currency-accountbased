import { assert } from 'chai'
import {
  EdgeCurrencyEngineCallbacks,
  EdgeCurrencyEngineOptions,
  EdgeIo,
  EdgeSyncStatus,
  makeFakeIo
} from 'edge-core-js'
import { describe, it } from 'mocha'

import { PluginEnvironment } from '../../src/common/innerPlugin'
import { polkadot } from '../../src/polkadot/info/polkadotInfo'
import { PolkadotEngine } from '../../src/polkadot/PolkadotEngine'
import { PolkadotTools } from '../../src/polkadot/PolkadotTools'
import type { PolkadotNetworkInfo } from '../../src/polkadot/polkadotTypes'
import { fakeLog } from '../fake/fakeLog'

const RELAY_URL = 'https://relay.subscan.test/api'
const ASSET_HUB_URL = 'https://assethub.subscan.test/api'
const ADDRESS = '15oF4uVJwmo4TdGW7VfQxNLavjCXviqxT9S1MgbjMNHr6Sp5'

/** How Subscan answers once the shared API key is over its limit. */
const THROTTLED = {
  status: 429,
  body: {
    code: 20008,
    message: 'You have reached the rate limit, please try again later.'
  }
}

/** An account with no transfers. */
const EMPTY = {
  status: 200,
  body: { code: 0, message: 'Success', data: { count: 0, transfers: null } }
}

interface SubscanReply {
  status: number
  body: unknown
}

interface FakePolkadot {
  engine: PolkadotEngine

  /** Every Subscan URL the engine asked, in order. */
  requests: string[]

  /** Every sync status the engine reported, in order. */
  syncStatuses: EdgeSyncStatus[]
}

/**
 * Builds a loaded `PolkadotEngine` over a fake `fetch`, without connecting to
 * a node, so the history pass runs through the real Subscan client.
 */
async function makeFakePolkadot(
  reply: (uri: string) => SubscanReply
): Promise<FakePolkadot> {
  const requests: string[] = []
  const syncStatuses: EdgeSyncStatus[] = []

  const fetch = async (uri: string): Promise<unknown> => {
    requests.push(uri)
    const { status, body } = reply(uri)
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body
    }
  }

  const io: EdgeIo = { ...makeFakeIo(), fetch: fetch as EdgeIo['fetch'] }

  const { currencyInfo } = polkadot({
    infoPayload: {},
    initOptions: {},
    io,
    log: fakeLog,
    nativeIo: {},
    pluginDisklet: io.disklet
  })

  const networkInfo: PolkadotNetworkInfo = {
    rpcNodes: ['wss://rpc.test'],
    ss58Format: 0,
    subscanBaseUrls: [RELAY_URL, ASSET_HUB_URL],
    subscanQueryLimit: 100,
    partialFeeOffsetMultiplier: '1',
    lengthFeePerByte: '1000000',
    liberlandScanUrl: undefined
  }

  const env = {
    builtinTokens: {},
    currencyInfo,
    initOptions: { subscanApiKey: 'test-key' },
    io,
    log: fakeLog,
    networkInfo
  } as unknown as PluginEnvironment<PolkadotNetworkInfo>

  const callbacks: EdgeCurrencyEngineCallbacks = {
    onAddressChanged() {},
    onAddressesChecked() {},
    onBalanceChanged() {},
    onBlockHeightChanged() {},
    onNewTokens() {},
    onSeenTxCheckpoint() {},
    onStakingStatusChanged() {},
    onSubscribeAddresses() {},
    onSyncStatusChanged(status) {
      syncStatuses.push(status)
    },
    onTokenBalanceChanged() {},
    onTransactions() {},
    onTransactionsChanged() {},
    onTxidsChanged() {},
    onUnactivatedTokenIdsChanged() {},
    onWcNewContractCall() {}
  }

  const engineOptions: EdgeCurrencyEngineOptions = {
    callbacks,
    customTokens: {},
    enabledTokenIds: [],
    log: fakeLog,
    seenTxCheckpoint: '0',
    userSettings: {},
    walletLocalDisklet: io.disklet,
    walletLocalEncryptedDisklet: io.disklet,
    walletSettings: {}
  }

  const engine = new PolkadotEngine(
    env,
    new PolkadotTools(env),
    { id: 'wallet-1', type: 'wallet:polkadot', keys: { publicKey: ADDRESS } },
    engineOptions
  )
  await engine.loadEngine()
  return { engine, requests, syncStatuses }
}

const transfersUrl = (baseUrl: string): string => `${baseUrl}/v2/scan/transfers`

const rejection = async (promise: Promise<unknown>): Promise<string> => {
  try {
    await promise
  } catch (error: unknown) {
    return String(error)
  }
  throw new Error('Expected a rejection')
}

describe('PolkadotEngine history sync', function () {
  // Each retry waits a second, as the throttle reply's Retry-After asks:
  this.timeout(10000)

  it('finishes when Subscan answers', async function () {
    const { engine, requests, syncStatuses } = await makeFakePolkadot(
      () => EMPTY
    )

    await engine.queryTransactions()

    assert.deepEqual(requests, [
      transfersUrl(RELAY_URL),
      transfersUrl(ASSET_HUB_URL)
    ])
    // History is done, the balance is not:
    assert.deepEqual(syncStatuses[syncStatuses.length - 1], { totalRatio: 0.5 })
  })

  it('rides out a brief throttle', async function () {
    let throttled = true
    const { engine, requests, syncStatuses } = await makeFakePolkadot(() => {
      if (!throttled) return EMPTY
      throttled = false
      return THROTTLED
    })

    await engine.queryTransactions()

    assert.deepEqual(requests, [
      transfersUrl(RELAY_URL),
      transfersUrl(RELAY_URL),
      transfersUrl(ASSET_HUB_URL)
    ])
    assert.deepEqual(syncStatuses[syncStatuses.length - 1], { totalRatio: 0.5 })
  })

  it('gives up on a lasting throttle and lets the next poll ask again', async function () {
    let throttled = true
    const { engine, requests, syncStatuses } = await makeFakePolkadot(() =>
      throttled ? THROTTLED : EMPTY
    )

    assert.include(
      await rejection(engine.queryTransactions()),
      'failed with 429'
    )
    // The first try plus three retries, all on the first chain:
    assert.deepEqual(requests, Array(4).fill(transfersUrl(RELAY_URL)))
    // History never claimed to be complete:
    assert.notDeepInclude(syncStatuses, { totalRatio: 0.5 })

    // The next poll is not stuck behind the failed one:
    throttled = false
    requests.length = 0
    await engine.queryTransactions()
    assert.deepEqual(requests, [
      transfersUrl(RELAY_URL),
      transfersUrl(ASSET_HUB_URL)
    ])
    assert.deepEqual(syncStatuses[syncStatuses.length - 1], { totalRatio: 0.5 })
  })
})
