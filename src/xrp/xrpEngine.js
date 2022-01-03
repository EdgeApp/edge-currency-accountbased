/**
 * Created by paul on 7/7/17.
 */
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
import { rippleTimeToUnixTime, Wallet } from 'xrpl'

import { CurrencyEngine } from '../common/engine.js'
import { cleanTxLogs, getOtherParams, validateObject } from '../common/utils.js'
import {
  PluginError,
  pluginErrorCodes,
  pluginErrorName
} from '../pluginError.js'
import { currencyInfo } from './xrpInfo.js'
import { XrpPlugin } from './xrpPlugin.js'
import { XrpGetBalancesSchema } from './xrpSchema.js'
import {
  type XrpTransaction,
  type XrpWalletOtherData,
  asFee,
  asGetTransactionsResponse,
  asServerInfo
} from './xrpTypes.js'

const ADDRESS_POLL_MILLISECONDS = 10000
const BLOCKHEIGHT_POLL_MILLISECONDS = 15000
const TRANSACTION_POLL_MILLISECONDS = 3000
const ADDRESS_QUERY_LOOKBACK_BLOCKS = 30 * 60 // ~ one minute

const PRIMARY_CURRENCY = currencyInfo.currencyCode
const MAX_DESTINATION_TAG_LENGTH = 10
const MAX_DESTINATION_TAG_LIMIT = 4294967295

type PaymentJson = {
  Amount: string,
  TransactionType: string,
  Account: string,
  Destination: string,
  Fee: string,
  DestinationTag?: number
}

type XrpParams = {
  preparedTx: Object
}

type XrpFunction =
  | 'getFee'
  | 'getServerInfo'
  | 'getTransactions'
  | 'getBalances'
  | 'connect'
  | 'disconnect'
  | 'preparePayment'
  | 'submit'

export class XrpEngine extends CurrencyEngine {
  xrpPlugin: XrpPlugin
  otherData: XrpWalletOtherData

  constructor(
    currencyPlugin: XrpPlugin,
    walletInfo: EdgeWalletInfo,
    opts: EdgeCurrencyEngineOptions
  ) {
    super(currencyPlugin, walletInfo, opts)
    this.xrpPlugin = currencyPlugin
  }

  async multicastServers(func: XrpFunction, ...params: any): Promise<any> {
    let method = 'request'
    // Request is most commonly used SDK method for funcs but some are special
    switch (func) {
      case 'getBalances':
      case 'disconnect':
      case 'submit':
        method = func
        break
      case 'preparePayment':
        method = 'autofill'
        break
    }
    const out = {
      result: await this.xrpPlugin.rippleApi[method](...params),
      server: this.xrpPlugin.rippleApi.serverName
    }
    this.log(`multicastServers ${func} ${out.server} won`)
    return out.result
  }

  // Poll on the blockheight
  async checkServerInfoInnerLoop() {
    try {
      const options = { command: 'fee' }
      const response = await this.multicastServers('getFee', options)
      const fee = asFee(response).result.drops.minimum_fee
      this.otherData.recommendedFee = fee
      this.walletLocalDataDirty = true
    } catch (e) {
      this.log.error(`Error fetching recommended fee: ${e}. Using default fee.`)
      if (this.otherData.recommendedFee !== currencyInfo.defaultSettings.fee) {
        this.otherData.recommendedFee = currencyInfo.defaultSettings.fee
        this.walletLocalDataDirty = true
      }
    }
    try {
      const options = { command: 'server_info' }
      const response = await this.multicastServers('getServerInfo', options)
      const blockHeight =
        asServerInfo(response).result.info.validated_ledger.seq
      this.log(`Got block height ${blockHeight}`)
      if (this.walletLocalData.blockHeight !== blockHeight) {
        this.checkDroppedTransactionsThrottled()
        this.walletLocalData.blockHeight = blockHeight // Convert to decimal
        this.walletLocalDataDirty = true
        this.currencyEngineCallbacks.onBlockHeightChanged(
          this.walletLocalData.blockHeight
        )
      }
    } catch (err) {
      this.log.error(`Error fetching height: ${err}`)
    }
  }

  processRippleTransaction(tx: XrpTransaction) {
    const ourReceiveAddresses = []
    let nativeAmount = tx.Amount
    if (tx.Destination === this.walletLocalData.publicKey) {
      ourReceiveAddresses.push(this.walletLocalData.publicKey)
    } else {
      nativeAmount = `-${bns.add(nativeAmount, tx.Fee)}`
    }

    const edgeTransaction: EdgeTransaction = {
      txid: tx.hash.toLowerCase(),
      date: rippleTimeToUnixTime(tx.date) / 1000, // Returned date is in "ripple time" which is unix time if it had started on Jan 1 2000
      currencyCode: PRIMARY_CURRENCY,
      blockHeight: tx.ledger_index,
      nativeAmount,
      networkFee: tx.Fee,
      ourReceiveAddresses,
      signedTx: '',
      otherParams: {}
    }
    this.addTransaction(PRIMARY_CURRENCY, edgeTransaction)
  }

