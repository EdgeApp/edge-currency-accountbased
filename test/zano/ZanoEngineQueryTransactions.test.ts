import { assert } from 'chai'
import {
  EdgeCurrencyEngineCallbacks,
  EdgeCurrencyEngineOptions,
  EdgeTransaction,
  EdgeTransactionEvent,
  makeFakeIo
} from 'edge-core-js'
import { describe, it } from 'mocha'
import type {
  GetRecentTransactionsResponse,
  RecentTransaction
} from 'react-native-zano'

import { PluginEnvironment } from '../../src/common/innerPlugin'
import { ZanoEngine } from '../../src/zano/ZanoEngine'
import { currencyInfo } from '../../src/zano/zanoInfo'
import { ZanoTools } from '../../src/zano/ZanoTools'
import { SafeZanoWalletInfo, ZanoNetworkInfo } from '../../src/zano/zanoTypes'
import { fakeLog } from '../fake/fakeLog'

const NATIVE_ASSET_ID =
  'd6329b5b1f7c0805b5c345f4957554002a2f557845f64d7645dae0e051a6498a'
const ADDRESS = 'ZxTestAddress'

/** The page size `CppBridge.getTransactions` asks the wallet for. */
const PAGE_SIZE = 100

function makeTransfer(
  txHash: string,
  height: number,
  opts: { isMining?: boolean } = {}
): RecentTransaction {
  return {
    employed_entries: {},
    fee: 10000000000,
    height,
    is_mining: opts.isMining ?? false,
    is_mixing: false,
    is_service: false,
    payment_id: '',
    show_sender: false,
    subtransfers: [
      { amount: 1000000000000, asset_id: NATIVE_ASSET_ID, is_income: true }
    ],
    timestamp: 1750000000,
    transfer_internal_index: 0,
    tx_blob_size: 1,
    tx_hash: txHash,
    tx_type: 0,
    unlock_time: 0
  }
}

interface FakeWallet {
  /** Confirmed transfers, oldest first, exactly as `m_transfer_history`. */
  history: RecentTransaction[]
  /** Mempool transfers, which the wallet reports only at offset zero. */
  unconfirmed: RecentTransaction[]
}

/**
 * Mirrors `wallet_rpc_server::on_get_recent_txs_and_info2` plus
 * `wallet2::get_recent_transfers_history`, the two pieces this engine's paging
 * contract rests on:
 *
 * - unconfirmed transfers are prepended ONLY when the requested offset is zero
 * - `last_item_index` is the history index of the last transfer actually
 *   RETURNED, so entries filtered out by `exclude_mining_txs` never advance it
 * - `total_transfers` is the full history length, filtered entries included
 */
function makeFakeTools(wallet: FakeWallet): {
  tools: ZanoTools
  requests: number[]
} {
  const requests: number[] = []

  const getTransactions = async (
    _nativeId: number,
    offset: number
  ): Promise<GetRecentTransactionsResponse> => {
    requests.push(offset)
    const transfers: RecentTransaction[] =
      offset === 0 ? [...wallet.unconfirmed] : []

    let lastItemIndex = 0
    let returned = 0
    for (let index = offset; index < wallet.history.length; ++index) {
      const transfer = wallet.history[index]
      if (transfer.is_mining) continue
      transfers.push(transfer)
      lastItemIndex = index
      if (++returned >= PAGE_SIZE) break
    }

    return {
      last_item_index: lastItemIndex,
      pi: {
        balance: 0,
        curent_height: 0,
        transfer_entries_count: 0,
        transfers_count: 0,
        unlocked_balance: 0
      },
      total_transfers: wallet.history.length,
      transfers
    }
  }

  const tools = {
    zano: { getTransactions }
  } as unknown as ZanoTools

  return { tools, requests }
}

interface TestEngine {
  engine: ZanoEngine
  /** Every transaction event the engine handed to the core, in order. */
  events: EdgeTransactionEvent[]
  queryTransactions: () => Promise<void>
  requests: number[]
  storedTx: (txid: string) => EdgeTransaction | undefined
}

