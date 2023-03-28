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

import { CurrencyEngine } from '../../src/common/engine'
import { PluginEnvironment } from '../../src/common/innerPlugin'
import { asWalletLocalData, SafeCommonWalletInfo } from '../../src/common/types'
import edgeCorePlugins from '../../src/index'
import { fakeLog } from '../fake/fakeLog'
import { FakeTools } from '../fake/FakeTools'
import { engineTestTxs } from './engine.txs'
import fixtures from './fixtures'

const fakeIo = makeFakeIo()
const opts: EdgeCorePluginOptions = {
  initOptions: {},
  io: { ...fakeIo, fetch },
  log: fakeLog,
  nativeIo: {},
  pluginDisklet: fakeIo.disklet
}

for (const fixture of fixtures) {
  let tools: EdgeCurrencyTools
  let engine: EdgeCurrencyEngine
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
    onStakingStatusChanged() {},
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

  describe(`Create Plugin for Wallet type ${WALLET_TYPE}`, function () {
    it('Tools', async function () {
      expect(plugin.currencyInfo.currencyCode).equals(
        fixture['Test Currency code']
      )
      return await plugin.makeCurrencyTools().then(async currencyTools => {
        tools = currencyTools

        const privateKeys = await tools.createPrivateKey(WALLET_TYPE)
        privateWalletInfo = {
          id: '1',
          type: WALLET_TYPE,
          keys: privateKeys
        }
        const publicKey = await tools.derivePublicKey(privateWalletInfo)
        Object.assign(privateWalletInfo.keys, publicKey)
      })
    })
  })

  describe(`Make Engine for Wallet type ${WALLET_TYPE}`, function () {
    it('Make Engine', async function () {
      if (WALLET_TYPE === 'wallet:fio') this.timeout(60000)
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      if (!plugin) throw new Error('ErrorNoPlugin')
      return await plugin
        .makeCurrencyEngine(privateWalletInfo, currencyEngineOptions)
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
    })
  })

  describe('Start engine', function () {
    it('Get BlockHeight', function (done) {
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      if (!engine) throw new Error('ErrorNoEngine')
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

  describe('Message signing', function () {
    if (fixture.messages == null) return
    it('Should sign a hashed message', async function () {
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      if (!engine) throw new Error('ErrorNoEngine')
      // @ts-expect-error
      const sig = engine.utils.signMessage(
        fixture.messages.eth_sign.param,
        privateWalletInfo.keys
      )
      assert.equal(sig, fixture.messages.eth_sign.signature)
    })
    it('Should sign a typed message', function () {
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      if (!engine) throw new Error('ErrorNoEngine')
      // @ts-expect-error
      const sig = engine.utils.signTypedData(
        fixture.messages.eth_signTypedData.param,
        privateWalletInfo.keys
      )
      assert.equal(sig, fixture.messages.eth_signTypedData.signature)
    })
  })

  describe('Stop the engine', function () {
    it('Should stop the engine', function (done) {
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
  onStakingStatusChanged() {},
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
      engine.addTransaction('ETH', tx, tx.date)
    }
    for (const tx of engineTestTxs.DAI) {
      // @ts-expect-error
      engine.addTransaction('DAI', tx, tx.date)
    }
  })

  it('addTransaction', () => {
    // @ts-expect-error
    assert(engine.transactionList.ETH[0].date === 1555590000)
    // @ts-expect-error
    assert(engine.transactionList.ETH[1].date === 1555580000)
    // @ts-expect-error
    assert(engine.transactionList.ETH[2].date === 1555570000)
    // @ts-expect-error
    assert(engine.transactionList.ETH[3].date === 1555560000)
    // @ts-expect-error
    assert(engine.transactionList.ETH[4].date === 1555550000)
    // @ts-expect-error
    assert(engine.transactionList.DAI[0].date === 1555690000)
    // @ts-expect-error
    assert(engine.transactionList.DAI[1].date === 1555680000)
    // @ts-expect-error
    assert(engine.transactionList.DAI[2].date === 1555670000)
    // @ts-expect-error
    assert(engine.transactionList.DAI[3].date === 1555660000)
    // @ts-expect-error
    assert(engine.transactionList.DAI[4].date === 1555650000)
    // @ts-expect-error
    assert(engine.walletLocalData.numUnconfirmedSpendTxs === 5)
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
      otherParams: {}
    }

    // @ts-expect-error
    engine.addTransaction('ETH', updatedTx, updatedTx.date)
    // @ts-expect-error
    assert(engine.transactionList.ETH[0].txid === '005')
    // @ts-expect-error
    assert(engine.transactionList.ETH[1].txid === '004')
    // @ts-expect-error
    assert(engine.transactionList.ETH[2].txid === '002')
    // @ts-expect-error
    assert(engine.transactionList.ETH[3].txid === '001')
    // @ts-expect-error
    assert(engine.transactionList.ETH[4].txid === '003')
    // @ts-expect-error
    assert(engine.walletLocalData.numUnconfirmedSpendTxs === 5)
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
      engine.addTransaction('ETH', tx, tx.date)
    }
    // @ts-expect-error
    engine.checkDroppedTransactions(1555590000)
    // @ts-expect-error
    assert(engine.transactionList.ETH[0].txid === '005')
    // @ts-expect-error
    assert(engine.transactionList.ETH[1].txid === '004')
    // @ts-expect-error
    assert(engine.transactionList.ETH[2].txid === '003')
    // @ts-expect-error
    assert(engine.transactionList.ETH[2].blockHeight === 2)
    // @ts-expect-error
    assert(engine.transactionList.ETH[3].txid === '002')
    // @ts-expect-error
    assert(engine.transactionList.ETH[4].txid === '001')
    // @ts-expect-error
    assert(engine.transactionList.ETH[4].blockHeight === 1)
    // @ts-expect-error
    assert(engine.walletLocalData.numUnconfirmedSpendTxs === 3)
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
      engine.addTransaction('ETH', tx, tx.date)
    }
    // @ts-expect-error
    engine.checkDroppedTransactions(1555656401)
    // @ts-expect-error
    assert(engine.transactionList.ETH.length === 5)
    // @ts-expect-error
    assert(engine.transactionList.ETH[0].txid === '005')
    // @ts-expect-error
    assert(engine.transactionList.ETH[1].txid === '004')
    // @ts-expect-error
    assert(engine.transactionList.ETH[2].txid === '003')
    // @ts-expect-error
    assert(engine.transactionList.ETH[2].blockHeight === 2)
    // @ts-expect-error
    assert(engine.transactionList.ETH[3].txid === '002')
    // @ts-expect-error
    assert(engine.transactionList.ETH[3].blockHeight === -1)
    // @ts-expect-error
    assert(engine.transactionList.ETH[4].txid === '001')
    // @ts-expect-error
    assert(engine.transactionList.ETH[4].blockHeight === 1)
    // @ts-expect-error
    assert(engine.walletLocalData.numUnconfirmedSpendTxs === 3)
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
    // @ts-expect-error
    engine.addTransaction('ETH', updateTx, 1555666401)

    // @ts-expect-error
    engine.checkDroppedTransactions(1555666401)
    // @ts-expect-error
    assert(engine.transactionList.ETH.length === 5)
    // @ts-expect-error
    assert(engine.transactionList.ETH[0].txid === '005')
    // @ts-expect-error
    assert(engine.transactionList.ETH[1].txid === '004')
    // @ts-expect-error
    assert(engine.transactionList.ETH[1].blockHeight === -1)
    // @ts-expect-error
    assert(engine.transactionList.ETH[2].txid === '003')
    // @ts-expect-error
    assert(engine.transactionList.ETH[2].blockHeight === 2)
    // @ts-expect-error
    assert(engine.transactionList.ETH[3].txid === '002')
    // @ts-expect-error
    assert(engine.transactionList.ETH[3].blockHeight === 0)
    // @ts-expect-error
    assert(engine.transactionList.ETH[4].txid === '001')
    // @ts-expect-error
    assert(engine.transactionList.ETH[4].blockHeight === 1)
    // @ts-expect-error
    assert(engine.walletLocalData.numUnconfirmedSpendTxs === 3)
    // @ts-expect-error
    validateTxidListMap(engine)
  })
})
