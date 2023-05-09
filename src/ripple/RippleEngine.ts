import {
  abs,
  add,
  div,
  eq,
  gt,
  log10,
  lte,
  mul,
  sub,
  toFixed
} from 'biggystring'
import {
  EdgeActivationApproveOptions,
  EdgeActivationQuote,
  EdgeActivationResult,
  EdgeCurrencyEngine,
  EdgeCurrencyEngineOptions,
  EdgeEngineActivationOptions,
  EdgeEngineGetActivationAssetsOptions,
  EdgeGetActivationAssetsResults,
  EdgeSpendInfo,
  EdgeTransaction,
  EdgeWalletInfo,
  InsufficientFundsError,
  JsonObject,
  NoAmountSpecifiedError
} from 'edge-core-js/types'
import { rippleTimeToUnixTime, TrustSet, Wallet } from 'xrpl'
import { AccountTxResponse } from 'xrpl/dist/npm/models/methods/accountTx'
import {
  Payment,
  validatePayment
} from 'xrpl/dist/npm/models/transactions/payment'

import { CurrencyEngine } from '../common/CurrencyEngine'
import { PluginEnvironment } from '../common/innerPlugin'
import { getTokenIdFromCurrencyCode } from '../common/tokenHelpers'
import { BooleanMap } from '../common/types'
import {
  cleanTxLogs,
  getOtherParams,
  matchJson,
  safeErrorMessage
} from '../common/utils'
import {
  PluginError,
  pluginErrorCodes,
  pluginErrorLabels,
  pluginErrorName
} from '../pluginError'
import { RippleTools } from './RippleTools'
import {
  asMaybeActivateTokenParams,
  asRipplePrivateKeys,
  asSafeRippleWalletInfo,
  asXrpNetworkLocation,
  asXrpTransaction,
  asXrpWalletOtherData,
  SafeRippleWalletInfo,
  XrpNetworkInfo,
  XrpTransaction,
  XrpWalletOtherData
} from './rippleTypes'
import { makeTokenId } from './rippleUtils'

type AccountTransaction = AccountTxResponse['result']['transactions'][number]

const ADDRESS_POLL_MILLISECONDS = 10000
const BLOCKHEIGHT_POLL_MILLISECONDS = 15000
const TRANSACTION_POLL_MILLISECONDS = 3000
const ADDRESS_QUERY_LOOKBACK_BLOCKS = 30 * 60 // ~ one minute
const LEDGER_OFFSET = 20 // sdk constant
const TOKEN_FEE = '12'
const tfSetNoRipple = 131072 // No Rippling Flag for token sends
const TRUST_LINE_APPROVAL_AMOUNT = '1000000'
const SET_TRUST_LINE_FEE = '12'
const SUPPORTED_TRANSACTION_TYPES: BooleanMap = {
  Payment: true,
  TrustSet: true
}

interface PaymentJson {
  Amount:
    | string
    | {
        currency: string
        issuer: string
        value: string
      }
  TransactionType: string
  Account: string
  Destination: string
  Fee: string
  DestinationTag?: number
  Flags?: number
}

interface XrpParams {
  preparedTx: Object
}

export class XrpEngine extends CurrencyEngine<
  RippleTools,
  SafeRippleWalletInfo
