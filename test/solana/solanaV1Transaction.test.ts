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

interface JsonRpcRequest {
  id: number
  method: string
  params: [string, { maxSupportedTransactionVersion?: number } | undefined]
}

/**
 * A `Connection` whose transport answers from the fixture instead of the
 * network, so the real web3.js deserialization runs over a real v1 response.
 * The stub enforces `maxSupportedTransactionVersion` the way the RPC does: ask
 * for less than version 1 and the v1 transaction comes back as error -32015.
 */
const makeStubConnection = (): Connection => {
  const answer = (request: JsonRpcRequest): unknown => {
    if (request.method !== 'getTransaction') {
      throw new Error(`Unexpected RPC method ${request.method}`)
    }
    const [signature, config] = request.params
    const maxVersion = config?.maxSupportedTransactionVersion ?? 0

    if (signature === UNSERVABLE_SIGNATURE) {
      return {
        jsonrpc: '2.0',
        id: request.id,
        error: versionUnsupportedError(maxVersion + 1)
      }
    }
    if (signature === V1_SIGNATURE) {
      return maxVersion >= 1
        ? { jsonrpc: '2.0', id: request.id, result: v1TransactionFixture }
        : { jsonrpc: '2.0', id: request.id, error: versionUnsupportedError(1) }
    }
    return { jsonrpc: '2.0', id: request.id, result: null }
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
    networkInfo: { commitment: 'confirmed' },
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

const fetchChunk = async (
  engine: any,
  signatures: string[]
): Promise<{ transactions: any[]; unavailable: Set<string> }> => {
  return await SolanaEngine.prototype.fetchTransactionChunk.call(
    engine,
    signatures
  )
}

const processOne = (engine: any, tx: any): EdgeTransaction[] => {
  const amounts = SolanaEngine.prototype.parseTxAmounts.call(
    engine,
    tx,
    new PublicKey(engine.base58PublicKey)
  )
  amounts.forEach((amount: any) => {
    SolanaEngine.prototype.processSolanaTransaction.call(
      engine,
      tx,
      amount,
      v1TransactionFixture.blockTime,
      []
    )
  })
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

    const captured = processOne(engine, transactions[0])
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

    const captured = processOne(engine, transactions[0])
    assert.equal(captured.length, 1)
    const edgeTx = captured[0]
    assert.equal(edgeTx.isSend, false)
    assert.deepEqual(edgeTx.ourReceiveAddresses, [RECIPIENT])
    // The balance delta is 1437640 - 0, credited whole because the sender paid.
    assert.equal(edgeTx.nativeAmount, '1437640')
    assert.equal(edgeTx.txid, V1_SIGNATURE)
  })

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

  it('reports a signature no node would answer as unavailable', async function () {
    const engine = makeFakeEngine(makeStubConnection(), FEE_PAYER)
    const { unavailable } = await fetchChunk(engine, [
      UNSERVABLE_SIGNATURE,
      V1_SIGNATURE
    ])

    // The history loop stops advancing its watermark past an unavailable
    // signature, so this row is asked for again on the next sync instead of
    // being skipped forever.
    assert.deepEqual([...unavailable], [UNSERVABLE_SIGNATURE])
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
    // A null result is the node answering, not an outage, so the watermark is
    // free to move past it.
    assert.equal(unavailable.size, 0)
  })
})
