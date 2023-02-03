import { add, gte } from 'biggystring'
import { assert } from 'chai'
import {
  closeEdge,
  EdgeCorePluginOptions,
  EdgeCurrencyEngineCallbacks,
  EdgeCurrencyEngineOptions,
  EdgeCurrencyPlugin,
  EdgeSpendInfo,
  EdgeTransaction,
  EdgeWalletInfo,
  makeFakeIo
} from 'edge-core-js'
import EventEmitter from 'events'
import { before, describe, it } from 'mocha'
import fetch from 'node-fetch'

import edgeCorePlugins from '../../src/index'
import { TezosEngine } from '../../src/tezos/tezosEngine'
import { fakeLog } from '../fake/fakeLog'

describe(`Tezos engine`, function () {
  const fakeIo = makeFakeIo()
  const opts: EdgeCorePluginOptions = {
    initOptions: {},
    io: { ...fakeIo, fetch, random: size => new Uint8Array(size) },
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
    onStakingStatusChanged() {},
    onTransactionsChanged(transactionList) {
      emitter.emit('onTransactionsChanged', transactionList)
    },
    onAddressChanged() {
      emitter.emit('addressChanged')
    },
    onUnactivatedTokenIdsChanged() {},
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
      assert.equal(gte(engine.walletLocalData.totalBalances.XTZ, '0'), true)
    } else {
      assert.equal(0, 1)
    }
  })
  const edgeSpendInfo: EdgeSpendInfo = {
    currencyCode: 'XTZ',
    spendTargets: [
      {
        nativeAmount: '3000000',
        publicAddress: 'tz3RDC3Jdn4j15J7bBHZd29EUee9gVB1CxD9'
      }
    ]
  }
  let edgeTransaction: EdgeTransaction
  it('should create a transaction', async function () {
    engine.walletLocalData.totalBalances.XTZ = '4000000'
    this.timeout(10000)
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (engine) {
      edgeTransaction = await engine.makeSpend(edgeSpendInfo)
      assert.equal(
        add(edgeTransaction.nativeAmount, edgeTransaction.networkFee) ===
          '-3000000',
        true
      )
    } else {
      assert.equal(0, 1)
    }
  })
  it('should sign a transaction', async function () {
    edgeTransaction = {
      txid: '',
      date: 0,
      currencyCode: 'XTZ',
      blockHeight: 0,
      nativeAmount: '-3002650',
      networkFee: '2650',
      ourReceiveAddresses: ['tz3RDC3Jdn4j15J7bBHZd29EUee9gVB1CxD9'],
      signedTx: '',
      otherParams: {
        idInternal: 0,
        fromAddress: 'tz1TC6ETpRC1awG3Sq226TgMx4wHbJRTzod6',
        toAddress: 'tz3RDC3Jdn4j15J7bBHZd29EUee9gVB1CxD9',
        fullOp: {
          opbytes:
            'f1afab4d0508bf29f0bb162c74134d315986c7fcffd4c3af386619fad5547f9f07000052d9258b002678631bada74ab0d31f948288a2a1940ac0c066904e0000321e7b03dcf0e1baf805f2a393828fefcb519797b7abb29f9280c1956a0129bf08000052d9258b002678631bada74ab0d31f948288a2a1c60ac1c066e8529502c08db7010002358cbffa97149631cfb999fa47f0035fb1ea863600',
          opOb: {
            branch: 'BMYitJkbEYD9qEP8NRF4GQHUHsRcKXos8wzSf282Ly9R2p7sknb',
            contents: [
              {
                kind: 'reveal',
                fee: '1300',
                public_key:
                  'edpku2JAJHC6k68KpUjzL6FsekWczHKDopgCBgxtkViof3iFYiFJN1',
                source: 'tz1TC6ETpRC1awG3Sq226TgMx4wHbJRTzod6',
                gas_limit: '10000',
                storage_limit: '0',
                counter: '1679424'
              },
              {
                kind: 'transaction',
                fee: '1350',
                gas_limit: '10600',
                storage_limit: '277',
                amount: '3000000',
                destination: 'tz3RDC3Jdn4j15J7bBHZd29EUee9gVB1CxD9',
                source: 'tz1TC6ETpRC1awG3Sq226TgMx4wHbJRTzod6',
                counter: '1679425'
              }
            ],
            protocol: 'Pt24m4xiPbLDhVgVfABUjirbmda3yohdN82Sp9FeuAXJ4eV9otd'
          }
        }
      },
      walletId: ''
    }
    const signedOpBytes =
      'f1afab4d0508bf29f0bb162c74134d315986c7fcffd4c3af386619fad5547f9f07000052d9258b002678631bada74ab0d31f948288a2a1940ac0c066904e0000321e7b03dcf0e1baf805f2a393828fefcb519797b7abb29f9280c1956a0129bf08000052d9258b002678631bada74ab0d31f948288a2a1c60ac1c066e8529502c08db7010002358cbffa97149631cfb999fa47f0035fb1ea863600e742a0adcfa27c0198bc767e6cc0fe5bcd578ccc9afaa4d9f7a00a85ae818d0022579535018862412bea95b758fd19bf21d4cea7a9548998683c912d2ded6804'
    this.timeout(10000)
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (engine) {
      edgeTransaction = await engine.signTx(edgeTransaction)
      assert.equal(edgeTransaction.signedTx === signedOpBytes, true)
      const { otherParams = {} } = edgeTransaction
      assert.equal(otherParams.fullOp.opbytes, signedOpBytes)
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
