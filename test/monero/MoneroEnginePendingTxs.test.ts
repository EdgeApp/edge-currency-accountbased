import { assert } from 'chai'
import {
  EdgeCurrencyEngineCallbacks,
  EdgeCurrencyEngineOptions,
  EdgeTransaction,
  makeFakeIo
} from 'edge-core-js'
import { describe, it } from 'mocha'
import type { TransactionInfo, TransactionsPage } from 'react-native-monero'

import { PluginEnvironment } from '../../src/common/innerPlugin'
import {
  DROPPED_TX_GRACE_MS,
  MoneroEngine
} from '../../src/monero/MoneroEngine'
import { currencyInfo } from '../../src/monero/moneroInfo'
import { MoneroTools } from '../../src/monero/MoneroTools'
import {
  EDGE_MONERO_LWS_SERVER,
  MoneroNetworkInfo,
  SafeMoneroWalletInfo
} from '../../src/monero/moneroTypes'
import { fakeLog } from '../fake/fakeLog'

const WALLET_ID = 'native-wallet-id'

/** The lwsf "not mined yet" sentinel, as JSON.parse delivers it. */
const PENDING_HEIGHT_SENTINEL = 18446744073709552000

interface FakeChain {
  confirmed: TransactionInfo[]
  pending: TransactionInfo[]
  // Called after each getPendingTransactions snapshots its page (so mutations
  // affect the next pass, not this one). Used to simulate an event arriving
  // mid-pass.
  onPendingQuery?: () => Promise<void>
}

function makeTx(hash: string, blockHeight: number | null): TransactionInfo {
  return {
    hash,
    direction: 0,
    isPending: blockHeight == null,
    isFailed: false,
    isCoinbase: false,
    amount: '1000000000000',
    fee: '50000000',
    blockHeight: blockHeight ?? PENDING_HEIGHT_SENTINEL,
    confirmations: 0,
    timestamp: 1750000000,
    paymentId: '',
    description: '',
    label: '',
    unlockTime: 0,
    subaddrAccount: 0
  }
}

/**
 * Replicates the native getAllTransactions/getPendingTransactions contract:
 * confirmed transactions sorted by height, pending entries always behind every
 * confirmed one, both queries paged.
 */
function makeFakeBridge(chain: FakeChain): unknown {
  const pageOf = (
    txs: TransactionInfo[],
    page: number,
    pageSize: number
  ): TransactionsPage => ({
    transactions: txs.slice(page * pageSize, (page + 1) * pageSize),
    totalCount: txs.length,
    page,
    pageSize
  })

  return {
    async getAllTransactions(
      _walletId: string,
      page: number,
      pageSize: number,
      sort: 'asc' | 'desc'
    ): Promise<TransactionsPage> {
      const confirmed = [...chain.confirmed].sort((a, b) =>
        sort === 'asc'
          ? a.blockHeight - b.blockHeight
          : b.blockHeight - a.blockHeight
      )
      return pageOf([...confirmed, ...chain.pending], page, pageSize)
    },

    async getPendingTransactions(
      _walletId: string,
      page: number,
      pageSize: number
    ): Promise<TransactionsPage> {
      const result = pageOf(chain.pending, page, pageSize)
      if (chain.onPendingQuery != null) await chain.onPendingQuery()
      return result
    }
  }
}

interface TestEngine {
  engine: MoneroEngine
  events: Array<{ isNew: boolean; transaction: EdgeTransaction }>
  queryTransactions: () => Promise<void>
  storedTx: (txid: string) => EdgeTransaction | undefined
}

