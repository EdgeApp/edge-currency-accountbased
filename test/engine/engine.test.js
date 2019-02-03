// @flow

import EventEmitter from 'events'

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
import { describe, it } from 'mocha'
import fetch from 'node-fetch'

import edgeCorePlugins from '../../src/index.js'
import fixtures from './fixtures.js'

for (const fixture of fixtures) {
  let tools: EdgeCurrencyTools
  let engine: EdgeCurrencyEngine
  let keys

  const WALLET_TYPE = fixture['WALLET_TYPE']
  // const TX_AMOUNT = fixture['TX_AMOUNT']

  const fakeIo = makeFakeIo()
  const opts: EdgeCorePluginOptions = {
    initOptions: {},
    io: { ...fakeIo, fetch, random: size => fixture['key'] },
    nativeIo: {},
    pluginDisklet: fakeIo.disklet
  }
  const factory = edgeCorePlugins[fixture['pluginName']]
  const plugin: EdgeCurrencyPlugin = factory(opts)

  const emitter = new EventEmitter()
  const callbacks: EdgeCurrencyEngineCallbacks = {
    onAddressesChecked (progressRatio) {
      // console.log('onAddressesCheck', progressRatio)
      emitter.emit('onAddressesCheck', progressRatio)
    },
    onTxidsChanged (txid) {
      // console.log('onTxidsChanged', txid)
      emitter.emit('onTxidsChanged', txid)
    },
    onBalanceChanged (currencyCode, balance) {
      // console.log('onBalanceChange:', currencyCode, balance)
      emitter.emit('onBalanceChange', currencyCode, balance)
    },
    onBlockHeightChanged (height) {
      // console.log('onBlockHeightChange:', height)
      emitter.emit('onBlockHeightChange', height)
    },
    onTransactionsChanged (transactionList) {
      // console.log('onTransactionsChanged:', transactionList)
      emitter.emit('onTransactionsChanged', transactionList)
    }
  }

  const walletLocalDisklet = fakeIo.disklet
  const currencyEngineOptions: EdgeCurrencyEngineOptions = {
    callbacks,
    userSettings: void 0,
    walletLocalDisklet,
    walletLocalEncryptedDisklet: walletLocalDisklet
  }

  describe(`Create Plugin for Wallet type ${WALLET_TYPE}`, function () {
    it('Tools', async function () {
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

  describe(`Make Engine for Wallet type ${WALLET_TYPE}`, function () {
    it('Make Engine', function () {
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

  describe('Start engine', function () {
    it('Get BlockHeight', function (done) {
      this.timeout(10000)
      emitter.once('onBlockHeightChange', height => {
        const thirdPartyHeight = 1578127
        assert(height >= thirdPartyHeight, 'Block height')
        if (!engine) throw new Error('ErrorNoEngine')
        const getHeight = engine.getBlockHeight()
        assert(getHeight >= thirdPartyHeight, 'Block height')
        done() // Can be "done" since the promise resolves before the event fires but just be on the safe side
      })
      if (!engine) throw new Error('ErrorNoEngine')
      engine.startEngine().catch(e => {
        console.log('startEngine error', e, e.message)
      })
    })
  })

  describe('Stop the engine', function () {
    it('Should stop the engine', function (done) {
      if (!engine) throw new Error('ErrorNoEngine')
      engine.killEngine().then(() => {
        closeEdge()
        keys = undefined
        done()
        // $FlowFixMe
        console.warn(process._getActiveRequests())
        // $FlowFixMe
        console.warn(process._getActiveHandles())
      })
    })
  })
}