  async checkTransactionsInnerLoop() {
    const blockHeight = this.walletLocalData.blockHeight
    const address = this.walletLocalData.publicKey
    let startBlock: number = -1 // A value of -1 instructs the server to use the earliest validated ledger version available
    if (
      this.walletLocalData.lastAddressQueryHeight >
      ADDRESS_QUERY_LOOKBACK_BLOCKS
    ) {
      // Only query for transactions as far back as ADDRESS_QUERY_LOOKBACK_BLOCKS from the last time we queried transactions
      startBlock =
        this.walletLocalData.lastAddressQueryHeight -
        ADDRESS_QUERY_LOOKBACK_BLOCKS
    }

    try {
      const options = {
        command: 'account_tx',
        account: address,
        forward: true, // returns oldest to newest
        ledger_index_min: startBlock
      }
      const response = await this.multicastServers('getTransactions', options)
      const transactions =
        asGetTransactionsResponse(response).result.transactions
      this.log(
        `Fetched transactions count: ${transactions.length} startBlock:${startBlock}`
      )
      // Get transactions
      // Iterate over transactions in address
      for (const transaction of transactions) {
        this.processRippleTransaction(transaction.tx)
      }
      if (this.transactionsChangedArray.length > 0) {
        this.currencyEngineCallbacks.onTransactionsChanged(
          this.transactionsChangedArray
        )
        this.transactionsChangedArray = []
      }
      this.walletLocalData.lastAddressQueryHeight = blockHeight
      this.tokenCheckTransactionsStatus.XRP = 1
      this.updateOnAddressesChecked()
    } catch (e) {
      this.log.error(`Error fetching transactions: ${e}`)
    }
  }

  async checkUnconfirmedTransactionsFetch() {}

  // Check all account balance and other relevant info
  async checkAccountInnerLoop() {
    const address = this.walletLocalData.publicKey
    try {
      const jsonObj = await this.multicastServers('getBalances', address)
      const valid = validateObject(jsonObj, XrpGetBalancesSchema)
      if (valid) {
        for (const bal of jsonObj) {
          const currencyCode = bal.currency
          const exchangeAmount = bal.value
          const nativeAmount = bns.mul(exchangeAmount, '1000000')

          if (
            typeof this.walletLocalData.totalBalances[currencyCode] ===
            'undefined'
          ) {
            this.walletLocalData.totalBalances[currencyCode] = '0'
          }

          if (
            this.walletLocalData.totalBalances[currencyCode] !== nativeAmount
          ) {
            this.walletLocalData.totalBalances[currencyCode] = nativeAmount
            this.log.warn(`Updated ${currencyCode} balance ${nativeAmount}`)
            this.currencyEngineCallbacks.onBalanceChanged(
              currencyCode,
              nativeAmount
            )
          }
        }
        this.tokenCheckBalanceStatus.XRP = 1
        this.updateOnAddressesChecked()
      } else {
        this.log.error(
          `Invalid data returned from rippleApi.getBalances ${JSON.stringify(
            jsonObj
          )}`
        )
      }
    } catch (e) {
      if (e.data) {
        if (e.data.error === 'actNotFound' || e.data.error_code === 19) {
          this.log.warn(
            'Account not found. Probably not activated w/minimum XRP'
          )
          this.tokenCheckBalanceStatus.XRP = 1
          this.updateOnAddressesChecked()
          return
        }
      }
      this.log.error(`Error fetching address info: ${e}`)
    }
  }

  // ****************************************************************************
  // Public methods
  // ****************************************************************************

