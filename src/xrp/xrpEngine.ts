/**
 * Created by paul on 7/7/17.
 */

import { add, eq, gt, lte, mul, sub } from 'biggystring'
import {
  EdgeCurrencyEngineOptions,
  EdgeSpendInfo,
  EdgeTransaction,
  EdgeWalletInfo,
  InsufficientFundsError,
  NoAmountSpecifiedError
} from 'edge-core-js/types'
import { rippleTimeToUnixTime, Wallet } from 'xrpl'

import { CurrencyEngine } from '../common/engine'
import { cleanTxLogs, getOtherParams, safeErrorMessage } from '../common/utils'
import { PluginError, pluginErrorCodes, pluginErrorName } from '../pluginError'
import { XrpPlugin } from './xrpPlugin'
import {
  asBalance,
  asFee,
  asGetTransactionsResponse,
  asServerInfo,
  XrpSettings,
  XrpTransaction,
  XrpWalletOtherData
} from './xrpTypes'

const ADDRESS_POLL_MILLISECONDS = 10000
const BLOCKHEIGHT_POLL_MILLISECONDS = 15000
const TRANSACTION_POLL_MILLISECONDS = 3000
const ADDRESS_QUERY_LOOKBACK_BLOCKS = 30 * 60 // ~ one minute

interface PaymentJson {
  Amount: string
  TransactionType: string
  Account: string
  Destination: string
  Fee: string
  DestinationTag?: number
}

interface XrpParams {
  preparedTx: Object
}

type XrpFunction =
  | 'getFee'
  | 'getServerInfo'
  | 'getTransactions'
  | 'getBalances'
  | 'connect'
  | 'preparePayment'
  | 'submit'

export class XrpEngine extends CurrencyEngine<XrpPlugin> {
  xrpPlugin: XrpPlugin
  otherData: XrpWalletOtherData
  xrpSettings: XrpSettings

  constructor(
    currencyPlugin: XrpPlugin,
    walletInfo: EdgeWalletInfo,
    opts: EdgeCurrencyEngineOptions
  ) {
    super(currencyPlugin, walletInfo, opts)
    this.xrpPlugin = currencyPlugin
    this.xrpSettings = currencyPlugin.currencyInfo.defaultSettings.otherSettings
  }

  async multicastServers(func: XrpFunction, ...params: any): Promise<any> {
    let method = 'request'
    // Request is most commonly used SDK method for funcs but some are special
    switch (func) {
      case 'getBalances':
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
    } catch (e: any) {
      this.error(
        `Error fetching recommended fee: ${safeErrorMessage(
          e
        )}. Using default fee.`
      )
      if (this.otherData.recommendedFee !== this.xrpSettings.defaultFee) {
        this.otherData.recommendedFee = this.xrpSettings.defaultFee
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
    } catch (e: any) {
      this.error(`Error fetching height: `, e)
    }
  }

  processRippleTransaction(tx: XrpTransaction) {
    const ourReceiveAddresses = []
    let nativeAmount = tx.Amount
    if (tx.Destination === this.walletLocalData.publicKey) {
      ourReceiveAddresses.push(this.walletLocalData.publicKey)
    } else {
      nativeAmount = `-${add(nativeAmount, tx.Fee)}`
    }

    const edgeTransaction: EdgeTransaction = {
      txid: tx.hash.toLowerCase(),
      date: rippleTimeToUnixTime(tx.date) / 1000, // Returned date is in "ripple time" which is unix time if it had started on Jan 1 2000
      currencyCode: this.xrpPlugin.currencyInfo.currencyCode,
      blockHeight: tx.ledger_index,
      nativeAmount,
      networkFee: tx.Fee,
      ourReceiveAddresses,
      signedTx: '',
      otherParams: {}
    }
    this.addTransaction(
      this.xrpPlugin.currencyInfo.currencyCode,
      edgeTransaction
    )
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
    } catch (e: any) {
      this.error(`Error fetching transactions: `, e)
    }
  }

  async checkUnconfirmedTransactionsFetch() {}

  // Check all account balance and other relevant info
  async checkAccountInnerLoop() {
    const address = this.walletLocalData.publicKey
    try {
      const jsonObj = await this.multicastServers('getBalances', address)
      if (Array.isArray(jsonObj)) {
        for (const bal of jsonObj) {
          const { currency, value } = asBalance(bal)
          const currencyCode = currency
          const exchangeAmount = value
          const nativeAmount = mul(exchangeAmount, '1000000')
          this.updateBalance(currencyCode, nativeAmount)
        }
      }
    } catch (e: any) {
      if (e?.data?.error === 'actNotFound' || e?.data?.error_code === 19) {
        this.warn('Account not found. Probably not activated w/minimum XRP')
        this.tokenCheckBalanceStatus.XRP = 1
        this.updateOnAddressesChecked()
        return
      }
      this.error(`Error fetching address info: `, e)
    }
  }

  // ****************************************************************************
  // Public methods
  // ****************************************************************************

