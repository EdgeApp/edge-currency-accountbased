// @flow

import { bns } from 'biggystring'
import {
  type EdgeCurrencyEngineOptions,
  type EdgeSpendInfo,
  type EdgeTransaction,
  type EdgeWalletInfo,
  InsufficientFundsError,
  NoAmountSpecifiedError
} from 'edge-core-js/types'

import { CurrencyEngine } from '../common/engine.js'
import {
  asyncWaterfall,
  getOtherParams,
  validateObject
} from '../common/utils.js'
import { OneGetTransactionSchema } from '../one/oneSchema'
import { currencyInfo } from './oneInfo'
import { OnePlugin } from './onePlugin.js'
import {
  type OneBalanceChange,
  type OneGetLastHeader,
  type OneGetTransaction,
  type OneGetTransactions,
  type OneWalletOtherData
} from './oneTypes.js'

const ADDRESS_POLL_MILLISECONDS = 10000
const BLOCKHEIGHT_POLL_MILLISECONDS = 15000
const TRANSACTION_POLL_MILLISECONDS = 3000

const PRIMARY_CURRENCY = currencyInfo.currencyCode

const maxAttempts = 5

type harmonyActions =
  | 'hmyv2_latestHeader'
  | 'hmyv2_getTransactionsCount'
  | 'hmyv2_getTransactionsHistory'
  | 'getBalance'
  | 'signTransaction'
  | 'sendTransaction'

export class OneEngine extends CurrencyEngine {
  onePlugin: OnePlugin
  otherData: OneWalletOtherData
  // callbacksSetup: boolean

  constructor(
    currencyPlugin: OnePlugin,
    walletInfo: EdgeWalletInfo,
    opts: EdgeCurrencyEngineOptions
  ) {
    super(currencyPlugin, walletInfo, opts)
    this.onePlugin = currencyPlugin
    // this.callbacksSetup = false
  }

  async multicastServers(
    actionName: harmonyActions,
    params?: any
  ): Promise<any> {
    const { oneServers } = this.currencyInfo.defaultSettings.otherSettings
    const { harmonyApi } = this.onePlugin
    let funcs = []

    switch (actionName) {
      case 'hmyv2_latestHeader':
      case 'hmyv2_getTransactionsCount':
      case 'hmyv2_getTransactionsHistory':
        funcs = oneServers.map(apiUrl => async () => {
          harmonyApi.blockchain.messenger.provider.url = apiUrl

          const res = await harmonyApi.blockchain.messenger.send(
            actionName,
            params
          )

          return res
        })
        break

      case 'getBalance':
        funcs = oneServers.map(apiUrl => async () => {
          harmonyApi.blockchain.messenger.provider.url = apiUrl

          const res = await harmonyApi.blockchain.getBalance(params)

          return res
        })
        break

      case 'signTransaction':
        funcs = oneServers.map(apiUrl => async () => {
          harmonyApi.blockchain.messenger.provider.url = apiUrl

          const res = await harmonyApi.wallet.signTransaction(params)

          return res
        })
        break

      case 'sendTransaction':
        funcs = oneServers.map(apiUrl => async () => {
          harmonyApi.blockchain.messenger.provider.url = apiUrl

          const signedTransaction = await harmonyApi.transactions.recover(
            params
          )

          const res = await signedTransaction.sendTransaction()

          return res
        })
        break
    }

    const result = await asyncWaterfall(funcs)

    return result
  }

  async checkServerInfoInnerLoop() {
    try {
      const res: OneGetLastHeader = await this.multicastServers(
        'hmyv2_latestHeader',
        []
      )

      if (
        res.result &&
        this.walletLocalData.blockHeight !== res.result.blockNumber
      ) {
        this.checkDroppedTransactionsThrottled()
        this.walletLocalData.blockHeight = res.result.blockNumber // Convert to decimal
        this.walletLocalDataDirty = true
        this.currencyEngineCallbacks.onBlockHeightChanged(
          this.walletLocalData.blockHeight
        )
      }
    } catch (e) {
      this.log(
        `ONE checkServerInfoInnerLoop e.message: ${JSON.stringify(e.message)}`
      )
    }
  }

