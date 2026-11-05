import { Ed25519PublicKey } from '@mysten/sui/keypairs/ed25519'
import { Transaction } from '@mysten/sui/transactions'
import { assert } from 'chai'
import {
  EdgeCurrencyEngineCallbacks,
  EdgeCurrencyEngineOptions,
  EdgeIo,
  EdgeTokenMap,
  EdgeTransaction,
  makeFakeIo
} from 'edge-core-js'
import { describe, it } from 'mocha'
import { base64 } from 'rfc4648'

import { PluginEnvironment } from '../../src/common/innerPlugin'
import { SuiEngine } from '../../src/sui/SuiEngine'
import {
  BALANCES_QUERY,
  COINS_QUERY,
  OBJECTS_QUERY,
  REFERENCE_GAS_PRICE_QUERY,
  SIMULATE_QUERY
} from '../../src/sui/suiGraphql'
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
  variables: {
    owner?: string
    digest?: string
    after?: string | null
    type?: string
    keys?: Array<{ address: string }>
  }
}

/**
 * How `graphql.mainnet.sui.io` rejected cursors it could not decode on
 * 2026-11-10: one that is not base64, one in another encoding, and a
 * truncated one.
 */
const CURSOR_REJECTIONS = [
  'Failed to parse "String": Invalid Base64',
  'Failed to parse "String": Invalid encoding: failed to decode Protobuf message: buffer underflow',
  'Invalid cursor'
]

