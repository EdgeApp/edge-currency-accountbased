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
import { MoneroEngine } from '../../src/monero/MoneroEngine'
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
      return pageOf(chain.pending, page, pageSize)
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
