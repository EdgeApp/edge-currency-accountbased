import { add, eq, gt, lte, sub } from 'biggystring'
import {
  EdgeCurrencyEngine,
  EdgeCurrencyEngineOptions,
  EdgeSpendInfo,
  EdgeTransaction,
  EdgeWalletInfo,
  InsufficientFundsError,
  NoAmountSpecifiedError
} from 'edge-core-js/types'
import { rippleTimeToUnixTime, Wallet } from 'xrpl'
import { validatePayment } from 'xrpl/dist/npm/models/transactions/payment'

import { CurrencyEngine } from '../common/engine'
import { PluginEnvironment } from '../common/innerPlugin'
import { cleanTxLogs, getOtherParams, safeErrorMessage } from '../common/utils'
import {
  PluginError,
  pluginErrorCodes,
  pluginErrorLabels,
  pluginErrorName
} from '../pluginError'
import { RippleTools } from './xrpPlugin'
import {
  asGetTransactionsResponse,
  XrpNetworkInfo,
  XrpTransaction,
  XrpWalletOtherData
} from './xrpTypes'

const ADDRESS_POLL_MILLISECONDS = 10000
const BLOCKHEIGHT_POLL_MILLISECONDS = 15000
const TRANSACTION_POLL_MILLISECONDS = 3000
const ADDRESS_QUERY_LOOKBACK_BLOCKS = 30 * 60 // ~ one minute
const LEDGER_OFFSET = 20 // sdk constant

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

export class XrpEngine extends CurrencyEngine<RippleTools> {
  otherData!: XrpWalletOtherData
  networkInfo: XrpNetworkInfo
  nonce: number

  constructor(
    tools: RippleTools,
    walletInfo: EdgeWalletInfo,
    opts: EdgeCurrencyEngineOptions,
    networkInfo: XrpNetworkInfo
  ) {
    super(tools, walletInfo, opts)
    this.networkInfo = networkInfo
    this.nonce = 0
  }