  async startEngine() {
    this.engineOn = true
    try {
      await this.xrpPlugin.connectApi(this.walletId)
    } catch (e) {
      this.log.error(`Error connecting to server`, String(e))
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
    await this.xrpPlugin.disconnectApi(this.walletId)
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
    const publicAddress = edgeSpendInfo.spendTargets[0].publicAddress

    let nativeAmount = '0'
    if (typeof edgeSpendInfo.spendTargets[0].nativeAmount === 'string') {
      nativeAmount = edgeSpendInfo.spendTargets[0].nativeAmount
    } else {
      throw new Error('Error: no amount specified')
    }

    if (bns.eq(nativeAmount, '0')) {
      throw new NoAmountSpecifiedError()
    }

    const nativeNetworkFee = this.otherData.recommendedFee

    if (currencyCode === PRIMARY_CURRENCY) {
      const virtualTxAmount = bns.add(nativeAmount, '20000000')
      if (bns.gt(virtualTxAmount, nativeBalance)) {
        throw new InsufficientFundsError()
      }
    }

    let uniqueIdentifier
    if (
      edgeSpendInfo.spendTargets[0].otherParams &&
      edgeSpendInfo.spendTargets[0].otherParams.uniqueIdentifier
    ) {
      if (
        typeof edgeSpendInfo.spendTargets[0].otherParams.uniqueIdentifier ===
        'string'
      ) {
        uniqueIdentifier = parseInt(
          edgeSpendInfo.spendTargets[0].otherParams.uniqueIdentifier
        )
      } else {
        throw new Error('Error invalid destinationtag')
      }

      // Destination Tag Checks
      const destinationTag =
        edgeSpendInfo.spendTargets[0].otherParams.uniqueIdentifier

      if (Number.isNaN(parseInt(destinationTag))) {
        throw new PluginError(
          'Please enter a valid Destination Tag',
          pluginErrorName.XRP_ERROR,
          pluginErrorCodes[0],
          currencyInfo.defaultSettings.errorCodes.UNIQUE_IDENTIFIER_FORMAT
        )
      }

      if (destinationTag.length > MAX_DESTINATION_TAG_LENGTH) {
        throw new PluginError(
          'XRP Destination Tag must be 10 characters or less',
          pluginErrorName.XRP_ERROR,
          pluginErrorCodes[0],
          currencyInfo.defaultSettings.errorCodes.UNIQUE_IDENTIFIER_EXCEEDS_LENGTH
        )
      }

      if (destinationTag > MAX_DESTINATION_TAG_LIMIT) {
        throw new PluginError(
          'XRP Destination Tag is above its maximum limit',
          pluginErrorName.XRP_ERROR,
          pluginErrorCodes[0],
          currencyInfo.defaultSettings.errorCodes.UNIQUE_IDENTIFIER_EXCEEDS_LIMIT
        )
      }
    }

    const payment: PaymentJson = {
      Amount: nativeAmount,
      TransactionType: 'Payment',
      Account: this.walletLocalData.publicKey,
      Destination: publicAddress,
      Fee: nativeNetworkFee
    }

    if (uniqueIdentifier != null) {
      payment.DestinationTag = uniqueIdentifier
    }

    let preparedTx = {}
    let i = 6
    while (true) {
      i--
      try {
        preparedTx = await this.multicastServers('preparePayment', payment)
        break
      } catch (err) {
        if (typeof err.message === 'string' && i) {
          if (err.message.includes('has too many decimal places')) {
            // HACK: ripple-js seems to have a bug where this error is intermittently thrown for no reason.
            // Just retrying seems to resolve it. -paulvp
            this.log.warn(
              'Got "too many decimal places" error. Retrying... ' + i.toString()
            )
            continue
          }
        }
        this.log.error(`makeSpend Error ${err}`)
        throw new Error('Error in preparePayment')
      }
    }

    const otherParams: XrpParams = {
      preparedTx
    }
    nativeAmount = `-${bns.add(nativeAmount, nativeNetworkFee)}`

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

    this.log.warn('Payment transaction prepared...')
    return edgeTransaction
  }

  async signTx(edgeTransaction: EdgeTransaction): Promise<EdgeTransaction> {
    const otherParams = getOtherParams(edgeTransaction)

    // Do signing
    const txJson = otherParams.preparedTx
    const privateKey = this.walletInfo.keys.rippleKey

    const wallet = Wallet.fromSeed(privateKey)
    const { tx_blob: signedTransaction, hash: id } = wallet.sign(txJson)

    this.log.warn('Payment transaction signed...')

    edgeTransaction.signedTx = signedTransaction
    edgeTransaction.txid = id.toLowerCase()
    edgeTransaction.date = Date.now() / 1000

    this.log.warn(`signTx\n${cleanTxLogs(edgeTransaction)}`)
    return edgeTransaction
  }

  async broadcastTx(
    edgeTransaction: EdgeTransaction
  ): Promise<EdgeTransaction> {
    await this.multicastServers('submit', edgeTransaction.signedTx)
    this.log.warn(`SUCCESS broadcastTx\n${cleanTxLogs(edgeTransaction)}`)
    return edgeTransaction
  }

  getDisplayPrivateSeed() {
    if (this.walletInfo.keys && this.walletInfo.keys.rippleKey) {
      return this.walletInfo.keys.rippleKey
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