> {
  otherData!: XrpWalletOtherData
  networkInfo: XrpNetworkInfo
  nonce: number

  constructor(
    env: PluginEnvironment<XrpNetworkInfo>,
    tools: RippleTools,
    walletInfo: SafeRippleWalletInfo,
    opts: EdgeCurrencyEngineOptions
  ) {
    super(env, tools, walletInfo, opts)
    const { networkInfo } = env
    this.networkInfo = networkInfo
    this.nonce = 0
    this.minimumAddressBalance = this.networkInfo.baseReserve
  }

  setOtherData(raw: any): void {
    this.otherData = asXrpWalletOtherData(raw)
  }

  getRecipientBalance = async (recipient: string): Promise<string> => {
    try {
      const accountInfo = await this.tools.rippleApi.request({
        command: 'account_info',
        account: recipient
      })
      return accountInfo.result.account_data.Balance
    } catch (e: any) {
      // API will throw if account doesn't exist
      if (e.data?.error === 'actNotFound') {
        return '0'
      }
      // For other errors just assume the recipient's account is sufficient
      return this.minimumAddressBalance
    }
  }

  getTotalReserve(): string {
    const numActivatedTokens =
      this.enabledTokens.length -
      1 -
      this.walletLocalData.unactivatedTokenIds.length

    const tokenReserve = mul(
      this.networkInfo.baseReservePerToken,
      numActivatedTokens.toString()
    )
    return add(this.networkInfo.baseReserve, tokenReserve)
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

  processRippleTransaction(accountTx: AccountTransaction): void {
    if (accountTx.tx == null) return

    // For some reason, XRPL types exclude Transaction hash, date, and ledger_index.
    // Check if the tx has these undocumented fields and throw if not
    asXrpTransaction(accountTx.tx)

    if (!SUPPORTED_TRANSACTION_TYPES[accountTx.tx.TransactionType]) return

    const tx: Payment & XrpTransaction = accountTx.tx as any

    const ourReceiveAddresses = []
    let nativeAmount = typeof tx.Amount === 'string' ? tx.Amount : '0'
    let isSend = false
    const chainCode = this.currencyInfo.currencyCode
    let currencyCode = chainCode
    let tokenTx = false
    if (typeof tx.Amount === 'string') {
      nativeAmount = tx.Amount
    } else if (tx.Amount != null) {
      const { meta } = accountTx
      if (typeof meta === 'string') {
        this.log.warn(`**** WARNING: String meta field in txid ${tx.hash}`)
        return
      }

      const DeliveredAmount = meta.DeliveredAmount ?? meta.delivered_amount
      if (DeliveredAmount == null) {
        this.log.warn(
          `**** WARNING: Undefined DeliveredAmount in txid ${tx.hash}`
        )
        return
      }

      if (typeof DeliveredAmount === 'string') {
        this.log.warn(`**** WARNING: String DeliveredAmount in txid ${tx.hash}`)
        return
      }

      const { currency, issuer, value } = DeliveredAmount

      // Special case that we can't yet validate:
      // If issuer === recipient account, then ignore this tx
      if (issuer === tx.Account) return

      tokenTx = true
      const tokenId = makeTokenId({ currency, issuer })
      const edgeToken = this.allTokensMap[tokenId]
      if (edgeToken == null) return
      currencyCode = edgeToken.currencyCode
      nativeAmount = mul(value, edgeToken.denominations[0].multiplier)
    }

    let networkFee = '0'
    let parentNetworkFee
    if (tx.Destination === this.walletLocalData.publicKey) {
      ourReceiveAddresses.push(this.walletLocalData.publicKey)
    } else if (tx.Account !== this.walletLocalData.publicKey) {
      // Error. If we're not the destination, we should be the source account
      throw new Error('tx is neither Destination or source Account')
    } else {
      isSend = true
      if (tokenTx) {
        parentNetworkFee = tx.Fee
        nativeAmount = `-${nativeAmount}`
      } else {
        networkFee = tx.Fee ?? '0'
        nativeAmount = `-${add(nativeAmount, tx.Fee ?? '0')}`
      }
    }

    const edgeTransaction: EdgeTransaction = {
      txid: tx.hash.toLowerCase(),
      date: rippleTimeToUnixTime(tx.date) / 1000, // Returned date is in "ripple time" which is unix time if it had started on Jan 1 2000
      currencyCode,
      blockHeight: tx.ledger_index,
      nativeAmount,
      isSend,
      networkFee,
      parentNetworkFee,
      ourReceiveAddresses,
      signedTx: '',
      otherParams: {},
      walletId: this.walletId
    }
    this.addTransaction(currencyCode, edgeTransaction)
    if (tokenTx && nativeAmount.startsWith('-')) {
      // Also add the mainnet fee transaction if this is a token spend
      this.addTransaction(chainCode, {
        ...edgeTransaction,
        currencyCode: chainCode,
        nativeAmount: `-${parentNetworkFee ?? ''}`,
        networkFee: parentNetworkFee ?? '',
        parentNetworkFee: undefined
      })
    }
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
      const response: AccountTxResponse = await this.tools.rippleApi.request({
        command: 'account_tx',
        account: address,
        forward: true, // returns oldest to newest
        ledger_index_min: startBlock
      })
      const { transactions } = response.result
      this.log(
        `Fetched transactions count: ${transactions.length} startBlock:${startBlock}`
      )
      // Get transactions
      // Iterate over transactions in address
      for (const transaction of transactions) {
        if (transaction.tx == null) continue
        this.processRippleTransaction(transaction)
      }
      if (this.transactionsChangedArray.length > 0) {
        this.currencyEngineCallbacks.onTransactionsChanged(
          this.transactionsChangedArray
        )
        this.transactionsChangedArray = []
      }
      this.walletLocalData.lastAddressQueryHeight = blockHeight
      this.tokenCheckTransactionsStatus.XRP = 1
      this.enabledTokens.forEach(tokenCurrencyCode => {
        this.tokenCheckTransactionsStatus[tokenCurrencyCode] = 1
      })
      this.updateOnAddressesChecked()
    } catch (e: any) {
      this.error(`Error fetching transactions: `, e)
    }
  }

  // Check all account balance and other relevant info
  async checkAccountInnerLoop(): Promise<void> {
    const address = this.walletLocalData.publicKey
    const newUnactivatedTokenIds: string[] = []

    try {
      const accountInfo = await this.tools.rippleApi.request({
        command: 'account_info',
        account: address,
        ledger_index: 'current'
      })
      const { Balance, Sequence } = accountInfo.result.account_data
      this.updateBalance(this.currencyInfo.currencyCode, Balance)
      this.nonce = Sequence

      const getBalInfo = await this.tools.rippleApi.getBalances(address)
      getBalInfo.forEach(({ currency, issuer, value }) => {
        if (issuer == null) return
        const tokenId = makeTokenId({ currency, issuer })
        const edgeToken = this.allTokensMap[tokenId]
        if (edgeToken != null) {
          const multiplier = edgeToken.denominations[0].multiplier
          if (multiplier == null) return
          const assetAmount = toFixed(mul(value, multiplier), 0, 0)
          this.updateBalance(edgeToken.currencyCode, assetAmount)
        }
      })

      // If get here, we've checked balances for all possible tokens the user
      // could have enabled. Mark all assets as checked
      this.enabledTokens.forEach(tokenCurrencyCode => {
        this.tokenCheckBalanceStatus[tokenCurrencyCode] = 1
      })
      this.updateOnAddressesChecked()

      if (this.enabledTokens.length > 1) {
        // Check for unactivated tokens
        const acctLinesResponse = await this.tools.rippleApi.request({
          command: 'account_lines',
          account: address
        })

        this.enabledTokens.forEach(tokenCurrencyCode => {
          const match = acctLinesResponse.result.lines.find(line => {
            const { account: issuer, currency } = line
            const lineTokenId = makeTokenId({ currency, issuer })
            const edgeToken = this.allTokensMap[lineTokenId]
            if (
              edgeToken != null &&
              tokenCurrencyCode === edgeToken.currencyCode
            ) {
              return true
            }
            return false
          })
          if (match == null) {
            const tokenId = getTokenIdFromCurrencyCode(
              tokenCurrencyCode,
              this.allTokensMap
            )
            if (tokenId != null) {
              newUnactivatedTokenIds.push(tokenId)
            }
          }
        })
      }
    } catch (e: any) {
      if (e?.data?.error === 'actNotFound' || e?.data?.error_code === 19) {
        this.log('Account not found. Probably not activated w/minimum XRP')
        this.updateBalance(this.currencyInfo.currencyCode, '0')
        this.enabledTokens.forEach(tokenCurrencyCode => {
          if (tokenCurrencyCode !== this.currencyInfo.currencyCode) {
            // All tokens are not activated if this address is not activated
            const tokenId = getTokenIdFromCurrencyCode(
              tokenCurrencyCode,
              this.allTokensMap
            )
            if (tokenId != null) {
              newUnactivatedTokenIds.push(tokenId)
            }
            this.updateBalance(tokenCurrencyCode, '0')
          }
        })
      } else {
        this.error(`Error fetching address info: `, e)
        return
      }
    }

    if (
      !matchJson(
        newUnactivatedTokenIds,
        this.walletLocalData.unactivatedTokenIds
      )
    ) {
      this.walletLocalData.unactivatedTokenIds = newUnactivatedTokenIds
      this.walletLocalDataDirty = true
      this.currencyEngineCallbacks.onUnactivatedTokenIdsChanged(
        this.walletLocalData.unactivatedTokenIds
      )
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
          this.startEngine().catch(e => console.log(e.message))
        }
      }, 10000)
      return
    }
    this.addToLoop(
      'checkServerInfoInnerLoop',
      BLOCKHEIGHT_POLL_MILLISECONDS
    ).catch(e => console.log(e.message))
    this.addToLoop('checkAccountInnerLoop', ADDRESS_POLL_MILLISECONDS).catch(
      e => console.log(e.message)
    )
    this.addToLoop(
      'checkTransactionsInnerLoop',
      TRANSACTION_POLL_MILLISECONDS
    ).catch(e => console.log(e.message))
    await super.startEngine()
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

    const totalReserve = this.getTotalReserve()

    if (currencyCode === this.currencyInfo.currencyCode) {
      spendableBalance = sub(spendableBalance, totalReserve)
    }
    if (lte(spendableBalance, '0')) throw new InsufficientFundsError()

    return spendableBalance
  }

  async makeSpend(edgeSpendInfoIn: EdgeSpendInfo): Promise<EdgeTransaction> {
    const { edgeSpendInfo, currencyCode, nativeBalance } =
      this.makeSpendCheck(edgeSpendInfoIn)
    const parentCurrencyCode = this.currencyInfo.currencyCode

    // Activation Transaction:
    const activateTokenParams = asMaybeActivateTokenParams(
      edgeSpendInfo.otherParams
    )
    if (activateTokenParams?.activateTokenId != null) {
      const activateTokenId = activateTokenParams.activateTokenId
      const edgeToken = this.allTokensMap[activateTokenId]
      const { currency, issuer } = asXrpNetworkLocation(
        edgeToken.networkLocation
      )
      const networkFee = SET_TRUST_LINE_FEE
      const trustSetTx: TrustSet = await this.tools.rippleApi.autofill({
        TransactionType: 'TrustSet',
        Account: this.walletLocalData.publicKey,
        Fee: networkFee,
        Flags: tfSetNoRipple,
        LimitAmount: {
          currency,
          issuer,
          value: TRUST_LINE_APPROVAL_AMOUNT
        }
        // Sequence: 12
      })

      return {
        txid: '',
        date: Date.now() / 1000,
        currencyCode: this.currencyInfo.currencyCode,
        blockHeight: 0, // blockHeight,
        metadata: edgeSpendInfo.metadata,
        nativeAmount: `-${networkFee}`,
        isSend: true,
        networkFee,
        ourReceiveAddresses: [],
        signedTx: '',
        otherParams: {
          trustSetTx
        },
        walletId: this.walletId
      }
    }

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

    let networkFee: string = '0'
    let parentNetworkFee: string | undefined

    // Make sure amount doesn't drop the balance below the reserve amount otherwise the
    // transaction is invalid. It is not necessary to consider the fee in this
    // calculation because the transaction fee can be taken out of the reserve balance.
    if (currencyCode === parentCurrencyCode) {
      networkFee = this.otherData.recommendedFee

      const totalReserve = this.getTotalReserve()

      if (gt(add(nativeAmount, totalReserve), nativeBalance))
        throw new InsufficientFundsError()
    } else {
      parentNetworkFee = TOKEN_FEE
      // Tokens
      if (gt(nativeAmount, nativeBalance)) throw new InsufficientFundsError()
      const parentBalance =
        this.walletLocalData.totalBalances[parentCurrencyCode] ?? '0'

      if (gt(parentNetworkFee, parentBalance)) {
        throw new InsufficientFundsError({
          currencyCode: parentCurrencyCode,
          networkFee: parentNetworkFee
        })
      }
    }

    const uniqueIdentifier =
      edgeSpendInfo.spendTargets[0].memo ??
      edgeSpendInfo.spendTargets[0].uniqueIdentifier ??
      edgeSpendInfo.spendTargets[0].otherParams?.uniqueIdentifier ??
      ''

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

    let payment: PaymentJson
    if (currencyCode === parentCurrencyCode) {
      payment = {
        Amount: nativeAmount,
        TransactionType: 'Payment',
        Account: this.walletLocalData.publicKey,
        Destination: publicAddress,
        Fee: networkFee
      }
      nativeAmount = `-${add(nativeAmount, networkFee)}`
    } else {
      const tokenId = getTokenIdFromCurrencyCode(
        currencyCode,
        this.allTokensMap
      )
      if (tokenId == null) {
        throw new Error('Error: Token not supported')
      }
      const edgeToken = this.allTokensMap[tokenId]
      const {
        networkLocation,
        denominations: [denom]
      } = edgeToken
      const { currency, issuer } = asXrpNetworkLocation(networkLocation)
      payment = {
        TransactionType: 'Payment',
        Account: this.walletLocalData.publicKey,
        Fee: parentNetworkFee ?? TOKEN_FEE,
        Amount: {
          currency,
          issuer,
          value: div(nativeAmount, denom.multiplier, log10(denom.multiplier))
        },
        Destination: publicAddress,
        Flags: tfSetNoRipple
      }
    }

    if (uniqueIdentifier !== '') {
      payment.DestinationTag = parseInt(uniqueIdentifier)
    }

    const otherParams: XrpParams = {
      preparedTx: payment
    }

    const edgeTransaction: EdgeTransaction = {
      txid: '', // txid
      date: 0, // date
      currencyCode, // currencyCode
      blockHeight: 0, // blockHeight
      nativeAmount, // nativeAmount
      isSend: true,
      networkFee,
      parentNetworkFee,
      ourReceiveAddresses: [], // ourReceiveAddresses
      signedTx: '', // signedTx
      otherParams,
      walletId: this.walletId
    }

    this.warn('Payment transaction prepared...')
    return edgeTransaction
  }

  async signTx(
    edgeTransaction: EdgeTransaction,
    privateKeys: JsonObject
  ): Promise<EdgeTransaction> {
    const ripplePrivateKeys = asRipplePrivateKeys(privateKeys)
    const otherParams = getOtherParams(edgeTransaction)

    // Activation Transaction:
    if (otherParams.trustSetTx != null) {
      const trustSetTx: TrustSet = otherParams.trustSetTx
      const privateKey = privateKeys.rippleKey
      const wallet = Wallet.fromSeed(privateKey)
      const { tx_blob: signedTransaction, hash: id } = wallet.sign(trustSetTx)
      this.warn('Activation transaction signed...')
      edgeTransaction.signedTx = signedTransaction
      edgeTransaction.txid = id.toLowerCase()
      edgeTransaction.date = Date.now() / 1000
      this.warn(`signTx\n${cleanTxLogs(edgeTransaction)}`)
      return edgeTransaction
    }

    const completeTxJson = {
      ...otherParams.preparedTx,
      Sequence: this.nonce,
      LastLedgerSequence: this.walletLocalData.blockHeight + LEDGER_OFFSET
    }
    validatePayment(completeTxJson)

    const publicAddress = completeTxJson.Destination
    if (publicAddress == null)
      throw new Error('makeSpend Missing publicAddress')

    if (edgeTransaction.currencyCode === this.currencyInfo.currencyCode) {
      const nativeAmount = abs(
        add(edgeTransaction.nativeAmount, edgeTransaction.networkFee)
      )
      await this.checkRecipientMinimumBalance(
        this.getRecipientBalance,
        nativeAmount,
        publicAddress
      )
    }

    // Do signing
    const privateKey = ripplePrivateKeys.rippleKey
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

    // https://xrpl.org/transaction-results.html
    if (
      (resultCode >= -199 && resultCode <= -100) || // failure and most likely wont succeed
      (resultCode >= -299 && resultCode <= -200) || // tx malformed
      (resultCode >= -399 && resultCode <= -300) // server failure and needs to be retried
    ) {
      this.warn(`FAILURE broadcastTx ${resultCode} ${resultMessage}`)
      throw new Error(resultMessage)
    }

    // Success codes
    // resultCode === 0 all good
    // (resultCode >= 100 && resultCode <= 199) tx failed but fee burned
    // (resultCode >= -99 && resultCode <= -1) tx failed but could still succeed (like waiting for fee to become competitive)

    this.warn(`SUCCESS broadcastTx\n${cleanTxLogs(edgeTransaction)}`)
    return edgeTransaction
  }

  getDisplayPrivateSeed(privateKeys: JsonObject): string {
    const ripplePrivateKeys = asRipplePrivateKeys(privateKeys)
    return ripplePrivateKeys.rippleKey
  }

  getDisplayPublicSeed(): string {
    return this.walletInfo.keys?.publicKey ?? ''
  }

  engineGetActivationAssets = async (
    options: EdgeEngineGetActivationAssetsOptions
  ): Promise<EdgeGetActivationAssetsResults> => {
    // We can only activate with XRP with the current wallet
    return {
      assetOptions: [
        {
          paymentWalletId: this.walletId,
          currencyPluginId: this.currencyInfo.pluginId
        }
      ]
    }
  }

  engineActivateWallet = async ({
    activateTokenIds,
    paymentTokenId,
    paymentWallet
  }: EdgeEngineActivationOptions): Promise<EdgeActivationQuote> => {
    if (activateTokenIds == null)
      throw new Error(
        `Must specify activateTokenIds for ${this.currencyInfo.currencyCode}`
      )
    if (paymentTokenId != null)
      throw new Error(`Must activate with ${this.currencyInfo.currencyCode}`)
    if (paymentWallet?.id !== this.walletId)
      throw new Error('Must pay with same wallet you are activating token with')

    for (const activateTokenId of activateTokenIds) {
      if (this.allTokensMap[activateTokenId] == null)
        throw new Error(`Invalid tokenId to activate ${activateTokenId}`)
    }

    const out = {
      paymentWalletId: this.walletId,
      fromNativeAmount: '0',
      networkFee: {
        nativeAmount: mul(
          SET_TRUST_LINE_FEE,
          activateTokenIds.length.toString()
        ),
        currencyPluginId: this.currencyInfo.pluginId
      },
      approve: async (
        options: EdgeActivationApproveOptions = {}
      ): Promise<EdgeActivationResult> => {
        const { metadata } = options
        const transactions: EdgeTransaction[] = []
        for (const activateTokenId of activateTokenIds) {
          const activationTx = await paymentWallet.makeSpend({
            spendTargets: [],
            metadata,
            otherParams: { activateTokenId }
          })
          const signedTx = await paymentWallet.signTx(activationTx)
          const edgeTransaction = await paymentWallet.broadcastTx(signedTx)

          this.warn(
            `SUCCESS activateWallet.approve()\n${cleanTxLogs(edgeTransaction)}`
          )
          transactions.push(edgeTransaction)
          await this.saveTx(edgeTransaction)
        }
        return { transactions }
      },
      close: async (): Promise<void> => {}
    }
    return out
  }
}

export async function makeCurrencyEngine(
  env: PluginEnvironment<XrpNetworkInfo>,
  tools: RippleTools,
  walletInfo: EdgeWalletInfo,
  opts: EdgeCurrencyEngineOptions
): Promise<EdgeCurrencyEngine> {
  const safeWalletInfo = asSafeRippleWalletInfo(walletInfo)
  const engine = new XrpEngine(env, tools, safeWalletInfo, opts)

  await engine.loadEngine(tools, safeWalletInfo, opts)

  return engine
}
