// @flow

import EventEmitter from 'events'

import { assert } from 'chai'
import { downgradeDisklet } from 'disklet'
import { destroyAllContexts, makeFakeIos } from 'edge-core-js'
import type {
  EdgeCurrencyEngineCallbacks,
  EdgeCurrencyEngineOptions,
  EdgeWalletInfo
} from 'edge-core-js'
import { describe, it } from 'mocha'
import fetch from 'node-fetch'

import * as Factories from '../../src/index.js'
import fixtures from './fixtures.json'

for (const fixture of fixtures) {
  const CurrencyPluginFactory = Factories[fixture['factory']]
  const WALLET_TYPE = fixture['WALLET_TYPE']
  // const TX_AMOUNT = fixture['TX_AMOUNT']

  let plugin, keys, engine
  const emitter = new EventEmitter()
  const [fakeIo] = makeFakeIos(1)
  // $FlowFixMe
  fakeIo.fetch = fetch
  const myIo = {
    random: size => fixture['key']
  }
  const opts = {
    io: Object.assign({}, fakeIo, myIo)
  }

  // const context = makeEdgeContext({ io: fakeIo, plugins })

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
  const walletLocalFolder = downgradeDisklet(walletLocalDisklet)
  const currencyEngineOptions: EdgeCurrencyEngineOptions = {
    callbacks,
    walletLocalDisklet,
    walletLocalEncryptedDisklet: walletLocalDisklet,
    walletLocalEncryptedFolder: walletLocalFolder,
    walletLocalFolder
  }

  describe(`Create Plugin for Wallet type ${WALLET_TYPE}`, function () {
    it('Plugin', async function () {
      const currencyPlugin = await CurrencyPluginFactory.makePlugin(opts)
      assert.equal(
        currencyPlugin.currencyInfo.currencyCode,
        fixture['Test Currency code']
      )
      plugin = currencyPlugin
      keys = await plugin.createPrivateKey(WALLET_TYPE)
      const info: EdgeWalletInfo = {
        id: '1',
        type: WALLET_TYPE,
        keys
      }
      const keys2 = await plugin.derivePublicKey(info)
      keys = Object.assign(keys, keys2)
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
      return plugin
        .makeEngine(info, currencyEngineOptions)
        .then(e => {
          engine = e
          assert.equal(typeof engine.startEngine, 'function', 'startEngine')
          assert.equal(typeof engine.killEngine, 'function', 'killEngine')
          assert.equal(
            typeof engine.getBlockHeight,
            'function',
            'getBlockHeight'
          )
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
        .catch(e => {
          console.log(e)
          assert.equal(0, 1)
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
        destroyAllContexts()
        engine = undefined
        plugin = undefined
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
