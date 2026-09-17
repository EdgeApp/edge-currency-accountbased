import { assert } from 'chai'
import { AuthInfo, TxBody, TxRaw } from 'cosmjs-types/cosmos/tx/v1beta1/tx'
import { describe, it } from 'mocha'

import type { CosmosClients } from '../../src/cosmos/cosmosTypes'
import { CosmosEngine } from '../../src/cosmos/engine/CosmosEngine'

const ADDRESS = 'axelar1z4spcxyucu63n3l7u9r4qnwl5gw30cspmt7r5g'
const HEIGHT = 28842747
const RECENT_HEIGHT = 34731966
const LOWEST_HEIGHT = 34246686
const TXID = 'AB3FD628'
const BLOCK_TIME = '2026-05-21T17:11:50.990489805Z'
const BLOCK_DATE = Math.floor(Date.parse(BLOCK_TIME) / 1000)
const PRUNED_ERROR = new Error(
  `height ${HEIGHT} is not available, lowest height is 34246686`
)

const txRawBytes = TxRaw.encode(
  TxRaw.fromPartial({
    bodyBytes: TxBody.encode(TxBody.fromPartial({ memo: '' })).finish(),
    authInfoBytes: AuthInfo.encode(AuthInfo.fromPartial({})).finish()
  })
).finish()

interface FakeTxRow {
  tx: Uint8Array
  hash: Uint8Array
  height: number
  index: number
  result: {
    code: number
    events: Array<{
      type: string
      attributes: Array<{ key: string; value: string }>
    }>
    gasWanted: bigint
    gasUsed: bigint
  }
}

/** A `tx_search` row holding one incoming transfer to our address. */
const makeTx = (
  height: number,
  hash = [0xab, 0x3f, 0xd6, 0x28]
): FakeTxRow => ({
  tx: txRawBytes,
  hash: Uint8Array.from(hash),
  height,
  index: 0,
  result: {
    code: 0,
    events: [
      {
        type: 'coin_received',
        attributes: [
          { key: 'receiver', value: ADDRESS },
          { key: 'amount', value: '79230000uaxl' }
        ]
      }
    ],
    gasWanted: BigInt(0),
    gasUsed: BigInt(0)
  }
})

interface FakePage {
  totalCount: number
  txs: FakeTxRow[]
}

/** Rows carrying no coin events, so a pass pages through without dating any. */
const makeEmptyRows = (count: number): FakeTxRow[] =>
  Array.from({ length: count }, () => {
    const row = makeTx(HEIGHT)
    return { ...row, result: { ...row.result, events: [] } }
  })

interface FakeNode {
  /** `tx_search` results, one entry per page. */
  pages?: FakePage[]
  /** Answers `tx_search` directly, for nodes that misreport their paging. */
  txSearch?: (page: number) => Promise<FakePage>
  /** Set when the node still stores the block. */
  blockTime?: string
  /** Raised when the node has no block to return. */
  blockError?: Error
  /** Heights below this count as pruned, even when `blockTime` is set. */
  prunedBelow?: number
}

const makeClients = (node: FakeNode): CosmosClients => {
  const clients = {
    cometClient: {
      txSearch: async ({ page }: { page: number }) => {
        if (node.txSearch != null) return await node.txSearch(page)
        const result = node.pages?.[page - 1]
        if (result == null) {
          throw new Error(
            `page should be within [1, ${
              node.pages?.length ?? 1
            }] range, given ${page}`
          )
        }
        return result
      }
    },
    stargateClient: {
      getBlock: async (height: number) => {
        if (node.blockTime == null || height < (node.prunedBelow ?? 0)) {
          throw node.blockError ?? PRUNED_ERROR
        }
        return { header: { time: node.blockTime } }
      }
    }
  }
  return clients as unknown as CosmosClients
}

/** A node that returns our transaction but has pruned its block. */
const makePrunedNode = (): CosmosClients =>
  makeClients({
    pages: [{ totalCount: 1, txs: [makeTx(HEIGHT)] }],
    blockError: PRUNED_ERROR
  })

