// @flow

import { assert } from 'chai'
import {
  type EdgeCorePluginOptions,
  type EdgeCurrencyEngine,
  type EdgeCurrencyEngineCallbacks,
  type EdgeCurrencyEngineOptions,
  type EdgeCurrencyPlugin,
  type EdgeWalletInfo,
  closeEdge,
  makeFakeIo
} from 'edge-core-js'
import EventEmitter from 'events'
import { before, describe, it } from 'mocha'
import fetch from 'node-fetch'

import edgeCorePlugins from '../../src/index.js'
import { fakeLog } from '../fakeLog.js'

describe(`EOS activation`, function () {
  let engine: EdgeCurrencyEngine

  const fakeIo = makeFakeIo()
  const opts: EdgeCorePluginOptions = {
    initOptions: {},
    io: { ...fakeIo, fetch, random: size => new Uint8Array(size) },
    nativeIo: {},
    log: fakeLog,
    pluginDisklet: fakeIo.disklet
  }
  const factory = edgeCorePlugins.eos
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
    onStakingStatusChanged() {},
    onTransactionsChanged(transactionList) {
      // console.log('onTransactionsChanged:', transactionList)
      emitter.emit('onTransactionsChanged', transactionList)
    },
    onAddressChanged() {
      emitter.emit('addressChanged')
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
    walletLocalEncryptedDisklet: walletLocalDisklet
  }

  const info: EdgeWalletInfo = {
    id: '1',
    type: 'wallet:eos',
    keys: {
      eosOwnerKey: '5JeBUyDfnUBceFyzaCSebkoBKiWwDpyMRggGuGdtepbPpSQDTCM',
      ownerPublicKey: 'EOS6gjtwHjdLKQTrPzWSmeDeLXMgxMC6oSGu6xZJNmgTa7iTCNrNn',
      eosKey: '5KZC4UX62kNn5yQZ9w4F5iScJDo3i95Yn9VExYzrVidDy8zwfxY',
      publicKey: 'EOS74z74w1fjuUQBNFGRzTeGHcBFkzxKFugR9nvEp5ADfkyhWHpXE'
    }
  }

  before('Engine', function () {
    return plugin
      .makeCurrencyEngine(info, currencyEngineOptions)
      .then(result => {
        engine = result
      })
  })

  it.skip('getSupportedCurrencies', async function () {
    if (plugin.otherMethods) {
      const result =
        await plugin.otherMethods.getActivationSupportedCurrencies()
      assert.equal(result.BTC, true)
      assert.equal(result.LTC, true)
    } else {
      assert.equal(0, 1)
    }
  })

  it('getActivationCost', async function () {
    this.timeout(10000)
    if (plugin.otherMethods) {
      const result = await plugin.otherMethods.getActivationCost('EOS')
      const cost = Number(result)
      assert.equal(cost > 0.01, true)
    } else {
      assert.equal(0, 1)
    }
  })

  // it('getAccountActivationQuote', async function () {
  //   if (plugin.otherMethods) {
  //     const params = {
  //       requestedAccountName: 'qpalzmwo5142',
  //       currencyCode: 'BTC',
  //       ownerPublicKey: engine.walletInfo.keys.ownerPublicKey,
  //       activePublicKey: engine.walletInfo.keys.publicKey
  //     }
  //     const now = Date.now() / 1000
  //     const result = await engine.otherMethods.getAccountActivationQuote(params)
  //     assert.equal(typeof result, 'object')
  //     assert.equal(typeof result.amount, 'string')
  //     assert.equal(result.currencyCode, 'BTC')
  //     assert.equal(result.expireTime > now, true)
  //     assert.equal(result.paymentAddress.length > 10, true)
  //   } else {
  //     assert.equal(0, 1)
  //   }
  // })

  describe('killEngine...', function () {
    it('Should stop the engine', function (done) {
      engine.killEngine().then(() => {
        closeEdge()
        done()
      })
    })
  })
})