async function makeEngine(
  wallet: FakeWallet,
  startOffset: number
): Promise<TestEngine> {
  const fakeIo = makeFakeIo()
  const events: EdgeTransactionEvent[] = []

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
    seenTxCheckpoint: '0',
    userSettings: {},
    walletLocalDisklet: fakeIo.disklet,
    walletLocalEncryptedDisklet: fakeIo.disklet,
    walletSettings: {}
  }

  const networkInfo: ZanoNetworkInfo = {
    nativeAssetId: NATIVE_ASSET_ID,
    walletRpcAddress: 'http://127.0.0.1:10500'
  }

  const env = {
    currencyInfo,
    io: fakeIo,
    log: fakeLog,
    networkInfo
  } as unknown as PluginEnvironment<ZanoNetworkInfo>

  const walletInfo: SafeZanoWalletInfo = {
    id: 'wallet-1',
    type: 'wallet:zano',
    keys: { publicKey: ADDRESS }
  }

  const { tools, requests } = makeFakeTools(wallet)
  const engine = new ZanoEngine(env, tools, walletInfo, opts)
  await engine.loadEngine()
  engine.otherData.transactionQueryOffset = startOffset
  // The lifecycle manager only hands out a native id for a started wallet;
  // these tests drive `queryTransactions` directly:
  ;(engine as any).nativeId = { get: async () => 0 }

  return {
    engine,
    events,
    queryTransactions: async () => {
      await engine.queryTransactions()
      engine.sendTransactionEvents()
    },
    requests,
    storedTx: (txid: string) => {
      const index = (engine as any).txIdMap['']?.[txid]
      if (index == null) return undefined
      return (engine as any).transactionList[''][index]
    }
  }
}

describe('ZanoEngine.queryTransactions', function () {
  it('terminates when the newest history entries are filtered out', async function () {
    // A defragmentation or mining transaction at the tip keeps
    // `last_item_index` at 1 while `total_transfers` is 3, so the old
    // `total - last === 1` test could never become true.
    const wallet: FakeWallet = {
      history: [
        makeTransfer('c0', 100),
        makeTransfer('c1', 101),
        makeTransfer('mined', 102, { isMining: true })
      ],
      unconfirmed: []
    }
    const { queryTransactions, requests, storedTx } = await makeEngine(
      wallet,
      1
    )

    await queryTransactions()

    // One mempool sweep plus one catch-up page, and no spin:
    assert.isBelow(requests.length, 4)
    assert.equal(storedTx('c1')?.blockHeight, 101)
  })

  it('sees an unconfirmed transfer on a wallet that already has history', async function () {
    // The wallet reports unconfirmed transfers only at offset zero, so a
    // catch-up that starts at the persisted offset never sees them.
    const wallet: FakeWallet = {
      history: [makeTransfer('c0', 100), makeTransfer('c1', 101)],
      unconfirmed: [makeTransfer('mempool', 0)]
    }
    const { queryTransactions, requests, storedTx } = await makeEngine(
      wallet,
      1
    )

    await queryTransactions()

    assert.include(requests, 0)
    assert.equal(storedTx('mempool')?.blockHeight, 0)
  })

  it('pages a long history and stops at its end', async function () {
    const history: RecentTransaction[] = []
    for (let index = 0; index < 150; ++index) {
      history.push(makeTransfer(`c${index}`, 100 + index))
    }
    const { queryTransactions, requests, storedTx, engine } = await makeEngine(
      { history, unconfirmed: [] },
      0
    )

    await queryTransactions()

    assert.equal(storedTx('c0')?.blockHeight, 100)
    assert.equal(storedTx('c149')?.blockHeight, 249)
    assert.equal(engine.otherData.transactionQueryOffset, 149)
    assert.isBelow(requests.length, 5)
  })

  it('reports an unconfirmed receive as a new transaction', async function () {
    // A mempool receive enters the store at blockHeight 0, which the base
    // checkpoint math reads as already seen, so without the engine's
    // `isTransactionNew` override the core would only ever hear about it as a
    // change and the receive dropdown would never fire.
    const wallet: FakeWallet = {
      history: [makeTransfer('c0', 100)],
      unconfirmed: [makeTransfer('mempool', 0)]
    }
    const { events, queryTransactions } = await makeEngine(wallet, 1)

    await queryTransactions()

    const event = events.find(event => event.transaction.txid === 'mempool')
    assert.isDefined(event)
    assert.isTrue(event?.isNew)
  })
})