interface FakeEngineOptions {
  /** Block lookups fall back to these. */
  archiveClients?: CosmosClients[]
  /** Raised instead of handing back archive clients. */
  archiveSetupError?: Error
  /** Transactions already recorded, as txid to block height. */
  recorded?: { [txid: string]: number }
  /** The stored watermark this query starts from. */
  watermark?: string
}

const makeEngine = (
  processed: unknown[][],
  warnings: string[],
  options: FakeEngineOptions = {}
): CosmosEngine => {
  const {
    archiveClients = [],
    archiveSetupError,
    recorded = {},
    watermark
  } = options
  const txids = Object.keys(recorded)
  // Only the members `queryTransactionsInner` reaches through `this`:
  const engine = {
    walletInfo: { keys: { bech32Address: ADDRESS } },
    otherData: { 'coin_received.receiver': { newestTxid: watermark } },
    walletLocalDataDirty: false,
    log: {
      warn: (...args: unknown[]) => warnings.push(args.map(String).join(' '))
    },
    processCosmosTransaction: (...args: unknown[]) => processed.push(args),
    tokenIdFromDenom: () => null,
    // `addTransaction` keys its map through `normalizeAddress`, so the stored
    // keys are lowercase and a caller passing an uppercase txid finds nothing:
    findTransaction: (_tokenId: unknown, txid: string) =>
      txids.findIndex(recordedTxid => recordedTxid.toLowerCase() === txid),
    transactionList: {
      '': txids.map(txid => ({ blockHeight: recorded[txid] }))
    },
    getArchiveClients: async () => {
      if (archiveSetupError != null) throw archiveSetupError
      return archiveClients
    },
    queryBlockDate: CosmosEngine.prototype.queryBlockDate,
    hasConfirmedTx: CosmosEngine.prototype.hasConfirmedTx
  }
  return engine as unknown as CosmosEngine
}

const syncQuery = async (
  engine: CosmosEngine,
  clients: CosmosClients
): Promise<{ newestTxid: string | undefined; lastTimestamp: number }> =>
  await CosmosEngine.prototype.queryTransactionsInner.call(
    engine,
    'coin_received.receiver',
    clients
  )

