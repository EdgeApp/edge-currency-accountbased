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
import { asMaybe, asObject, asValue } from 'cleaners'
import {
  EdgeActivationApproveOptions,
  EdgeActivationQuote,
  EdgeActivationResult,
  EdgeAssetAction,
  EdgeAssetActionType,
  EdgeAssetAmount,
  EdgeCurrencyEngine,
  EdgeCurrencyEngineOptions,
  EdgeEngineActivationOptions,
  EdgeEngineGetActivationAssetsOptions,
  EdgeGetActivationAssetsResults,
  EdgeMemo,
  EdgeSpendInfo,
  EdgeTransaction,
  EdgeWalletInfo,
  InsufficientFundsError,
  JsonObject,
  NoAmountSpecifiedError
} from 'edge-core-js/types'
import { base16 } from 'rfc4648'
import {
  DeletedNode,
  getBalanceChanges,
  isCreatedNode,
  isDeletedNode,
  isModifiedNode,
  ModifiedNode,
  OfferCreate,
  Payment as PaymentJson,
  rippleTimeToUnixTime,
  TrustSet,
  unixTimeToRippleTime
} from 'xrpl'
import { Amount } from 'xrpl/dist/npm/models/common'
import {
  AccountTxResponse,
  AccountTxTransaction
} from 'xrpl/dist/npm/models/methods/accountTx'
import { validatePayment } from 'xrpl/dist/npm/models/transactions/payment'

import { CurrencyEngine } from '../common/CurrencyEngine'
import { PluginEnvironment } from '../common/innerPlugin'
import { getRandomDelayMs } from '../common/network'
import { getTokenIdFromCurrencyCode } from '../common/tokenHelpers'
import { MakeTxParams } from '../common/types'
import { utf8 } from '../common/utf8'
import {
  cleanTxLogs,
  getOtherParams,
  matchJson,
  safeErrorMessage
} from '../common/utils'
import { DIVIDE_PRECISION, EST_BLOCK_TIME_MS } from './rippleInfo'
import { RippleTools } from './RippleTools'
import {
  asFinalFieldsCanceledOffer,
  asMaybeActivateTokenParams,
  asRipplePrivateKeys,
  asSafeRippleWalletInfo,
  asXrpNetworkLocation,
  asXrpTransaction,
  asXrpWalletOtherData,
  RippleOtherMethods,
  SafeRippleWalletInfo,
  XrpNetworkInfo,
  XrpTransaction,
  XrpWalletOtherData
} from './rippleTypes'
import { makeTokenId } from './rippleUtils'

type AccountTransaction = AccountTxResponse['result']['transactions'][number]

const ADDRESS_POLL_MILLISECONDS = getRandomDelayMs(20000)
const BLOCKHEIGHT_POLL_MILLISECONDS = getRandomDelayMs(20000)
const TRANSACTION_POLL_MILLISECONDS = getRandomDelayMs(20000)
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

interface XrpParams {
  preparedTx: PaymentJson
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
            assetAction: {
              assetActionType: 'swapOrderPost'
            },
            blockHeight: 0, // blockHeight,
            currencyCode,
            date: Date.now() / 1000,
            isSend: true,
            memos: [],
            metadata,
            nativeAmount: `-${add(fromNativeAmount, networkFee)}`,
            networkFee,
            networkFees: [],
            otherParams: {
              xrpTransaction
            },
            ourReceiveAddresses: [],
            signedTx: '',
            tokenId: fromTokenId ?? null,
            txid: '',
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
        currency: currency,
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
      this.enabledTokenIds.length -
      this.walletLocalData.unactivatedTokenIds.length

