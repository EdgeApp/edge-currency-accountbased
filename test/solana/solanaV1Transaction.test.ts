import { Connection, PublicKey } from '@solana/web3.js'
import { assert } from 'chai'
import { EdgeTokenId, EdgeTransaction } from 'edge-core-js/types'
import { describe, it } from 'mocha'

import { SolanaEngine } from '../../src/solana/SolanaEngine'
import v1TransactionFixture from './fixtures/solanaV1Transaction.json'

// A real Agave 4.2 version 1 transaction, captured from devnet slot 495733175
// where v1 is already live. Account 0 is the fee payer and sends; account 1
// receives.
const V1_SIGNATURE = v1TransactionFixture.transaction.signatures[0]
const FEE_PAYER = v1TransactionFixture.transaction.message.accountKeys[0]
const RECIPIENT = v1TransactionFixture.transaction.message.accountKeys[1]

// Stands in for a transaction newer than anything this client can declare, so
// no version bump makes the node serve it.
const UNSERVABLE_SIGNATURE = '2'.repeat(87)
// Every node reports itself unhealthy for this one: an outage, not an answer.
const FLAKY_SIGNATURE = '3'.repeat(87)
// A signature no archive node holds. The RPC answers a null result, not an
// error.
const MISSING_SIGNATURE = '1'.repeat(87)

const versionUnsupportedError = (version: number): unknown => ({
  code: -32015,
  message:
    `Transaction version (${version}) is not supported by the requesting ` +
    'client. Please try the request again with the following configuration ' +
    `parameter: "maxSupportedTransactionVersion": ${version}`
})

const nodeUnhealthyError = { code: -32005, message: 'Node is unhealthy' }

interface JsonRpcRequest {
  id: number
  method: string
  params: [string, { maxSupportedTransactionVersion?: number } | undefined]
}

interface StubOptions {
  /** Signatures `getSignaturesForAddress` returns, newest first. */
  history?: string[]
}

/**
 * A `Connection` whose transport answers from the fixture instead of the
 * network, so the real web3.js deserialization runs over a real v1 response.
 * The stub enforces `maxSupportedTransactionVersion` the way the RPC does: ask
 * for less than version 1 and the v1 transaction comes back as error -32015.
 */
const makeStubConnection = (options: StubOptions = {}): Connection => {
  const { history = [] } = options

  const answer = (request: JsonRpcRequest): unknown => {
    const reply = (payload: object): unknown => ({
      jsonrpc: '2.0',
      id: request.id,
      ...payload
    })

    if (request.method === 'getSignaturesForAddress') {
      return reply({
        result: history.map(signature => ({
          signature,
          slot: v1TransactionFixture.slot,
          err: null,
          memo: null,
          blockTime: v1TransactionFixture.blockTime
        }))
      })
    }
    if (request.method !== 'getTransaction') {
      throw new Error(`Unexpected RPC method ${request.method}`)
    }

    const [signature, config] = request.params
    const maxVersion = config?.maxSupportedTransactionVersion ?? 0
    if (signature === UNSERVABLE_SIGNATURE) {
      return reply({ error: versionUnsupportedError(maxVersion + 1) })
    }
    if (signature === FLAKY_SIGNATURE) {
      return reply({ error: nodeUnhealthyError })
    }
    if (signature === V1_SIGNATURE) {
      return maxVersion >= 1
        ? reply({ result: v1TransactionFixture })
        : reply({ error: versionUnsupportedError(1) })
    }
    return reply({ result: null })
  }

  const stubFetch = async (_url: unknown, init: unknown): Promise<Response> => {
    const body = JSON.parse((init as { body: string }).body)
    const payload = Array.isArray(body) ? body.map(answer) : answer(body)
    return new Response(JSON.stringify(payload), {
      headers: { 'content-type': 'application/json' }
    })
  }

  return new Connection('http://localhost/stub', {
    commitment: 'confirmed',
    fetch: stubFetch as never
  })
}

const makeFakeEngine = (connection: Connection, owner: string): any => {
  const captured: EdgeTransaction[] = []
  return {
    allTokensMap: {},
    base58PublicKey: owner,
    captured,
    networkInfo: { commitment: 'confirmed', txQueryLimit: 1000 },
    tools: {
      archiveConnections: [connection],
      tokenProgramPublicKey: new PublicKey(
        'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
      ),
      token2022ProgramPublicKey: new PublicKey(
        'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'
      )
    },
    walletId: 'test-wallet',
    getCurrencyCode: (tokenId: EdgeTokenId) => (tokenId == null ? 'SOL' : null),
    addTransaction: (_tokenId: unknown, tx: EdgeTransaction) =>
      captured.push(tx),
    error: () => undefined
  }
}

