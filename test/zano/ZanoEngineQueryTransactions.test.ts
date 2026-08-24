import { assert } from 'chai'
import { EdgeTransaction } from 'edge-core-js'
import { describe, it } from 'mocha'
import type {
  GetRecentTransactionsResponse,
  RecentTransaction
} from 'react-native-zano'

import { ZanoEngine } from '../../src/zano/ZanoEngine'
import { ZanoTools } from '../../src/zano/ZanoTools'
import {
  FAKE_NATIVE_ASSET_ID,
  makeFakeZanoEngine
} from '../fake/fakeZanoEngine'

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
      { amount: 1000000000000, asset_id: FAKE_NATIVE_ASSET_ID, is_income: true }
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
  /** Runs at the start of every fetch, before the response is built. */
  onFetch?: () => void
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
    wallet.onFetch?.()
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
  queryTransactions: () => Promise<void>
  requests: number[]
  storedTx: (txid: string) => EdgeTransaction | undefined
}

async function makeEngine(
  wallet: FakeWallet,
  startOffset: number
): Promise<TestEngine> {
  const { tools, requests } = makeFakeTools(wallet)
  const engine = await makeFakeZanoEngine({ tools })
  engine.otherData.transactionQueryOffset = startOffset
  // The lifecycle manager only hands out a native id for a started wallet;
  // these tests drive `queryTransactions` directly:
  ;(engine as any).nativeId = { get: async () => 0 }

  return {
    engine,
    queryTransactions: async () => {
      await engine.queryTransactions()
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

  it('fetches offset zero once for a wallet whose cursor sits there', async function () {
    // The paging loop already served offset zero -- unconfirmed transfers
    // included -- so a second fetch for the mempool sweep would repeat the
    // same RPC and the same processing on every sync tick, forever, for any
    // wallet whose cursor never advances (an empty wallet most of all).
    const wallet: FakeWallet = {
      history: [],
      unconfirmed: [makeTransfer('mempool', 0)]
    }
    const { queryTransactions, requests, storedTx } = await makeEngine(
      wallet,
      0
    )

    await queryTransactions()

    assert.deepEqual(requests, [0])
    // The single fetch still delivered the mempool:
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

  it('discards an in-flight page when a resync lands under it', async function () {
    // `resyncBlockchain` empties the transaction cache, zeroes the cursor,
    // and bumps the store generation. A page fetched before that must not be
    // processed into the cleared store, and above all must not write its old
    // cursor back -- that would park the cursor past history the cache no
    // longer holds, so it is never re-fetched.
    const wallet: FakeWallet = {
      history: [makeTransfer('c0', 100), makeTransfer('c1', 101)],
      unconfirmed: []
    }
    const { engine, queryTransactions, storedTx } = await makeEngine(wallet, 0)
    wallet.onFetch = () => {
      // Model the resync landing while the fetch is in flight:
      engine.otherData.transactionQueryOffset = 0
      ;(engine as any).storeGeneration =
        Number((engine as any).storeGeneration) + 1
      wallet.onFetch = undefined
    }

    await queryTransactions()

    assert.equal(engine.otherData.transactionQueryOffset, 0)
    assert.isUndefined(storedTx('c1'))
  })
})
