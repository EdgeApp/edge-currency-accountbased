// @flow
import EventEmitter from 'events'
import { makeFakeIos, destroyAllContexts } from 'edge-core-js'
import type {
  // EdgeSpendInfo,
  EdgeWalletInfo,
  EdgeCurrencyEngineOptions,
  EdgeCurrencyEngineCallbacks
} from 'edge-core-js'
import { describe, it, before } from 'mocha'
import * as Factories from '../../src/index.js'
import { assert } from 'chai'
import fetch from 'node-fetch'

describe(`EOS activation`, function () {
  let plugin: any
  let engine: any
  const emitter = new EventEmitter()
  const [fakeIo] = makeFakeIos(1)
  if (!fakeIo.folder) {
    throw new Error('Missing fakeio.folder')
  }
  const walletLocalFolder = fakeIo.folder
  // $FlowFixMe
  fakeIo.fetch = fetch
  const myIo = {
    random: size => [0]
  }
  const opts: any = {
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

  const currencyEngineOptions: EdgeCurrencyEngineOptions = {
    callbacks,
    walletLocalFolder,
    walletLocalEncryptedFolder: walletLocalFolder
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

  before('Plugin', function (done) {
    Factories.eosCurrencyPluginFactory.makePlugin(opts).then(currencyPlugin => {
      assert.equal(currencyPlugin.currencyInfo.currencyCode, 'EOS')
      plugin = currencyPlugin
      plugin.makeEngine(info, currencyEngineOptions).then(result => {
        engine = result
        done()
      })
    })
  })

  it('getSupportedCurrencies', async function () {
    if (plugin.otherMethods) {
      const result = await plugin.otherMethods.getActivationSupportedCurrencies()
      assert.equal(result.BTC, true)
      assert.equal(result.LTC, true)
    } else {
      assert.equal(0, 1)
    }
  })

  it('getActivationCost', async function () {
    if (plugin.otherMethods) {
      const result = await plugin.otherMethods.getActivationCost()
      const cost = Number(result)
      assert.equal(cost > 0.01, true)
    } else {
      assert.equal(0, 1)
    }
  })

  it('getAccountActivationQuote', async function () {
    if (plugin.otherMethods) {
      const params = {
        requestedAccountName: 'qpalzmwo5142',
        currencyCode: 'BTC',
        ownerPublicKey: engine.walletInfo.keys.ownerPublicKey,
        activePublicKey: engine.walletInfo.keys.publicKey
      }
      const now = Date.now() / 1000
      const result = await engine.otherMethods.getAccountActivationQuote(params)
      assert.equal(typeof result, 'object')
      assert.equal(typeof result.amount, 'string')
      assert.equal(result.currencyCode, 'BTC')
      assert.equal(result.expireTime > now, true)
      assert.equal(result.paymentAddress.length > 10, true)
    } else {
      assert.equal(0, 1)
    }
  })

  describe('killEngine...', function () {
    it('Should stop the engine', function (done) {
      engine.killEngine().then(() => {
        destroyAllContexts()
        done()
      })
    })
  })
})
