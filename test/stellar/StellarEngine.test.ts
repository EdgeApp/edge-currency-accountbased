import {
  Asset,
  Networks,
  Operation,
  StrKey,
  Transaction
} from '@stellar/stellar-sdk'
import { assert } from 'chai'
import {
  EdgeActivationQuote,
  EdgeCorePluginOptions,
  EdgeCurrencyEngineCallbacks,
  EdgeCurrencyEngineOptions,
  EdgeCurrencyWallet,
  EdgeFetchFunction,
  EdgeSpendInfo,
  EdgeTransaction,
  makeFakeIo
} from 'edge-core-js'
import { describe, it } from 'mocha'

import { StellarEngine } from '../../src/stellar/StellarEngine'
import { stellar } from '../../src/stellar/stellarInfo'
import {
  asStellarWalletOtherData,
  StellarOperationRecord
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

const USDC_ISSUER = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN'
const USDC = `USDC-${USDC_ISSUER}`
const USDT0 = 'USDT0-GATISXX6BZ6NC7IKQBY37CJD4SOZL3CYZJWXEDG6JVIY4WBS6KXJHN6Q'

/** A trustline balance, as Horizon lists it. */
const trustline = (code: string, issuer: string, balance: string): object => ({
  asset_type: code.length > 4 ? 'credit_alphanum12' : 'credit_alphanum4',
  asset_code: code,
  asset_issuer: issuer,
  balance,
  limit: '922337203685.4775807',
  buying_liabilities: '0.0000000',
  selling_liabilities: '0.0000000',
  is_authorized: true
})

// Sequence numbers are int64 values, well past Number.MAX_SAFE_INTEGER:
const SEQUENCE = '280502140848308224'

type HorizonStub = (func: string, ...params: any[]) => Promise<any>

/** An operations record with just the fields the engine reads. */
const record = (fields: object): StellarOperationRecord =>
  fields as StellarOperationRecord

/**
 * An operation of a transaction whose source account pays its fee,
 * as Horizon lists it.
 */
const operation = (source: string, fields: object): StellarOperationRecord =>
  record({
    created_at: '2026-11-04T00:00:00Z',
    transaction: async () => ({
      fee_charged: '100',
      ledger_attr: 123,
      memo_type: 'none',
      source_account: source
    }),
    ...fields
  })

const horizon: HorizonStub = async func => {
  switch (func) {
    case 'loadAccount':
      return {
        id: ADDRESS,
        sequence: SEQUENCE,
        subentry_count: 0,
        num_sponsoring: 0,
        num_sponsored: 0,
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
  fetch?: EdgeFetchFunction,
  opts: {
    callbacks?: Partial<EdgeCurrencyEngineCallbacks>
    enabledTokenIds?: string[]
    infoPayload?: object
  } = {}
): Promise<StellarEngine> {
  const fakeIo = makeFakeIo()
  const io = fetch == null ? fakeIo : { ...fakeIo, fetch }
  const pluginOptions: EdgeCorePluginOptions = {
    infoPayload: { ...opts.infoPayload },
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
    onWcNewContractCall() {},
    ...opts.callbacks
  }
  const engineOptions: EdgeCurrencyEngineOptions = {
    callbacks,
    customTokens: {},
    enabledTokenIds: opts.enabledTokenIds ?? [],
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
    const memo = { memo_type: 'text', memo: 'hi' }
    const created = (source: string): object => ({
      created_at: '2026-11-04T00:00:00Z',
      transaction: async () => ({
        fee_charged: '100',
        ledger_attr: 123,
        source_account: source,
        ...memo
      })
    })

    // Horizon's create_account records have no asset_type:
    await engine.processTransaction(
      record({
        ...created(FUNDER),
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
        ...created(ADDRESS),
        id: '2',
        paging_token: '2',
        type: 'create_account',
        transaction_hash: 'bb'.repeat(32),
        source_account: ADDRESS,
        account: RECIPIENT,
        starting_balance: '2.5000000'
      })
    )
    // Payments in tokens this wallet doesn't know stay out of history:
    await engine.processTransaction(
      operation(FUNDER, {
        id: '3',
        paging_token: '3',
        type: 'payment',
        transaction_hash: 'cc'.repeat(32),
        asset_type: 'credit_alphanum4',
        asset_code: 'USDC',
        asset_issuer: FUNDER,
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
        ['aa'.repeat(32), '50000000', '0', 123],
        ['bb'.repeat(32), '-25000100', '100', 123]
      ]
    )
    assert.deepEqual(txs[0].memos, [
      { type: 'text', memoName: 'memo_text', value: 'hi' }
    ])
  })

  it('records path payments by the XLM they move', async function () {
    const engine = await makeEngine(horizon)
    // The paying account submits each path payment:
    const pathPayment = (
      fields: { from: string } & Record<string, string>
    ): StellarOperationRecord => operation(fields.from, fields)

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

  it('records token payments in the token history', async function () {
    const engine = await makeEngine(horizon, undefined, {
      enabledTokenIds: [USDC]
    })
    const usdc = {
      asset_type: 'credit_alphanum4',
      asset_code: 'USDC',
      asset_issuer: USDC_ISSUER
    }

    // Someone pays us USDC:
    await engine.processTransaction(
      operation(FUNDER, {
        paging_token: '1',
        type: 'payment',
        transaction_hash: 'aa'.repeat(32),
        ...usdc,
        from: FUNDER,
        to: ADDRESS,
        amount: '7.5000000'
      })
    )
    // We pay USDC, and the fee in XLM:
    await engine.processTransaction(
      operation(ADDRESS, {
        paging_token: '2',
        type: 'payment',
        transaction_hash: 'bb'.repeat(32),
        ...usdc,
        from: ADDRESS,
        to: RECIPIENT,
        amount: '2.0000000'
      })
    )

    const tokenTxs = await engine.getTransactions({ tokenId: USDC })
    tokenTxs.sort((a, b) => a.txid.localeCompare(b.txid))
    assert.deepEqual(
      tokenTxs.map(tx => [
        tx.txid,
        tx.currencyCode,
        tx.nativeAmount,
        tx.isSend,
        tx.networkFee,
        tx.parentNetworkFee
      ]),
      [
        ['aa'.repeat(32), 'USDC', '75000000', false, '0', '0'],
        ['bb'.repeat(32), 'USDC', '-20000000', true, '0', '100']
      ]
    )

    // Only the fee shows in the XLM history:
    const txs = await engine.getTransactions({ tokenId: null })
    assert.deepEqual(
      txs.map(tx => [tx.txid, tx.nativeAmount, tx.networkFee]),
      [['bb'.repeat(32), '-100', '100']]
    )
  })

  it('records what contract calls move in and out', async function () {
    const engine = await makeEngine(horizon, undefined, {
      enabledTokenIds: [USDC]
    })
    const usdc = {
      asset_type: 'credit_alphanum4',
      asset_code: 'USDC',
      asset_issuer: USDC_ISSUER
    }

    // The asset contract mints USDC to us, and an anchor pays us USDC
    // through it alongside a transfer between two other accounts,
    // after another account sends us a little XLM:
    await engine.processTransaction(
      operation(FUNDER, {
        paging_token: '1',
        type: 'invoke_host_function',
        transaction_hash: 'aa'.repeat(32),
        asset_balance_changes: [
          {
            asset_type: 'native',
            type: 'transfer',
            from: RECIPIENT,
            to: ADDRESS,
            amount: '0.0000001'
          },
          { ...usdc, type: 'mint', to: ADDRESS, amount: '1.0000000' },
          {
            ...usdc,
            type: 'transfer',
            from: FUNDER,
            to: RECIPIENT,
            amount: '3.0000000'
          },
          {
            ...usdc,
            type: 'transfer',
            from: FUNDER,
            to: ADDRESS,
            amount: '4.5000000'
          }
        ]
      })
    )
    // We pay XLM into a contract:
    await engine.processTransaction(
      operation(ADDRESS, {
        paging_token: '2',
        type: 'invoke_host_function',
        transaction_hash: 'bb'.repeat(32),
        asset_balance_changes: [
          {
            asset_type: 'native',
            type: 'transfer',
            from: ADDRESS,
            to: RECIPIENT,
            amount: '2.0000000'
          }
        ]
      })
    )
    // A contract call that moves none of our assets stays out of history:
    await engine.processTransaction(
      operation(FUNDER, {
        paging_token: '3',
        type: 'invoke_host_function',
        transaction_hash: 'cc'.repeat(32)
      })
    )
    // A bare mint comes from the account that called the contract:
    await engine.processTransaction(
      operation(FUNDER, {
        paging_token: '4',
        type: 'invoke_host_function',
        transaction_hash: 'dd'.repeat(32),
        source_account: RECIPIENT,
        asset_balance_changes: [
          { ...usdc, type: 'mint', to: ADDRESS, amount: '2.0000000' }
        ]
      })
    )

    // The sender is the transfer's, never the mint's missing one:
    const tokenTxs = await engine.getTransactions({ tokenId: USDC })
    assert.deepEqual(
      tokenTxs.map(tx => [
        tx.txid,
        tx.nativeAmount,
        tx.isSend,
        tx.otherParams?.fromAddress
      ]),
      [
        ['aa'.repeat(32), '55000000', false, FUNDER],
        ['dd'.repeat(32), '20000000', false, RECIPIENT]
      ]
    )
    // Each asset names its own sender:
    const txs = await engine.getTransactions({ tokenId: null })
    txs.sort((a, b) => a.txid.localeCompare(b.txid))
    assert.deepEqual(
      txs.map(tx => [
        tx.txid,
        tx.nativeAmount,
        tx.isSend,
        tx.otherParams?.fromAddress
      ]),
      [
        ['aa'.repeat(32), '1', false, RECIPIENT],
        ['bb'.repeat(32), '-20000100', true, ADDRESS]
      ]
    )
  })

  it('records swaps between XLM and tokens', async function () {
    const engine = await makeEngine(horizon, undefined, {
      enabledTokenIds: [USDC, USDT0]
    })
    const usdc = {
      asset_code: 'USDC',
      asset_issuer: USDC_ISSUER
    }

    // We swap USDC for XLM by paying ourselves:
    await engine.processTransaction(
      operation(ADDRESS, {
        paging_token: '1',
        type: 'path_payment_strict_send',
        transaction_hash: 'aa'.repeat(32),
        from: ADDRESS,
        to: ADDRESS,
        asset_type: 'native',
        amount: '4.0000000',
        source_asset_type: 'credit_alphanum4',
        source_asset_code: usdc.asset_code,
        source_asset_issuer: usdc.asset_issuer,
        source_amount: '12.0000000'
      })
    )
    // We swap XLM for USDT0:
    await engine.processTransaction(
      operation(ADDRESS, {
        paging_token: '2',
        type: 'path_payment_strict_receive',
        transaction_hash: 'bb'.repeat(32),
        from: ADDRESS,
        to: ADDRESS,
        asset_type: 'credit_alphanum12',
        asset_code: 'USDT0',
        asset_issuer: USDT0.split('-')[1],
        amount: '5.0000000',
        source_asset_type: 'native',
        source_amount: '2.0000000'
      })
    )
    // Someone pays us USDC, spending XLM, which is no swap of ours:
    await engine.processTransaction(
      operation(FUNDER, {
        paging_token: '3',
        type: 'path_payment_strict_send',
        transaction_hash: 'cc'.repeat(32),
        from: FUNDER,
        to: ADDRESS,
        asset_type: 'credit_alphanum4',
        ...usdc,
        amount: '1.0000000',
        source_asset_type: 'native',
        source_amount: '0.5000000'
      })
    )

    // Someone swaps XLM for USDC in a transaction that pays us dust,
    // which is no swap of ours either:
    const theirSwap = 'dd'.repeat(32)
    const theirOperations = [
      { type: 'payment', from: FUNDER, to: ADDRESS, amount: '0.0100000' },
      {
        type: 'path_payment_strict_send',
        from: FUNDER,
        to: FUNDER,
        amount: '30.0000000',
        source_asset_type: 'native',
        source_amount: '100.0000000'
      }
    ].map(fields =>
      record({
        paging_token: '4',
        created_at: '2026-11-04T00:00:00Z',
        transaction_hash: theirSwap,
        transaction: async () => ({
          fee_charged: '200',
          ledger_attr: 123,
          memo_type: 'none',
          source_account: FUNDER,
          operation_count: 2,
          operations: async () => ({ records: theirOperations })
        }),
        asset_type: 'credit_alphanum4',
        ...usdc,
        ...fields
      })
    )
    await engine.processTransaction(theirOperations[0])

    // We swap XLM for USDT0 in a transaction that also brings us USDC,
    // which is no part of the swap:
    const mixed = 'ee'.repeat(32)
    const mixedOperations = [
      {
        type: 'path_payment_strict_receive',
        from: ADDRESS,
        to: ADDRESS,
        asset_type: 'credit_alphanum12',
        asset_code: 'USDT0',
        asset_issuer: USDT0.split('-')[1],
        amount: '1.0000000',
        source_asset_type: 'native',
        source_amount: '3.0000000'
      },
      {
        type: 'payment',
        from: FUNDER,
        to: ADDRESS,
        asset_type: 'credit_alphanum4',
        ...usdc,
        amount: '2.0000000'
      }
    ].map(fields =>
      record({
        paging_token: '5',
        created_at: '2026-11-04T00:00:00Z',
        transaction_hash: mixed,
        transaction: async () => ({
          fee_charged: '200',
          ledger_attr: 123,
          memo_type: 'none',
          source_account: ADDRESS,
          operation_count: 2,
          operations: async () => ({ records: mixedOperations })
        }),
        ...fields
      })
    )
    await engine.processTransaction(mixedOperations[0])

    const rows = async (tokenId: string | null): Promise<unknown[]> => {
      const txs = await engine.getTransactions({ tokenId })
      txs.sort((a, b) => a.txid.localeCompare(b.txid))
      return txs.map(tx => [
        tx.txid,
        tx.nativeAmount,
        tx.assetAction?.assetActionType
      ])
    }
    const usdcTxs = await engine.getTransactions({ tokenId: USDC })
    const usdcSwap = usdcTxs.find(tx => tx.txid === 'aa'.repeat(32))
    assert.deepInclude(usdcSwap?.savedAction, {
      actionType: 'swap',
      fromAsset: {
        pluginId: 'stellar',
        tokenId: USDC,
        nativeAmount: '120000000'
      },
      toAsset: { pluginId: 'stellar', tokenId: null, nativeAmount: '40000000' },
      payoutAddress: ADDRESS
    })
    assert.deepEqual(await rows(null), [
      ['aa'.repeat(32), '39999900', 'swap'],
      ['bb'.repeat(32), '-20000100', 'swap'],
      [mixed, '-30000200', 'swap']
    ])
    assert.deepEqual(await rows(USDC), [
      ['aa'.repeat(32), '-120000000', 'swap'],
      ['cc'.repeat(32), '10000000', undefined],
      [theirSwap, '100000', undefined],
      [mixed, '20000000', undefined]
    ])
    assert.deepEqual(await rows(USDT0), [
      ['bb'.repeat(32), '50000000', 'swap'],
      [mixed, '10000000', 'swap']
    ])
    for (const txid of ['cc'.repeat(32), theirSwap, mixed]) {
      const incoming = usdcTxs.find(tx => tx.txid === txid)
      assert.isUndefined(incoming?.savedAction)
    }
  })

  it('records a transaction with several operations as one', async function () {
    const engine = await makeEngine(horizon, undefined, {
      enabledTokenIds: [USDC]
    })
    const hash = 'aa'.repeat(32)
    let operationReads = 0
    const transaction = async (): Promise<object> => ({
      fee_charged: '300',
      ledger_attr: 123,
      memo_type: 'none',
      source_account: ADDRESS,
      operation_count: 3,
      operations: async () => {
        // The first read fails:
        if (++operationReads === 1) throw new Error('Horizon timed out')
        return { records: payments }
      }
    })
    const payment = (id: string, asset: object, amount: string): object => ({
      id,
      paging_token: id,
      type: 'payment',
      created_at: '2026-11-04T00:00:00Z',
      transaction_hash: hash,
      transaction,
      from: ADDRESS,
      to: RECIPIENT,
      amount,
      ...asset
    })
    const usdc = {
      asset_type: 'credit_alphanum4',
      asset_code: 'USDC',
      asset_issuer: USDC_ISSUER
    }
    // One transaction pays 1 XLM, 2 XLM and 3 USDC:
    const payments = [
      payment('1', { asset_type: 'native' }, '1.0000000'),
      payment('2', { asset_type: 'native' }, '2.0000000'),
      payment('3', usdc, '3.0000000')
    ]

    // A failed read leaves the transaction for the next poll:
    await expectRejection(
      engine.processTransaction(record(payments[0])),
      'Error: Horizon timed out'
    )

    // Horizon lists each operation, and history shows their total:
    for (const op of payments) await engine.processTransaction(record(op))
    assert.strictEqual(operationReads, 2)
    const xlmTxs = await engine.getTransactions({ tokenId: null })
    assert.deepEqual(
      xlmTxs.map(tx => [tx.txid, tx.nativeAmount, tx.networkFee]),
      [[hash, '-30000300', '300']]
    )
    const usdcTxs = await engine.getTransactions({ tokenId: USDC })
    assert.deepEqual(
      usdcTxs.map(tx => [tx.txid, tx.nativeAmount, tx.parentNetworkFee]),
      [[hash, '-30000000', '300']]
    )

    // A resync reads the transaction again:
    await engine.clearBlockchainCache()
    await engine.processTransaction(record(payments[0]))
    assert.strictEqual(operationReads, 3)
  })

  it('names the sender of each asset in a transaction', async function () {
    const engine = await makeEngine(horizon, undefined, {
      enabledTokenIds: [USDC]
    })
    const hash = 'aa'.repeat(32)
    let failures = 1
    const transaction = async (): Promise<object> => ({
      fee_charged: '200',
      ledger_attr: 123,
      memo_type: 'none',
      source_account: FUNDER,
      operation_count: 2,
      operations: async () => ({ records: payments })
    })
    const payment = (fields: object): StellarOperationRecord =>
      record({
        paging_token: '1',
        type: 'payment',
        created_at: '2026-11-04T00:00:00Z',
        transaction_hash: hash,
        transaction,
        to: ADDRESS,
        ...fields
      })
    // A dust USDC payment from one account comes before a larger XLM
    // payment from another, and the first read of it fails:
    const dust = payment({
      from: RECIPIENT,
      asset_type: 'credit_alphanum4',
      asset_code: 'USDC',
      asset_issuer: USDC_ISSUER
    })
    Object.defineProperty(dust, 'amount', {
      get: () => {
        if (failures-- > 0) throw new Error('Bad record')
        return '0.0000001'
      }
    })
    const payments = [
      dust,
      payment({ from: FUNDER, asset_type: 'native', amount: '50.0000000' })
    ]

    // A failure leaves the transaction for the next poll:
    await expectRejection(
      engine.processTransaction(payments[0]),
      'Error: Bad record'
    )
    for (const op of payments) await engine.processTransaction(op)

    const sender = async (tokenId: string | null): Promise<unknown[]> => {
      const txs = await engine.getTransactions({ tokenId })
      return txs.map(tx => [
        tx.nativeAmount,
        tx.otherParams?.fromAddress,
        tx.savedAction
      ])
    }
    assert.deepEqual(await sender(null), [['500000000', FUNDER, undefined]])
    assert.deepEqual(await sender(USDC), [['1', RECIPIENT, undefined]])
  })

  it('records trustline changes as XLM fees', async function () {
    const engine = await makeEngine(horizon, undefined, {
      enabledTokenIds: [USDC]
    })
    const changeTrust = (id: string, limit: string): StellarOperationRecord =>
      operation(ADDRESS, {
        paging_token: id,
        type: 'change_trust',
        transaction_hash: id.repeat(64),
        source_account: ADDRESS,
        trustor: ADDRESS,
        asset_type: 'credit_alphanum4',
        asset_code: 'USDC',
        asset_issuer: USDC_ISSUER,
        limit
      })

    // Adding the trustline, then removing it:
    await engine.processTransaction(changeTrust('a', '922337203685.4775807'))
    await engine.processTransaction(changeTrust('b', '0.0000000'))

    const txs = await engine.getTransactions({ tokenId: null })
    txs.sort((a, b) => a.txid.localeCompare(b.txid))
    assert.deepEqual(
      txs.map(tx => [
        tx.txid,
        tx.nativeAmount,
        tx.networkFee,
        tx.parentNetworkFee,
        tx.isSend
      ]),
      [
        // A parentNetworkFee would overwrite the core's XLM fee:
        ['a'.repeat(64), '-100', '100', undefined, true],
        ['b'.repeat(64), '-100', '100', undefined, true]
      ]
    )
    assert.lengthOf(await engine.getTransactions({ tokenId: USDC }), 0)
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
    const path = `/accounts/${ADDRESS}/operations`
    assert.deepEqual(requests, [
      [path, 'cursor=0&join=transactions&limit=200'],
      [path, 'cursor=2&join=transactions&limit=200']
    ])
    assert.strictEqual(engine.otherData.lastOperationPagingToken, '2')

    // The sender paid the fee, not us:
    const txs = await engine.getTransactions({ tokenId: null })
    assert.deepEqual(
      txs.map(tx => [tx.nativeAmount, tx.networkFee, tx.memos[0].value]),
      [
        ['10000000', '0', '42'],
        ['10000000', '0', '42']
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

  it('keeps the reserve and XLM in offers from being spent', async function () {
    const engine = await makeEngine(async (func, ...params) => {
      const result = await horizon(func, ...params)
      if (func !== 'loadAccount') return result
      // 4 entries of 0.5 XLM: 2 base entries and 3 subentries, less 2
      // that others sponsor, plus 1 the account sponsors for someone else.
      // 1 XLM more is in offers:
      return {
        ...result,
        subentry_count: 3,
        num_sponsoring: 1,
        num_sponsored: 2,
        balances: [{ ...result.balances[0], selling_liabilities: '1.0000000' }]
      }
    })
    await engine.checkAccountInnerLoop()
    assert.strictEqual(engine.lockedNativeAmount, '30000000')

    // 100 XLM, less 3 locked, less the 100 stroop fee:
    const send = async (nativeAmount: string): Promise<unknown> =>
      await engine.makeSpend({
        tokenId: null,
        spendTargets: [{ publicAddress: RECIPIENT, nativeAmount }]
      })
    await send('969999900')
    await expectRejection(
      send('969999901'),
      'InsufficientFundsError: Insufficient funds'
    )
  })

  it('reads token balances from trustlines', async function () {
    const unactivated: string[][] = []
    const detected: string[][] = []
    const engine = await makeEngine(
      async (func, ...params) => {
        const result = await horizon(func, ...params)
        if (func !== 'loadAccount') return result
        return {
          ...result,
          subentry_count: 3,
          balances: [
            trustline('USDC', USDC_ISSUER, '12.5000000'),
            trustline('USDT0', USDT0.split('-')[1], '3.0000000'),
            // A token the wallet doesn't know about:
            trustline('ABC', FUNDER, '1.0000000'),
            ...result.balances
          ]
        }
      },
      undefined,
      {
        callbacks: {
          onNewTokens: tokenIds => detected.push(tokenIds),
          onUnactivatedTokenIdsChanged: tokenIds => unactivated.push(tokenIds)
        },
        enabledTokenIds: [USDC]
      }
    )
    await engine.checkAccountInnerLoop()

    assert.strictEqual(engine.getBalance({ tokenId: null }), '1000000000')
    assert.strictEqual(engine.getBalance({ tokenId: USDC }), '125000000')
    // USDT0 has a balance but isn't enabled, so it gets suggested:
    assert.deepEqual(detected, [[USDT0]])
    // Every enabled token has a trustline, so nothing changes:
    assert.deepEqual(unactivated, [])
    // 2 base entries and 3 trustlines:
    assert.strictEqual(engine.lockedNativeAmount, '25000000')
  })

  it('lists enabled tokens with no trustline as unactivated', async function () {
    const unactivated: string[][] = []
    let trustsUsdc = false
    const engine = await makeEngine(
      async (func, ...params) => {
        const result = await horizon(func, ...params)
        if (func !== 'loadAccount' || !trustsUsdc) return result
        return {
          ...result,
          balances: [
            trustline('USDC', USDC_ISSUER, '0.0000000'),
            ...result.balances
          ]
        }
      },
      undefined,
      {
        callbacks: {
          onUnactivatedTokenIdsChanged: tokenIds => unactivated.push(tokenIds)
        }
      }
    )

    // Enabling tokens checks for trustlines right away:
    await engine.changeEnabledTokenIds([USDC, USDT0])
    assert.deepEqual(unactivated, [[USDC, USDT0]])
    assert.strictEqual(engine.getBalance({ tokenId: USDC }), '0')

    // Polling again reports only changes:
    await engine.checkAccountInnerLoop()
    assert.lengthOf(unactivated, 1)

    trustsUsdc = true
    await engine.checkAccountInnerLoop()
    assert.deepEqual(unactivated, [[USDC, USDT0], [USDT0]])
  })

  it('lists every enabled token as unactivated with no account', async function () {
    const unactivated: string[][] = []
    const engine = await makeEngine(lookUpAccounts([]), undefined, {
      callbacks: {
        onUnactivatedTokenIdsChanged: tokenIds => unactivated.push(tokenIds)
      },
      enabledTokenIds: [USDC]
    })
    await engine.checkAccountInnerLoop()
    assert.deepEqual(unactivated, [[USDC]])
    assert.strictEqual(engine.getBalance({ tokenId: USDC }), '0')
  })

  it('adds a trustline when the reserve covers it', async function () {
    const submitted: Transaction[] = []
    let xlm = '1.5000000'
    const engine = await makeEngine(async (func, ...params) => {
      if (func === 'submitTransaction') submitted.push(params[0])
      const result = await horizon(func, ...params)
      if (func !== 'loadAccount') return result
      return { ...result, balances: [{ ...result.balances[0], balance: xlm }] }
    })
    await engine.checkAccountInnerLoop()
    const activate = async (): Promise<EdgeTransaction> =>
      await engine.makeSpend({
        tokenId: null,
        spendTargets: [],
        otherParams: { activateTokenId: USDC }
      })

    // 1 XLM is the base reserve, the trustline needs 0.5 more, plus the fee:
    await expectRejection(
      activate(),
      'InsufficientFundsError: Insufficient funds'
    )
    xlm = '1.5000100'
    await engine.checkAccountInnerLoop()
    const tx = await activate()
    assert.strictEqual(tx.nativeAmount, '-100')
    assert.strictEqual(tx.networkFee, '100')
    assert.isNull(tx.tokenId)

    // Signing looks up no recipient, and broadcasting sends a changeTrust:
    const signed = await engine.signTx(tx, { stellarKey: SECRET })
    await engine.broadcastTx(signed)
    const { operations } = submitted[0]
    assert.lengthOf(operations, 1)
    assert.deepInclude(operations[0], {
      type: 'changeTrust',
      limit: '922337203685.4775807'
    })
    const { line } = operations[0] as Operation.ChangeTrust
    assert.strictEqual((line as Asset).getCode(), 'USDC')
    assert.strictEqual((line as Asset).getIssuer(), USDC_ISSUER)
  })

  it('lets a sponsor pay the trustline reserve when enabled', async function () {
    const submitted: Transaction[] = []
    const stub: HorizonStub = async (func, ...params) => {
      if (func === 'submitTransaction') submitted.push(params[0])
      const result = await horizon(func, ...params)
      if (func !== 'loadAccount') return result
      // Enough for the fees, but not for another entry's reserve:
      return {
        ...result,
        balances: [{ ...result.balances[0], balance: '1.0000300' }]
      }
    }
    const activate = async (
      engine: StellarEngine,
      sponsorAddress?: string
    ): Promise<EdgeTransaction> =>
      await engine.makeSpend({
        tokenId: null,
        spendTargets: [],
        otherParams: { activateTokenId: USDC, sponsorAddress }
      })

    // The flag is off by default:
    const plain = await makeEngine(stub)
    await plain.checkAccountInnerLoop()
    await expectRejection(
      activate(plain, FUNDER),
      'Error: Sponsored trustlines are off'
    )
    await expectRejection(
      activate(plain),
      'InsufficientFundsError: Insufficient funds'
    )

    const engine = await makeEngine(stub, undefined, {
      infoPayload: { sponsoredTrustlines: true }
    })
    await engine.checkAccountInnerLoop()
    await expectRejection(
      activate(engine, 'nope'),
      'Error: Invalid sponsor address nope'
    )
    const tx = await activate(engine, FUNDER)
    assert.strictEqual(tx.nativeAmount, '-300')
    assert.strictEqual(tx.networkFee, '300')

    // The sponsor wraps our changeTrust, and still has to sign:
    const signed = await engine.signTx(tx, { stellarKey: SECRET })
    await engine.broadcastTx(signed)
    const { operations, signatures } = submitted[0]
    assert.deepEqual(
      operations.map(op => [op.type, op.source]),
      [
        ['beginSponsoringFutureReserves', FUNDER],
        ['changeTrust', undefined],
        ['endSponsoringFutureReserves', undefined]
      ]
    )
    assert.deepInclude(operations[0], { sponsoredId: ADDRESS })
    assert.lengthOf(signatures, 1)
  })

  it('removes a trustline only once the token is empty', async function () {
    const submitted: Transaction[] = []
    let usdc = '0.0000001'
    const engine = await makeEngine(
      async (func, ...params) => {
        if (func === 'submitTransaction') submitted.push(params[0])
        const result = await horizon(func, ...params)
        if (func !== 'loadAccount') return result
        return {
          ...result,
          subentry_count: 1,
          balances: [trustline('USDC', USDC_ISSUER, usdc), ...result.balances]
        }
      },
      undefined,
      { enabledTokenIds: [USDC] }
    )
    await engine.checkAccountInnerLoop()
    const deactivate = async (): Promise<EdgeTransaction> =>
      await engine.makeSpend({
        tokenId: null,
        spendTargets: [],
        otherParams: { deactivateTokenId: USDC }
      })
    await expectRejection(
      deactivate(),
      'Error: Send or swap all USDC before removing it, since Stellar only removes empty trustlines'
    )

    usdc = '0.0000000'
    await engine.checkAccountInnerLoop()
    const signed = await engine.signTx(await deactivate(), {
      stellarKey: SECRET
    })
    await engine.broadcastTx(signed)
    assert.deepInclude(submitted[0].operations[0], {
      type: 'changeTrust',
      limit: '0.0000000'
    })
  })

  it('counts every trustline reserve when activating several tokens', async function () {
    const calls: string[] = []
    let xlm = '2.0000100'
    const engine = await makeEngine(
      async (func, ...params) => {
        calls.push(func)
        const result = await horizon(func, ...params)
        if (func !== 'loadAccount') return result
        // Each changeTrust we submitted added a trustline:
        const trustlines = calls.filter(call => call === 'submitTransaction')
        return {
          ...result,
          subentry_count: trustlines.length,
          balances: [{ ...result.balances[0], balance: xlm }]
        }
      },
      undefined,
      { enabledTokenIds: [USDC, USDT0] }
    )
    await engine.checkAccountInnerLoop()
    const wallet = {
      id: engine.walletId,
      makeSpend: async (spendInfo: EdgeSpendInfo) =>
        await engine.makeSpend(spendInfo),
      signTx: async (tx: EdgeTransaction) =>
        await engine.signTx(tx, { stellarKey: SECRET }),
      broadcastTx: async (tx: EdgeTransaction) => await engine.broadcastTx(tx)
    } as unknown as EdgeCurrencyWallet
    const activateBoth = async (): Promise<EdgeActivationQuote> =>
      await engine.engineActivateWallet({
        activateTokenIds: [USDC, USDT0],
        paymentInfo: { wallet, tokenId: null }
      })

    // 1 XLM is the base reserve, each trustline needs 0.5 more,
    // and each activation pays a fee:
    await expectRejection(
      activateBoth(),
      'InsufficientFundsError: Insufficient funds'
    )
    xlm = '2.0000200'
    await engine.checkAccountInnerLoop()
    calls.length = 0
    const { transactions } = await (await activateBoth()).approve()
    assert.lengthOf(transactions, 2)

    // The account reloads after each activation, so the next one
    // counts the reserve the last one locked:
    assert.deepEqual(calls, [
      'submitTransaction',
      'loadAccount',
      'submitTransaction',
      'loadAccount'
    ])
  })

  it('activates tokens through the activation API', async function () {
    const unactivated: string[][] = []
    let trusted = false
    const engine = await makeEngine(
      async (func, ...params) => {
        if (func === 'submitTransaction') trusted = true
        const result = await horizon(func, ...params)
        if (func !== 'loadAccount' || !trusted) return result
        return {
          ...result,
          subentry_count: 1,
          balances: [
            trustline('USDC', USDC_ISSUER, '0.0000000'),
            ...result.balances
          ]
        }
      },
      undefined,
      {
        callbacks: {
          onUnactivatedTokenIdsChanged: tokenIds => unactivated.push(tokenIds)
        },
        enabledTokenIds: [USDC]
      }
    )
    await engine.checkAccountInnerLoop()
    assert.deepEqual(unactivated, [[USDC]])

    // A stand-in for the core wallet, which signs with the wallet's keys:
    const wallet = {
      id: engine.walletId,
      makeSpend: async (spendInfo: EdgeSpendInfo) =>
        await engine.makeSpend(spendInfo),
      signTx: async (tx: EdgeTransaction) =>
        await engine.signTx(tx, { stellarKey: SECRET }),
      broadcastTx: async (tx: EdgeTransaction) => await engine.broadcastTx(tx)
    } as unknown as EdgeCurrencyWallet

    const { assetOptions } = await engine.engineGetActivationAssets({
      activateTokenIds: [USDC],
      currencyWallets: {}
    })
    assert.deepEqual(assetOptions, [
      {
        paymentWalletId: engine.walletId,
        tokenId: null,
        currencyPluginId: 'stellar'
      }
    ])
    const quote = await engine.engineActivateWallet({
      activateTokenIds: [USDC],
      paymentInfo: { wallet, tokenId: null }
    })
    assert.strictEqual(quote.networkFee.nativeAmount, '100')
    const { transactions } = await quote.approve()
    assert.lengthOf(transactions, 1)

    // The trustline shows right after the approval:
    assert.deepEqual(unactivated, [[USDC], []])
  })

  it('sends tokens to a recipient that trusts them', async function () {
    const lookups: string[] = []
    const submitted: Transaction[] = []
    // Our account holds 10 USDC, 2 of them in an offer,
    // and the recipient has a USDC trustline:
    const engine = await makeEngine(
      async (func, ...params) => {
        if (func === 'submitTransaction') submitted.push(params[0])
        const result = await horizon(func, ...params)
        if (func !== 'loadAccount') return result
        lookups.push(params[0])
        const line =
          params[0] === ADDRESS
            ? {
                ...trustline('USDC', USDC_ISSUER, '10.0000000'),
                selling_liabilities: '2.0000000'
              }
            : trustline('USDC', USDC_ISSUER, '0.0000000')
        return {
          ...result,
          id: params[0],
          subentry_count: 2,
          balances: [line, ...result.balances]
        }
      },
      undefined,
      { enabledTokenIds: [USDC] }
    )
    await engine.checkAccountInnerLoop()

    const send = async (nativeAmount: string): Promise<EdgeTransaction> =>
      await engine.makeSpend({
        tokenId: USDC,
        spendTargets: [{ publicAddress: RECIPIENT, nativeAmount }],
        memos: [{ type: 'text', value: 'invoice 7' }]
      })
    await expectRejection(
      send('80000001'),
      `InsufficientFundsError: Insufficient ${USDC}`
    )
    const tx = await send('80000000')
    assert.include(tx, {
      currencyCode: 'USDC',
      nativeAmount: '-80000000',
      networkFee: '0',
      parentNetworkFee: '100',
      tokenId: USDC
    })

    // Signing a token send checks no XLM minimum on the recipient:
    const signed = await engine.signTx(tx, { stellarKey: SECRET })
    await engine.broadcastTx(signed)
    assert.deepEqual(lookups, [ADDRESS, RECIPIENT])
    const { memo, operations } = submitted[0]
    assert.strictEqual(memo.type, 'text')
    assert.strictEqual(
      Buffer.from(memo.value as Uint8Array).toString(),
      'invoice 7'
    )
    assert.lengthOf(operations, 1)
    assert.deepInclude(operations[0], {
      type: 'payment',
      destination: RECIPIENT,
      amount: '8.0000000'
    })
    const { asset } = operations[0] as Operation.Payment
    assert.isTrue(asset.equals(new Asset('USDC', USDC_ISSUER)))
  })

  it('explains why a recipient cannot take tokens', async function () {
    // The recipient's trustline for USDC, or undefined for no account:
    let recipientLines: object[] | undefined
    const engine = await makeEngine(
      async (func, ...params) => {
        const result = await horizon(func, ...params)
        if (func !== 'loadAccount') return result
        if (params[0] === ADDRESS) {
          return {
            ...result,
            subentry_count: 1,
            balances: [
              trustline('USDC', USDC_ISSUER, '10.0000000'),
              ...result.balances
            ]
          }
        }
        if (recipientLines == null) throw horizonError(404, 'Resource Missing')
        return { ...result, balances: [...recipientLines, ...result.balances] }
      },
      undefined,
      { enabledTokenIds: [USDC] }
    )
    await engine.checkAccountInnerLoop()
    const send = async (publicAddress: string): Promise<EdgeTransaction> =>
      await engine.makeSpend({
        tokenId: USDC,
        spendTargets: [{ publicAddress, nativeAmount: '10000000' }]
      })

    await expectRejection(
      send(RECIPIENT),
      "Error: The recipient's Stellar account isn't activated, so it can't receive USDC yet"
    )
    // A trustline for a different USDC doesn't count:
    recipientLines = [trustline('USDC', FUNDER, '0.0000000')]
    await expectRejection(
      send(RECIPIENT),
      "Error: The recipient hasn't added USDC to their Stellar wallet, so it can't receive USDC yet"
    )
    recipientLines = [
      { ...trustline('USDC', USDC_ISSUER, '0.0000000'), is_authorized: false }
    ]
    await expectRejection(
      send(RECIPIENT),
      "Error: The USDC issuer hasn't authorized the recipient to receive USDC"
    )

    // The issuer needs no trustline for its own asset:
    recipientLines = undefined
    await send(USDC_ISSUER)
  })

  it('pays the token fee from spendable XLM', async function () {
    // 1.5 XLM is locked by the base reserve and the trustline:
    let xlm = '1.5000099'
    const engine = await makeEngine(
      async (func, ...params) => {
        const result = await horizon(func, ...params)
        if (func !== 'loadAccount') return result
        return {
          ...result,
          subentry_count: 1,
          balances: [
            trustline('USDC', USDC_ISSUER, '10.0000000'),
            { ...result.balances[0], balance: xlm }
          ]
        }
      },
      undefined,
      { enabledTokenIds: [USDC] }
    )
    await engine.checkAccountInnerLoop()
    const send = async (): Promise<EdgeTransaction> =>
      await engine.makeSpend({
        tokenId: USDC,
        spendTargets: [{ publicAddress: USDC_ISSUER, nativeAmount: '10000000' }]
      })
    await expectRejection(send(), 'InsufficientFundsError: Insufficient funds')
    xlm = '1.5000100'
    await engine.checkAccountInnerLoop()
    await send()
  })

  it('keeps the saved account sequence when it loads', function () {
    const otherData = asStellarWalletOtherData({
      lastOperationPagingToken: '0',
      accountSequence: SEQUENCE
    })
    assert.strictEqual(otherData.accountSequence, SEQUENCE)
  })

  it('restarts history for wallets saved with the payments cursor', function () {
    // Wallets synced before token support carry a payments cursor that
    // already skipped their token payments and trustline changes:
    const otherData = asStellarWalletOtherData({
      lastPagingToken: '123456789',
      accountSequence: SEQUENCE
    })
    assert.strictEqual(otherData.lastOperationPagingToken, '0')
  })
})
