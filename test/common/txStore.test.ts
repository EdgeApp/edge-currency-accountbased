import { expect } from 'chai'
import { describe, it } from 'mocha'

import {
  db,
  makeStoreFixture,
  makeTx,
  TOKEN_ID,
  WALLET_ID
} from './txStoreFixture'

/**
 * The engine's transactions, in the database rather than in three JSON files.
 *
 * What these check is the part the type system cannot: that a transaction
 * survives the round trip through `EdgeTx` with the pieces the core's model
 * has no room for still attached, and that a wallet which already has a file
 * on disk keeps its history.
 */

describe('engine transaction store', function () {
  it('writes a transaction through and reads it back', async function () {
    const fixture = await makeStoreFixture()
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
    const fixture = await makeStoreFixture()
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
    const fixture = await makeStoreFixture()
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
    const fixture = await makeStoreFixture()
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
    const fixture = await makeStoreFixture({
      legacyTxs: [
        makeTx({ tokenId: null, txid: '0xold' }),
        makeTx({ tokenId: null, txid: '0xolder', date: 1717000000 })
      ]
    })

    // Imported as the engine loaded, before any save:
    expect(fixture.engine.transactionList[''].length).equals(2)
    expect((await db(fixture).getTxs()).length).equals(2)

    // And a restart reads the database, not the files:
    const engine = await fixture.restart()
    expect(engine.transactionList[''].map(tx => tx.txid)).deep.equals([
      '0xold',
      '0xolder'
    ])
  })

  it('reads a transaction that has no detail row', async function () {
    const fixture = await makeStoreFixture()

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
    const fixture = await makeStoreFixture({
      legacyTxs: [makeTx({ tokenId: null, txid: '0xold' })],
      legacyState: { blockHeight: 18000000 }
    })
    fixture.engine.addTransaction(null, makeTx({ tokenId: null }))
    await fixture.engine.save()
    expect((await db(fixture).getTxs()).length).equals(2)

    await fixture.engine.resync()
    expect((await db(fixture).getTxs()).length).equals(0)
    expect(await db(fixture).findRows('txDetail', {})).deep.equals([])

    // Including the files, so they cannot be imported back:
    expect(await fixture.disklet.list('txEngineFolder')).deep.equals({})
    const engine = await fixture.restart()
    expect(engine.transactionList['']?.length ?? 0).equals(0)
  })

  it('refuses to start without a database, naming it', async function () {
    let error: unknown
    await makeStoreFixture({ txDatabase: undefined }).catch(e => (error = e))
    expect(String(error)).includes('transaction database')
  })
})

describe('engine state', function () {
  it('round-trips through its row', async function () {
    const fixture = await makeStoreFixture()
    fixture.engine.walletLocalData.blockHeight = 19000123
    fixture.engine.walletLocalData.totalBalances[''] = '4200000000000000000'
    fixture.engine.walletLocalData.lastTransactionQueryHeight[TOKEN_ID] = 777
    fixture.engine.walletLocalDataDirty = true
    await fixture.engine.save()

    const engine = await fixture.restart()
    expect(engine.walletLocalData.blockHeight).equals(19000123)
    expect(engine.walletLocalData.totalBalances['']).equals(
      '4200000000000000000'
    )
    expect(engine.walletLocalData.lastTransactionQueryHeight[TOKEN_ID]).equals(
      777
    )
  })

  it('imports state that is already on disk', async function () {
    const fixture = await makeStoreFixture({
      legacyState: {
        blockHeight: 18000000,
        lastAddressQueryHeight: 17999000,
        otherData: { lastQueryCursor: 'abc' }
      }
    })

    expect(fixture.engine.walletLocalData.blockHeight).equals(18000000)
    await fixture.engine.save()

    // And a restart reads the row, not the file:
    const [result] = await db(fixture).getRows([
      { table: 'meta', keys: ['wallet'] }
    ])
    expect(result.rows.length).equals(1)

    const engine = await fixture.restart()
    expect(engine.walletLocalData.lastAddressQueryHeight).equals(17999000)
    expect(engine.walletLocalData.otherData).deep.equals({
      lastQueryCursor: 'abc'
    })
  })
})
