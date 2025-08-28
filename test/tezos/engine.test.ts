import { gte } from 'biggystring'
import { assert } from 'chai'
import {
  closeEdge,
  EdgeCorePluginOptions,
  EdgeCurrencyEngineCallbacks,
  EdgeCurrencyEngineOptions,
  EdgeCurrencyPlugin,
  EdgeWalletInfo,
  makeFakeIo
} from 'edge-core-js'
import EventEmitter from 'events'
import { before, describe, it } from 'mocha'
import fetch from 'node-fetch'

import edgeCorePlugins from '../../src/index'
import { TezosEngine } from '../../src/tezos/TezosEngine'
import { fakeLog } from '../fake/fakeLog'

describe(`Tezos engine`, function () {
  const fakeIo = makeFakeIo()
  const opts: EdgeCorePluginOptions = {
    infoPayload: {},
    initOptions: {},
    io: {
      ...fakeIo,
      fetch,
      fetchCors: fetch,
      random: size => new Uint8Array(size)
    },
    log: fakeLog,
    nativeIo: {},
    pluginDisklet: fakeIo.disklet
  }
  const factory = edgeCorePlugins.tezos
  const plugin: EdgeCurrencyPlugin = factory(opts)

  const emitter = new EventEmitter()
  const callbacks: EdgeCurrencyEngineCallbacks = {
    onAddressesChecked(progressRatio) {
      emitter.emit('onAddressesCheck', progressRatio)
    },
    onTxidsChanged(txid) {
      emitter.emit('onTxidsChanged', txid)
    },
    onBalanceChanged(currencyCode, balance) {
      emitter.emit('onBalanceChange', currencyCode, balance)
    },
    onBlockHeightChanged(height) {
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

  let engine: TezosEngine
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

  const info: EdgeWalletInfo = {
    id: '1',
    type: 'wallet:xtz',
    keys: {
      mnemonic:
        'canal head puzzle gravity keep response bulb diagram time oak mesh faith match quit hole sand laptop cycle group crunch say nose border later',
      publicKey: 'tz1TC6ETpRC1awG3Sq226TgMx4wHbJRTzod6',
      publicKeyEd: 'edpku2JAJHC6k68KpUjzL6FsekWczHKDopgCBgxtkViof3iFYiFJN1',
      privateKey:
        'edskSAdy4abu2a7rzfnhmpWxU3oXDT6bP4J1yXywd5NHNSsgBrnhuWjsFpVuqQP8Ce4Je3f5kcVjUuQVN69PWH5fYztc7xcYjJ'
    }
  }

  before('Engine', async function () {
    return await plugin
      .makeCurrencyEngine(info, currencyEngineOptions)
      .then(result => {
        // @ts-expect-error
        engine = result
      })
  })
  it('should get a block height', async function () {
    this.timeout(10000)
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (engine) {
      await engine.checkBlockchainInnerLoop()
      assert.equal(engine.walletLocalData.blockHeight > 10, true)
    } else {
      assert.equal(0, 1)
    }
  })
  it('should get a balance', async function () {
    this.timeout(10000)
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (engine) {
      await engine.checkAccountInnerLoop()
      assert.equal(gte(engine.getBalance({ tokenId: null }), '0'), true)
    } else {
      assert.equal(0, 1)
    }
  })
  describe('killEngine...', function () {
    it('Should stop the engine', function (done) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      engine.killEngine().then(() => {
        closeEdge()
        done()
      })
    })
  })
})