    const tokenReserve = mul(
      this.networkInfo.baseReservePerToken,
      numActivatedTokens.toString()
    )
    return add(this.networkInfo.baseReserve, tokenReserve)
  }

  async changeEnabledTokenIds(tokens: string[]): Promise<void> {
    await super.changeEnabledTokenIds(tokens)

    // Make sure to immediately do the checkAccountInnerLoop routine because
    // it contains the routine to check for unactivated tokens. This solves
    // a majority of race conditions when adding a new token and immediately
    // checking the unactivatedTokenIds on a wallet.
    await this.tools.rippleApiPromise
    await this.checkAccountInnerLoop()
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
      await this.tools.reconnectApi()
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
      await this.tools.reconnectApi()
    }
  }

  /**
   * Parse TakerGets or TakerPays into an EdgeAssetAmount
   * */
  parseRippleDexTxAmount = (
    takerAmount: Amount
  ): EdgeAssetAmount | undefined => {
    const {
      currency,
      issuer,
      value
      // Taker pays/gets XRP if 'TakerPays/Gets' is a plain string
    } =
      typeof takerAmount === 'string'
        ? { currency: 'XRP', issuer: undefined, value: takerAmount }
        : takerAmount
    const isTakerToken = currency !== 'XRP' && issuer != null
    if (isTakerToken && issuer == null) {
      this.error('parseRippleDexTxAmount: No ussuer for token')
      return
    }
    const tokenId = isTakerToken
      ? makeTokenId({
          currency,
          issuer
        })
      : null

    const takerVal = isTakerToken ? value : String(takerAmount)

    if (takerVal == null) {
      this.error(
        `parseRippleDexTxAmount: Transaction has token code ${currency} with no value`
      )
      return
    }

    let takerDenom
    if (tokenId == null) {
      takerDenom = this.currencyInfo.denominations[0]
    } else {
      const builtinToken = this.builtinTokens[tokenId]
      if (builtinToken == null) return
      takerDenom = builtinToken.denominations[0]
    }

    return {
      nativeAmount: mul(takerVal, takerDenom.multiplier),
      pluginId: this.currencyInfo.pluginId,
      tokenId
    }
  }

  /**
   * Parse potential DEX trades.
   * Parse offer-related nodes to determine order status for saving to the
   * EdgeTxAction
   **/
  processRippleDexTx = (
    accountTx: AccountTxTransaction
    // balances: Balance[] // TODO
  ): EdgeAssetAction | undefined => {
    const { meta, tx } = accountTx
    if (tx == null || typeof meta !== 'object') return

    // Parse meta nodes
    const { AffectedNodes } = meta
    const deletedNodes = AffectedNodes.filter(
      node =>
        isDeletedNode(node) && node.DeletedNode.LedgerEntryType === 'Offer'
    ) as DeletedNode[]

    const modifiedNodes = AffectedNodes.filter(
      node =>
        isModifiedNode(node) && node.ModifiedNode.LedgerEntryType === 'Offer'
    ) as ModifiedNode[]

    const hasDeletedNodes = deletedNodes.length > 0
    const hasModifiedNodes = modifiedNodes.length > 0
    const createdNodes = AffectedNodes.filter(
      node =>
        isCreatedNode(node) && node.CreatedNode.LedgerEntryType === 'Offer'
    )
    // Shouldn't happen. Only possible to have one created node per order tx
    if (createdNodes.length > 1) {
      this.error('processRippleDexTx: OfferCreate: multiple created nodes')
      return
    }

    let type: EdgeAssetActionType | undefined
    // Any kind of limit order state - post (open & unfilled), partially
    // filled, fully filled, but NOT canceled.
    if (tx.TransactionType === 'OfferCreate') {
      // Exactly one node was created. Order opened without any fills
      const isOpenOrder = createdNodes.length === 1

      // Either an existing order that had partial fills, OR
      // a new order that only matched exact offer amounts in the book
      const isPartiallyFilled =
        hasModifiedNodes || (isOpenOrder && hasDeletedNodes)

      // Order was fully filled
      const isFullyFilled = hasDeletedNodes && !isOpenOrder

      // Don't care about partial fills - counting them as general fills
      type =
        isFullyFilled || isPartiallyFilled ? 'swapOrderFill' : 'swapOrderPost'
    } else if (tx.TransactionType === 'OfferCancel') {
      // Assert only one offer is canceled per OfferCancel transaction
      if (deletedNodes.length > 1) {
        this.error('processRippleDexTx: OfferCancel: multiple deleted nodes')
        return
      }
      if (deletedNodes.length === 1) {
        // Reference the canceled offer for asset types/amounts
        try {
          asFinalFieldsCanceledOffer(deletedNodes[0].DeletedNode.FinalFields)
        } catch (error) {
          this.error(`Cleaning DeletedNodes FinalFields failed: ${error}`)
          return
        }
        type = 'swapOrderCancel'
      } else {
        // The offer could not be canceled, possibly because it was already filled or expired
        this.log.warn(
          'processRippleDexTx: OfferCancel: without actual cancellation'
        )
        return
      }
    }

    if (type == null) {
      return
    }

    // Succeeded all checks
    return {
      assetActionType: type
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

    const { date, DestinationTag, hash, Fee } = xrpTx

    const memos: EdgeMemo[] = []
    if (DestinationTag != null) {
      memos.push({
        type: 'number',
        value: DestinationTag.toString(),
        memoName: 'destination tag'
      })
    }

    // Parse XRPL Memos array for text memos
    try {
      const txAny: any = tx
      const Memos: any[] | undefined = txAny?.Memos
      if (Array.isArray(Memos)) {
        for (const entry of Memos) {
          const memoObj = entry?.Memo
          if (memoObj == null) continue
          const memoDataHex: string | undefined = memoObj.MemoData
          const memoFormatHex: string | undefined = memoObj.MemoFormat

          // Decode MemoFormat to determine content type, if present
          let memoFormatText: string | undefined
          if (memoFormatHex != null) {
            try {
              memoFormatText = utf8
                .stringify(base16.parse(memoFormatHex))
                .toLowerCase()
            } catch (e) {}
          }

          if (memoDataHex != null) {
            const hexValue = memoDataHex.toLowerCase()
            // Only decode to UTF-8 text when MemoFormat indicates text
            if (
              memoFormatText === 'text/plain' ||
              memoFormatText?.startsWith('text/') === true
            ) {
              try {
                const bytes = base16.parse(hexValue)
                const text = utf8.stringify(bytes)
                memos.push({ type: 'text', memoName: 'memo', value: text })
                continue
              } catch (e) {
                // Fall through to storing hex if decoding fails
              }
            }

            // Default: store as hex without attempting text decode, and hide from UI
            memos.push({
              type: 'hex',
              memoName: 'memo',
              value: hexValue,
              hidden: true
            })
          }
        }
      }
    } catch (e) {
      this.log.warn('XRP: processTransaction memo parsing error', e)
    }

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
          this.addTransaction(null, {
            assetAction: this.processRippleDexTx(accountTx),
            blockHeight: tx.ledger_index ?? -1,
            currencyCode: currency,
            date: rippleTimeToUnixTime(date) / 1000, // Returned date is in "ripple time" which is unix time if it had started on Jan 1 2000
            isSend,
            memos,
            nativeAmount,
            networkFee,
            networkFees: [],
            otherParams: {},
            ourReceiveAddresses,
            signedTx: '',
            tokenId: null,
            txid: hash.toLowerCase(),
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

          this.addTransaction(tokenId, {
            assetAction: this.processRippleDexTx(accountTx),
            blockHeight: tx.ledger_index ?? -1,
            currencyCode,
            date: rippleTimeToUnixTime(date) / 1000, // Returned date is in "ripple time" which is unix time if it had started on Jan 1 2000
            isSend,
            memos,
            nativeAmount,
            networkFee: '0',
            networkFees: [],
            otherParams: {},
            ourReceiveAddresses,
            signedTx: '',
            tokenId,
            txid: hash.toLowerCase(),
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

    // See if we need to add new data to the existing EdgeTransactions on disk
    if (this.otherData.txListReset) {
      this.log('Resetting Ripple tx list...')
      this.otherData.txListReset = false
      this.walletLocalData.lastAddressQueryHeight = 0
      this.walletLocalDataDirty = true
    } else if (
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
      this.sendTransactionEvents()
      this.walletLocalData.lastAddressQueryHeight = blockHeight
      this.tokenCheckTransactionsStatus.set(null, 1)
      for (const tokenId of this.enabledTokenIds) {
        this.tokenCheckTransactionsStatus.set(tokenId, 1)
      }
      this.updateOnAddressesChecked()
    } catch (e: any) {
      this.error(`Error fetching transactions: `, e)
      await this.tools.reconnectApi()
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
      this.updateBalance(null, Balance)
      this.nonce = Sequence

      const detectedTokenIds: string[] = []
      const getBalInfo = await this.tools.rippleApi.getBalances(address)
      getBalInfo.forEach(({ currency, issuer, value }) => {
        if (issuer == null) return
        const tokenId = makeTokenId({ currency, issuer })
        const edgeToken = this.allTokensMap[tokenId]
        if (edgeToken != null) {
          const multiplier = edgeToken.denominations[0].multiplier
          if (multiplier == null) return
          const assetAmount = toFixed(mul(value, multiplier), 0, 0)
          this.updateBalance(tokenId, assetAmount)

          if (gt(assetAmount, '0') && !this.enabledTokenIds.includes(tokenId)) {
            detectedTokenIds.push(tokenId)
          }
        }
      })

      if (detectedTokenIds.length > 0) {
        this.currencyEngineCallbacks.onNewTokens(detectedTokenIds)
      }

      // If get here, we've checked balances for all possible tokens the user
      // could have enabled. Mark all assets as checked
      for (const tokenId of this.enabledTokenIds) {
        this.tokenCheckBalanceStatus.set(tokenId, 1)
      }
      this.updateOnAddressesChecked()

      if (this.enabledTokenIds.length > 0) {
        // Check for unactivated tokens
        const acctLinesResponse = await this.tools.rippleApi.request({
          command: 'account_lines',
          account: address
        })

        for (const tokenId of this.enabledTokenIds) {
          const match = acctLinesResponse.result.lines.find(line => {
            const { account: issuer, currency } = line
            const lineTokenId = makeTokenId({ currency, issuer })
            if (tokenId === lineTokenId) {
              return true
            }
            return false
          })
          if (match == null) {
            newUnactivatedTokenIds.push(tokenId)
          }
        }
      }
    } catch (e: any) {
      if (e?.data?.error === 'actNotFound' || e?.data?.error_code === 19) {
        this.log('Account not found. Probably not activated w/minimum XRP')
        this.updateBalance(null, '0')
        this.enabledTokenIds.forEach(tokenId => {
          // All tokens are not activated if this address is not activated
          if (tokenId != null) {
            newUnactivatedTokenIds.push(tokenId)
          }
          this.updateBalance(tokenId, '0')
        })
      } else {
        this.error(`Error fetching address info: `, e)
        await this.tools.reconnectApi()
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
    try {
      await this.tools.connectApi(this.walletId)
    } catch (e: unknown) {
      this.log.error(`Error connecting to server `, String(e))
      setTimeout(() => {
        if (this.engineOn) {
          this.startEngine().catch(e => console.log(e.message))
        }
      }, 10000)
      return
    }
    this.addToLoop('checkServerInfoInnerLoop', BLOCKHEIGHT_POLL_MILLISECONDS)
    this.addToLoop('checkAccountInnerLoop', ADDRESS_POLL_MILLISECONDS)
    this.addToLoop('checkTransactionsInnerLoop', TRANSACTION_POLL_MILLISECONDS)
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
    const { tokenId } = spendInfo
    let spendableBalance = this.getBalance({
      tokenId
    })

    const totalReserve = this.getTotalReserve()

    if (tokenId == null) {
      spendableBalance = sub(spendableBalance, totalReserve)
    }
    if (lte(spendableBalance, '0'))
      throw new InsufficientFundsError({ tokenId })

    return spendableBalance
  }

  async makeSpend(edgeSpendInfoIn: EdgeSpendInfo): Promise<EdgeTransaction> {
    const { edgeSpendInfo, currencyCode, nativeBalance } =
      this.makeSpendCheck(edgeSpendInfoIn)
    const { memos = [], tokenId } = edgeSpendInfo

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
        blockHeight: 0, // blockHeight,
        currencyCode: this.currencyInfo.currencyCode,
        date: Date.now() / 1000,
        isSend: true,
        memos,
        metadata: edgeSpendInfo.metadata,
        nativeAmount: `-${networkFee}`,
        networkFee,
        networkFees: [],
        otherParams: {
          xrpTransaction
        },
        ourReceiveAddresses: [],
        signedTx: '',
        tokenId,
        txid: '',
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
        throw new InsufficientFundsError({ tokenId })
    } else {
      parentNetworkFee = TOKEN_FEE
      // Tokens
      if (gt(nativeAmount, nativeBalance))
        throw new InsufficientFundsError({ tokenId })
      const parentBalance = this.getBalance({ tokenId: null })

      if (gt(parentNetworkFee, parentBalance)) {
        throw new InsufficientFundsError({
          networkFee: parentNetworkFee,
          tokenId: null
        })
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
        this.currencyInfo.currencyCode,
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
      nativeAmount = `-${nativeAmount}`
    }

    for (const memo of memos) {
      if (memo.type === 'number') {
        payment.DestinationTag = parseInt(memo.value)
      } else if (memo.type === 'text') {
        if (payment.Memos == null) payment.Memos = []
        payment.Memos.push({
          Memo: {
            MemoFormat: base16.stringify(utf8.parse('text/plain')),
            MemoData: base16.stringify(utf8.parse(memo.value))
          }
        })
      }
    }

    const otherParams: XrpParams = {
      preparedTx: payment
    }

    const edgeTransaction: EdgeTransaction = {
      blockHeight: 0, // blockHeight
      currencyCode, // currencyCode
      date: 0, // date
      isSend: true,
      memos: [],
      nativeAmount, // nativeAmount
      networkFee,
      networkFees: [],
      otherParams,
      ourReceiveAddresses: [], // ourReceiveAddresses
      parentNetworkFee,
      signedTx: '', // signedTx
      tokenId,
      txid: '', // txid
      walletId: this.walletId
    }

    this.warn('Payment transaction prepared...')
    return edgeTransaction
  }

  async checkTrustLines(publicAddress: string, tokenId: string): Promise<void> {
    const accountCache =
      this.tools.accountTrustLineCache.get(publicAddress) ?? new Set()
    if (accountCache.has(tokenId)) return

    try {
      const trustLines = await this.tools.rippleApi.request({
        command: 'account_lines',
        account: publicAddress
      })

      for (const line of trustLines.result.lines) {
        const tlTokenId = makeTokenId({
          issuer: line.account,
          currency: line.currency
        })
        accountCache.add(tlTokenId)
      }
      this.tools.accountTrustLineCache.set(publicAddress, accountCache)
    } catch (error: unknown) {
      const asMaybeNotFound = asMaybe(
        asObject({
          data: asObject({ error: asValue('actNotFound') })
        })
      )
      if (asMaybeNotFound(error) == null) throw error
    }

    if (!accountCache.has(tokenId)) {
      throw new Error(`Recipient has not set up trust line`)
    }
  }

  async signTx(
    edgeTransaction: EdgeTransaction,
    privateKeys: JsonObject
  ): Promise<EdgeTransaction> {
    const ripplePrivateKeys = asRipplePrivateKeys(privateKeys)
    const wallet = this.tools.makeWallet(ripplePrivateKeys)
    const otherParams = getOtherParams(edgeTransaction)

    // Activation Transaction:
    if (otherParams.xrpTransaction != null) {
      const xrpTransaction: TrustSet = otherParams.xrpTransaction
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
    if (edgeTransaction.tokenId !== null) {
      await this.checkTrustLines(publicAddress, edgeTransaction.tokenId)
    }

    // Do signing
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
          tokenId: null,
          currencyPluginId: this.currencyInfo.pluginId
        }
      ]
    }
  }

  engineActivateWallet = async ({
    activateTokenIds,
    paymentInfo
  }: EdgeEngineActivationOptions): Promise<EdgeActivationQuote> => {
    if (activateTokenIds == null)
      throw new Error(
        `Must specify activateTokenIds for ${this.currencyInfo.currencyCode}`
      )
    const { wallet, tokenId } = paymentInfo ?? { tokenId: null }
    if (tokenId !== null)
      throw new Error(`Must activate with ${this.currencyInfo.currencyCode}`)
    if (wallet?.id !== this.walletId)
      throw new Error('Must pay with same wallet you are activating token with')

    for (const activateTokenId of activateTokenIds) {
      if (
        activateTokenId !== null &&
        this.allTokensMap[activateTokenId] == null
      )
        throw new Error(`Invalid tokenId to activate ${activateTokenId}`)
    }

    const out = {
      paymentWalletId: this.walletId,
      paymentTokenId: null,
      fromNativeAmount: '0',
      networkFee: {
        nativeAmount: mul(
          SET_TRUST_LINE_FEE,
          activateTokenIds.length.toString()
        ),
        tokenId: null,
        currencyPluginId: this.currencyInfo.pluginId
      },
      approve: async (
        options: EdgeActivationApproveOptions = {}
      ): Promise<EdgeActivationResult> => {
        const { metadata } = options
        const transactions: EdgeTransaction[] = []
        for (const activateTokenId of activateTokenIds) {
          const activationTx = await wallet.makeSpend({
            spendTargets: [],
            metadata,
            tokenId,
            otherParams: { activateTokenId }
          })
          const signedTx = await wallet.signTx(activationTx)
          const edgeTransaction = await wallet.broadcastTx(signedTx)

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

  await engine.loadEngine()

  return engine
}
