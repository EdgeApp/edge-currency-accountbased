import {
  abs,
  add,
  div,
  eq,
  gt,
  log10,
  lt,
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
import {
  getBalanceChanges,
  OfferCreate,
  rippleTimeToUnixTime,
  TrustSet,
  unixTimeToRippleTime,
  Wallet
} from 'xrpl'
import { Amount } from 'xrpl/dist/npm/models/common'
import { AccountTxResponse } from 'xrpl/dist/npm/models/methods/accountTx'
import { validatePayment } from 'xrpl/dist/npm/models/transactions/payment'

import { CurrencyEngine } from '../common/CurrencyEngine'
import { PluginEnvironment } from '../common/innerPlugin'
import { getTokenIdFromCurrencyCode } from '../common/tokenHelpers'
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
import { DIVIDE_PRECISION, EST_BLOCK_TIME_MS } from './rippleInfo'
import { RippleTools } from './RippleTools'
import {
  asMaybeActivateTokenParams,
  asRipplePrivateKeys,
  asSafeRippleWalletInfo,
  asXrpNetworkLocation,
  asXrpTransaction,
  asXrpWalletOtherData,
  MakeTxParams,
  RippleOtherMethods,
  SafeRippleWalletInfo,
  XrpNetworkInfo,
  XrpTransaction,
  XrpWalletOtherData
} from './rippleTypes'
import { convertCurrencyCodeToHex, makeTokenId } from './rippleUtils'

type AccountTransaction = AccountTxResponse['result']['transactions'][number]

const ADDRESS_POLL_MILLISECONDS = 10000
const BLOCKHEIGHT_POLL_MILLISECONDS = 15000
const TRANSACTION_POLL_MILLISECONDS = 3000
const ADDRESS_QUERY_LOOKBACK_BLOCKS = 30 * 60 // ~ one minute

// How long to wait before a transaction is accepted into a ledge close (block)
// afterwhich the transaction is dropped
const TX_EXPIRATION_TIME_MS = 1000 * 60 * 1 // 1 min

// How long a DEX order will stay open and be fulfilled
const DEX_ORDER_EXPIRATION_TIME_DEFAULT_S = 60 * 5 // 5 min
const LEDGER_OFFSET = 20 // sdk constant
const TOKEN_FEE = '12'
const tfSetNoRipple = 131072 // No Rippling Flag for token sends
const TRUST_LINE_APPROVAL_AMOUNT = '1000000'
const SET_TRUST_LINE_FEE = '12'

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
  otherMethods: RippleOtherMethods

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
    this.otherMethods = {
      makeTx: async (params: MakeTxParams) => {
        if (params.type === 'MakeTxDexSwap') {
          const {
            expiration,
            metadata,
            fromNativeAmount,
            fromTokenId,
            toNativeAmount,
            toTokenId
          } = params

          const takerGets = this.nativeToXrpAmount(
            fromNativeAmount,
            fromTokenId
          )
          const takerPays = this.nativeToXrpAmount(toNativeAmount, toTokenId)

          const expirationXrp = unixTimeToRippleTime(
            (expiration ?? DEX_ORDER_EXPIRATION_TIME_DEFAULT_S) * 1000
          )

          // Construct the base payment transaction
          const transaction: OfferCreate = {
            Account: this.walletLocalData.publicKey,
            Expiration: expirationXrp,
            TransactionType: 'OfferCreate',
            TakerGets: takerGets,
            TakerPays: takerPays
          }

          const xrpTransaction: OfferCreate =
            await this.tools.rippleApi.autofill(transaction)

          // Add 2 minutes worth of blocks to the LastLedgerSequence since users have
          // 1 min to confirm a DEX transaction after it has already been created
          const lastLedger =
            (xrpTransaction.LastLedgerSequence ??
              this.walletLocalData.blockHeight) +
            TX_EXPIRATION_TIME_MS / EST_BLOCK_TIME_MS
          xrpTransaction.LastLedgerSequence = Math.floor(lastLedger)

          const networkFee = xrpTransaction.Fee ?? '0'

          const { currencyCode } =
            fromTokenId == null
              ? this.currencyInfo
              : this.allTokensMap[fromTokenId]

          const out: EdgeTransaction = {
            txid: '',
            date: Date.now() / 1000,
            currencyCode,
            blockHeight: 0, // blockHeight,
            metadata,
            nativeAmount: `-${add(fromNativeAmount, networkFee)}`,
            isSend: true,
            networkFee,
            ourReceiveAddresses: [],
            signedTx: '',
            otherParams: {
              xrpTransaction
            },
            walletId: this.walletId
          }
          return out
        }

        throw new Error(`Invalid type: ${params.type}`)
      }
    }
  }

  nativeToXrpAmount(nativeAmount: string, tokenId?: string): Amount {
    if (tokenId == null) {
      // We are sending XRP
      return nativeAmount
    } else {
      const { networkLocation, denominations } = this.allTokensMap[tokenId]
      const { currency, issuer } = asXrpNetworkLocation(networkLocation)
      return {
        value: div(nativeAmount, denominations[0].multiplier, DIVIDE_PRECISION),
        currency: convertCurrencyCodeToHex(currency),
        issuer
      }
    }
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
    const { log } = this
    const { publicKey: publicAddress } = this.walletLocalData
    const { meta, tx } = accountTx
    if (tx == null) {
      log(`processRippleTransaction: no tx`)
      return
    }
    if (typeof meta !== 'object') {
      log(`processRippleTransaction: hash:${tx.hash?.toString()} no meta`)
      return
    }

    // For some reason, XRPL types exclude Transaction hash, date, and ledger_index.
    // Check if the tx has these undocumented fields and throw if not
    let xrpTx: XrpTransaction
    try {
      xrpTx = asXrpTransaction(tx)
    } catch (e) {
      log(String(e))
      return
    }

    const balances = getBalanceChanges(meta)

    const { date, hash, Fee } = xrpTx
    for (const balance of balances) {
      const { account } = balance
      if (account !== publicAddress) {
        continue
      }
      for (const amount of balance.balances) {
        const { currency, issuer, value } = amount
        if (currency === this.currencyInfo.currencyCode) {
          /**
           * Native mainnet currency balance update (ie XRP)
           */
          if (issuer != null) {
            log(`Transaction has parent code ${currency} with issuer ${issuer}`)
            return
          }
          const denom = this.currencyInfo.denominations.find(
            d => d.name === currency
          )
          if (denom == null) {
            log(`Unknown denom ${currency}`)
            continue
          }
          const nativeAmount = mul(value, denom.multiplier)
          let isSend = false
          let networkFee = '0'
          const ourReceiveAddresses: string[] = []
          if (lt(nativeAmount, '0')) {
            isSend = true
            networkFee = Fee ?? '0'
          } else {
            ourReceiveAddresses.push(publicAddress)
          }
          // Parent currency like XRP
          this.addTransaction(currency, {
            txid: hash.toLowerCase(),
            date: rippleTimeToUnixTime(date) / 1000, // Returned date is in "ripple time" which is unix time if it had started on Jan 1 2000
            currencyCode: currency,
            blockHeight: tx.ledger_index ?? -1,
            nativeAmount,
            isSend,
            networkFee,
            ourReceiveAddresses,
            signedTx: '',
            otherParams: {},
            walletId: this.walletId
          })
        } else {
          /**
           * Token balance update
           */
          if (issuer == null) {
            log(`Transaction has token code ${currency} with no issuer`)
            return
          }
          const tokenId = makeTokenId({ currency, issuer })
          const edgeToken = this.allTokensMap[tokenId]
          if (edgeToken == null) return
          const { currencyCode } = edgeToken
          const nativeAmount = mul(value, edgeToken.denominations[0].multiplier)
          let isSend = false
          const ourReceiveAddresses: string[] = []

          if (lt(nativeAmount, '0')) {
            isSend = true
          } else {
            ourReceiveAddresses.push(publicAddress)
          }

          this.addTransaction(currencyCode, {
            txid: hash.toLowerCase(),
            date: rippleTimeToUnixTime(date) / 1000, // Returned date is in "ripple time" which is unix time if it had started on Jan 1 2000
            currencyCode,
            blockHeight: tx.ledger_index ?? -1,
            nativeAmount,
            isSend,
            networkFee: '0',
            ourReceiveAddresses,
            signedTx: '',
            otherParams: {},
            walletId: this.walletId
          })
        }
      }
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
      const xrpTransaction: TrustSet = await this.tools.rippleApi.autofill({
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
          xrpTransaction
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
    if (otherParams.xrpTransaction != null) {
      const xrpTransaction: TrustSet = otherParams.xrpTransaction
      const privateKey = privateKeys.rippleKey
      const wallet = Wallet.fromSeed(privateKey)
      const { tx_blob: signedTransaction, hash: id } =
        wallet.sign(xrpTransaction)
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
