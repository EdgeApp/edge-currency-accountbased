import { Networks, StrKey, Transaction } from '@stellar/stellar-sdk'
import { assert } from 'chai'
import {
  EdgeCorePluginOptions,
  EdgeCurrencyEngineCallbacks,
  EdgeCurrencyEngineOptions,
  EdgeFetchFunction,
  makeFakeIo
} from 'edge-core-js'
import { describe, it } from 'mocha'

import { StellarEngine } from '../../src/stellar/StellarEngine'
import { stellar } from '../../src/stellar/stellarInfo'
import {
  asStellarWalletOtherData,
  StellarPaymentRecord
} from '../../src/stellar/stellarTypes'
import { expectRejection } from '../expectRejection'
import { fakeLog } from '../fake/fakeLog'

// A fixed test key (the raw seed is 32 bytes of 0x07), plus an address to pay:
const SECRET = 'SADQOBYHA4DQOBYHA4DQOBYHA4DQOBYHA4DQOBYHA4DQOBYHA4DQP54X'
const ADDRESS = 'GDVEU3DD4KOFECV66VIHWEZOYX4ZKR3WV27L464SIIPOU2IUI3JCZA57'
const RECIPIENT = 'GAJZR5RMNUNEK7CRXJVEWXZ5XUXWT7FJGILCDDOITF7EC26RPWJ4UVOE'
// The recipient's account with the routing ID 1234:
const MUXED_RECIPIENT =
  'MAJZR5RMNUNEK7CRXJVEWXZ5XUXWT7FJGILCDDOITF7EC26RPWJ4UAAAAAAAAAAE2IYHE'
const FUNDER = 'GD6ROJBYLKQMOW3E7N4M2YBPUHMZD7PL65VRHRMO24BOVSBV5H3BQRSL'

// Sequence numbers are int64 values, well past Number.MAX_SAFE_INTEGER:
const SEQUENCE = '280502140848308224'

type HorizonStub = (func: string, ...params: any[]) => Promise<any>

/** A payments record with just the fields the engine reads. */
const record = (fields: object): StellarPaymentRecord =>
  fields as StellarPaymentRecord

const horizon: HorizonStub = async func => {
  switch (func) {
    case 'loadAccount':
      return {
        id: ADDRESS,
        sequence: SEQUENCE,
        balances: [
          {
            asset_type: 'native',
            balance: '100.0000000',
            buying_liabilities: '0.0000000',
            selling_liabilities: '0.0000000'
          }
        ]
      }
    case 'submitTransaction':
      return { hash: 'ab'.repeat(32) }
  }
  throw new Error(`Unexpected Horizon call ${func}`)
}

/** An error shaped like the SDK's for a Horizon error response. */
const horizonError = (status: number, title: string): Error =>
  Object.assign(new Error(title), { response: { status, title } })

/**
 * Looks accounts up like Horizon, by G address only,
 * finding the given accounts and logging each lookup.
 */
const lookUpAccounts =
  (accounts: string[], lookups: string[] = []): HorizonStub =>
  async (func, ...params) => {
    if (func === 'loadAccount') {
      const [accountId] = params
      lookups.push(accountId)
      if (!StrKey.isValidEd25519PublicKey(accountId)) {
        throw horizonError(400, 'Bad Request')
      }
      if (!accounts.includes(accountId)) {
        throw horizonError(404, 'Resource Missing')
      }
    }
    return await horizon(func, ...params)
  }

/**
 * Makes an engine whose Horizon calls go to the stub,
 * or else through the plugin's Horizon client to the fake fetch.
 */
async function makeEngine(
  stub?: HorizonStub,
  fetch?: EdgeFetchFunction
): Promise<StellarEngine> {
  const fakeIo = makeFakeIo()
  const io = fetch == null ? fakeIo : { ...fakeIo, fetch }
  const pluginOptions: EdgeCorePluginOptions = {
    infoPayload: {},
    initOptions: {},
    io,
    log: fakeLog,
    nativeIo: {},
    pluginDisklet: io.disklet
  }
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
  const engine = (await stellar(pluginOptions).makeCurrencyEngine(
    {
      id: 'stellar-test',
      type: 'wallet:stellar',
      keys: { publicKey: ADDRESS }
    },
    engineOptions
  )) as unknown as StellarEngine
  if (stub != null) engine.multicastServers = stub
  return engine
}

