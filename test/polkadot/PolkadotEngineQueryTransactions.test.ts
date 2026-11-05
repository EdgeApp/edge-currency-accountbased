import type { ApiPromise } from '@polkadot/api'
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
import { snooze } from '../../src/common/utils'
import { polkadot } from '../../src/polkadot/info/polkadotInfo'
import { PolkadotEngine } from '../../src/polkadot/PolkadotEngine'
import { PolkadotTools } from '../../src/polkadot/PolkadotTools'
import type {
  PolkadotNetworkInfo,
  SubscanTx
} from '../../src/polkadot/polkadotTypes'
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

/** Answers the node queries `startEngine` makes, for an empty account. */
const fakeApi = {
  consts: {
    balances: { existentialDeposit: { toString: () => '10000000000' } }
  },
  query: {
    system: {
      account: async () => ({
        nonce: { toNumber: () => 0 },
        data: { free: { toString: () => '0' } }
      })
    }
  },
  rpc: {
    chain: {
      getBlock: async () => ({
        block: { header: { number: { toNumber: () => 1 } } }
      })
    }
  },
  disconnect: async () => {}
} as unknown as ApiPromise

interface SubscanReply {
  status: number
  body: unknown
}

/** The paging fields the engine sends with each transfers query. */
interface SubscanRequest {
  row: number
  page: number
  order?: string
}

interface FakePolkadot {
  engine: PolkadotEngine
  tools: PolkadotTools

  /** Every Subscan URL the engine asked, in order. */
  requests: string[]

  /** Every txid the engine reported to the core, in order. */
  txids: string[]

  /** Every sync status the engine reported, in order. */
  syncStatuses: EdgeSyncStatus[]
}

/**
 * Builds a loaded `PolkadotEngine` over a fake `fetch` and a fake node API,
 * so the history pass runs through the real Subscan client.
 */
async function makeFakePolkadot(
  reply: (
    uri: string,
    request: SubscanRequest
  ) => SubscanReply | Promise<SubscanReply>,
  opts: { lightMode?: boolean } = {}
): Promise<FakePolkadot> {
  const { lightMode } = opts
  const requests: string[] = []
  const txids: string[] = []
  const syncStatuses: EdgeSyncStatus[] = []

  const fetch = async (
    uri: string,
    opts: { body: string }
  ): Promise<unknown> => {
    requests.push(uri)
    const { status, body } = await reply(uri, JSON.parse(opts.body))
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
    subscanQueryLimit: 25,
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
    onTransactions(events) {
      for (const { transaction } of events) txids.push(transaction.txid)
    },
    onTransactionsChanged() {},
    onTxidsChanged() {},
    onUnactivatedTokenIdsChanged() {},
    onWcNewContractCall() {}
  }

  const engineOptions: EdgeCurrencyEngineOptions = {
    callbacks,
    customTokens: {},
    enabledTokenIds: [],
    lightMode,
    log: fakeLog,
    seenTxCheckpoint: '0',
    userSettings: {},
    walletLocalDisklet: io.disklet,
    walletLocalEncryptedDisklet: io.disklet,
    walletSettings: {}
  }

  const tools = new PolkadotTools(env)
  tools.connectApi = async () => {
    tools.polkadotApi = fakeApi
    return fakeApi
  }

  const engine = new PolkadotEngine(
    env,
    tools,
    { id: 'wallet-1', type: 'wallet:polkadot', keys: { publicKey: ADDRESS } },
    engineOptions
  )
  await engine.loadEngine()
  return { engine, tools, requests, txids, syncStatuses }
}

const transfersUrl = (baseUrl: string): string => `${baseUrl}/v2/scan/transfers`

/** A transfer into the test wallet, at block `n`. */
const makeTransfer = (n: number): SubscanTx => ({
  from: '1zugcag7cJVBtVRnFxv5Qftn7xKAnR6YJ9x4x3XLgGgmNnS',
  to: ADDRESS,
  success: true,
  hash: `0x${n}`,
  block_num: n,
  block_timestamp: 1700000000 + n,
  module: 'balances',
  amount: '1',
  fee: '0'
})

/**
 * Answers transfer queries the way Subscan does, paging the given
 * Asset Hub transfers (oldest first) and leaving the relay chain empty.
 */
const subscanAccount =
  (transfers: SubscanTx[]) =>
  (uri: string, request: SubscanRequest): SubscanReply => {
    if (uri !== transfersUrl(ASSET_HUB_URL)) return EMPTY
    const ordered =
      request.order === 'asc' ? transfers : [...transfers].reverse()
    const start = request.page * request.row
    return {
      status: 200,
      body: {
        code: 0,
        message: 'Success',
        data: {
          count: transfers.length,
          transfers: ordered.slice(start, start + request.row)
        }
      }
    }
  }

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

  it("does not wait on another wallet's history pass", async function () {
    let answerStuck: (reply: SubscanReply) => void = () => {}
    const stuckReply = new Promise<SubscanReply>(resolve => {
      answerStuck = resolve
    })
    const stuck = await makeFakePolkadot(async () => await stuckReply)
    const fresh = await makeFakePolkadot(() => EMPTY)

    // A sweep's temporary wallet syncs while the user's wallets are mid-pass:
    const stuckPass = stuck.engine.queryTransactions()
    await fresh.engine.queryTransactions()
    assert.deepEqual(fresh.syncStatuses[fresh.syncStatuses.length - 1], {
      totalRatio: 0.5
    })

    answerStuck(EMPTY)
    await stuckPass
  })
})

