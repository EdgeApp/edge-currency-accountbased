// @flow

import { assert, expect } from 'chai'
import {
  type EdgeCorePluginOptions,
  type EdgeCurrencyEngine,
  type EdgeCurrencyEngineCallbacks,
  type EdgeCurrencyEngineOptions,
  type EdgeCurrencyPlugin,
  type EdgeCurrencyTools,
  type EdgeWalletInfo,
  closeEdge,
  makeFakeIo
} from 'edge-core-js'
import EventEmitter from 'events'
import { beforeEach, describe, it } from 'mocha'
import fetch from 'node-fetch'

import { CurrencyEngine } from '../../src/common/engine.js'
import { CurrencyPlugin } from '../../src/common/plugin.js'
import { WalletLocalData } from '../../src/common/types.js'
import { currencyInfo } from '../../src/ethereum/ethInfo.js'
import edgeCorePlugins from '../../src/index.js'
import { fakeLog } from '../fakeLog.js'
import { engineTestTxs } from './engine.txs.js'
import fixtures from './fixtures.js'

for (const fixture of fixtures) {
  let tools: EdgeCurrencyTools
  let engine: EdgeCurrencyEngine
  let keys

  const WALLET_TYPE = fixture.WALLET_TYPE
  // const TX_AMOUNT = fixture['TX_AMOUNT']

  const fakeIo = makeFakeIo()
  const opts: EdgeCorePluginOptions = {
    initOptions: {},
    io: { ...fakeIo, fetch, random: size => fixture.key },
    log: fakeLog,
    nativeIo: {},
    pluginDisklet: fakeIo.disklet
  }
  const factory = edgeCorePlugins[fixture.pluginName]
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
    onTransactionsChanged(transactionList) {
      // console.log('onTransactionsChanged:', transactionList)
      emitter.emit('onTransactionsChanged', transactionList)
    }
  }

  const walletLocalDisklet = fakeIo.disklet
  const currencyEngineOptions: EdgeCurrencyEngineOptions = {
    callbacks,
    log: fakeLog,
    userSettings: undefined,
    walletLocalDisklet,
    walletLocalEncryptedDisklet: walletLocalDisklet
  }

  describe(`Create Plugin for Wallet type ${WALLET_TYPE}`, function() {
    it('Tools', async function() {
      expect(plugin.currencyInfo.currencyCode).equals(
        fixture['Test Currency code']
      )
      return plugin.makeCurrencyTools().then(async currencyTools => {
        tools = currencyTools

        keys = await tools.createPrivateKey(WALLET_TYPE)
        const info: EdgeWalletInfo = {
          id: '1',
          type: WALLET_TYPE,
          keys
        }
        const keys2 = await tools.derivePublicKey(info)
        keys = Object.assign(keys, keys2)
      })
    })
  })

  describe(`Make Engine for Wallet type ${WALLET_TYPE}`, function() {
    it('Make Engine', function() {
      const info: EdgeWalletInfo = {
        id: '1',
        type: WALLET_TYPE,
        keys
      }
      if (!plugin) throw new Error('ErrorNoPlugin')
      return plugin.makeCurrencyEngine(info, currencyEngineOptions).then(e => {
        engine = e
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
        return true
      })
    })
  })

  describe('Start engine', function() {
    it('Get BlockHeight', function(done) {
      this.timeout(10000)
      emitter.once('onBlockHeightChange', height => {
        const thirdPartyHeight = 1578127
        // this validation is not OK for RSK
        if (WALLET_TYPE === 'wallet:eth') {
          assert(height >= thirdPartyHeight, 'Block height')
        }
        if (!engine) throw new Error('ErrorNoEngine')
        const getHeight = engine.getBlockHeight()
        // this validation is not OK for RSK
        if (WALLET_TYPE === 'wallet:eth') {
          assert(getHeight >= thirdPartyHeight, 'Block height')
        }
        assert(getHeight > 0)
        done() // Can be "done" since the promise resolves before the event fires but just be on the safe side
      })
      if (!engine) throw new Error('ErrorNoEngine')
      engine.startEngine().catch(e => {
        console.log('startEngine error', e, e.message)
      })
    })
  })

  describe('Stop the engine', function() {
    it('Should stop the engine', function(done) {
      if (!engine) throw new Error('ErrorNoEngine')
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

const fakeIo = makeFakeIo()
const plugin = new CurrencyPlugin(fakeIo, 'fakePlugin', currencyInfo)
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
  onTransactionsChanged(transactionList) {
    // console.log('onTransactionsChanged:', transactionList)
    emitter.emit('onTransactionsChanged', transactionList)
  }
}

const walletLocalDisklet = fakeIo.disklet
const currencyEngineOptions: EdgeCurrencyEngineOptions = {
  callbacks,
  log: fakeLog,
  userSettings: undefined,
  walletLocalDisklet,
  walletLocalEncryptedDisklet: walletLocalDisklet
}
const walletInfo = { id: '', type: '', keys: {} }

function validateTxidListMap(engine: CurrencyEngine) {
  const ccs = ['ETH', 'DAI']
  for (const currencyCode of ccs) {
    const transactionList = engine.transactionList[currencyCode]
    const txidList = engine.txIdList[currencyCode]
    const txidMap = engine.txIdMap[currencyCode]
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
  let engine
  beforeEach(() => {
    engine = new CurrencyEngine(plugin, walletInfo, currencyEngineOptions)
    engine.walletLocalData = new WalletLocalData(
      '{"publicKey": "0x123456"}',
      'ETH'
    )

    for (const tx of engineTestTxs.ETH) {
      engine.addTransaction('ETH', tx, tx.date)
    }
    for (const tx of engineTestTxs.DAI) {
      engine.addTransaction('DAI', tx, tx.date)
    }
  })

  it('addTransaction', () => {
    assert(engine.transactionList.ETH[0].date === 1555590000)
    assert(engine.transactionList.ETH[1].date === 1555580000)
    assert(engine.transactionList.ETH[2].date === 1555570000)
    assert(engine.transactionList.ETH[3].date === 1555560000)
    assert(engine.transactionList.ETH[4].date === 1555550000)
    assert(engine.transactionList.DAI[0].date === 1555690000)
    assert(engine.transactionList.DAI[1].date === 1555680000)
    assert(engine.transactionList.DAI[2].date === 1555670000)
    assert(engine.transactionList.DAI[3].date === 1555660000)
    assert(engine.transactionList.DAI[4].date === 1555650000)
    assert(engine.walletLocalData.numUnconfirmedSpendTxs === 5)
    validateTxidListMap(engine)
  })

  it('Updating transaction causing re-sort', () => {
    const updatedTx: any = {
      txid: '003',
      date: 1555540000,
      nativeAmount: '-1',
      ourReceiveAddresses: [],
      blockHeight: 0,
      otherParams: {}
    }

    engine.addTransaction('ETH', updatedTx, updatedTx.date)
    assert(engine.transactionList.ETH[0].txid === '005')
    assert(engine.transactionList.ETH[1].txid === '004')
    assert(engine.transactionList.ETH[2].txid === '002')
    assert(engine.transactionList.ETH[3].txid === '001')
    assert(engine.transactionList.ETH[4].txid === '003')
    assert(engine.walletLocalData.numUnconfirmedSpendTxs === 5)
    validateTxidListMap(engine)
  })

  it('Confirm transactions and check none dropped', () => {
    const updatedTxs: Array<any> = [
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
      engine.addTransaction('ETH', tx, tx.date)
    }
    engine.checkDroppedTransactions(1555590000)
    assert(engine.transactionList.ETH[0].txid === '005')
    assert(engine.transactionList.ETH[1].txid === '004')
    assert(engine.transactionList.ETH[2].txid === '003')
    assert(engine.transactionList.ETH[2].blockHeight === 2)
    assert(engine.transactionList.ETH[3].txid === '002')
    assert(engine.transactionList.ETH[4].txid === '001')
    assert(engine.transactionList.ETH[4].blockHeight === 1)
    assert(engine.walletLocalData.numUnconfirmedSpendTxs === 3)
    validateTxidListMap(engine)
  })

  it('Confirm transactions and check dropped', () => {
    const updatedTxs: Array<any> = [
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
      engine.addTransaction('ETH', tx, tx.date)
    }
    engine.checkDroppedTransactions(1555656401)
    assert(engine.transactionList.ETH.length === 5)
    assert(engine.transactionList.ETH[0].txid === '005')
    assert(engine.transactionList.ETH[1].txid === '004')
    assert(engine.transactionList.ETH[2].txid === '003')
    assert(engine.transactionList.ETH[2].blockHeight === 2)
    assert(engine.transactionList.ETH[3].txid === '002')
    assert(engine.transactionList.ETH[3].blockHeight === -1)
    assert(engine.transactionList.ETH[4].txid === '001')
    assert(engine.transactionList.ETH[4].blockHeight === 1)
    assert(engine.walletLocalData.numUnconfirmedSpendTxs === 3)
    validateTxidListMap(engine)
  })

  it('Confirm transactions and check dropped 2', () => {
    const updatedTxs: Array<any> = [
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
      engine.addTransaction('ETH', tx, 1555590000)
    }
    const updateTx: any = {
      txid: '002',
      date: 1555560000,
      nativeAmount: '1',
      ourReceiveAddresses: ['0x123456'],
      blockHeight: 0,
      otherParams: {}
    }
    engine.addTransaction('ETH', updateTx, 1555666401)

    engine.checkDroppedTransactions(1555666401)
    assert(engine.transactionList.ETH.length === 5)
    assert(engine.transactionList.ETH[0].txid === '005')
    assert(engine.transactionList.ETH[1].txid === '004')
    assert(engine.transactionList.ETH[1].blockHeight === -1)
    assert(engine.transactionList.ETH[2].txid === '003')
    assert(engine.transactionList.ETH[2].blockHeight === 2)
    assert(engine.transactionList.ETH[3].txid === '002')
    assert(engine.transactionList.ETH[3].blockHeight === 0)
    assert(engine.transactionList.ETH[4].txid === '001')
    assert(engine.transactionList.ETH[4].blockHeight === 1)
    assert(engine.walletLocalData.numUnconfirmedSpendTxs === 3)
    validateTxidListMap(engine)
  })
})
