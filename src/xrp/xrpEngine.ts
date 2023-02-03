import { add, div, eq, gt, log10, lte, mul, sub, toFixed } from 'biggystring'
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
import { AccountTxResponse } from 'xrpl/dist/npm/models/methods/accountTx'
import {
  Payment,
  validatePayment
} from 'xrpl/dist/npm/models/transactions/payment'

import { CurrencyEngine } from '../common/engine'
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
import { RippleTools } from './xrpPlugin'
import {
  asXrpNetworkLocation,
  asXrpTransaction,
  asXrpWalletOtherData,
  XrpNetworkInfo,
  XrpTransaction,
  XrpWalletOtherData
} from './xrpTypes'
import { makeTokenId } from './xrpUtils'

type AccountTransaction = AccountTxResponse['result']['transactions'][number]

const ADDRESS_POLL_MILLISECONDS = 10000
const BLOCKHEIGHT_POLL_MILLISECONDS = 15000
const TRANSACTION_POLL_MILLISECONDS = 3000
const ADDRESS_QUERY_LOOKBACK_BLOCKS = 30 * 60 // ~ one minute
const LEDGER_OFFSET = 20 // sdk constant
const TOKEN_FEE = '12'
const tfSetNoRipple = 131072 // No Rippling Flag for token sends

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

export class XrpEngine extends CurrencyEngine<RippleTools> {
  otherData!: XrpWalletOtherData
  networkInfo: XrpNetworkInfo
  nonce: number

  constructor(
    env: PluginEnvironment<XrpNetworkInfo>,
    tools: RippleTools,
    walletInfo: EdgeWalletInfo,
    opts: EdgeCurrencyEngineOptions
  ) {
    super(env, tools, walletInfo, opts)
    const { networkInfo } = env
    this.networkInfo = networkInfo
    this.nonce = 0
  }

  setOtherData(raw: any): void {
    this.otherData = asXrpWalletOtherData(raw)
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

    if (accountTx.tx.TransactionType !== 'Payment') {
      return
    }

    const tx: Payment & XrpTransaction = accountTx.tx as any

    const ourReceiveAddresses = []
    let nativeAmount = typeof tx.Amount === 'string' ? tx.Amount : '0'
    let { currencyCode } = this.currencyInfo
    let tokenTx = false
    if (typeof tx.Amount === 'string') {
      nativeAmount = tx.Amount
    } else {
      const { meta } = accountTx
      if (typeof meta === 'string') {
        this.log.warn(`**** WARNING: String meta field in txid ${tx.hash}`)
        return
      }

      const { DeliveredAmount } = meta
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
      networkFee,
      parentNetworkFee,
      ourReceiveAddresses,
      signedTx: '',
      otherParams: {},
      walletId: this.walletId
    }
    this.addTransaction(currencyCode, edgeTransaction)
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
        this.warn('Account not found. Probably not activated w/minimum XRP')
        this.enabledTokens.forEach(tokenCurrencyCode => {
          this.tokenCheckBalanceStatus[tokenCurrencyCode] = 1
          if (tokenCurrencyCode !== this.currencyInfo.currencyCode) {
            // All tokens are not activated if this address is not activated
            const tokenId = getTokenIdFromCurrencyCode(
              tokenCurrencyCode,
              this.allTokensMap
            )
            if (tokenId != null) {
              newUnactivatedTokenIds.push(tokenId)
            }
          }
        })
        this.updateOnAddressesChecked()
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
    if (currencyCode === this.currencyInfo.currencyCode) {
      spendableBalance = sub(spendableBalance, this.networkInfo.baseReserve)
    }
    if (lte(spendableBalance, '0')) throw new InsufficientFundsError()

    return spendableBalance
  }

  async makeSpend(edgeSpendInfoIn: EdgeSpendInfo): Promise<EdgeTransaction> {
    const { edgeSpendInfo, currencyCode, nativeBalance } =
      this.makeSpendCheck(edgeSpendInfoIn)
    const parentCurrencyCode = this.currencyInfo.currencyCode

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
      if (gt(add(nativeAmount, this.networkInfo.baseReserve), nativeBalance))
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
  const engine = new XrpEngine(env, tools, walletInfo, opts)

  await engine.loadEngine(tools, walletInfo, opts)

  return engine
}
