import { expect } from 'chai'
import {
  EdgeCurrencyEngineCallbacks,
  EdgeCurrencyEngineOptions,
  EdgeToken,
  EdgeTokenId,
  EdgeTransaction,
  EdgeTxDatabase,
  makeFakeIo,
  makeMemoryTxDatabase
} from 'edge-core-js'
import { describe, it } from 'mocha'

import { CurrencyEngine } from '../../src/common/CurrencyEngine'
import { PluginEnvironment } from '../../src/common/innerPlugin'
import {
  makeTokenSyncTracker,
  TokenSyncTracker
} from '../../src/common/SyncTracker'
import {
  SafeCommonWalletInfo,
  TRANSACTION_STORE_FILE,
  TXID_LIST_FILE,
  TXID_MAP_FILE
} from '../../src/common/types'
import { currencyInfo } from '../../src/ethereum/info/ethereumInfo'
import { fakeLog } from '../fake/fakeLog'
import { FakeTools } from '../fake/FakeTools'

/**
 * The engine's transactions, in the database rather than in three JSON files.
 *
 * What these check is the part the type system cannot: that a transaction
 * survives the round trip through `EdgeTx` with the pieces the core's model
 * has no room for still attached, and that a wallet which already has a file
 * on disk keeps its history.
 */

const TOKEN_ID = 'a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
const WALLET_ID = Buffer.alloc(32, 0x11).toString('base64')

const usdc: EdgeToken = {
  currencyCode: 'USDC',
  displayName: 'USD Coin',
  denominations: [{ name: 'USDC', multiplier: '1000000' }],
  networkLocation: { contractAddress: `0x${TOKEN_ID}` }
}