describe('queryTransactionsInner block dates', function () {
  it('dates a transaction from an archive node when the indexing node has pruned the block', async function () {
    const processed: unknown[][] = []
    const archive = makeClients({ blockTime: BLOCK_TIME })

    const { newestTxid, lastTimestamp } = await syncQuery(
      makeEngine(processed, [], { archiveClients: [archive] }),
      makePrunedNode()
    )

    assert.equal(processed.length, 1)
    const [txid, date, , coin] = processed[0]
    assert.equal(txid, TXID)
    assert.equal(date, BLOCK_DATE)
    assert.deepEqual(coin, { denom: 'uaxl', amount: '79230000' })
    assert.equal(newestTxid, TXID)
    assert.equal(lastTimestamp, BLOCK_DATE * 1000)
  })

  it('holds the watermark at a row no node can date', async function () {
    const processed: unknown[][] = []
    // An undateable row, then a dateable one, on the same page:
    const node = makeClients({
      pages: [
        {
          totalCount: 2,
          txs: [makeTx(HEIGHT, [0x01]), makeTx(RECENT_HEIGHT, [0x02])]
        }
      ],
      blockTime: BLOCK_TIME,
      prunedBelow: LOWEST_HEIGHT
    })

    const { newestTxid } = await syncQuery(makeEngine(processed, []), node)

    // The later row still lands, and the watermark stays below the gap so the
    // next pass reaches the undated row again:
    assert.deepEqual(
      processed.map(([txid]) => txid),
      ['02']
    )
    assert.isUndefined(newestTxid)
  })

  it('skips a transaction no node can date', async function () {
    const processed: unknown[][] = []
    const warnings: string[] = []
    const alsoPruned = makeClients({ blockError: PRUNED_ERROR })

    const { newestTxid } = await syncQuery(
      makeEngine(processed, warnings, { archiveClients: [alsoPruned] }),
      makePrunedNode()
    )

    assert.equal(processed.length, 0)
    assert.isUndefined(newestTxid)
    assert.equal(
      warnings.filter(warning =>
        warning.includes(`No node has block ${HEIGHT}`)
      ).length,
      1
    )
  })

  it('ends the pass when a block lookup fails for any other reason', async function () {
    const processed: unknown[][] = []
    const failing = makeClients({
      pages: [{ totalCount: 1, txs: [makeTx(HEIGHT)] }],
      blockError: new Error('fetch failed')
    })

    let thrown: unknown
    try {
      await syncQuery(makeEngine(processed, []), failing)
    } catch (error: unknown) {
      thrown = error
    }

    assert.match(String(thrown), /fetch failed/)
    assert.equal(processed.length, 0)
  })

  it('ends the pass when the archive nodes cannot be set up', async function () {
    const processed: unknown[][] = []

    let thrown: unknown
    try {
      await syncQuery(
        makeEngine(processed, [], {
          archiveSetupError: new Error('Expected a string at .quiknodeApiKey')
        }),
        makePrunedNode()
      )
    } catch (error: unknown) {
      thrown = error
    }

    assert.match(String(thrown), /quiknodeApiKey/)
    assert.equal(processed.length, 0)
  })

  it('looks up no block for a transaction already recorded', async function () {
    const processed: unknown[][] = []
    // Any block lookup against this node fails the test:
    const node = makeClients({
      pages: [{ totalCount: 1, txs: [makeTx(HEIGHT)] }],
      blockError: new Error('getBlock should not run')
    })

    const { newestTxid } = await syncQuery(
      makeEngine(processed, [], { recorded: { [TXID]: 123 } }),
      node
    )

    assert.equal(processed.length, 0)
    assert.isUndefined(newestTxid)
  })

  it('dates a transaction it holds only as pending', async function () {
    const processed: unknown[][] = []
    const archive = makeClients({ blockTime: BLOCK_TIME })

    await syncQuery(
      makeEngine(processed, [], {
        archiveClients: [archive],
        recorded: { [TXID]: 0 }
      }),
      makePrunedNode()
    )

    assert.equal(processed.length, 1)
  })

  it('keeps the stored watermark through a pass that adds nothing', async function () {
    const processed: unknown[][] = []

    const { newestTxid } = await syncQuery(
      makeEngine(processed, [], { watermark: TXID }),
      makePrunedNode()
    )

    assert.equal(processed.length, 0)
    assert.equal(newestTxid, TXID)
  })
})

describe('getArchiveClients', function () {
  it('has nothing to offer when the chain configures no archive node', async function () {
    const engine = { networkInfo: {} } as unknown as CosmosEngine

    const clients = await CosmosEngine.prototype.getArchiveClients.call(engine)

    assert.deepEqual(clients, [])
  })
})

describe('queryTransactionsInner page retries', function () {
  it('gives up on a page the node keeps reporting as out of range', async function () {
    const pageRequests: number[] = []
    const node = makeClients({
      txSearch: async page => {
        pageRequests.push(page)
        if (page === 1) return { totalCount: 60, txs: makeEmptyRows(50) }
        throw new Error('page should be within [1, 1] range, given 2')
      }
    })

    let thrown: unknown
    try {
      await syncQuery(makeEngine([], []), node)
    } catch (error: unknown) {
      thrown = error
    }

    assert.match(String(thrown), /page should be within/)
    // The first request for page 2, plus a bounded number of retries:
    assert.equal(pageRequests.filter(page => page === 2).length, 4)
  })

  it('keeps paging when a retried page answers', async function () {
    const pageRequests: number[] = []
    const node = makeClients({
      txSearch: async page => {
        pageRequests.push(page)
        if (page === 1) return { totalCount: 60, txs: makeEmptyRows(50) }
        if (pageRequests.filter(request => request === 2).length === 1) {
          throw new Error('page should be within [1, 1] range, given 2')
        }
        return { totalCount: 60, txs: makeEmptyRows(10) }
      }
    })

    const { newestTxid } = await syncQuery(makeEngine([], []), node)

    assert.isUndefined(newestTxid)
    assert.equal(pageRequests.filter(page => page === 2).length, 2)
  })
})
