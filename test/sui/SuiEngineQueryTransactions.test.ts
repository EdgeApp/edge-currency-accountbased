import { Ed25519PublicKey } from '@mysten/sui/keypairs/ed25519'
import { assert } from 'chai'
import {
  EdgeCurrencyEngineCallbacks,
  EdgeCurrencyEngineOptions,
  EdgeIo,
  EdgeTransaction,
  makeFakeIo
} from 'edge-core-js'
import { describe, it } from 'mocha'

import { PluginEnvironment } from '../../src/common/innerPlugin'
import { SuiEngine } from '../../src/sui/SuiEngine'
import { currencyInfo } from '../../src/sui/suiInfo'
import { SuiTools } from '../../src/sui/SuiTools'
import type { SuiNetworkInfo } from '../../src/sui/suiTypes'
import { fakeLog } from '../fake/fakeLog'

const GRAPHQL_URL = 'https://graphql.test'
const GRAPHQL_URL_2 = 'https://graphql2.test'

const PUBLIC_KEY = 'AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE='
const ADDRESS = new Ed25519PublicKey(PUBLIC_KEY).toSuiAddress()
const OTHER =
  '0x7ba661f0e68dcfa31c8c20f21d42bc0b973920ee79904bd5683c9259a9925fdf'

interface GraphqlBody {
  query: string
  variables: { owner?: string; digest?: string; after?: string | null }
}

const makeGraphqlBalanceChanges = (
  amounts: string[],
  hasNextPage: boolean
): unknown => ({
  pageInfo: { hasNextPage, endCursor: 'MA==' },
  nodes: amounts.map(amount => ({
    amount,
    coinType: {
      repr: '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI'
    },
    owner: { address: ADDRESS }
  }))
})

/** A transaction as GraphQL returns it, sent by `sender`. */
const makeGraphqlTx = (
  digest: string,
  opts: { sender?: string; balanceChanges?: unknown } = {}
): unknown => {
  const {
    sender = OTHER,
    balanceChanges = makeGraphqlBalanceChanges(['5'], false)
  } = opts
  return {
    digest,
    sender: { address: sender },
    transactionBcs: 'AAAA',
    signatures: [{ signatureBytes: 'AA==' }],
    effects: {
      timestamp: '2023-11-14T22:13:20.000Z',
      checkpoint: { sequenceNumber: 100 },
      gasEffects: {
        gasSummary: {
          computationCost: 1000,
          storageCost: 2000,
          storageRebate: 500,
          nonRefundableStorageFee: 5
        }
      },
      balanceChanges
    }
  }
}

/** One page of the address history query. */
const makePage = (
  txs: unknown[],
  hasNextPage: boolean,
  endCursor: string | null
): unknown => ({
  data: {
    transactions: { pageInfo: { hasNextPage, endCursor }, nodes: txs }
  }
})

/** A history of one transaction per page, with cursors 'c1', 'c2', ... */
const pagedHistory =
  (digests: string[]) =>
  (body: GraphqlBody): unknown => {
    const after = body.variables.after
    const index = after == null ? 0 : Number(after.slice(1))
    if (index > digests.length) {
      return { data: null, errors: [{ message: 'Invalid cursor' }] }
    }
    const txs = index < digests.length ? [makeGraphqlTx(digests[index])] : []
    const endCursor = txs.length > 0 ? `c${index + 1}` : null
    return makePage(txs, index + 1 < digests.length, endCursor)
  }

interface FakeSui {
  engine: SuiEngine

  /** Every request the engine sent, in order. */
  requests: string[]

  /** Every ratio the sweep reported for history. */
  historyRatios: number[]

  /** Every transaction the engine reported, in order. */
  transactions: EdgeTransaction[]
}

/**
 * Builds a loaded `SuiEngine` and real `SuiTools` over a fake `fetch`, so the
 * sweep runs through the same failover and cleaners as in the app.
 */