/**
 * Everything `queryTransactionsInner` reaches through `this`, for a wallet that
 * has never synced: an empty watermark, so the pass starts from the oldest
 * signature.
 */
const makeHistoryEngine = (connection: Connection): any =>
  Object.assign(makeFakeEngine(connection, RECIPIENT), {
    otherData: { newestTxid: { '': '' } },
    progressRatio: 0,
    syncTracker: { updateHistoryRatio: () => undefined },
    walletLocalDataDirty: false,
    sendTransactionEvents: () => undefined,
    fetchTransactionChunk: SolanaEngine.prototype.fetchTransactionChunk,
    parseTxAmounts: SolanaEngine.prototype.parseTxAmounts,
    makeSolanaTransaction: SolanaEngine.prototype.makeSolanaTransaction
  })

const syncHistory = async (engine: any): Promise<void> => {
  await SolanaEngine.prototype.queryTransactionsInner.call(
    engine,
    null,
    new PublicKey(RECIPIENT)
  )
}

const fetchChunk = async (
  engine: any,
  signatures: string[]
): Promise<{ transactions: any[]; unavailable: Set<string> }> => {
  return await SolanaEngine.prototype.fetchTransactionChunk.call(
    engine,
    signatures
  )
}

const recordOne = (engine: any, tx: any): EdgeTransaction[] => {
  const amounts = SolanaEngine.prototype.parseTxAmounts.call(
    engine,
    tx,
    new PublicKey(engine.base58PublicKey)
  )
  for (const amount of amounts) {
    const edgeTransaction = SolanaEngine.prototype.makeSolanaTransaction.call(
      engine,
      tx,
      amount,
      v1TransactionFixture.blockTime,
      []
    )
    if (edgeTransaction != null) engine.captured.push(edgeTransaction)
  }
  return engine.captured
}

describe('Solana version 1 transactions', function () {
  it('deserializes a v1 transaction the RPC returns', async function () {
    const engine = makeFakeEngine(makeStubConnection(), FEE_PAYER)
    const { transactions } = await fetchChunk(engine, [V1_SIGNATURE])
    const [tx] = transactions

    assert.isNotNull(tx)
    assert.equal(tx.version, 1)
    assert.equal(tx.slot, 495733175)
    // `parseTxAmounts` looks the wallet up in `staticAccountKeys`, which a v1
    // message must keep exposing.
    assert.equal(
      tx.transaction.message.staticAccountKeys.length,
      v1TransactionFixture.transaction.message.accountKeys.length
    )
    assert.equal(
      tx.transaction.message.staticAccountKeys[0].toBase58(),
      FEE_PAYER
    )
  })

  it('records the send side with amount, fee and direction', async function () {
    const engine = makeFakeEngine(makeStubConnection(), FEE_PAYER)
    const { transactions } = await fetchChunk(engine, [V1_SIGNATURE])

    const captured = recordOne(engine, transactions[0])
    assert.equal(captured.length, 1)
    const edgeTx = captured[0]
    assert.equal(edgeTx.currencyCode, 'SOL')
    assert.equal(edgeTx.isSend, true)
    assert.deepEqual(edgeTx.ourReceiveAddresses, [])
    // The balance delta is 75889606355 - 75891049735 = -1443380, less the 5740
    // fee the engine subtracts for a send.
    assert.equal(edgeTx.nativeAmount, '-1449120')
    assert.equal(edgeTx.networkFee, '5740')
    assert.equal(edgeTx.blockHeight, 495733175)
    assert.equal(edgeTx.txid, V1_SIGNATURE)
  })

  it('records the receive side with amount and direction', async function () {
    const engine = makeFakeEngine(makeStubConnection(), RECIPIENT)
    const { transactions } = await fetchChunk(engine, [V1_SIGNATURE])

    const captured = recordOne(engine, transactions[0])
    assert.equal(captured.length, 1)
    const edgeTx = captured[0]
    assert.equal(edgeTx.isSend, false)
    assert.deepEqual(edgeTx.ourReceiveAddresses, [RECIPIENT])
    // The balance delta is 1437640 - 0, credited whole because the sender paid.
    assert.equal(edgeTx.nativeAmount, '1437640')
    assert.equal(edgeTx.txid, V1_SIGNATURE)
  })
})