  processOneTransaction(tx: OneGetTransaction) {
    const valid = validateObject(tx, OneGetTransactionSchema)
    if (valid) {
      const currencyCode = PRIMARY_CURRENCY
      const ourReceiveAddresses: Array<string> = []

      let nativeAmount = bns.add('0', tx.value)

      const networkFee = bns.mul(tx.gas, tx.gasPrice)

      if (this.walletLocalData.publicKey === tx.to) {
        ourReceiveAddresses.push(tx.to)
      }

      if (tx.to !== this.walletLocalData.publicKey) {
        nativeAmount = '-' + bns.add(tx.value, networkFee)
      }

      const date = Number(tx.timestamp)

      const edgeTransaction: EdgeTransaction = {
        txid: tx.hash,
        date,
        currencyCode,
        blockHeight: Number(tx.blockNumber),
        nativeAmount,
        networkFee: networkFee,
        ourReceiveAddresses,
        signedTx: '',
        otherParams: {},
        metadata: {}
      }

      this.addTransaction(currencyCode, edgeTransaction)
    } else {
      this.log('ONE Invalid transaction data')
    }
  }

  async checkTransactionsInnerLoop() {
    try {
      const address = this.walletLocalData.publicKey
      // const blockHeight = this.walletLocalData.blockHeight
      // let startBlock: number = 0

      if (!this.otherData.numberTransactions) {
        this.otherData.numberTransactions = 0
      }

      const res: OneGetLastHeader = await this.multicastServers(
        'hmyv2_getTransactionsCount',
        [address, 'ALL']
      )

      const txsCount = Object.keys(res.result).length

      if (txsCount > this.otherData.numberTransactions) {
        this.tokenCheckTransactionsStatus.ONE = 0.5

        let pageIndex = 0
        const pageSize = 100

        while (pageIndex * pageSize < txsCount) {
          const res: OneGetTransactions = await this.multicastServers(
            'hmyv2_getTransactionsHistory',
            [
              {
                address: address,
                pageIndex,
                pageSize,
                fullTx: true,
                txType: 'ALL',
                order: 'DESC'
              }
            ]
          )

          pageIndex++

          if (res.result && Array.isArray(res.result.transactions)) {
            res.result.transactions.forEach(tx =>
              this.processOneTransaction(tx)
            )
          }
        }

        if (this.transactionsChangedArray.length > 0) {
          this.currencyEngineCallbacks.onTransactionsChanged(
            this.transactionsChangedArray
          )

          this.transactionsChangedArray = []
        }

        this.otherData.numberTransactions = txsCount
        this.walletLocalDataDirty = true

        this.tokenCheckTransactionsStatus.ONE = 1

        this.updateOnAddressesChecked()
      }
    } catch (e) {
      this.log(`ONE Error fetching address info: ${JSON.stringify(e)}`)
      this.log(`ONE e.code: ${JSON.stringify(e.code)}`)
      this.log(`ONE e.message: ${JSON.stringify(e.message)}`)
    }
  }

  async checkUnconfirmedTransactionsFetch() {}

  // Check all account balance and other relevant info
  async checkAccountInnerLoop() {
    try {
      const address = this.walletLocalData.publicKey

      const res: OneBalanceChange = await this.multicastServers('getBalance', {
        address
      })

      const balance = new this.onePlugin.harmonyApi.utils.Unit(res.result)
        .asOne()
        .toEther()

      if (this.walletLocalData.totalBalances.ONE !== balance) {
        this.walletLocalData.totalBalances.ONE = balance

        this.currencyEngineCallbacks.onBalanceChanged('ONE', balance)
        // this.tokenCheckBalanceStatus.ONE = 1
        // this.updateOnAddressesChecked()
      }
    } catch (e) {
      this.log(`ONE Error fetching address info: ${JSON.stringify(e)}`)
      this.log(`ONE e.code: ${JSON.stringify(e.code)}`)
      this.log(`ONE e.message: ${JSON.stringify(e.message)}`)
    }
  }

  async clearBlockchainCache() {
    await super.clearBlockchainCache()
  }

  // ****************************************************************************
  // Public methods
  // ****************************************************************************