async function makeFakeSui(opts: {
  /** Answers GraphQL queries, by node. A throw is a network failure. */
  graphql: {
    [url: string]: (body: GraphqlBody) => unknown | Promise<unknown>
  }
}): Promise<FakeSui> {
  const { graphql } = opts
  const requests: string[] = []
  const transactions: EdgeTransaction[] = []

  const fetch = async (
    uri: string,
    init?: { body?: unknown }
  ): Promise<unknown> => {
    const handler = graphql[uri]
    if (handler == null) throw new Error(`Unexpected request to ${uri}`)
    const body = JSON.parse(String(init?.body)) as GraphqlBody
    const { after, digest } = body.variables
    requests.push(
      digest != null
        ? `balanceChanges ${digest} ${String(after)}`
        : `history ${String(after)}`
    )
    const json = await handler(body)
    return { ok: true, status: 200, json: async () => json }
  }

  const io: EdgeIo = { ...makeFakeIo(), fetch: fetch as EdgeIo['fetch'] }

  const networkInfo = {
    network: 'mainnet',
    pluginMnemonicKeyName: 'suiMnemonic',
    totalSupply: '10000000000000000000',
    graphqlNodes: Object.keys(graphql),
    maxRequestsPerSecond: 1000
  } as unknown as SuiNetworkInfo

  const env = {
    builtinTokens: {},
    currencyInfo,
    initOptions: {},
    io,
    log: fakeLog,
    networkInfo
  } as unknown as PluginEnvironment<SuiNetworkInfo>

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
    onTransactions(events) {
      transactions.push(...events.map(event => event.transaction))
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
    log: fakeLog,
    seenTxCheckpoint: '0',
    userSettings: {},
    walletLocalDisklet: io.disklet,
    walletLocalEncryptedDisklet: io.disklet,
    walletSettings: {}
  }

  const engine = new SuiEngine(
    env,
    new SuiTools(env),
    { id: 'wallet-1', type: 'wallet:sui', keys: { publicKey: PUBLIC_KEY } },
    engineOptions
  )
  await engine.loadEngine()
  // The polling loop stays off; each test runs passes by hand:
  engine.engineOn = true

  const historyRatios: number[] = []
  const { syncTracker } = engine
  const setHistoryRatios = syncTracker.setHistoryRatios.bind(syncTracker)
  syncTracker.setHistoryRatios = (tokenIds, ratio) => {
    historyRatios.push(ratio)
    setHistoryRatios(tokenIds, ratio)
  }

  return { engine, requests, historyRatios, transactions }
}

/** The transactions a sweep reported, as `[txid, nativeAmount]`. */
const added = (transactions: EdgeTransaction[]): string[][] =>
  transactions.map(tx => [tx.txid, tx.nativeAmount])

