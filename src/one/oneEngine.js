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
import { getOtherParams, validateObject } from '../common/utils.js'
import { OnePlugin } from './onePlugin.js'
import {
  type OneBalanceChange,
  type OneGetLastHeader,
  type OneGetTransaction,
  type OneGetTransactions,
  type OneWalletOtherData
} from './oneTypes.js'
import { currencyInfo } from './oneInfo'
import { OneGetTransactionSchema } from '../one/oneSchema'

const ADDRESS_POLL_MILLISECONDS = 10000
const BLOCKHEIGHT_POLL_MILLISECONDS = 15000
const TRANSACTION_POLL_MILLISECONDS = 3000

const PRIMARY_CURRENCY = currencyInfo.currencyCode

const maxAttempts = 5

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

  async checkServerInfoInnerLoop() {
    try {
      const res: OneGetLastHeader = await this.onePlugin.harmonyApi.blockchain.messenger.send(
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

      ourReceiveAddresses.push(tx.to)

      let name

      if (this.walletLocalData.publicKey === tx.to) {
        name = tx.from
      } else {
        name = tx.to
      }

      let nativeAmount = String(Number(tx.value))

      const networkFee = bns.mul(tx.gas, tx.gasPrice)

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
        networkFee: String(networkFee),
        ourReceiveAddresses,
        signedTx: '',
        otherParams: {},
        metadata: {
          name
        }
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

      const res: OneGetLastHeader = await this.onePlugin.harmonyApi.blockchain.messenger.send(
        'hmyv2_getTransactionsCount',
        [address, 'ALL']
      )

      const num = res.result

      if (num > this.otherData.numberTransactions) {
        this.tokenCheckTransactionsStatus.ONE = 0.5

        const res: OneGetTransactions = await this.onePlugin.harmonyApi.blockchain.messenger.send(
          'hmyv2_getTransactionsHistory',
          [
            {
              address: address,
              pageIndex: 0,
              pageSize: 100,
              fullTx: true,
              txType: 'ALL',
              order: 'ASC'
            }
          ]
        )

        if (res.result && Array.isArray(res.result.transactions)) {
          res.result.transactions.forEach(tx => this.processOneTransaction(tx))
        }

        if (this.transactionsChangedArray.length > 0) {
          this.currencyEngineCallbacks.onTransactionsChanged(
            this.transactionsChangedArray
          )

          this.transactionsChangedArray = []
        }

        this.otherData.numberTransactions = num
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

      const res: OneBalanceChange = await this.onePlugin.harmonyApi.blockchain.getBalance(
        {
          address
        }
      )

      const balance = new this.onePlugin.harmonyApi.utils.Unit(res.result)
        .asOne()
        .toEther()

      this.walletLocalData.totalBalances.ONE = balance

      // this.tokenCheckBalanceStatus.ONE = 1
      // this.updateOnAddressesChecked()

      this.currencyEngineCallbacks.onBalanceChanged('ONE', balance)
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
    try {
      await this.onePlugin.connectApi(this.walletId)
    } catch (e) {
      this.log(`Error connecting to server`, String(e))
      setTimeout(() => {
        if (this.engineOn) {
          this.startEngine()
        }
      }, 10000)
      return
    }
    this.addToLoop('checkServerInfoInnerLoop', BLOCKHEIGHT_POLL_MILLISECONDS)
    this.addToLoop('checkAccountInnerLoop', ADDRESS_POLL_MILLISECONDS)
    this.addToLoop('checkTransactionsInnerLoop', TRANSACTION_POLL_MILLISECONDS)
    super.startEngine()
  }

  async killEngine() {
    await super.killEngine()
    await this.onePlugin.disconnectApi(this.walletId)
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

    const { nativeNetworkFee, gasLimit, gasPrice } = this.otherData

    const totalTxAmount = bns.add(nativeNetworkFee, nativeAmount)

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

    nativeAmount = bns.add(nativeAmount, nativeNetworkFee)
    nativeAmount = '-' + nativeAmount

    const edgeTransaction: EdgeTransaction = {
      txid: '', // txid
      date: 0, // date
      currencyCode, // currencyCode
      blockHeight: 0, // blockHeight
      nativeAmount, // nativeAmount
      networkFee: nativeNetworkFee, // networkFee
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

    const signedTransaction = await this.onePlugin.harmonyApi.wallet.signTransaction(
      harmonyTx,
      signer
    )

    edgeTransaction.signedTx = signedTransaction.getRawTransaction()
    edgeTransaction.date = Date.now() / 1000

    this.log('ONE Payment transaction signed...')

    return edgeTransaction
  }

  async broadcastTx(
    edgeTransaction: EdgeTransaction
  ): Promise<EdgeTransaction> {
    const signedTransaction = await this.onePlugin.harmonyApi.transactions.recover(
      edgeTransaction.signedTx
    )

    const [sentTxn, txnHash] = await signedTransaction.sendTransaction()

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
