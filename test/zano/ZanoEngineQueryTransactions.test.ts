import { assert } from 'chai'
import { EdgeTransaction, EdgeTransactionEvent } from 'edge-core-js'
import { describe, it } from 'mocha'
import type {
  GetRecentTransactionsResponse,
  RecentTransaction
} from 'zano-native'

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
  opts: { isMining?: boolean; paymentId?: string } = {}
): RecentTransaction {
  return {
    employed_entries: {},
    fee: 10000000000,
    height,
    is_mining: opts.isMining ?? false,
    is_mixing: false,
    is_service: false,
    show_sender: false,
    subtransfers_by_pid: [
      {
        payment_id: opts.paymentId ?? '',
        subtransfers: [
          {
            amount: 1000000000000,
            asset_id: FAKE_NATIVE_ASSET_ID,
            is_income: true
          }
        ]
      }
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
  const events: EdgeTransactionEvent[] = []
  const { tools, requests } = makeFakeTools(wallet)
  const engine = await makeFakeZanoEngine({
    onTransactions(transactionEvents) {
      events.push(...transactionEvents)
    },
    tools
  })
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

  it('attaches a payment id memo from the intrinsic id groups', async function () {
    // Since HF6 the id arrives per output, grouped in subtransfers_by_pid.
    // The empty-string group carries the id-less amounts and must not
    // produce a memo:
    const wallet: FakeWallet = {
      history: [
        makeTransfer('plain', 100),
        makeTransfer('deposit', 101, { paymentId: 'a1b2c3d4e5f60718' })
      ],
      unconfirmed: []
    }
    const { queryTransactions, storedTx } = await makeEngine(wallet, 0)

    await queryTransactions()

    const plain = storedTx('plain')
    assert.isDefined(plain)
    assert.isUndefined(plain?.memos.find(memo => memo.memoName === 'paymentId'))
    const deposit = storedTx('deposit')
    const memo = deposit?.memos.find(memo => memo.memoName === 'paymentId')
    assert.equal(memo?.value, 'a1b2c3d4e5f60718')
    assert.equal(memo?.type, 'hex')
  })

  it('reports history progress as a climbing fraction of the total', async function () {
    // The regression this guards: the ratio was computed upside down,
    // `total / fetched`, so a multi-page history reported values above 1 that
    // shrank toward 1. An unclamped ratio above 1 reads as fully synced (and
    // pushes the blended total past 1) while pages are still being fetched.
    const wallet: FakeWallet = {
      history: Array.from({ length: 250 }, (_, index) =>
        makeTransfer(`c${index}`, 100 + index)
      ),
      unconfirmed: []
    }
    const { engine, queryTransactions } = await makeEngine(wallet, 0)

    const ratios: number[] = []
    ;(engine as any).syncTracker.updateHistoryRatio = (ratio: number) => {
      ratios.push(ratio)
    }

    await queryTransactions()

    // Two mid-fetch reports (after pages one and two), then the final 1:
    assert.equal(ratios[ratios.length - 1], 1)
    for (const ratio of ratios) {
      assert.isAtMost(ratio, 1, `history ratio above 1: ${ratio}`)
      assert.isAbove(ratio, 0)
    }
    for (let i = 1; i < ratios.length; ++i) {
      assert.isAtLeast(ratios[i], ratios[i - 1], 'history ratio went backward')
    }
    assert.isAtLeast(ratios.length, 3)
  })
})