describe('SuiEngine history sweep', function () {
  it('walks every page and saves the cursor after each', async function () {
    const { engine, requests, historyRatios, transactions } = await makeFakeSui(
      {
        graphql: { [GRAPHQL_URL]: pagedHistory(['a', 'b']) }
      }
    )

    await engine.queryTransactions()

    assert.deepEqual(requests, ['history null', 'history c1'])
    assert.deepEqual(added(transactions), [
      ['a', '5'],
      ['b', '5']
    ])
    assert.equal(engine.otherData.txCursor, 'c2')
    assert.deepEqual(historyRatios, [1])
  })

  it('resumes from the saved cursor', async function () {
    const { engine, requests, transactions } = await makeFakeSui({
      graphql: { [GRAPHQL_URL]: pagedHistory(['a', 'b', 'c']) }
    })
    engine.otherData.txCursor = 'c2'

    await engine.queryTransactions()

    assert.deepEqual(requests, ['history c2'])
    assert.deepEqual(
      added(transactions).map(([txid]) => txid),
      ['c']
    )
    assert.equal(engine.otherData.txCursor, 'c3')
  })

  it('keeps the cursor when a later sweep finds nothing new', async function () {
    const { engine, transactions } = await makeFakeSui({
      graphql: { [GRAPHQL_URL]: pagedHistory(['a']) }
    })
    engine.otherData.txCursor = 'c1'

    await engine.queryTransactions()

    assert.deepEqual(added(transactions), [])
    assert.equal(engine.otherData.txCursor, 'c1')
  })

  it('keeps the pages it read when a later page fails', async function () {
    const { engine, historyRatios, transactions } = await makeFakeSui({
      graphql: {
        [GRAPHQL_URL]: body => {
          if (body.variables.after == null) {
            return makePage([makeGraphqlTx('a')], true, 'c1')
          }
          throw new Error('Network request failed')
        }
      }
    })

    await engine.queryTransactions()

    assert.deepEqual(
      added(transactions).map(([txid]) => txid),
      ['a']
    )
    assert.equal(engine.otherData.txCursor, 'c1')
    // History is not reported as synced:
    assert.deepEqual(historyRatios, [])
  })

  it('reads the whole history again once if the cursor is rejected', async function () {
    const { engine, requests, transactions } = await makeFakeSui({
      graphql: { [GRAPHQL_URL]: pagedHistory(['a']) }
    })
    engine.otherData.txCursor = 'c9'

    await engine.queryTransactions()

    assert.deepEqual(requests, ['history c9', 'history null'])
    assert.deepEqual(
      added(transactions).map(([txid]) => txid),
      ['a']
    )
    assert.equal(engine.otherData.txCursor, 'c1')
  })

  it('stops after one restart if the service keeps rejecting cursors', async function () {
    const { engine, requests, historyRatios } = await makeFakeSui({
      graphql: {
        [GRAPHQL_URL]: body =>
          body.variables.after == null
            ? makePage([makeGraphqlTx('a')], true, 'c1')
            : { data: null, errors: [{ message: 'Invalid cursor' }] }
      }
    })
    engine.otherData.txCursor = 'c9'

    await engine.queryTransactions()

    assert.deepEqual(requests, ['history c9', 'history null', 'history c1'])
    assert.equal(engine.otherData.txCursor, 'c1')
    assert.deepEqual(historyRatios, [])
  })

  it('tells sends from receipts by the sender', async function () {
    const { engine, transactions } = await makeFakeSui({
      graphql: {
        [GRAPHQL_URL]: () =>
          makePage(
            [
              makeGraphqlTx('sent', { sender: ADDRESS }),
              makeGraphqlTx('received')
            ],
            false,
            'c2'
          )
      }
    })

    await engine.queryTransactions()

    const [sent, received] = transactions
    assert.equal(sent.isSend, true)
    assert.deepEqual(sent.ourReceiveAddresses, [])
    assert.equal(received.isSend, false)
    assert.deepEqual(received.ourReceiveAddresses, [ADDRESS])
    assert.equal(received.networkFee, '2500')
  })

  it('gathers balance changes past the first page', async function () {
    const { engine, requests, transactions } = await makeFakeSui({
      graphql: {
        [GRAPHQL_URL]: body =>
          body.variables.digest == null
            ? makePage(
                [
                  makeGraphqlTx('a', {
                    balanceChanges: makeGraphqlBalanceChanges(['5'], true)
                  })
                ],
                false,
                'c1'
              )
            : {
                data: {
                  transaction: {
                    effects: {
                      balanceChanges: makeGraphqlBalanceChanges(['7'], false)
                    }
                  }
                }
              }
      }
    })

    await engine.queryTransactions()

    assert.deepEqual(requests, ['history null', 'balanceChanges a MA=='])
    assert.deepEqual(added(transactions), [['a', '12']])
  })

  it('tries the next GraphQL node when one fails', async function () {
    const { engine, transactions } = await makeFakeSui({
      graphql: {
        [GRAPHQL_URL]: () => {
          throw new Error('Network request failed')
        },
        [GRAPHQL_URL_2]: pagedHistory(['a'])
      }
    })

    await engine.queryTransactions()

    assert.deepEqual(added(transactions), [['a', '5']])
  })

  it('lets a running pass finish before the engine stops', async function () {
    let release: () => void = () => {}
    const held = new Promise<void>(resolve => {
      release = resolve
    })
    const { engine, requests } = await makeFakeSui({
      graphql: {
        [GRAPHQL_URL]: async body => {
          await held
          return pagedHistory(['a'])(body)
        }
      }
    })

    const running = engine.queryTransactions()
    const queued = engine.queryTransactions()
    let killed = false
    const killing = engine.killEngine().then(() => {
      killed = true
    })
    await new Promise(resolve => setTimeout(resolve, 10))
    assert.equal(killed, false)

    release()
    await Promise.all([running, queued, killing])

    // The running pass saved its cursor; the queued one never ran:
    assert.deepEqual(requests, ['history null'])
    assert.equal(engine.otherData.txCursor, 'c1')
  })
})