  async startEngine() {
    this.engineOn = true
    try {
      await this.xrpPlugin.connectApi(this.walletId)
    } catch (e: any) {
      this.error(`Error connecting to server `, e)
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

  async getMaxSpendable(spendInfo: EdgeSpendInfo): Promise<string> {
    const { currencyCode } = spendInfo
    let spendableBalance = this.getBalance({
      currencyCode
    })
    if (currencyCode === this.xrpPlugin.currencyInfo.currencyCode) {
      spendableBalance = sub(spendableBalance, this.xrpSettings.baseReserve)
    }
    if (lte(spendableBalance, '0')) throw new InsufficientFundsError()

    return spendableBalance
  }

  async makeSpend(edgeSpendInfoIn: EdgeSpendInfo) {
    const { edgeSpendInfo, currencyCode, nativeBalance } =
      this.makeSpendCheck(edgeSpendInfoIn)

    if (edgeSpendInfo.spendTargets.length !== 1) {
      throw new Error('Error: only one output allowed')
    }

    const { publicAddress } = edgeSpendInfo.spendTargets[0]
    let { nativeAmount } = edgeSpendInfo.spendTargets[0]

    if (publicAddress == null)
      throw new Error('makeSpend Missing publicAddress')
    if (nativeAmount == null) throw new NoAmountSpecifiedError()

    if (eq(nativeAmount, '0')) {
      throw new NoAmountSpecifiedError()
    }

    const nativeNetworkFee = this.otherData.recommendedFee

    // Make sure amount doesn't drop the balance below the reserve amount otherwise the
    // transaction is invalid. It is not necessary to consider the fee in this
    // calculation because the transaction fee can be taken out of the reserve balance.
    if (gt(add(nativeAmount, this.xrpSettings.baseReserve), nativeBalance))
      throw new InsufficientFundsError()

    const uniqueIdentifier =
      edgeSpendInfo.spendTargets[0].otherParams?.uniqueIdentifier ?? ''

    if (uniqueIdentifier !== '') {
      // Destination Tag Checks
      const {
        memoMaxLength = Infinity,
        memoMaxValue,
        defaultSettings: { errorCodes }
      } = this.xrpPlugin.currencyInfo

      if (Number.isNaN(parseInt(uniqueIdentifier))) {
        throw new PluginError(
          'Please enter a valid Destination Tag',
          pluginErrorName.XRP_ERROR,
          pluginErrorCodes[0],
          errorCodes.UNIQUE_IDENTIFIER_FORMAT
        )
      }

      if (uniqueIdentifier.length > memoMaxLength) {
        throw new PluginError(
          `Destination Tag must be ${memoMaxLength} characters or less`,
          pluginErrorName.XRP_ERROR,
          pluginErrorCodes[0],
          errorCodes.UNIQUE_IDENTIFIER_EXCEEDS_LENGTH
        )
      }

      if (memoMaxValue != null && gt(uniqueIdentifier, memoMaxValue)) {
        throw new PluginError(
          'XRP Destination Tag is above its maximum limit',
          pluginErrorName.XRP_ERROR,
          pluginErrorCodes[0],
          errorCodes.UNIQUE_IDENTIFIER_EXCEEDS_LIMIT
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

    if (uniqueIdentifier !== '') {
      payment.DestinationTag = parseInt(uniqueIdentifier)
    }

    let preparedTx = {}
    let i = 6
    while (true) {
      i--
      try {
        preparedTx = await this.multicastServers('preparePayment', payment)
        break
      } catch (e: any) {
        if (
          safeErrorMessage(e).includes('has too many decimal places') &&
          i > 0
        ) {
          // HACK: ripple-js seems to have a bug where this error is intermittently thrown for no reason.
          // Just retrying seems to resolve it. -paulvp
          this.warn(
            `Got "too many decimal places" error. Retrying... ${i.toString()}`
          )
          continue
        }
        this.error(`makeSpend Error `, e)
        throw new Error('Error in preparePayment')
      }
    }

    const otherParams: XrpParams = {
      preparedTx
    }
    nativeAmount = `-${add(nativeAmount, nativeNetworkFee)}`

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

    this.warn('Payment transaction prepared...')
    return edgeTransaction
  }

  async signTx(edgeTransaction: EdgeTransaction): Promise<EdgeTransaction> {
    const otherParams = getOtherParams(edgeTransaction)

    // Do signing
    const txJson = otherParams.preparedTx
    const privateKey = this.walletInfo.keys.rippleKey

    const wallet = Wallet.fromSeed(privateKey)
    const { tx_blob: signedTransaction, hash: id } = wallet.sign(txJson)

    this.warn('Payment transaction signed...')

    edgeTransaction.signedTx = signedTransaction
    edgeTransaction.txid = id.toLowerCase()
    edgeTransaction.date = Date.now() / 1000

    this.warn(`signTx\n${cleanTxLogs(edgeTransaction)}`)
    return edgeTransaction
  }

  async broadcastTx(
    edgeTransaction: EdgeTransaction
  ): Promise<EdgeTransaction> {
    await this.multicastServers('submit', edgeTransaction.signedTx)
    this.warn(`SUCCESS broadcastTx\n${cleanTxLogs(edgeTransaction)}`)
    return edgeTransaction
  }

  getDisplayPrivateSeed() {
    return this.walletInfo.keys?.rippleKey ?? ''
  }

  getDisplayPublicSeed() {
    return this.walletInfo.keys?.publicKey ?? ''
  }
}

export { CurrencyEngine }