async function makeEngine(chain: FakeChain): Promise<TestEngine> {
  const fakeIo = makeFakeIo()
  const events: Array<{ isNew: boolean; transaction: EdgeTransaction }> = []

  const callbacks: EdgeCurrencyEngineCallbacks = {
    onAddressChanged() {},
    onAddressesChecked() {},
    onBalanceChanged() {},
    onBlockHeightChanged() {},
    onNewTokens() {},
    onSeenTxCheckpoint() {},
    onStakingStatusChanged() {},
    onSubscribeAddresses() {},
    onSyncStatusChanged() {},
    onTokenBalanceChanged() {},
    onTransactions(transactionEvents) {
      events.push(...transactionEvents)
    },
    onTransactionsChanged() {},
    onTxidsChanged() {},
    onUnactivatedTokenIdsChanged() {},
    onWcNewContractCall() {}
  }

  const opts: EdgeCurrencyEngineOptions = {
    callbacks,
    customTokens: {},
    enabledTokenIds: [],
    log: fakeLog,
    userSettings: {},
    walletLocalDisklet: fakeIo.disklet,
    walletLocalEncryptedDisklet: fakeIo.disklet,
    walletSettings: {}
  }

  const env = {
    currencyInfo,
    initOptions: { edgeApiKey: '' },
    io: fakeIo,
    log: fakeLog,
    networkInfo: {
      edgeLwsServer: EDGE_MONERO_LWS_SERVER,
      networkType: 'MAINNET'
    }
  } as unknown as PluginEnvironment<MoneroNetworkInfo>

  const tools = {
    cppBridge: makeFakeBridge(chain),
    moneroIo: { on: () => () => {} }
  } as unknown as MoneroTools

  const walletInfo: SafeMoneroWalletInfo = {
    id: 'wallet-1',
    type: 'wallet:monero',
    keys: {
      publicKey: '4-fake-address',
      moneroAddress: '4-fake-address',
      moneroViewKeyPrivate: 'view-private',
      moneroViewKeyPublic: 'view-public',
      moneroSpendKeyPublic: 'spend-public'
    }
  }

  const engine = new MoneroEngine(
    env,
    tools,
    walletInfo,
    { edgeApiKey: '' },
    opts
  )
  await engine.loadEngine()

  return {
    engine,
    events,
    queryTransactions: async () => {
      await (engine as any).queryTransactions(WALLET_ID)
    },
    storedTx: (txid: string) => (engine as any).storedTransaction(txid)
  }
}