const quietCallbacks: EdgeCurrencyEngineCallbacks = {
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

/**
 * A bare `CurrencyEngine` -- no chain, no network.
 *
 * The transaction store is common code every account-based engine inherits,
 * so testing it through one real chain's engine would drag that chain's
 * network in for no gain.
 */
class TestEngine extends CurrencyEngine<
  FakeTools,
  SafeCommonWalletInfo,
  TokenSyncTracker
> {
  // Both are protected, which is right for the plugin surface and useless
  // for a test of the storage they drive.
  async save(): Promise<void> {
    await this.saveWalletLoop()
  }

  async resync(): Promise<void> {
    await this.clearBlockchainCache()
  }
}

interface Fixture {
  engine: TestEngine
  /** Absent only in the test that checks the disklet path still works. */
  txDatabase: EdgeTxDatabase | undefined
  disklet: EdgeCurrencyEngineOptions['walletLocalDisklet']
  /** A second engine over the same storage, which is what a restart is. */
  restart: () => Promise<TestEngine>
}

async function setup(
  opts: {
    txDatabase?: EdgeTxDatabase | undefined
    /** Transactions already on disk, as an older version would have left them. */
    legacyTxs?: EdgeTransaction[]
  } = {}
): Promise<Fixture> {
  const fakeIo = makeFakeIo()
  const disklet = fakeIo.disklet

  if (opts.legacyTxs != null) {
    const txs = opts.legacyTxs
    await disklet.setText(TRANSACTION_STORE_FILE, JSON.stringify({ '': txs }))
    await disklet.setText(
      TXID_LIST_FILE,
      JSON.stringify({ '': txs.map(tx => tx.txid) })
    )
    await disklet.setText(
      TXID_MAP_FILE,
      JSON.stringify({
        '': Object.fromEntries(txs.map((tx, i) => [tx.txid, i]))
      })
    )
  }
  const txDatabase =
    'txDatabase' in opts
      ? opts.txDatabase
      : await makeMemoryTxDatabase({
          walletId: WALLET_ID,
          pluginId: 'ethereum'
        })

  const env = {
    currencyInfo,
    io: fakeIo,
    log: fakeLog,
    builtinTokens: { [TOKEN_ID]: usdc }
  } as unknown as PluginEnvironment<{}>

  const walletInfo: SafeCommonWalletInfo = {
    id: WALLET_ID,
    type: 'wallet:ethereum',
    keys: { publicKey: '0xabc' }
  }

  const engineOptions = (): EdgeCurrencyEngineOptions => ({
    callbacks: quietCallbacks,
    customTokens: { [TOKEN_ID]: usdc },
    enabledTokenIds: [TOKEN_ID],
    log: fakeLog,
    txDatabase,
    userSettings: {},
    walletLocalDisklet: disklet,
    walletLocalEncryptedDisklet: disklet,
    walletSettings: {}
  })

  const make = async (): Promise<TestEngine> => {
    const engine = new TestEngine(
      env,
      new FakeTools(),
      walletInfo,
      engineOptions(),
      makeTokenSyncTracker
    )
    await engine.loadEngine()
    return engine
  }

  return { engine: await make(), txDatabase, disklet, restart: make }
}

function db(fixture: Fixture): EdgeTxDatabase {
  if (fixture.txDatabase == null) throw new Error('This fixture has none')
  return fixture.txDatabase
}

function makeTx(
  overrides: Partial<EdgeTransaction> & { tokenId: EdgeTokenId }
): EdgeTransaction {
  return {
    currencyCode: overrides.tokenId == null ? 'ETH' : 'USDC',
    nativeAmount: '-1000000000000000',
    networkFees: [],
    networkFee: '21000000000000',
    blockHeight: 19000000,
    date: 1717243200,
    txid: '0xdeadbeef',
    signedTx: '',
    memos: [],
    ourReceiveAddresses: [],
    isSend: true,
    walletId: WALLET_ID,
    ...overrides
  }
}

describe('engine transaction store', function () {
  it('writes a transaction through and reads it back', async function () {
    const fixture = await setup()
    fixture.engine.addTransaction(null, makeTx({ tokenId: null }))
    await fixture.engine.save()

    const engine = await fixture.restart()
    const [tx] = engine.transactionList['']
    expect(tx.txid).equals('0xdeadbeef')
    expect(tx.nativeAmount).equals('-1000000000000000')
    expect(tx.currencyCode).equals('ETH')

    // The flat fee, which most engines still report instead of the array:
    expect(tx.networkFee).equals('21000000000000')
  })

  it('keeps the two assets of one transaction apart', async function () {
    const fixture = await setup()
    // A token transfer is two `EdgeTransaction`s sharing a txid, and one
    // `EdgeTx`. The merge is the part that could silently lose one of them.
    fixture.engine.addTransaction(null, makeTx({ tokenId: null }))
    fixture.engine.addTransaction(
      TOKEN_ID,
      makeTx({
        tokenId: TOKEN_ID,
        nativeAmount: '-5000000',
        networkFee: '0',
        parentNetworkFee: '21000000000000'
      })
    )
    await fixture.engine.save()

    // One document, two assets:
    expect((await db(fixture).getTxs()).length).equals(1)

    const engine = await fixture.restart()
    expect(engine.transactionList[''].length).equals(1)
    expect(engine.transactionList[TOKEN_ID].length).equals(1)
    expect(engine.transactionList[''][0].nativeAmount).equals(
      '-1000000000000000'
    )

    const token = engine.transactionList[TOKEN_ID][0]
    expect(token.nativeAmount).equals('-5000000')
    expect(token.currencyCode).equals('USDC')
    expect(token.networkFee).equals('0')
    expect(token.parentNetworkFee).equals('21000000000000')
  })

  it('keeps what EdgeTx has no room for', async function () {
    const fixture = await setup()
    fixture.engine.addTransaction(
      null,
      makeTx({
        tokenId: null,
        confirmations: 'failed',
        otherParams: { idInternal: 'stellar-op-42' }
      })
    )
    await fixture.engine.save()

    const engine = await fixture.restart()
    const [tx] = engine.transactionList['']

    // A verdict, not a height: nothing stored implies it, so losing it would
    // resurrect a failed transaction as merely unconfirmed.
    expect(tx.confirmations).equals('failed')
    expect(tx.otherParams?.idInternal).equals('stellar-op-42')
  })

  it('writes only what changed', async function () {
    const fixture = await setup()
    for (let i = 0; i < 5; ++i) {
      fixture.engine.addTransaction(
        null,
        makeTx({ tokenId: null, txid: `0xtx${i}`, date: 1717243200 + i })
      )
    }
    await fixture.engine.save()

    // The whole reason for the database: one new transaction is one write,
    // not a rewrite of the entire list.
    fixture.engine.addTransaction(
      null,
      makeTx({ tokenId: null, txid: '0xnew', date: 1717250000 })
    )
    // The engine's own normalized form, which is how it keys `txIdMap`. The
    // rows themselves are keyed by the txid the transaction spells.
    expect([...fixture.engine.dirtyTxids]).deep.equals(['new'])
    await fixture.engine.save()
    expect(fixture.engine.dirtyTxids.size).equals(0)

    const engine = await fixture.restart()
    expect(engine.transactionList[''].length).equals(6)
  })

  it('imports a wallet that already has files on disk', async function () {
    // Nothing marks the import as done. A wallet with transactions stored
    // never reaches the files again, and one with none has nothing to import
    // twice -- so the state itself is the marker.
    const fixture = await setup({
      legacyTxs: [
        makeTx({ tokenId: null, txid: '0xold' }),
        makeTx({ tokenId: null, txid: '0xolder', date: 1717000000 })
      ]
    })

    expect(fixture.engine.transactionList[''].length).equals(2)
    await fixture.engine.save()
    expect((await db(fixture).getTxs()).length).equals(2)

    // And a restart reads the database, not the files:
    const engine = await fixture.restart()
    expect(engine.transactionList[''].map(tx => tx.txid)).deep.equals([
      '0xold',
      '0xolder'
    ])
  })

  it('reads a transaction that has no detail row', async function () {
    const fixture = await setup()

    // The core writes an engine's transactions through its own adapter too,
    // and it knows nothing about this table. Those still have to load.
    await db(fixture).saveTxs([
      {
        walletId: WALLET_ID,
        txid: '0xfromthecore',
        pluginId: 'ethereum',
        date: '2024-06-01T12:00:00.000Z',
        blockHeight: 19000000,
        isSend: false,
        nativeAmounts: new Map([[null, '500']]),
        networkFees: new Map(),
        ourReceiveAddresses: [],
        memos: [],
        tokenData: new Map()
      }
    ])

    const engine = await fixture.restart()
    const [tx] = engine.transactionList['']
    expect(tx.txid).equals('0xfromthecore')
    expect(tx.currencyCode).equals('ETH')
  })

  it('forgets everything a resync clears', async function () {
    const fixture = await setup()
    fixture.engine.addTransaction(null, makeTx({ tokenId: null }))
    await fixture.engine.save()
    expect((await db(fixture).getTxs()).length).equals(1)

    await fixture.engine.resync()
    expect((await db(fixture).getTxs()).length).equals(0)

    // Including the files, which are what an empty database imports from --
    // otherwise the next start reads back the history it was told to forget.
    const engine = await fixture.restart()
    expect(engine.transactionList['']?.length ?? 0).equals(0)
  })

  it('still uses the files where there is no database', async function () {
    const fixture = await setup({ txDatabase: undefined })
    fixture.engine.addTransaction(null, makeTx({ tokenId: null }))
    await fixture.engine.save()

    const stored = JSON.parse(
      await fixture.disklet.getText(TRANSACTION_STORE_FILE)
    )
    expect(stored[''].length).equals(1)
  })
})