describe('Solana transaction chunk fetch', function () {
  it('keeps the good rows when one signature poisons the batch', async function () {
    const engine = makeFakeEngine(makeStubConnection(), FEE_PAYER)

    // `getTransactions` throws on the first error in the batch and discards
    // every good result with it, so without the per-signature retry this whole
    // chunk would come back empty and the wallet's history would stall here.
    const { transactions } = await fetchChunk(engine, [
      UNSERVABLE_SIGNATURE,
      V1_SIGNATURE
    ])

    assert.equal(transactions.length, 2)
    assert.isNull(transactions[0])
    assert.equal(transactions[1].transaction.signatures[0], V1_SIGNATURE)
  })

  it('reports a node outage as unavailable', async function () {
    const engine = makeFakeEngine(makeStubConnection(), FEE_PAYER)
    const { unavailable } = await fetchChunk(engine, [
      FLAKY_SIGNATURE,
      V1_SIGNATURE
    ])

    assert.deepEqual([...unavailable], [FLAKY_SIGNATURE])
  })

  it('does not report an unsupported transaction version as unavailable', async function () {
    const engine = makeFakeEngine(makeStubConnection(), FEE_PAYER)
    const { transactions, unavailable } = await fetchChunk(engine, [
      UNSERVABLE_SIGNATURE,
      V1_SIGNATURE
    ])

    // Every node answers -32015 the same way on every sync, so freezing the
    // watermark for it would stall the wallet until the client learns the
    // next version.
    assert.isNull(transactions[0])
    assert.equal(unavailable.size, 0)
  })

  it('returns null for a signature no node holds, without calling it unavailable', async function () {
    const engine = makeFakeEngine(makeStubConnection(), FEE_PAYER)
    const { transactions, unavailable } = await fetchChunk(engine, [
      MISSING_SIGNATURE,
      V1_SIGNATURE
    ])

    assert.equal(transactions.length, 2)
    assert.isNull(transactions[0])
    assert.equal(transactions[1].transaction.signatures[0], V1_SIGNATURE)
    assert.equal(unavailable.size, 0)
  })
})

describe('Solana history watermark', function () {
  it('advances past a clean chunk', async function () {
    const engine = makeHistoryEngine(
      makeStubConnection({ history: [V1_SIGNATURE] })
    )
    await syncHistory(engine)

    assert.equal(engine.otherData.newestTxid[''], V1_SIGNATURE)
    assert.equal(engine.captured.length, 1)
  })

  it('holds still behind a node outage, while still showing the rows after it', async function () {
    // Newest first, so the pass meets the outage before the good row.
    const engine = makeHistoryEngine(
      makeStubConnection({ history: [V1_SIGNATURE, FLAKY_SIGNATURE] })
    )
    await syncHistory(engine)

    // The next sync asks again from the start rather than skipping the row the
    // outage hid.
    assert.equal(engine.otherData.newestTxid[''], '')
    assert.equal(engine.captured.length, 1)
    assert.equal(engine.captured[0].txid, V1_SIGNATURE)
  })

  it('moves past an unsupported transaction version', async function () {
    const engine = makeHistoryEngine(
      makeStubConnection({ history: [V1_SIGNATURE, UNSERVABLE_SIGNATURE] })
    )
    await syncHistory(engine)

    assert.equal(engine.otherData.newestTxid[''], V1_SIGNATURE)
    assert.equal(engine.captured.length, 1)
  })

  it('records nothing from a transaction that fails part way through', async function () {
    const engine = makeHistoryEngine(
      makeStubConnection({ history: [V1_SIGNATURE] })
    )
    // A SOL amount that builds, then a second amount that throws.
    engine.parseTxAmounts = () => [
      { amount: '1437640', networkFee: '5740' },
      { amount: '1', networkFee: '0', tokenId: 'unbuildable' }
    ]
    const makeSolanaTransaction = engine.makeSolanaTransaction
    engine.makeSolanaTransaction = function (
      this: any,
      tx: any,
      amounts: any,
      timestamp: number,
      memos: string[]
    ) {
      if (amounts.tokenId === 'unbuildable') throw new Error('cannot build')
      return makeSolanaTransaction.call(this, tx, amounts, timestamp, memos)
    }
    await syncHistory(engine)

    assert.equal(engine.captured.length, 0)
    // A transaction we cannot interpret fails the same way on every sync, so
    // the watermark still moves past it.
    assert.equal(engine.otherData.newestTxid[''], V1_SIGNATURE)
  })
})