describe('PolkadotEngine history paging', function () {
  // A lasting throttle costs three one-second retries:
  this.timeout(10000)

  it('reads every transfer, one Subscan-sized page at a time', async function () {
    const transfers = Array.from({ length: 60 }, (_, i) => makeTransfer(i + 1))
    const pages: SubscanRequest[] = []
    const account = subscanAccount(transfers)
    const { engine, txids } = await makeFakePolkadot((uri, request) => {
      if (uri === transfersUrl(ASSET_HUB_URL)) pages.push(request)
      return account(uri, request)
    })

    await engine.queryTransactions()

    assert.deepEqual(
      pages.map(({ row, page, order }) => ({ row, page, order })),
      [0, 1, 2].map(page => ({ row: 25, page, order: 'asc' }))
    )
    assert.deepEqual(
      txids,
      transfers.map(tx => tx.hash)
    )
  })

  it('picks up a transfer made since the last pass', async function () {
    const transfers = Array.from({ length: 60 }, (_, i) => makeTransfer(i + 1))
    const pages: number[] = []
    const account = subscanAccount(transfers)
    const { engine, txids } = await makeFakePolkadot((uri, request) => {
      if (uri === transfersUrl(ASSET_HUB_URL)) pages.push(request.page)
      return account(uri, request)
    })
    await engine.queryTransactions()

    transfers.push(makeTransfer(61))
    pages.length = 0
    txids.length = 0
    await engine.queryTransactions()

    // Only the last page, which now holds the new transfer:
    assert.deepEqual(pages, [2])
    assert.include(txids, '0x61')
  })

  it('keeps the newest transfers when there are more than the engine holds', async function () {
    // 2510 more than the engine's 2500, and not a whole number of pages:
    const transfers = Array.from({ length: 2610 }, (_, i) =>
      makeTransfer(i + 1)
    )
    const pages: number[] = []
    const account = subscanAccount(transfers)
    const { engine, txids } = await makeFakePolkadot((uri, request) => {
      if (uri === transfersUrl(ASSET_HUB_URL)) pages.push(request.page)
      return account(uri, request)
    })

    await engine.queryTransactions()

    // The first page tells the count, then the pass skips to the first
    // whole page of the newest 2500:
    assert.deepEqual(pages.slice(0, 3), [0, 5, 6])
    assert.equal(pages[pages.length - 1], 104)
    assert.deepEqual(
      txids,
      transfers.slice(125).map(tx => tx.hash)
    )

    // The skipped transfers count as seen, so the next pass is one page:
    transfers.push(makeTransfer(2611))
    pages.length = 0
    txids.length = 0
    await engine.queryTransactions()
    assert.deepEqual(pages, [104])
  })

  it('resumes after the last page a failed pass finished', async function () {
    const transfers = Array.from({ length: 60 }, (_, i) => makeTransfer(i + 1))
    const pages: number[] = []
    const account = subscanAccount(transfers)
    let throttled = true
    const { engine, txids } = await makeFakePolkadot((uri, request) => {
      if (uri === transfersUrl(ASSET_HUB_URL)) pages.push(request.page)
      if (throttled && request.page === 1) return THROTTLED
      return account(uri, request)
    })

    assert.include(
      await rejection(engine.queryTransactions()),
      'failed with 429'
    )

    throttled = false
    pages.length = 0
    await engine.queryTransactions()

    assert.deepEqual(pages, [1, 2])
    assert.deepEqual(
      txids,
      transfers.map(tx => tx.hash)
    )
  })
})

describe('PolkadotEngine light mode', function () {
  /** Resolves once the engine reports a full sync, or fails after a second. */
  const fullSync = async (syncStatuses: EdgeSyncStatus[]): Promise<void> => {
    for (let i = 0; i < 100; ++i) {
      if (syncStatuses.some(status => status.totalRatio === 1)) return
      await snooze(10)
    }
    throw new Error('The engine never fully synced')
  }

  it('fully syncs without asking Subscan, as a sweep needs', async function () {
    const { engine, requests, syncStatuses } = await makeFakePolkadot(
      () => THROTTLED,
      { lightMode: true }
    )

    await engine.startEngine()
    await fullSync(syncStatuses)
    assert.deepEqual(requests, [])
    await engine.killEngine()
  })

  it('still syncs history outside light mode', async function () {
    const { engine, requests, syncStatuses } = await makeFakePolkadot(
      () => EMPTY
    )

    await engine.startEngine()
    await fullSync(syncStatuses)
    assert.deepEqual(requests, [
      transfersUrl(RELAY_URL),
      transfersUrl(ASSET_HUB_URL)
    ])
    await engine.killEngine()
  })
})

describe('PolkadotTools shared connection', function () {
  it('lets a wallet that never connected resync', async function () {
    // The engine's connect is still in flight when the user taps Resync:
    const { engine } = await makeFakePolkadot(() => EMPTY)

    await engine.resyncBlockchain()
    await engine.killEngine()
  })

  it('closes the connection once, after the last wallet leaves', async function () {
    const { tools } = await makeFakePolkadot(() => EMPTY)
    let disconnects = 0
    tools.polkadotApi = {
      disconnect: async () => {
        ++disconnects
      }
    } as unknown as ApiPromise
    tools.polkadotApiSubscribers.add('wallet-1')
    tools.polkadotApiSubscribers.add('wallet-2')

    await tools.disconnectApi('wallet-1')
    assert.equal(disconnects, 0)
    await tools.disconnectApi('wallet-2')
    assert.equal(disconnects, 1)

    // A second kill of the same engine finds nothing left to close:
    await tools.disconnectApi('wallet-2')
    assert.equal(disconnects, 1)
  })
})