describe('StellarEngine', function () {
  it('sends again before the next account poll', async function () {
    const submitted: Transaction[] = []
    const engine = await makeEngine(async (func, ...params) => {
      if (func === 'submitTransaction') submitted.push(params[0])
      return await horizon(func, ...params)
    })
    await engine.checkAccountInnerLoop()
    assert.strictEqual(engine.otherData.accountSequence, SEQUENCE)

    // Each broadcast bumps the cached sequence by exactly one:
    for (const expected of ['280502140848308225', '280502140848308226']) {
      const tx = await engine.makeSpend({
        tokenId: null,
        spendTargets: [{ publicAddress: RECIPIENT, nativeAmount: '10000000' }]
      })
      const signed = await engine.signTx(tx, { stellarKey: SECRET })
      await engine.broadcastTx(signed)
      assert.strictEqual(engine.otherData.accountSequence, expected)

      // The signed transaction travels in signedTx, and that's what goes out:
      const sent = submitted[submitted.length - 1]
      assert.strictEqual(sent.toXdr(), signed.signedTx)
      assert.strictEqual(sent.sequence, expected)
      assert.lengthOf(sent.signatures, 1)
    }
  })

  it('sends to a muxed (M) address through its account', async function () {
    const lookups: string[] = []
    const engine = await makeEngine(
      lookUpAccounts([ADDRESS, RECIPIENT], lookups)
    )
    await engine.checkAccountInnerLoop()

    // 0.1 XLM is under the minimum balance, so signing checks the recipient:
    const tx = await engine.makeSpend({
      tokenId: null,
      spendTargets: [
        { publicAddress: MUXED_RECIPIENT, nativeAmount: '1000000' }
      ]
    })
    const signed = await engine.signTx(tx, { stellarKey: SECRET })

    // The payment carries the M address, and only the G account was looked up:
    const { operations } = new Transaction(signed.signedTx, Networks.PUBLIC)
    assert.lengthOf(operations, 1)
    assert.deepInclude(operations[0], {
      type: 'payment',
      destination: MUXED_RECIPIENT,
      amount: '0.1000000'
    })
    assert.deepEqual(lookups, [ADDRESS, RECIPIENT, RECIPIENT])
  })

  it('sends to a muxed (M) address only once its account exists', async function () {
    const engine = await makeEngine(lookUpAccounts([ADDRESS]))
    await engine.checkAccountInnerLoop()

    // Creating an account takes its G address, so the M address can't:
    await expectRejection(
      engine.makeSpend({
        tokenId: null,
        spendTargets: [
          { publicAddress: MUXED_RECIPIENT, nativeAmount: '20000000' }
        ]
      }),
      'Error: Recipient address not activated. A muxed (M) address can only receive funds after its account is activated'
    )
  })

  it('looks a recipient up again after a failed lookup', async function () {
    const lookUp = lookUpAccounts([ADDRESS, RECIPIENT])
    let lookupFails = true
    const engine = await makeEngine(async (func, ...params) => {
      if (func === 'loadAccount' && params[0] === RECIPIENT && lookupFails) {
        lookupFails = false
        throw new Error('Network request failed')
      }
      return await lookUp(func, ...params)
    })
    await engine.checkAccountInnerLoop()
    const spendInfo = {
      tokenId: null,
      spendTargets: [{ publicAddress: RECIPIENT, nativeAmount: '20000000' }]
    }

    // The failure comes through as itself, not as an unactivated account:
    await expectRejection(
      engine.makeSpend(spendInfo),
      'Error: Network request failed'
    )

    // So the next attempt finds the account, and pays it:
    const tx = await engine.makeSpend(spendInfo)
    const signed = await engine.signTx(tx, { stellarKey: SECRET })
    const { operations } = new Transaction(signed.signedTx, Networks.PUBLIC)
    assert.strictEqual(operations[0].type, 'payment')
  })

  it('looks a recipient up again until its account exists', async function () {
    const accounts = [ADDRESS]
    const engine = await makeEngine(lookUpAccounts(accounts))
    await engine.checkAccountInnerLoop()

    /** Builds and signs a 2 XLM send, returning its operation type. */
    const send = async (publicAddress: string): Promise<string> => {
      const tx = await engine.makeSpend({
        tokenId: null,
        spendTargets: [{ publicAddress, nativeAmount: '20000000' }]
      })
      const signed = await engine.signTx(tx, { stellarKey: SECRET })
      const { operations } = new Transaction(signed.signedTx, Networks.PUBLIC)
      return operations[0].type
    }

    // Before the account exists, a send creates it, which an M address can't:
    assert.strictEqual(await send(RECIPIENT), 'createAccount')
    await expectRejection(
      send(MUXED_RECIPIENT),
      'Error: Recipient address not activated. A muxed (M) address can only receive funds after its account is activated'
    )

    // Once someone else activates it, both addresses pay it:
    accounts.push(RECIPIENT)
    assert.strictEqual(await send(RECIPIENT), 'payment')
    assert.strictEqual(await send(MUXED_RECIPIENT), 'payment')
  })

  it('records account creations in history', async function () {
    const engine = await makeEngine(horizon)
    const operation = {
      created_at: '2026-11-04T00:00:00Z',
      transaction: async () => ({
        fee_charged: '100',
        ledger_attr: 123,
        memo_type: 'text',
        memo: 'hi'
      })
    }

    // Horizon's create_account records have no asset_type:
    await engine.processTransaction(
      record({
        ...operation,
        id: '1',
        paging_token: '1',
        type: 'create_account',
        transaction_hash: 'aa'.repeat(32),
        source_account: FUNDER,
        account: ADDRESS,
        starting_balance: '5.0000000'
      })
    )
    await engine.processTransaction(
      record({
        ...operation,
        id: '2',
        paging_token: '2',
        type: 'create_account',
        transaction_hash: 'bb'.repeat(32),
        source_account: ADDRESS,
        account: RECIPIENT,
        starting_balance: '2.5000000'
      })
    )
    // Token payments stay out of the XLM history:
    await engine.processTransaction(
      record({
        ...operation,
        id: '3',
        paging_token: '3',
        type: 'payment',
        transaction_hash: 'cc'.repeat(32),
        asset_type: 'credit_alphanum4',
        from: FUNDER,
        to: ADDRESS,
        amount: '7.0000000'
      })
    )

    const txs = await engine.getTransactions({ tokenId: null })
    txs.sort((a, b) => a.txid.localeCompare(b.txid))
    assert.deepEqual(
      txs.map(tx => [tx.txid, tx.nativeAmount, tx.networkFee, tx.blockHeight]),
      [
        ['aa'.repeat(32), '50000000', '100', 123],
        ['bb'.repeat(32), '-25000100', '100', 123]
      ]
    )
    assert.deepEqual(txs[0].memos, [
      { type: 'text', memoName: 'memo_text', value: 'hi' }
    ])
  })

  it('records path payments by the XLM they move', async function () {
    const engine = await makeEngine(horizon)
    const pathPayment = (fields: object): StellarPaymentRecord =>
      record({
        created_at: '2026-11-04T00:00:00Z',
        transaction: async () => ({
          fee_charged: '100',
          ledger_attr: 123,
          memo_type: 'none'
        }),
        ...fields
      })

    // Someone pays us XLM, spending a token:
    await engine.processTransaction(
      pathPayment({
        paging_token: '1',
        type: 'path_payment_strict_receive',
        transaction_hash: 'aa'.repeat(32),
        from: FUNDER,
        to: ADDRESS,
        asset_type: 'native',
        amount: '3.0000000',
        source_asset_type: 'credit_alphanum4',
        source_amount: '9.0000000'
      })
    )
    // We spend XLM, delivering a token:
    await engine.processTransaction(
      pathPayment({
        paging_token: '2',
        type: 'path_payment_strict_send',
        transaction_hash: 'bb'.repeat(32),
        from: ADDRESS,
        to: RECIPIENT,
        asset_type: 'credit_alphanum4',
        amount: '50.0000000',
        source_asset_type: 'native',
        source_amount: '2.0000000'
      })
    )
    // We swap a token for XLM by paying ourselves:
    await engine.processTransaction(
      pathPayment({
        paging_token: '3',
        type: 'path_payment_strict_send',
        transaction_hash: 'cc'.repeat(32),
        from: ADDRESS,
        to: ADDRESS,
        asset_type: 'native',
        amount: '4.0000000',
        source_asset_type: 'credit_alphanum4',
        source_amount: '12.0000000'
      })
    )
    // Token-only path payments stay out of the XLM history:
    await engine.processTransaction(
      pathPayment({
        paging_token: '4',
        type: 'path_payment_strict_send',
        transaction_hash: 'dd'.repeat(32),
        from: FUNDER,
        to: ADDRESS,
        asset_type: 'credit_alphanum4',
        amount: '1.0000000',
        source_asset_type: 'credit_alphanum4',
        source_amount: '1.0000000'
      })
    )

    const txs = await engine.getTransactions({ tokenId: null })
    txs.sort((a, b) => a.txid.localeCompare(b.txid))
    assert.deepEqual(
      txs.map(tx => [tx.txid, tx.nativeAmount, tx.isSend]),
      [
        ['aa'.repeat(32), '30000000', false],
        ['bb'.repeat(32), '-20000100', true],
        ['cc'.repeat(32), '39999900', false]
      ]
    )
  })

  it('reads history a full page at a time, with transactions', async function () {
    const payment = (id: string, hash: string): object => ({
      id,
      paging_token: id,
      type: 'payment',
      created_at: '2026-11-04T00:00:00Z',
      transaction_hash: hash,
      asset_type: 'native',
      from: FUNDER,
      to: ADDRESS,
      amount: '1.0000000',
      // Horizon embeds this for join=transactions:
      transaction: {
        hash,
        fee_charged: '100',
        ledger_attr: 123,
        memo_type: 'id',
        memo: '42'
      },
      _links: {
        transaction: {
          href: `https://horizon.stellar.org/transactions/${hash}`
        }
      }
    })

    const requests: Array<[string, string]> = []
    const fetch: EdgeFetchFunction = async uri => {
      const { pathname, searchParams } = new URL(uri)
      searchParams.sort()
      requests.push([pathname, searchParams.toString()])
      const records =
        searchParams.get('cursor') === '0'
          ? [payment('1', 'aa'.repeat(32)), payment('2', 'bb'.repeat(32))]
          : []
      const text = JSON.stringify({
        _embedded: { records },
        _links: {
          next: {
            href: `https://horizon.stellar.org${pathname}?cursor=2&join=transactions&limit=200`
          }
        }
      })
      return {
        headers: { forEach() {}, get: () => null, has: () => false },
        ok: true,
        status: 200,
        arrayBuffer: async () => new TextEncoder().encode(text).buffer,
        json: async () => JSON.parse(text),
        text: async () => text
      }
    }

    const engine = await makeEngine(undefined, fetch)
    await engine.checkTransactionsInnerLoop()

    // One request per page, and none per transaction:
    const path = `/accounts/${ADDRESS}/payments`
    assert.deepEqual(requests, [
      [path, 'cursor=0&join=transactions&limit=200'],
      [path, 'cursor=2&join=transactions&limit=200']
    ])
    assert.strictEqual(engine.otherData.lastPagingToken, '2')

    const txs = await engine.getTransactions({ tokenId: null })
    assert.deepEqual(
      txs.map(tx => [tx.nativeAmount, tx.networkFee, tx.memos[0].value]),
      [
        ['10000000', '100', '42'],
        ['10000000', '100', '42']
      ]
    )
  })

  it('bids from the base fee, and higher when ledgers fill up', async function () {
    const feesFor = async (
      lastBaseFee: string,
      capacityUsage: string
    ): Promise<StellarEngine['fees']> => {
      const engine = await makeEngine(async () => ({
        // Smart contract fees skew these, so the engine ignores them:
        fee_charged: { p50: '100', p70: '2959', p95: '7449' },
        last_ledger_base_fee: lastBaseFee,
        ledger_capacity_usage: capacityUsage
      }))
      await engine.queryFee()
      return engine.fees
    }

    assert.deepEqual(await feesFor('100', '0.61'), {
      low: 100,
      standard: 100,
      high: 200
    })
    // Surge pricing:
    assert.deepEqual(await feesFor('250', '1.00'), {
      low: 250,
      standard: 500,
      high: 2500
    })
    // Never below the network minimum:
    assert.deepEqual(await feesFor('', ''), {
      low: 100,
      standard: 100,
      high: 200
    })
  })

  it('keeps the saved account sequence when it loads', function () {
    const otherData = asStellarWalletOtherData({
      lastPagingToken: '0',
      accountSequence: SEQUENCE
    })
    assert.strictEqual(otherData.accountSequence, SEQUENCE)
  })
})