const rejectCursor = (message: string): unknown => ({
  data: null,
  errors: [{ message }]
})

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
    if (index > digests.length) return rejectCursor(CURSOR_REJECTIONS[0])
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

  /** Tokens the plugin knows, all of them enabled. */
  tokens?: EdgeTokenMap
}): Promise<FakeSui> {
  const { graphql, tokens = {} } = opts
  const requests: string[] = []
  const transactions: EdgeTransaction[] = []

  const fetch = async (
    uri: string,
    init?: { body?: unknown }
  ): Promise<unknown> => {
    const handler = graphql[uri]
    if (handler == null) throw new Error(`Unexpected request to ${uri}`)
    const body = JSON.parse(String(init?.body)) as GraphqlBody
    requests.push(describeRequest(body))
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
    builtinTokens: tokens,
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
    enabledTokenIds: Object.keys(tokens),
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

/** Names a request by its query, with the cursor it asked for. */
const describeRequest = (body: GraphqlBody): string => {
  const { after, digest, type } = body.variables
  switch (body.query) {
    case BALANCES_QUERY:
      return `balances ${String(after)}`
    case COINS_QUERY:
      return `coins ${String(
        type?.includes('::sui::SUI') === true ? 'SUI' : 'USDC'
      )} ${String(after)}`
    case OBJECTS_QUERY:
      return 'objects'
    case REFERENCE_GAS_PRICE_QUERY:
      return 'gasPrice'
    case SIMULATE_QUERY:
      return 'simulate'
  }
  return digest != null
    ? `balanceChanges ${digest} ${String(after)}`
    : `history ${String(after)}`
}

/** The transactions a sweep reported, as `[txid, nativeAmount]`. */
const added = (transactions: EdgeTransaction[]): string[][] =>
  transactions.map(tx => [tx.txid, tx.nativeAmount])

describe('SuiEngine balances and sends', function () {
  const SUI =
    '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI'
  const USDC =
    '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC'
  const USDC_ID =
    '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7usdcUSDC'
  const TOKENS: EdgeTokenMap = {
    [USDC_ID]: {
      currencyCode: 'USDC',
      denominations: [{ multiplier: '1000000', name: 'USDC' }],
      displayName: 'USD Coin',
      networkLocation: { contractAddress: USDC }
    }
  }
  const DIGEST = '2WbsXjQJuKV2xc3du8GXwhCzch9gppCe89rb65c3nqZm'
  const GAS_COIN =
    '0x1111111111111111111111111111111111111111111111111111111111111111'

  /** The id of the `n`th USDC coin, from 1. */
  const usdcCoin = (n: number): string =>
    `0x${n.toString(16).padStart(2, '0').repeat(32)}`

  const GAS_SUMMARY = {
    computationCost: 750000,
    storageCost: 1976000,
    storageRebate: 978120,
    nonRefundableStorageFee: 9880
  }

  /** One page of the balances query. */
  const balancePage = (
    balances: Array<[coinType: string, total: string]>,
    endCursor: string | null
  ): unknown => ({
    data: {
      address: {
        balances: {
          pageInfo: { hasNextPage: endCursor != null, endCursor },
          nodes: balances.map(([repr, totalBalance]) => ({
            coinType: { repr },
            totalBalance
          }))
        }
      }
    }
  })

  /** One page of the coins query. */
  const coinPage = (
    coins: Array<[id: string, balance: string]>,
    endCursor: string | null
  ): unknown => ({
    data: {
      address: {
        objects: {
          pageInfo: { hasNextPage: endCursor != null, endCursor },
          nodes: coins.map(([address, balance]) => ({
            address,
            version: 12,
            digest: DIGEST,
            contents: { json: { balance } }
          }))
        }
      }
    }
  })

  /**
   * A node holding 9 SUI in one coin and 2 USDC, with the USDC coins spread
   * over `usdcPages` (one balance per coin, cursors 'k1', 'k2', ...). Each
   * simulation answers with `simulate`.
   */
  const sendNode =
    (
      opts: {
        usdcPages?: string[][]
        simulate?: () => unknown
      } = {}
    ) =>
    (body: GraphqlBody): unknown => {
      const { usdcPages = [['2000000']], simulate } = opts
      const { after, keys = [], type = '' } = body.variables
      switch (body.query) {
        case BALANCES_QUERY:
          return balancePage(
            [
              [SUI, '9000000000'],
              [USDC, '2000000']
            ],
            null
          )
        case REFERENCE_GAS_PRICE_QUERY:
          return { data: { epoch: { referenceGasPrice: '750' } } }
        case COINS_QUERY: {
          if (type.includes('::sui::SUI')) {
            return coinPage([[GAS_COIN, '9000000000']], null)
          }
          const index = after == null ? 0 : Number(after.slice(1))
          let n = 1
          for (let i = 0; i < index; ++i) n += usdcPages[i].length
          return coinPage(
            usdcPages[index].map((balance, i) => [usdcCoin(n + i), balance]),
            index + 1 < usdcPages.length ? `k${index + 1}` : null
          )
        }
        case OBJECTS_QUERY:
          return {
            data: {
              multiGetObjects: keys.map(({ address }) => ({
                address,
                version: 12,
                digest: DIGEST,
                owner: {
                  __typename: 'AddressOwner',
                  address: { address: ADDRESS }
                }
              }))
            }
          }
        case SIMULATE_QUERY:
          return (
            simulate?.() ?? {
              data: {
                simulateTransaction: {
                  effects: {
                    status: 'SUCCESS',
                    executionError: null,
                    gasEffects: { gasSummary: GAS_SUMMARY }
                  }
                }
              }
            }
          )
      }
      throw new Error(`Unexpected query: ${body.query}`)
    }

  /** A wallet holding USDC, with its balances loaded. */
  const makeSendSui = async (
    handler: (body: GraphqlBody) => unknown
  ): Promise<FakeSui> => {
    const fake = await makeFakeSui({
      graphql: { [GRAPHQL_URL]: handler },
      tokens: TOKENS
    })
    await fake.engine.queryBalance()
    fake.requests.length = 0
    return fake
  }

  /** The coin objects a built transaction spends, other than gas. */
  const spentCoins = (tx: EdgeTransaction): string[] => {
    const { unsignedBase64 } = tx.otherParams as { unsignedBase64: string }
    return Transaction.from(base64.parse(unsignedBase64))
      .getData()
      .inputs.map(input => input.Object?.ImmOrOwnedObject?.objectId)
      .filter((id): id is string => id != null)
      .sort((a, b) => a.localeCompare(b))
  }

  /** Settles `promise` to the error it rejects with, if any. */
  const rejectionOf = async (promise: Promise<unknown>): Promise<unknown> =>
    await promise.then(
      () => undefined,
      (error: unknown) => error
    )

  it('reads every page of balances', async function () {
    const { engine, requests } = await makeFakeSui({
      graphql: {
        [GRAPHQL_URL]: body =>
          body.variables.after == null
            ? balancePage([[SUI, '9000000000']], 'b1')
            : balancePage([[USDC, '2000000']], null)
      },
      tokens: TOKENS
    })

    await engine.queryBalance()

    assert.deepEqual(requests, ['balances null', 'balances b1'])
    assert.equal(engine.getBalance({ tokenId: null }), '9000000000')
    assert.equal(engine.getBalance({ tokenId: USDC_ID }), '2000000')
  })

  it('stops reading balances when the cursor does not move', async function () {
    const { engine, requests } = await makeFakeSui({
      graphql: { [GRAPHQL_URL]: () => balancePage([[SUI, '9000000000']], 'b1') }
    })

    await engine.queryBalance()

    assert.deepEqual(requests, ['balances null', 'balances b1'])
  })

  it('takes balances from another node when one reports more SUI than exists', async function () {
    const { engine } = await makeFakeSui({
      graphql: {
        [GRAPHQL_URL]: () => balancePage([[SUI, '10000000000000000001']], null),
        [GRAPHQL_URL_2]: () => balancePage([[SUI, '9000000000']], null)
      }
    })

    await engine.queryBalance()

    assert.equal(engine.getBalance({ tokenId: null }), '9000000000')
  })

  it('gathers token coins from more than one page', async function () {
    const { engine, requests } = await makeSendSui(
      sendNode({ usdcPages: [['600000'], ['600000']] })
    )

    const tx = await engine.makeSpend({
      tokenId: USDC_ID,
      spendTargets: [{ nativeAmount: '1000000', publicAddress: OTHER }]
    })

    assert.includeOrderedMembers(requests, ['coins USDC null', 'coins USDC k1'])
    assert.deepEqual(spentCoins(tx), [usdcCoin(1), usdcCoin(2)])
    assert.equal(tx.nativeAmount, '-1000000')
    assert.equal(tx.networkFee, '0')
    assert.equal(tx.parentNetworkFee, String(750000 + 1976000 - 978120))
  })

  it('refuses a token send when the coins run out', async function () {
    const { engine, requests } = await makeSendSui(
      // The balance says 2 USDC, but the node only finds 0.6:
      sendNode({ usdcPages: [['300000'], ['300000']] })
    )

    const error = await rejectionOf(
      engine.makeSpend({
        tokenId: USDC_ID,
        spendTargets: [{ nativeAmount: '1000000', publicAddress: OTHER }]
      })
    )

    assert.equal((error as Error | undefined)?.name, 'InsufficientFundsError')
    assert.equal((error as { tokenId?: string }).tokenId, USDC_ID)
    assert.deepEqual(requests, ['coins USDC null', 'coins USDC k1'])
  })

  it('stops gathering token coins when the cursor does not move', async function () {
    const node = sendNode()
    const { engine, requests } = await makeSendSui(body =>
      body.query === COINS_QUERY &&
      !String(body.variables.type).includes('::sui::SUI')
        ? coinPage([[usdcCoin(1), '300000']], 'k1')
        : node(body)
    )

    const error = await rejectionOf(
      engine.makeSpend({
        tokenId: USDC_ID,
        spendTargets: [{ nativeAmount: '1000000', publicAddress: OTHER }]
      })
    )

    assert.match(String(error), /repeated the coin cursor k1/)
    assert.deepEqual(requests, ['coins USDC null', 'coins USDC k1'])
  })

  it('refuses a send the simulation says would fail', async function () {
    const { engine, requests } = await makeSendSui(
      sendNode({
        usdcPages: [['1000000']],
        simulate: () => ({
          data: {
            simulateTransaction: {
              effects: {
                status: 'FAILURE',
                executionError: { message: 'InsufficientCoinBalance' },
                gasEffects: { gasSummary: GAS_SUMMARY }
              }
            }
          }
        })
      })
    )

    const error = await rejectionOf(
      engine.makeSpend({
        tokenId: USDC_ID,
        spendTargets: [{ nativeAmount: '1000000', publicAddress: OTHER }]
      })
    )

    assert.match(
      String(error),
      /Sui transaction would fail: InsufficientCoinBalance/
    )
    assert.include(requests, 'simulate')
  })

  it('builds a send whose storage rebate beats its gas', async function () {
    const gasSummary = {
      computationCost: 1000,
      storageCost: 0,
      storageRebate: 48000,
      nonRefundableStorageFee: 480
    }
    const { engine } = await makeSendSui(
      sendNode({
        simulate: () => ({
          data: {
            simulateTransaction: {
              effects: {
                status: 'SUCCESS',
                executionError: null,
                gasEffects: { gasSummary }
              }
            }
          }
        })
      })
    )

    const tx = await engine.makeSpend({
      tokenId: null,
      spendTargets: [{ nativeAmount: '1000', publicAddress: OTHER }]
    })

    // The wallet ends up 47000 - 1000 richer, so the amount is positive:
    assert.equal(tx.networkFee, '-47000')
    assert.equal(tx.nativeAmount, '46000')
  })
})

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

  for (const message of CURSOR_REJECTIONS) {
    it(`reads the whole history again once on "${message}"`, async function () {
      const { engine, requests, transactions } = await makeFakeSui({
        graphql: {
          [GRAPHQL_URL]: body =>
            body.variables.after === 'c9'
              ? rejectCursor(message)
              : pagedHistory(['a'])(body)
        }
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
  }

  it('keeps a rejection that is not about the cursor', async function () {
    const { engine, requests, historyRatios } = await makeFakeSui({
      graphql: {
        [GRAPHQL_URL]: () => rejectCursor('Request timed out')
      }
    })
    engine.otherData.txCursor = 'c9'

    await engine.queryTransactions()

    assert.deepEqual(requests, ['history c9'])
    assert.equal(engine.otherData.txCursor, 'c9')
    assert.deepEqual(historyRatios, [])
  })

  it('stops after one restart if the service keeps rejecting cursors', async function () {
    const { engine, requests, historyRatios } = await makeFakeSui({
      graphql: {
        [GRAPHQL_URL]: body =>
          body.variables.after == null
            ? makePage([makeGraphqlTx('a')], true, 'c1')
            : rejectCursor(CURSOR_REJECTIONS[0])
      }
    })
    engine.otherData.txCursor = 'c9'

    await engine.queryTransactions()

    assert.deepEqual(requests, ['history c9', 'history null', 'history c1'])
    assert.equal(engine.otherData.txCursor, 'c1')
    assert.deepEqual(historyRatios, [])
  })

  it('stops when a page hands back the cursor it was sent', async function () {
    const { engine, requests, historyRatios } = await makeFakeSui({
      graphql: {
        [GRAPHQL_URL]: () => makePage([makeGraphqlTx('a')], true, 'c1')
      }
    })

    await engine.queryTransactions()

    assert.deepEqual(requests, ['history null', 'history c1'])
    assert.equal(engine.otherData.txCursor, 'c1')
    assert.deepEqual(historyRatios, [])
  })

  it('stops at the next page once the engine is killed', async function () {
    const fake = await makeFakeSui({
      graphql: {
        [GRAPHQL_URL]: body => {
          // The engine stops while this page is in flight:
          fake.engine.engineOn = false
          return pagedHistory(['a', 'b', 'c'])(body)
        }
      }
    })
    const { engine, requests, historyRatios, transactions } = fake

    await engine.queryTransactions()

    assert.deepEqual(requests, ['history null'])
    assert.deepEqual(added(transactions), [['a', '5']])
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

  it('stops reading balance changes when the cursor does not move', async function () {
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
                      balanceChanges: makeGraphqlBalanceChanges(['7'], true)
                    }
                  }
                }
              }
      }
    })

    // The sweep logs the error, so the proof is that the walk stopped:
    await engine.queryTransactions()

    assert.deepEqual(requests, ['history null', 'balanceChanges a MA=='])
    assert.deepEqual(added(transactions), [])
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
