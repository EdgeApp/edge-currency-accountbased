import { Ed25519PublicKey } from '@mysten/sui/keypairs/ed25519'
import { assert } from 'chai'
import {
  EdgeCurrencyEngineCallbacks,
  EdgeCurrencyEngineOptions,
  EdgeIo,
  makeFakeIo
} from 'edge-core-js'
import { describe, it } from 'mocha'

import { PluginEnvironment } from '../../src/common/innerPlugin'
import { SuiEngine } from '../../src/sui/SuiEngine'
import { currencyInfo } from '../../src/sui/suiInfo'
import { SuiTools } from '../../src/sui/SuiTools'
import type { SuiHistoryTx, SuiNetworkInfo } from '../../src/sui/suiTypes'
import { fakeLog } from '../fake/fakeLog'

const RPC_URL = 'https://rpc.test'
const GRAPHQL_URL = 'https://graphql.test'
const GRAPHQL_URL_2 = 'https://graphql2.test'

const PUBLIC_KEY = 'AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE='
const ADDRESS = new Ed25519PublicKey(PUBLIC_KEY).toSuiAddress()

/** What a node answers once it has pruned a transaction on the page. */
const PRUNED_ERROR = {
  code: -32000,
  message:
    'ErrorObject { code: InvalidParams, message: "unable to derive balance/object changes because effect is empty", data: None }'
}

interface RpcBody {
  id: number
  method: string
  params: [{ options?: object }, string | null]
}

interface GraphqlBody {
  query: string
  variables: { keys?: string[]; digest?: string; after?: string }
}

type RpcReply = { result: unknown } | { error: unknown }

