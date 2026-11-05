import {
  Account,
  Asset,
  Horizon,
  Keypair,
  Networks,
  NotFoundError,
  Operation,
  TimeoutInfinite,
  TransactionBuilder,
  TransactionFailedError
} from '@stellar/stellar-sdk'
import { assert } from 'chai'
import { makeFakeIo } from 'edge-core-js'
import {
  EdgeFetchFunction,
  EdgeFetchOptions,
  EdgeFetchResponse
} from 'edge-core-js/types'
import { describe, it } from 'mocha'

import { makeEdgeFetchAdapter } from '../../src/stellar/stellarHttp'
import { stellar } from '../../src/stellar/stellarInfo'
import type { StellarTools } from '../../src/stellar/StellarTools'
import { fakeLog } from '../fake/fakeLog'

// A fixed test key (the raw seed is 32 bytes of 0x07), plus an address to pay:
const SECRET = 'SADQOBYHA4DQOBYHA4DQOBYHA4DQOBYHA4DQOBYHA4DQOBYHA4DQP54X'
const ADDRESS = 'GDVEU3DD4KOFECV66VIHWEZOYX4ZKR3WV27L464SIIPOU2IUI3JCZA57'
const RECIPIENT = 'GAJZR5RMNUNEK7CRXJVEWXZ5XUXWT7FJGILCDDOITF7EC26RPWJ4UVOE'
const SEQUENCE = '280502140848308224'

// The parts of a Horizon account record the SDK reads:
const ACCOUNT = {
  id: ADDRESS,
  account_id: ADDRESS,
  sequence: SEQUENCE,
  balances: [],
  data: {},
  _links: {
    data: {
      href: `https://horizon.stellar.org/accounts/${ADDRESS}/data/{key}`,
      templated: true
    }
  }
}

interface FakeRequest {
  uri: string
  opts: EdgeFetchOptions
}

type FakeRoute = (request: FakeRequest) => { status: number; body: unknown }

/** A stand-in for the core's fetch, which records each request. */
function makeFetch(route: FakeRoute): {
  fetch: EdgeFetchFunction
  requests: FakeRequest[]
} {
  const requests: FakeRequest[] = []
  const fetch: EdgeFetchFunction = async (uri, opts = {}) => {
    const request = { uri, opts }
    requests.push(request)
    const { status, body } = route(request)
    const text = JSON.stringify(body)
    const response: EdgeFetchResponse = {
      headers: {
        forEach(visit) {
          visit('application/hal+json', 'content-type')
        },
        get: () => null,
        has: () => false
      },
      ok: status >= 200 && status < 300,
      status,
      arrayBuffer: async () => new TextEncoder().encode(text).buffer,
      json: async () => JSON.parse(text),
      text: async () => text
    }
    return response
  }
  return { fetch, requests }
}

/** Builds the plugin's tools on a fake fetch and returns their Horizon client. */
async function makeHorizon(
  route: FakeRoute
): Promise<{ horizon: Horizon.Server; requests: FakeRequest[] }> {
  const { fetch, requests } = makeFetch(route)
  const io = { ...makeFakeIo(), fetch }
  const plugin = stellar({
    infoPayload: {},
    initOptions: {},
    io,
    log: fakeLog,
    nativeIo: {},
    pluginDisklet: io.disklet
  })
  const tools = (await plugin.makeCurrencyTools()) as StellarTools
  return { horizon: tools.stellarApiServers[0], requests }
}

async function rejection(promise: Promise<unknown>): Promise<any> {
  try {
    await promise
  } catch (error: unknown) {
    return error
  }
  throw new Error('Expected a rejection')
}

describe('Stellar Horizon fetch adapter', function () {
  it('sends Horizon requests through the core fetch', async function () {
    const { horizon, requests } = await makeHorizon(() => ({
      status: 200,
      body: ACCOUNT
    }))

    const account = await horizon.loadAccount(ADDRESS)
    assert.strictEqual(account.sequence, SEQUENCE)
    assert.deepEqual(
      requests.map(({ uri, opts }) => [uri, opts.method]),
      [[`https://horizon.stellar.org/accounts/${ADDRESS}`, 'GET']]
    )
    assert.strictEqual(
      requests[0].opts.headers?.['x-client-name'],
      'js-stellar-sdk'
    )
  })

  it('rejects a missing account with NotFoundError', async function () {
    const { horizon } = await makeHorizon(() => ({
      status: 404,
      body: { title: 'Resource Missing', status: 404 }
    }))

    const error = await rejection(horizon.loadAccount(ADDRESS))
    const { response } = error
    assert.instanceOf(error, NotFoundError)
    // The engine reads the body's title to spot accounts that aren't activated:
    assert.strictEqual(response.title, 'Resource Missing')
  })

  it('posts transactions and keeps the result codes', async function () {
    const { horizon, requests } = await makeHorizon(({ opts }) =>
      opts.method === 'POST'
        ? {
            status: 400,
            body: {
              title: 'Transaction Failed',
              status: 400,
              extras: { result_codes: { transaction: 'tx_bad_seq' } }
            }
          }
        : // The memo-required check loads the recipient first:
          { status: 200, body: ACCOUNT }
    )
    const transaction = new TransactionBuilder(new Account(ADDRESS, '1'), {
      fee: '100',
      networkPassphrase: Networks.PUBLIC
    })
      .addOperation(
        Operation.payment({
          destination: RECIPIENT,
          asset: Asset.native(),
          amount: '1'
        })
      )
      .setTimeout(TimeoutInfinite)
      .build()
    transaction.sign(Keypair.fromSecret(SECRET))

    const error = await rejection(horizon.submitTransaction(transaction))
    const { response } = error
    assert.instanceOf(error, TransactionFailedError)
    assert.strictEqual(
      response.data.extras.result_codes.transaction,
      'tx_bad_seq'
    )

    const post = requests.find(({ opts }) => opts.method === 'POST')
    assert.strictEqual(post?.uri, 'https://horizon.stellar.org/transactions')
    assert.match(String(post?.opts.body), /^tx=/)
    assert.strictEqual(
      post?.opts.headers?.['content-type'],
      'application/x-www-form-urlencoded'
    )
  })

  it('serializes query params', async function () {
    const { fetch, requests } = makeFetch(() => ({ status: 200, body: {} }))
    const adapter = makeEdgeFetchAdapter(fetch)

    await adapter({
      url: 'https://horizon.stellar.org/ledgers',
      params: { order: 'desc', limit: 1, cursor: undefined }
    })
    assert.deepEqual(
      requests.map(({ uri }) => uri),
      ['https://horizon.stellar.org/ledgers?order=desc&limit=1']
    )
  })

  it("applies the SDK's request timeout", async function () {
    const adapter = makeEdgeFetchAdapter(
      async () => await new Promise<EdgeFetchResponse>(() => {})
    )

    const error = await rejection(
      adapter({
        url: 'https://horizon.stellar.org/transactions',
        method: 'post',
        timeout: 10
      })
    )
    assert.strictEqual(error.message, 'timeout of 10ms exceeded')
  })
})
