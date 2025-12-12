import { assert, expect } from 'chai'
import {
  closeEdge,
  EdgeCorePluginOptions,
  EdgeCurrencyEngine,
  EdgeCurrencyEngineCallbacks,
  EdgeCurrencyEngineOptions,
  EdgeCurrencyPlugin,
  EdgeCurrencyTools,
  EdgeWalletInfo,
  makeFakeIo
} from 'edge-core-js'
import EventEmitter from 'events'
import { beforeEach, describe, it } from 'mocha'
import fetch from 'node-fetch'

import { CurrencyEngine } from '../../src/common/CurrencyEngine'
import { PluginEnvironment } from '../../src/common/innerPlugin'
import { asWalletLocalData, SafeCommonWalletInfo } from '../../src/common/types'
import edgeCorePlugins from '../../src/index'
import { fakeLog } from '../fake/fakeLog'
import { FakeTools } from '../fake/FakeTools'
import { engineTestTxs } from './engine.txs'
import fixtures from './fixtures'

describe('Engine', function () {
  const fakeIo = makeFakeIo()
  const opts: EdgeCorePluginOptions = {
    initOptions: {},
    infoPayload: {},
    io: { ...fakeIo, fetch, fetchCors: fetch },
    log: fakeLog,
    nativeIo: {},
    pluginDisklet: fakeIo.disklet
  }

  for (const fixture of fixtures) {
    let privateWalletInfo: EdgeWalletInfo
    const WALLET_TYPE = fixture.WALLET_TYPE
    // const TX_AMOUNT = fixture['TX_AMOUNT']

    // @ts-expect-error
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    opts.io = { ...opts.io, random: size => fixture.key }

    // @ts-expect-error
    const factory = edgeCorePlugins[fixture.pluginId]
    const plugin: EdgeCurrencyPlugin = factory(opts)

    const emitter = new EventEmitter()
    const callbacks: EdgeCurrencyEngineCallbacks = {
      onAddressesChecked(progressRatio) {
        // console.log('onAddressesCheck', progressRatio)
        emitter.emit('onAddressesCheck', progressRatio)
      },
      onTxidsChanged(txid) {
        // console.log('onTxidsChanged', txid)
        emitter.emit('onTxidsChanged', txid)
      },
      onBalanceChanged(currencyCode, balance) {
        // console.log('onBalanceChange:', currencyCode, balance)
        emitter.emit('onBalanceChange', currencyCode, balance)
      },
      onBlockHeightChanged(height) {
        // console.log('onBlockHeightChange:', height)
        emitter.emit('onBlockHeightChange', height)
      },
      onSeenTxCheckpoint(checkpoint) {
        emitter.emit('onSeenTxCheckpoint', checkpoint)
      },
      onStakingStatusChanged() {},
      onSubscribeAddresses() {},
      onNewTokens() {},
      onTokenBalanceChanged(tokenId, balance) {
        emitter.emit('onTokenBalanceChanged', tokenId, balance)
      },
      onTransactions(transactionEvents) {
        emitter.emit('onTransactions', transactionEvents)
      },
      onTransactionsChanged(transactionList) {
        // console.log('onTransactionsChanged:', transactionList)
        emitter.emit('onTransactionsChanged', transactionList)
      },
      onAddressChanged() {
        emitter.emit('addressChanged')
      },
      onUnactivatedTokenIdsChanged(payload) {
        emitter.emit('onUnactivatedTokenIdsChanged', payload)
      },
      onWcNewContractCall(payload) {
        emitter.emit('wcNewContractCall', payload)
      }
    }

    const walletLocalDisklet = fakeIo.disklet
    const currencyEngineOptions: EdgeCurrencyEngineOptions = {
      callbacks,
      log: fakeLog,
      userSettings: undefined,
      walletLocalDisklet,
      walletLocalEncryptedDisklet: walletLocalDisklet,
      customTokens: {},
      enabledTokenIds: []
    }

    let tools: EdgeCurrencyTools
    let engine: EdgeCurrencyEngine
    before(async function () {
      tools = await plugin.makeCurrencyTools()
      const privateKeys = await tools.createPrivateKey(WALLET_TYPE)
      privateWalletInfo = {
        id: '1',
        type: WALLET_TYPE,
        keys: privateKeys
      }
      const publicKey = await tools.derivePublicKey(privateWalletInfo)
      Object.assign(privateWalletInfo.keys, publicKey)
      engine = await plugin.makeCurrencyEngine(
        privateWalletInfo,
        currencyEngineOptions
      )
    })

    describe(`Create Plugin for Wallet type ${WALLET_TYPE}`, function () {
      it(`has correct currency code ${WALLET_TYPE}`, async function () {
        expect(plugin.currencyInfo.currencyCode).equals(
          fixture['Test Currency code']
        )
      })
    })

    describe(`Make Engine for Wallet type ${WALLET_TYPE}`, function () {
      it(`Make Engine ${WALLET_TYPE}`, async function () {
        if (WALLET_TYPE === 'wallet:fio') this.timeout(60000)
        assert.equal(typeof engine.startEngine, 'function', 'startEngine')
        assert.equal(typeof engine.killEngine, 'function', 'killEngine')
        assert.equal(typeof engine.getBlockHeight, 'function', 'getBlockHeight')
        assert.equal(typeof engine.getBalance, 'function', 'getBalance')
        assert.equal(
          typeof engine.getNumTransactions,
          'function',
          'getNumTransactions'
        )
        assert.equal(
          typeof engine.getTransactions,
          'function',
          'getTransactions'
        )
        assert.equal(
          typeof engine.getFreshAddress,
          'function',
          'getFreshAddress'
        )
        assert.equal(
          typeof engine.addGapLimitAddresses,
          'function',
          'addGapLimitAddresses'
        )
        assert.equal(typeof engine.isAddressUsed, 'function', 'isAddressUsed')
        assert.equal(typeof engine.makeSpend, 'function', 'makeSpend')
        assert.equal(typeof engine.signTx, 'function', 'signTx')
        assert.equal(typeof engine.broadcastTx, 'function', 'broadcastTx')
        assert.equal(typeof engine.saveTx, 'function', 'saveTx')
      })
    })

    describe(`Start engine ${WALLET_TYPE}`, function () {
      it(`Get BlockHeight ${WALLET_TYPE}`, function (done) {
        engine.startEngine().catch(e => {
          console.log('startEngine error', e, e.message)
        })
        this.timeout(100000)
        emitter.once('onBlockHeightChange', height => {
          const thirdPartyHeight = 1578127
          // this validation is not OK for RSK
          if (WALLET_TYPE === 'wallet:eth') {
            assert(height >= thirdPartyHeight, 'Block height')
          }
          // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
          if (!engine) throw new Error('ErrorNoEngine')
          const getHeight = engine.getBlockHeight()
          // this validation is not OK for RSK
          if (WALLET_TYPE === 'wallet:eth') {
            assert(getHeight >= thirdPartyHeight, 'Block height')
          }
          assert(getHeight > 0)
          done() // Can be "done" since the promise resolves before the event fires but just be on the safe side
        })
      })
    })

    describe(`Message signing ${WALLET_TYPE}`, function () {
      if (fixture.messages == null) return
      it(`Should sign a hashed message ${WALLET_TYPE}`, async function () {
        if (engine == null) throw new Error('ErrorNoEngine')
        if (engine.signMessage == null) return
        const sig = await engine.signMessage(
          fixture.messages.eth_sign.param,
          privateWalletInfo.keys,
          {}
        )
        assert.equal(sig, fixture.messages.eth_sign.signature)
      })
      it(`Should sign a typed message ${WALLET_TYPE}`, async function () {
        if (engine == null) throw new Error('ErrorNoEngine')
        if (engine.signMessage == null) return
        const sig = await engine.signMessage(
          JSON.stringify(fixture.messages.eth_signTypedData.param),
          privateWalletInfo.keys,
          {
            otherParams: {
              typedData: true
            }
          }
        )
        assert.equal(sig, fixture.messages.eth_signTypedData.signature)
      })
    })

    describe(`Stop the engine ${WALLET_TYPE}`, function () {
      it(`Should stop the engine ${WALLET_TYPE}`, function (done) {
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
        if (!engine) throw new Error('ErrorNoEngine')
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        engine.killEngine().then(() => {
          closeEdge()
          done()
          // const flowHack: any = process
          // console.warn(flowHack._getActiveRequests())
          // console.warn(flowHack._getActiveHandles())
        })
      })
    })
  }

  // Get the currency info
  const emitter = new EventEmitter()
  const callbacks: EdgeCurrencyEngineCallbacks = {
    onAddressesChecked(progressRatio) {
      // console.log('onAddressesCheck', progressRatio)
      emitter.emit('onAddressesCheck', progressRatio)
    },
    onTxidsChanged(txid) {
      // console.log('onTxidsChanged', txid)
      emitter.emit('onTxidsChanged', txid)
    },
    onBalanceChanged(currencyCode, balance) {
      // console.log('onBalanceChange:', currencyCode, balance)
      emitter.emit('onBalanceChange', currencyCode, balance)
    },
    onBlockHeightChanged(height) {
      // console.log('onBlockHeightChange:', height)
      emitter.emit('onBlockHeightChange', height)
    },
    onSeenTxCheckpoint(checkpoint) {
      emitter.emit('onSeenTxCheckpoint', checkpoint)
    },
    onStakingStatusChanged() {},
    onSubscribeAddresses() {},
    onNewTokens() {},
    onTokenBalanceChanged(tokenId, balance) {
      emitter.emit('onTokenBalanceChanged', tokenId, balance)
    },
    onTransactions(transactionEvents) {
      emitter.emit('onTransactions', transactionEvents)
    },
    onTransactionsChanged(transactionList) {
      // console.log('onTransactionsChanged:', transactionList)
      emitter.emit('onTransactionsChanged', transactionList)
    },
    onAddressChanged() {
      // console.log('onTransactionsChanged:', transactionList)
      emitter.emit('addressChanged')
    },
    onUnactivatedTokenIdsChanged(payload) {
      emitter.emit('onUnactivatedTokenIdsChanged', payload)
    },
    onWcNewContractCall(payload) {
      emitter.emit('wcNewContractCall', payload)
    }
  }

  const walletLocalDisklet = fakeIo.disklet
  const currencyEngineOptions: EdgeCurrencyEngineOptions = {
    callbacks,
    log: fakeLog,
    userSettings: undefined,
    walletLocalDisklet,
    walletLocalEncryptedDisklet: walletLocalDisklet,
    customTokens: {},
    enabledTokenIds: []
  }
  const env: PluginEnvironment<{}> = {
    infoPayload: {},
    initOptions: {},
    io: {} as any,
    log: {} as any,
    nativeIo: {} as any,
    pluginDisklet: {} as any,

    builtinTokens: {},
    currencyInfo: {} as any,
    networkInfo: {}
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  function validateTxidListMap(
    engine: CurrencyEngine<FakeTools, SafeCommonWalletInfo>
  ) {
    const tokenIds = [null, '6b175474e89094c44da98b954eedeac495271d0f']
    for (const tokenId of tokenIds) {
      const safeTokenId = tokenId ?? ''
      const transactionList = engine.transactionList[safeTokenId]
      const txidList = engine.txIdList[safeTokenId]
      const txidMap = engine.txIdMap[safeTokenId]
      assert(transactionList.length === txidList.length)
      // Ensure txidlist and transactionList is in order
      for (let i = 0; i < txidList.length; i++) {
        assert(txidList[i] === transactionList[i].txid)
        if (i === 0) continue
        assert(transactionList[i].date < transactionList[i - 1].date)
      }

      // Ensure txidMap properly maps to transactionList
      for (const txid in txidMap) {
        const idx = txidMap[txid]
        assert(transactionList[idx].txid === txid)
      }
    }
  }
  describe('Test transaction list updating', () => {
    // @ts-expect-error
    let engine
    beforeEach(() => {
      engine = new CurrencyEngine(
        env,
        new FakeTools(),
        {
          id: '',
          type: '',
          keys: { publicKey: 'hi' }
        },
        currencyEngineOptions
      )
      engine.walletLocalData = asWalletLocalData({ publicKey: '0x123456' })

      for (const tx of engineTestTxs.ETH) {
        // @ts-expect-error
        engine.addTransaction(null, tx, tx.date)
      }
      for (const tx of engineTestTxs.DAI) {
        engine.addTransaction(
          '6b175474e89094c44da98b954eedeac495271d0f',
          // @ts-expect-error
          tx,
          tx.date
        )
      }
    })

    it('addTransaction', () => {
      // @ts-expect-error
      assert(engine.transactionList[''][0].date === 1555590000)
      // @ts-expect-error
      assert(engine.transactionList[''][1].date === 1555580000)
      // @ts-expect-error
      assert(engine.transactionList[''][2].date === 1555570000)
      // @ts-expect-error
      assert(engine.transactionList[''][3].date === 1555560000)
      // @ts-expect-error
      assert(engine.transactionList[''][4].date === 1555550000)
      assert(
        // @ts-expect-error
        engine.transactionList['6b175474e89094c44da98b954eedeac495271d0f'][0]
          .date === 1555690000
      )
      assert(
        // @ts-expect-error
        engine.transactionList['6b175474e89094c44da98b954eedeac495271d0f'][1]
          .date === 1555680000
      )
      assert(
        // @ts-expect-error
        engine.transactionList['6b175474e89094c44da98b954eedeac495271d0f'][2]
          .date === 1555670000
      )
      assert(
        // @ts-expect-error
        engine.transactionList['6b175474e89094c44da98b954eedeac495271d0f'][3]
          .date === 1555660000
      )
      assert(
        // @ts-expect-error
        engine.transactionList['6b175474e89094c44da98b954eedeac495271d0f'][4]
          .date === 1555650000
      )
      // @ts-expect-error
      validateTxidListMap(engine)
    })

    it('Updating transaction causing re-sort', () => {
      const updatedTx: any = {
        txid: '003',
        date: 1555540000,
        nativeAmount: '-1',
        ourReceiveAddresses: [],
        blockHeight: 0,
        tokenId: null,
        otherParams: {}
      }

      // @ts-expect-error
      engine.addTransaction(null, updatedTx, updatedTx.date)
      // @ts-expect-error
      assert(engine.transactionList[''][0].txid === '005')
      // @ts-expect-error
      assert(engine.transactionList[''][1].txid === '004')
      // @ts-expect-error
      assert(engine.transactionList[''][2].txid === '002')
      // @ts-expect-error
      assert(engine.transactionList[''][3].txid === '001')
      // @ts-expect-error
      assert(engine.transactionList[''][4].txid === '003')
      // @ts-expect-error
      validateTxidListMap(engine)
    })

    it('Confirm transactions and check none dropped', () => {
      const updatedTxs: any[] = [
        {
          txid: '001',
          date: 1555550000,
          nativeAmount: '-1',
          ourReceiveAddresses: [],
          blockHeight: 1,
          otherParams: {}
        },
        {
          txid: '003',
          date: 1555570000,
          nativeAmount: '-1',
          ourReceiveAddresses: [],
          blockHeight: 2,
          otherParams: {}
        }
      ]
      for (const tx of updatedTxs) {
        // @ts-expect-error
        engine.addTransaction(null, tx, tx.date)
      }
      // @ts-expect-error
      engine.checkDroppedTransactions(1555590000)
      // @ts-expect-error
      assert(engine.transactionList[''][0].txid === '005')
      // @ts-expect-error
      assert(engine.transactionList[''][1].txid === '004')
      // @ts-expect-error
      assert(engine.transactionList[''][2].txid === '003')
      // @ts-expect-error
      assert(engine.transactionList[''][2].blockHeight === 2)
      // @ts-expect-error
      assert(engine.transactionList[''][3].txid === '002')
      // @ts-expect-error
      assert(engine.transactionList[''][4].txid === '001')
      // @ts-expect-error
      assert(engine.transactionList[''][4].blockHeight === 1)
      // @ts-expect-error
      validateTxidListMap(engine)
    })

    it('Confirm transactions and check dropped', () => {
      const updatedTxs: any[] = [
        {
          txid: '001',
          date: 1555550000,
          nativeAmount: '-1',
          ourReceiveAddresses: [],
          blockHeight: 1,
          otherParams: {}
        },
        {
          txid: '002',
          date: 1555560000,
          nativeAmount: '-1',
          ourReceiveAddresses: [],
          blockHeight: 0,
          otherParams: {}
        },
        {
          txid: '003',
          date: 1555570000,
          nativeAmount: '-1',
          ourReceiveAddresses: [],
          blockHeight: 2,
          otherParams: {}
        }
      ]
      for (const tx of updatedTxs) {
        // @ts-expect-error
        engine.addTransaction(null, tx, tx.date)
      }
      // @ts-expect-error
      engine.checkDroppedTransactions(1555656401)
      // @ts-expect-error
      assert(engine.transactionList[''].length === 5)
      // @ts-expect-error
      assert(engine.transactionList[''][0].txid === '005')
      // @ts-expect-error
      assert(engine.transactionList[''][1].txid === '004')
      // @ts-expect-error
      assert(engine.transactionList[''][2].txid === '003')
      // @ts-expect-error
      assert(engine.transactionList[''][2].blockHeight === 2)
      // @ts-expect-error
      assert(engine.transactionList[''][3].txid === '002')
      // @ts-expect-error
      assert(engine.transactionList[''][3].blockHeight === -1)
      // @ts-expect-error
      assert(engine.transactionList[''][4].txid === '001')
      // @ts-expect-error
      assert(engine.transactionList[''][4].blockHeight === 1)
      // @ts-expect-error
      validateTxidListMap(engine)
    })

    it('Confirm transactions and check dropped 2', () => {
      const updatedTxs: any[] = [
        {
          txid: '001',
          date: 1555550000,
          nativeAmount: '-1',
          ourReceiveAddresses: [],
          blockHeight: 1,
          otherParams: {}
        },
        {
          txid: '003',
          date: 1555570000,
          nativeAmount: '-1',
          ourReceiveAddresses: [],
          blockHeight: 2,
          otherParams: {}
        }
      ]
      for (const tx of updatedTxs) {
        // @ts-expect-error
        engine.addTransaction(null, tx, 1555590000)
      }
      const updateTx: any = {
        txid: '002',
        date: 1555560000,
        nativeAmount: '1',
        ourReceiveAddresses: ['0x123456'],
        blockHeight: 0,
        otherParams: {}
      }
      // @ts-expect-error
      engine.addTransaction(null, updateTx, 1555666401)

      // @ts-expect-error
      engine.checkDroppedTransactions(1555666401)
      // @ts-expect-error
      assert(engine.transactionList[''].length === 5)
      // @ts-expect-error
      assert(engine.transactionList[''][0].txid === '005')
      // @ts-expect-error
      assert(engine.transactionList[''][1].txid === '004')
      // @ts-expect-error
      assert(engine.transactionList[''][1].blockHeight === -1)
      // @ts-expect-error
      assert(engine.transactionList[''][2].txid === '003')
      // @ts-expect-error
      assert(engine.transactionList[''][2].blockHeight === 2)
      // @ts-expect-error
      assert(engine.transactionList[''][3].txid === '002')
      // @ts-expect-error
      assert(engine.transactionList[''][3].blockHeight === 0)
      // @ts-expect-error
      assert(engine.transactionList[''][4].txid === '001')
      // @ts-expect-error
      assert(engine.transactionList[''][4].blockHeight === 1)
      // @ts-expect-error
      validateTxidListMap(engine)
    })
  })
})