/** A transaction as the node returns it while it still holds it. */
const makeRpcTx = (digest: string): SuiHistoryTx => ({
  digest,
  checkpoint: '100',
  timestampMs: '1700000000000',
  rawTransaction: 'AQAAAAAAAA==',
  effects: {
    gasUsed: {
      computationCost: '1000',
      storageCost: '2000',
      storageRebate: '500',
      nonRefundableStorageFee: '5'
    }
  },
  balanceChanges: [
    { owner: { AddressOwner: ADDRESS }, coinType: '0x2::sui::SUI', amount: '5' }
  ]
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

/** The same transaction as GraphQL returns it. */
const makeGraphqlTx = (
  digest: string,
  balanceChanges = makeGraphqlBalanceChanges(['5'], false)
): unknown => ({
  digest,
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
})

/** A GraphQL service that holds every transaction it is asked for. */
const graphqlHoldsAll = (body: GraphqlBody): unknown => ({
  data: {
    multiGetTransactions: (body.variables.keys ?? []).map(digest =>
      makeGraphqlTx(digest)
    )
  }
})

interface FakeSui {
  engine: SuiEngine

  /** Every request the engine sent, in order. */
  requests: string[]
}

/**
 * Builds a loaded `SuiEngine` and real `SuiTools` over a fake `fetch`, so the
 * sweep runs through the same client, throttle and cleaners as in the app.
 */
async function makeFakeSui(opts: {
  /** Answers a history query. `full` is false when only digests are asked. */
  rpc: (cursor: string | null, full: boolean) => RpcReply

  /** Answers GraphQL queries, by node. A throw is a network failure. */
  graphql?: { [url: string]: (body: GraphqlBody) => unknown }
}): Promise<FakeSui> {
  const { rpc, graphql = { [GRAPHQL_URL]: graphqlHoldsAll } } = opts
  const requests: string[] = []

  const answer = (uri: string, text: string): unknown => {
    if (uri === RPC_URL) {
      const body = JSON.parse(text) as RpcBody
      if (body.method !== 'suix_queryTransactionBlocks') {
        throw new Error(`Unexpected method ${body.method}`)
      }
      const [{ options }, cursor] = body.params
      const full = options != null && Object.keys(options).length > 0
      requests.push(`rpc ${full ? 'full' : 'digests'} ${String(cursor)}`)
      return { jsonrpc: '2.0', id: body.id, ...rpc(cursor, full) }
    }

    const handler = graphql[uri]
    if (handler == null) throw new Error(`Unexpected request to ${uri}`)
    const body = JSON.parse(text) as GraphqlBody
    const { after, digest, keys } = body.variables
    requests.push(
      keys != null
        ? `graphql ${keys.join(',')}`
        : `graphql balanceChanges ${String(digest)} ${String(after)}`
    )
    return handler(body)
  }

  const fetch = async (
    uri: string,
    init?: { body?: unknown }
  ): Promise<unknown> => {
    const json = answer(uri, String(init?.body))
    return { ok: true, status: 200, json: async () => json }
  }

  const io: EdgeIo = { ...makeFakeIo(), fetch: fetch as EdgeIo['fetch'] }

  const networkInfo: SuiNetworkInfo = {
    network: 'mainnet',
    pluginMnemonicKeyName: 'suiMnemonic',
    totalSupply: '10000000000000000000',
    rpcNodes: [RPC_URL],
    rpcNodesArchival: [RPC_URL],
    graphqlNodes: Object.keys(graphql),
    maxRequestsPerSecond: 1000
  }

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

  const engine = new SuiEngine(
    env,
    new SuiTools(env),
    { id: 'wallet-1', type: 'wallet:sui', keys: { publicKey: PUBLIC_KEY } },
    engineOptions
  )
  await engine.loadEngine()
  return { engine, requests }
}

/** The transactions a sweep added, as `[txid, nativeAmount]`. */
const added = (engine: SuiEngine): string[][] =>
  engine.transactionEvents.map(({ transaction }) => [
    transaction.txid,
    transaction.nativeAmount
  ])

const rejection = async (promise: Promise<unknown>): Promise<string> => {
  try {
    await promise
  } catch (error: unknown) {
    return String(error)
  }
  throw new Error('Expected a rejection')
}

describe('SuiEngine history sweep', function () {
  it('asks the node once when it holds every transaction', async function () {
    const { engine, requests } = await makeFakeSui({
      rpc: () => ({
        result: {
          data: [makeRpcTx('a'), makeRpcTx('b')],
          hasNextPage: false,
          nextCursor: 'b'
        }
      })
    })

    await engine.queryTransactionsInner('to')

    assert.deepEqual(requests, ['rpc full null'])
    assert.deepEqual(added(engine), [
      ['a', '5'],
      ['b', '5']
    ])
    assert.equal(engine.otherData.latestTxidTo, 'b')
  })

  it('loads a page from GraphQL once the node has pruned it', async function () {
    const { engine, requests } = await makeFakeSui({
      rpc: (cursor, full) =>
        full
          ? { error: PRUNED_ERROR }
          : {
              result: {
                data: [{ digest: 'a' }, { digest: 'b' }],
                hasNextPage: false,
                nextCursor: 'b'
              }
            }
    })

    await engine.queryTransactionsInner('to')

    assert.deepEqual(requests, [
      'rpc full null',
      'rpc digests null',
      'graphql a,b'
    ])
    assert.deepEqual(added(engine), [
      ['a', '5'],
      ['b', '5']
    ])
    assert.equal(engine.otherData.latestTxidTo, 'b')
  })

  it('stores the same transaction from either source', async function () {
    const fromNode = await makeFakeSui({
      rpc: () => ({
        result: { data: [makeRpcTx('a')], hasNextPage: false, nextCursor: 'a' }
      })
    })
    const fromGraphql = await makeFakeSui({
      rpc: (cursor, full) =>
        full
          ? { error: PRUNED_ERROR }
          : {
              result: {
                data: [{ digest: 'a' }],
                hasNextPage: false,
                nextCursor: 'a'
              }
            }
    })

    await fromNode.engine.queryTransactionsInner('from')
    await fromGraphql.engine.queryTransactionsInner('from')

    const [expected] = fromNode.engine.transactionEvents
    const [actual] = fromGraphql.engine.transactionEvents
    assert.deepEqual(actual.transaction, {
      ...expected.transaction,
      // The fake node's raw bytes are a placeholder, so only this differs:
      signedTx: actual.transaction.signedTx
    })
    assert.equal(actual.transaction.networkFee, '2500')
  })

  it('asks the node for full transactions again on the next page', async function () {
    const { engine, requests } = await makeFakeSui({
      rpc: (cursor, full) => {
        if (cursor === 'a') {
          return {
            result: {
              data: [makeRpcTx('b')],
              hasNextPage: false,
              nextCursor: 'b'
            }
          }
        }
        if (full) return { error: PRUNED_ERROR }
        return {
          result: {
            data: [{ digest: 'a' }],
            hasNextPage: true,
            nextCursor: 'a'
          }
        }
      }
    })

    await engine.queryTransactionsInner('to')

    assert.deepEqual(requests, [
      'rpc full null',
      'rpc digests null',
      'graphql a',
      'rpc full a'
    ])
    assert.deepEqual(
      added(engine).map(([txid]) => txid),
      ['a', 'b']
    )
    assert.equal(engine.otherData.latestTxidTo, 'b')
  })

  it('stops at a page GraphQL cannot load in full', async function () {
    const { engine } = await makeFakeSui({
      rpc: (cursor, full) => {
        if (cursor == null) {
          return {
            result: {
              data: [makeRpcTx('a')],
              hasNextPage: true,
              nextCursor: 'a'
            }
          }
        }
        if (full) return { error: PRUNED_ERROR }
        return {
          result: {
            data: [{ digest: 'b' }, { digest: 'c' }],
            hasNextPage: false,
            nextCursor: 'c'
          }
        }
      },
      graphql: {
        [GRAPHQL_URL]: () => ({
          data: { multiGetTransactions: [makeGraphqlTx('b'), null] }
        })
      }
    })

    const error = await rejection(engine.queryTransactionsInner('to'))

    assert.match(error, /no transaction c/)
    assert.deepEqual(
      added(engine).map(([txid]) => txid),
      ['a']
    )
    assert.equal(engine.otherData.latestTxidTo, 'a')
  })

  it('gathers balance changes past the first page', async function () {
    const { engine, requests } = await makeFakeSui({
      rpc: (cursor, full) =>
        full
          ? { error: PRUNED_ERROR }
          : {
              result: {
                data: [{ digest: 'a' }],
                hasNextPage: false,
                nextCursor: 'a'
              }
            },
      graphql: {
        [GRAPHQL_URL]: body =>
          body.variables.keys != null
            ? {
                data: {
                  multiGetTransactions: [
                    makeGraphqlTx('a', makeGraphqlBalanceChanges(['5'], true))
                  ]
                }
              }
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

    await engine.queryTransactionsInner('to')

    assert.deepEqual(requests.slice(2), [
      'graphql a',
      'graphql balanceChanges a MA=='
    ])
    assert.deepEqual(added(engine), [['a', '12']])
  })

  it('tries the next GraphQL node when one fails', async function () {
    const { engine } = await makeFakeSui({
      rpc: (cursor, full) =>
        full
          ? { error: PRUNED_ERROR }
          : {
              result: {
                data: [{ digest: 'a' }],
                hasNextPage: false,
                nextCursor: 'a'
              }
            },
      graphql: {
        [GRAPHQL_URL]: () => {
          throw new Error('Network request failed')
        },
        [GRAPHQL_URL_2]: graphqlHoldsAll
      }
    })

    await engine.queryTransactionsInner('to')

    assert.deepEqual(added(engine), [['a', '5']])
  })

  it('leaves other node errors alone', async function () {
    const { engine, requests } = await makeFakeSui({
      rpc: () => ({ error: { code: -32602, message: 'Invalid params' } })
    })

    const error = await rejection(engine.queryTransactionsInner('to'))

    assert.match(error, /Invalid params/)
    assert.deepEqual(requests, ['rpc full null'])
  })
})