describe('MoneroEngine pending transactions', function () {
  it('surfaces pending txs during the ascending backfill and anchors only on confirmed txs', async function () {
    const chain: FakeChain = {
      confirmed: [makeTx('c1', 100), makeTx('c2', 101)],
      pending: [makeTx('p1', null)]
    }
    const { queryTransactions, storedTx, engine } = await makeEngine(chain)

    await queryTransactions()

    assert.equal(storedTx('c1')?.blockHeight, 100)
    assert.equal(storedTx('c2')?.blockHeight, 101)
    // The pending tx appears immediately, with the sentinel height masked:
    assert.equal(storedTx('p1')?.blockHeight, 0)
    // The anchor is the newest confirmed tx, never the pending one:
    assert.equal(engine.otherData.mostRecentTxid, 'c2')
    assert.equal((engine as any).txSortOrder, 'desc')
  })

  it('surfaces a new pending incoming tx while anchored on confirmed history', async function () {
    const chain: FakeChain = {
      confirmed: [makeTx('c1', 100), makeTx('c2', 101)],
      pending: []
    }
    const { queryTransactions, storedTx, engine } = await makeEngine(chain)
    await queryTransactions() // backfill + anchor at c2

    chain.pending.push(makeTx('p1', null))
    await queryTransactions()

    assert.equal(storedTx('p1')?.blockHeight, 0)
    assert.equal(engine.otherData.mostRecentTxid, 'c2')
  })

  it('re-processes a pending tx once it confirms', async function () {
    const chain: FakeChain = {
      confirmed: [makeTx('c1', 100)],
      pending: [makeTx('p1', null)]
    }
    const { queryTransactions, storedTx, engine } = await makeEngine(chain)
    await queryTransactions()
    assert.equal(storedTx('p1')?.blockHeight, 0)

    chain.pending = []
    chain.confirmed.push(makeTx('p1', 102))
    await queryTransactions()

    assert.equal(storedTx('p1')?.blockHeight, 102)
    assert.equal(engine.otherData.mostRecentTxid, 'p1')
  })

  it('heals a cursor that was recorded while its tx was still pending', async function () {
    const chain: FakeChain = {
      confirmed: [makeTx('x1', 105)],
      pending: []
    }
    const { queryTransactions, storedTx, engine } = await makeEngine(chain)

    // Simulate data written by older code: the tx is stored unconfirmed and
    // its own hash is the cursor anchor.
    ;(engine as any).txSortOrder = 'desc'
    ;(engine as any).processTransaction(makeTx('x1', null))
    engine.otherData.mostRecentTxid = 'x1'
    assert.equal(storedTx('x1')?.blockHeight, 0)

    await queryTransactions()

    assert.equal(storedTx('x1')?.blockHeight, 105)
  })

  it('marks a tx dropped only after a sustained absence from the pool', async function () {
    const chain: FakeChain = {
      confirmed: [makeTx('c1', 100)],
      pending: [makeTx('p1', null)]
    }
    const { queryTransactions, storedTx, engine } = await makeEngine(chain)
    await queryTransactions()
    assert.hasAllKeys(engine.otherData.pendingTxSeen, ['p1'])

    // The tx leaves the pool. Within the grace window nothing changes — this
    // is also what a just-mined tx looks like before the server indexes it:
    chain.pending = []
    await queryTransactions()
    assert.equal(storedTx('p1')?.blockHeight, 0)

    // Still missing once the grace window has passed: dropped.
    engine.otherData.pendingTxSeen.p1 = Date.now() - DROPPED_TX_GRACE_MS - 1
    await queryTransactions()

    assert.equal(storedTx('p1')?.blockHeight, -1)
    assert.deepEqual(engine.otherData.pendingTxSeen, {})
  })

  it('does not relabel a failed tx as dropped when it leaves the pool', async function () {
    const chain: FakeChain = {
      confirmed: [makeTx('c1', 100)],
      pending: [{ ...makeTx('f1', null), isFailed: true }]
    }
    const { queryTransactions, storedTx, engine } = await makeEngine(chain)
    await queryTransactions()
    assert.equal(storedTx('f1')?.confirmations, 'failed')

    // The failed tx leaves the pool and stays gone past the grace window:
    chain.pending = []
    engine.otherData.pendingTxSeen.f1 = Date.now() - DROPPED_TX_GRACE_MS - 1
    await queryTransactions()

    // Still 'failed', not relabeled 'dropped', and no longer watched:
    assert.equal(storedTx('f1')?.confirmations, 'failed')
    assert.equal(storedTx('f1')?.blockHeight, 0)
    assert.deepEqual(engine.otherData.pendingTxSeen, {})
  })

  it('confirms (not drops) a tx that reappears confirmed after briefly vanishing', async function () {
    const chain: FakeChain = {
      confirmed: [makeTx('c1', 100)],
      pending: [makeTx('p1', null)]
    }
    const { queryTransactions, storedTx, engine } = await makeEngine(chain)
    await queryTransactions()

    // Mined: gone from the pool, but not yet indexed as confirmed.
    chain.pending = []
    await queryTransactions()
    assert.equal(storedTx('p1')?.blockHeight, 0)

    // The server indexes the block:
    chain.confirmed.push(makeTx('p1', 102))
    await queryTransactions()

    assert.equal(storedTx('p1')?.blockHeight, 102)
    assert.deepEqual(engine.otherData.pendingTxSeen, {})
  })

  it('re-runs instead of dropping a call that arrives mid-pass', async function () {
    const chain: FakeChain = {
      confirmed: [makeTx('c1', 100)],
      pending: []
    }
    const { engine, queryTransactions, storedTx } = await makeEngine(chain)

    let fired = false
    let storedWhenInnerResolved: EdgeTransaction | undefined
    let innerCall: Promise<void> = Promise.resolve()
    chain.onPendingQuery = async () => {
      if (fired) return
      fired = true
      // A pending tx arrives after this pass already snapshotted an empty
      // pool, and the event fires a second query while the first is still in
      // flight. The call must coalesce into a re-run rather than run
      // concurrently or be dropped, and its promise must not resolve until
      // that re-run has ingested the new tx.
      chain.pending.push(makeTx('p1', null))
      innerCall = (
        (engine as any).queryTransactions(WALLET_ID) as Promise<void>
      ).then(() => {
        storedWhenInnerResolved = storedTx('p1')
      })
    }

    await queryTransactions()
    await innerCall

    // The coalesced re-run picked up the tx that arrived mid-pass, instead of
    // leaving it invisible until the next sync poll:
    assert.equal(storedTx('p1')?.blockHeight, 0)
    // And the coalesced caller's promise did not resolve early — the tx was
    // already stored by the time it settled:
    assert.equal(storedWhenInnerResolved?.blockHeight, 0)
  })

  it('still honors a queued call when the in-flight pass throws', async function () {
    const chain: FakeChain = {
      confirmed: [makeTx('c1', 100)],
      pending: []
    }
    const { engine, queryTransactions, storedTx } = await makeEngine(chain)

    let fired = false
    let innerCall: Promise<void> = Promise.resolve()
    chain.onPendingQuery = async () => {
      if (fired) return
      fired = true
      // A call arrives mid-pass, and then the in-flight pass itself fails:
      chain.pending.push(makeTx('p1', null))
      innerCall = (engine as any).queryTransactions(WALLET_ID) as Promise<void>
      throw new Error('bridge exploded')
    }

    await queryTransactions()
    await innerCall

    // The queued re-run still ran after the error and picked up the tx,
    // instead of the error exiting the loop and stranding the queued caller:
    assert.equal(storedTx('p1')?.blockHeight, 0)
  })

  it('does not emit change events when re-processing an unchanged pending tx', async function () {
    const chain: FakeChain = {
      confirmed: [makeTx('c1', 100)],
      pending: [makeTx('p1', null)]
    }
    const { queryTransactions, events } = await makeEngine(chain)
    await queryTransactions()
    assert.isAbove(events.length, 0)

    events.length = 0
    await queryTransactions()
    await queryTransactions()

    assert.equal(events.length, 0)
  })
})