  async startEngine() {
    this.engineOn = true

    this.addToLoop('checkServerInfoInnerLoop', BLOCKHEIGHT_POLL_MILLISECONDS)
    this.addToLoop('checkAccountInnerLoop', ADDRESS_POLL_MILLISECONDS)
    this.addToLoop('checkTransactionsInnerLoop', TRANSACTION_POLL_MILLISECONDS)
    super.startEngine()
  }

  async killEngine() {
    await super.killEngine()
  }

  async resyncBlockchain(): Promise<void> {
    await this.killEngine()
    await this.clearBlockchainCache()
    await this.startEngine()
  }

  async makeSpend(edgeSpendInfoIn: EdgeSpendInfo) {
    const { edgeSpendInfo, currencyCode, nativeBalance } = super.makeSpend(
      edgeSpendInfoIn
    )

    if (edgeSpendInfo.spendTargets.length !== 1) {
      throw new Error('Error: only one output allowed')
    }
    const receiverAddress = edgeSpendInfo.spendTargets[0].publicAddress

    let nativeAmount = '0'
    if (typeof edgeSpendInfo.spendTargets[0].nativeAmount === 'string') {
      nativeAmount = edgeSpendInfo.spendTargets[0].nativeAmount
    } else {
      throw new Error('Error: no amount specified')
    }

    if (!nativeAmount || nativeAmount === '0') {
      throw new NoAmountSpecifiedError()
    }

    const { recommendedFee, gasLimit, gasPrice } = this.otherData

    const totalTxAmount = bns.add(recommendedFee, nativeAmount)

    if (bns.gt(totalTxAmount, nativeBalance)) {
      throw new InsufficientFundsError()
    }

    const senderAddress = this.walletLocalData.publicKey

    const txParams = {
      from: senderAddress,
      to: receiverAddress,
      value: nativeAmount,
      gasLimit,
      gasPrice,
      shardID: 0,
      toShardID: 0
    }

    const otherParams = {
      txParams
    }

    nativeAmount = bns.add(nativeAmount, recommendedFee)
    nativeAmount = '-' + nativeAmount

    const edgeTransaction: EdgeTransaction = {
      txid: '', // txid
      date: 0, // date
      currencyCode, // currencyCode
      blockHeight: 0, // blockHeight
      nativeAmount, // nativeAmount
      networkFee: recommendedFee, // networkFee
      ourReceiveAddresses: [], // ourReceiveAddresses
      signedTx: '', // signedTx
      otherParams
    }

    this.log('ONE Payment transaction prepared...')
    return edgeTransaction
  }

  async signTx(edgeTransaction: EdgeTransaction): Promise<EdgeTransaction> {
    const otherParams = getOtherParams(edgeTransaction)

    // Do signing
    const txParams = otherParams.txParams
    const privateKey = this.walletInfo.keys.oneKey

    const signer = await this.onePlugin.harmonyApi.wallet.addByPrivateKey(
      privateKey
    )

    const harmonyTx = await this.onePlugin.harmonyApi.transactions.newTx(
      txParams
    )

    const signedTransaction = await this.multicastServers('signTransaction', [
      harmonyTx,
      signer
    ])

    edgeTransaction.signedTx = signedTransaction.getRawTransaction()
    edgeTransaction.date = Date.now() / 1000

    this.log('ONE Payment transaction signed...')

    return edgeTransaction
  }

  async broadcastTx(
    edgeTransaction: EdgeTransaction
  ): Promise<EdgeTransaction> {
    const [sentTxn, txnHash] = await this.multicastServers(
      'sendTransaction',
      edgeTransaction.signedTx
    )

    edgeTransaction.txid = txnHash

    await sentTxn.confirm(txnHash, maxAttempts)

    this.log('ONE Payment transaction confirmed...')

    return edgeTransaction
  }

  getDisplayPrivateSeed() {
    if (this.walletInfo.keys && this.walletInfo.keys.oneMnemonic) {
      return this.walletInfo.keys.oneMnemonic
    }

    if (this.walletInfo.keys && this.walletInfo.keys.oneKey) {
      return this.walletInfo.keys.oneKey
    }
    return ''
  }

  getDisplayPublicSeed() {
    if (this.walletInfo.keys && this.walletInfo.keys.publicKey) {
      return this.walletInfo.keys.publicKey
    }
    return ''
  }
}

export { CurrencyEngine }