  // Poll on the blockheight
  async checkServerInfoInnerLoop(): Promise<void> {
    try {
      const response = await this.tools.rippleApi.request({ command: 'fee' })
      this.otherData.recommendedFee = response.result.drops.open_ledger_fee
      this.walletLocalDataDirty = true
    } catch (e: any) {
      this.error(
        `Error fetching recommended fee: ${safeErrorMessage(
          e
        )}. Using default fee.`
      )
      if (this.otherData.recommendedFee !== this.networkInfo.defaultFee) {
        this.otherData.recommendedFee = this.networkInfo.defaultFee
        this.walletLocalDataDirty = true
      }
    }
    try {
      const response = await this.tools.rippleApi.request({
        command: 'server_info'
      })
      const blockHeight = response.result.info.validated_ledger?.seq
      if (blockHeight == null)
        throw new Error('Received response without ledger info')

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

  processRippleTransaction(tx: XrpTransaction): void {
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
      currencyCode: this.currencyInfo.currencyCode,
      blockHeight: tx.ledger_index,
      nativeAmount,
      networkFee: tx.Fee,
      ourReceiveAddresses,
      signedTx: '',
      otherParams: {},
      walletId: this.walletId
    }
    this.addTransaction(this.currencyInfo.currencyCode, edgeTransaction)
  }

  async checkTransactionsInnerLoop(): Promise<void> {
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
      const response = await this.tools.rippleApi.request({
        command: 'account_tx',
        account: address,
        forward: true, // returns oldest to newest
        ledger_index_min: startBlock
      })
      const transactions =
        asGetTransactionsResponse(response).result.transactions
      this.log(
        `Fetched transactions count: ${transactions.length} startBlock:${startBlock}`
      )
      // Get transactions
      // Iterate over transactions in address
      for (const transaction of transactions) {
        if (transaction.tx == null) continue
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

  // Check all account balance and other relevant info
  async checkAccountInnerLoop(): Promise<void> {
    const address = this.walletLocalData.publicKey
    try {
      const accountInfo = await this.tools.rippleApi.request({
        command: 'account_info',
        account: address,
        ledger_index: 'current'
      })
      const { Balance, Sequence } = accountInfo.result.account_data
      // TODO: Token balances can be queried with this.tools.rippleApi.getBalances(address)
      this.updateBalance(this.currencyInfo.currencyCode, Balance)
      this.nonce = Sequence
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

  async startEngine(): Promise<void> {
    this.engineOn = true
    try {
      await this.tools.connectApi(this.walletId)
    } catch (e: any) {
      this.error(`Error connecting to server `, e)
      setTimeout(() => {
        if (this.engineOn) {
          this.startEngine().catch(() => {})
        }
      }, 10000)
      return
    }
    this.addToLoop(
      'checkServerInfoInnerLoop',
      BLOCKHEIGHT_POLL_MILLISECONDS
    ).catch(() => {})
    this.addToLoop('checkAccountInnerLoop', ADDRESS_POLL_MILLISECONDS).catch(
      () => {}
    )
    this.addToLoop(
      'checkTransactionsInnerLoop',
      TRANSACTION_POLL_MILLISECONDS
    ).catch(() => {})
    super.startEngine().catch(() => {})
  }

  async killEngine(): Promise<void> {
    await super.killEngine()
    await this.tools.disconnectApi(this.walletId)
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
    // TODO: Look into this logic when adding token support
    if (currencyCode === this.currencyInfo.currencyCode) {
      spendableBalance = sub(spendableBalance, this.networkInfo.baseReserve)
    }
    if (lte(spendableBalance, '0')) throw new InsufficientFundsError()

    return spendableBalance
  }

  async makeSpend(edgeSpendInfoIn: EdgeSpendInfo): Promise<EdgeTransaction> {
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
    if (gt(add(nativeAmount, this.networkInfo.baseReserve), nativeBalance))
      throw new InsufficientFundsError()

    const uniqueIdentifier =
      edgeSpendInfo.spendTargets[0].otherParams?.uniqueIdentifier ?? ''

    if (uniqueIdentifier !== '') {
      // Destination Tag Checks
      const { memoMaxLength = Infinity, memoMaxValue } = this.currencyInfo

      if (Number.isNaN(parseInt(uniqueIdentifier))) {
        throw new PluginError(
          'Please enter a valid Destination Tag',
          pluginErrorName.XRP_ERROR,
          pluginErrorCodes[0],
          pluginErrorLabels.UNIQUE_IDENTIFIER_FORMAT
        )
      }

      if (uniqueIdentifier.length > memoMaxLength) {
        throw new PluginError(
          `Destination Tag must be ${memoMaxLength} characters or less`,
          pluginErrorName.XRP_ERROR,
          pluginErrorCodes[0],
          pluginErrorLabels.UNIQUE_IDENTIFIER_EXCEEDS_LENGTH
        )
      }

      if (memoMaxValue != null && gt(uniqueIdentifier, memoMaxValue)) {
        throw new PluginError(
          'XRP Destination Tag is above its maximum limit',
          pluginErrorName.XRP_ERROR,
          pluginErrorCodes[0],
          pluginErrorLabels.UNIQUE_IDENTIFIER_EXCEEDS_LIMIT
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

    const otherParams: XrpParams = {
      preparedTx: payment
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
      otherParams,
      walletId: this.walletId
    }

    this.warn('Payment transaction prepared...')
    return edgeTransaction
  }

  async signTx(edgeTransaction: EdgeTransaction): Promise<EdgeTransaction> {
    const otherParams = getOtherParams(edgeTransaction)

    const completeTxJson = {
      ...otherParams.preparedTx,
      Sequence: this.nonce,
      LastLedgerSequence: this.walletLocalData.blockHeight + LEDGER_OFFSET
    }
    validatePayment(completeTxJson)

    // Do signing
    const privateKey = this.walletInfo.keys.rippleKey
    const wallet = Wallet.fromSeed(privateKey)
    const { tx_blob: signedTransaction, hash: id } = wallet.sign(completeTxJson)

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
    const response = await this.tools.rippleApi.submit(edgeTransaction.signedTx)
    const {
      engine_result_code: resultCode,
      engine_result_message: resultMessage
    } = response.result

    if (resultCode !== 0) {
      this.warn(`FAILURE broadcastTx ${resultCode} ${resultMessage}`)
      throw new Error(resultMessage)
    }

    this.warn(`SUCCESS broadcastTx\n${cleanTxLogs(edgeTransaction)}`)
    return edgeTransaction
  }

  getDisplayPrivateSeed(): string {
    return this.walletInfo.keys?.rippleKey ?? ''
  }

  getDisplayPublicSeed(): string {
    return this.walletInfo.keys?.publicKey ?? ''
  }
}

export async function makeCurrencyEngine(
  env: PluginEnvironment<XrpNetworkInfo>,
  tools: RippleTools,
  walletInfo: EdgeWalletInfo,
  opts: EdgeCurrencyEngineOptions
): Promise<EdgeCurrencyEngine> {
  const engine = new XrpEngine(tools, walletInfo, opts, env.networkInfo)

  await engine.loadEngine(tools, walletInfo, opts)

  // This is just to make sure otherData is Flow checked
  engine.otherData = engine.walletLocalData.otherData as any

  if (engine.otherData.recommendedFee == null) {
    engine.otherData.recommendedFee = '0'
  }

  return engine
}
