import {
  Account,
  Asset,
  AssetType,
  extractBaseAddress,
  Horizon,
  Keypair,
  Memo,
  Operation,
  StrKey,
  TimeoutInfinite,
  TransactionBuilder
} from '@stellar/stellar-sdk'
import { abs, add, div, eq, gt, mul, sub } from 'biggystring'
import {
  EdgeActivationApproveOptions,
  EdgeActivationQuote,
  EdgeActivationResult,
  EdgeCurrencyEngine,
  EdgeCurrencyEngineOptions,
  EdgeEngineActivationOptions,
  EdgeEngineGetActivationAssetsOptions,
  EdgeFetchFunction,
  EdgeGetActivationAssetsResults,
  EdgeMemo,
  EdgeSpendInfo,
  EdgeTokenId,
  EdgeTransaction,
  EdgeTxActionSwap,
  EdgeWalletInfo,
  InsufficientFundsError,
  JsonObject,
  NoAmountSpecifiedError
} from 'edge-core-js/types'
import { base16, base64 } from 'rfc4648'

import { CurrencyEngine } from '../common/CurrencyEngine'
import { PluginEnvironment } from '../common/innerPlugin'
import { getRandomDelayMs } from '../common/network'
import {
  asyncWaterfall,
  formatAggregateError,
  promiseAny
} from '../common/promiseUtils'
import { makeTokenSyncTracker, TokenSyncTracker } from '../common/SyncTracker'
import {
  cleanTxLogs,
  getOtherParams,
  makeEngineFetch,
  matchJson
} from '../common/utils'
import { StellarTools } from './StellarTools'
import {
  asFeeStats,
  asMaybeActivateTokenParams,
  asMaybeDeactivateTokenParams,
  asSafeStellarWalletInfo,
  asStellarPrivateKeys,
  asStellarWalletOtherData,
  SafeStellarWalletInfo,
  StellarNetworkInfo,
  StellarOperationRecord,
  StellarWalletOtherData
} from './stellarTypes'
import { getAccountReserve, getTokenAsset, makeTokenId } from './stellarUtils'

const { OperationResponseType } = Horizon.HorizonApi

// Horizon's largest page:
const TX_QUERY_PAGING_LIMIT = 200
const ADDRESS_POLL_MILLISECONDS = getRandomDelayMs(20000)
const BLOCKCHAIN_POLL_MILLISECONDS = getRandomDelayMs(20000)
const TRANSACTION_POLL_MILLISECONDS = getRandomDelayMs(20000)

const BASE_FEE = 100 // Stroops
// The most operations a Stellar transaction can hold:
const MAX_TX_OPERATIONS = 100

/** What one operation of a transaction says about the transaction. */
interface StellarParties {
  fromAddress: string
  toAddress?: string
}

interface StellarOperationSummary extends StellarParties {
  isSwap: boolean
  savedAction?: EdgeTxActionSwap
}

type StellarServerFunction =
  | 'feeStats'
  | 'operations'
  | 'loadAccount'
  | 'ledgers'
  | 'submitTransaction'

export class StellarEngine extends CurrencyEngine<
  StellarTools,
  SafeStellarWalletInfo,
  TokenSyncTracker
> {
  networkInfo: StellarNetworkInfo
  engineFetch: EdgeFetchFunction
  activatedAccountsCache: { [publicAddress: string]: boolean }
  /** XLM this account can't spend: its reserve plus XLM held in offers. */
  lockedNativeAmount: string
  /** Each token's amount held in offers, which sends can't spend. */
  lockedTokenAmounts: { [tokenId: string]: string } = {}
  fees: { low: number; standard: number; high: number }
  otherData!: StellarWalletOtherData
  /** The multi-operation transaction processTransaction last read. */
  private lastMultiOpTxid: string | undefined

  constructor(
    env: PluginEnvironment<StellarNetworkInfo>,
    tools: StellarTools,
    walletInfo: SafeStellarWalletInfo,
    opts: EdgeCurrencyEngineOptions
  ) {
    super(env, tools, walletInfo, opts, makeTokenSyncTracker)
    this.networkInfo = env.networkInfo
    this.engineFetch = makeEngineFetch(env.io)
    this.activatedAccountsCache = {}
    this.fees = { low: BASE_FEE, standard: BASE_FEE, high: BASE_FEE }
    this.minimumAddressBalance = this.networkInfo.baseReserve
    this.lockedNativeAmount = this.networkInfo.baseReserve
  }

  setOtherData(raw: any): void {
    this.otherData = asStellarWalletOtherData(raw)
  }

  getRecipientBalance = async (recipient: string): Promise<string> => {
    try {
      const account: Horizon.AccountResponse = await this.multicastServers(
        'loadAccount',
        getAccountId(recipient)
      )
      const balanceObj = account.balances.find(
        bal => bal.asset_type === AssetType.native
      )
      if (balanceObj == null) return '0'

      const denom = this.getDenomination(null)
      if (denom == null) throw new Error('Unknown denom')

      return mul(balanceObj.balance, denom.multiplier)
    } catch (e: any) {
      // API will throw if account doesn't exist
      if (e.response?.title === 'Resource Missing') {
        return '0'
      }
      // For other errors just assume the recipient's account is sufficient
      return this.minimumAddressBalance
    }
  }

  async multicastServers(
    func: StellarServerFunction,
    ...params: any
  ): Promise<any> {
    let out: { result: any; server: string } = { result: '', server: '' }
    let funcs
    switch (func) {
      // Functions that should waterfall from top to low priority servers
      case 'feeStats':
        funcs = this.networkInfo.stellarServers.map(
          (serverUrl: string) => async () => {
            const response = await this.engineFetch(`${serverUrl}/fee_stats`)
            const result = asFeeStats(await response.json())

            return { server: serverUrl, result }
          }
        )
        out = await asyncWaterfall(funcs)
        break

      case 'loadAccount':
        funcs = this.tools.stellarApiServers.map(api => async () => {
          // @ts-expect-error
          const result = await api[func](...params)
          return { server: api.serverURL.toString(), result }
        })
        out = await asyncWaterfall(funcs)
        break

      case 'ledgers':
        funcs = this.tools.stellarApiServers.map(serverApi => async () => {
          const result = await serverApi.ledgers().order('desc').limit(1).call()
          const blockHeight = result.records[0].sequence
          if (
            this.walletLocalData.blockHeight <= blockHeight &&
            this.tools.highestTxHeight <= blockHeight
          ) {
            return { server: serverApi.serverURL.toString(), result }
          } else {
            throw new Error('Height out of date')
          }
        })
        out = await asyncWaterfall(funcs)
        break

      // Operations, unlike payments, include trustline changes:
      case 'operations':
        funcs = this.tools.stellarApiServers.map(serverApi => async () => {
          const result = await serverApi
            .operations()
            // Embed each operation's transaction, so reading its fee and
            // memo doesn't need a request per operation:
            .join('transactions')
            .limit(TX_QUERY_PAGING_LIMIT)
            .cursor(this.otherData.lastOperationPagingToken)
            .forAccount(params[0])
            .call()
          return { server: serverApi.serverURL.toString(), result }
        })
        out = await asyncWaterfall(funcs)
        break

      // Functions that should multicast to all servers
      case 'submitTransaction':
        out = await formatAggregateError(
          promiseAny(
            this.tools.stellarApiServers.map(async serverApi => {
              // @ts-expect-error
              const result = await serverApi[func](...params)
              return { server: serverApi.serverURL.toString(), result }
            })
          ),
          'Broadcast failed:'
        )
        break
    }
    this.log(`multicastServers ${func} ${out.server} won`)
    return out.result
  }

  async processTransaction(tx: StellarOperationRecord): Promise<string> {
    let rawTx: Horizon.ServerApi.TransactionRecord
    try {
      rawTx = await tx.transaction()
    } catch (e: any) {
      this.error(`processTransaction rawTx Error `, e)
      throw e
    }

    // Horizon lists each operation that involves us, but the history
    // shows one row per transaction, so read every operation of a
    // multi-operation transaction once, at the first one listed:
    let operations = [tx]
    const isMultiOp = rawTx.operation_count > 1
    if (isMultiOp) {
      if (tx.transaction_hash === this.lastMultiOpTxid) return tx.paging_token
      const page = await rawTx.operations({ limit: MAX_TX_OPERATIONS })
      operations = page.records
    }
    this.saveTransaction(tx, rawTx, operations)
    // Only once the transaction is saved, so a failure tries again:
    if (isMultiOp) this.lastMultiOpTxid = tx.transaction_hash
    return tx.paging_token
  }

  /** Adds the history rows for a transaction and its operations. */
  private saveTransaction(
    tx: StellarOperationRecord,
    rawTx: Horizon.ServerApi.TransactionRecord,
    operations: StellarOperationRecord[]
  ): void {
    const ourAddress = this.walletLocalData.publicKey

    // What the transaction adds to each of our assets, before fees,
    // and the first operation that moved each asset:
    const amounts = new Map<EdgeTokenId, string>()
    const movers = new Map<EdgeTokenId, StellarParties>()
    const swapped = new Set<EdgeTokenId>()
    const summaries: StellarOperationSummary[] = []
    for (const operation of operations) {
      const moved = new Map<EdgeTokenId, string>()
      const summary = this.readOperation(operation, moved)
      if (summary == null) continue
      summaries.push(summary)
      for (const [tokenId, amount] of moved) {
        amounts.set(tokenId, add(amounts.get(tokenId) ?? '0', amount))
        if (summary.isSwap) swapped.add(tokenId)
        if (!movers.has(tokenId)) movers.set(tokenId, summary)
      }
    }
    if (summaries.length === 0) return

    // Skip transactions that neither move our assets nor cost us a fee:
    for (const [tokenId, amount] of amounts) {
      if (eq(amount, '0')) amounts.delete(tokenId)
    }
    const fromUs = summaries.some(summary => summary.fromAddress === ourAddress)
    if (amounts.size === 0 && !fromUs) return

    // Each row names the parties of the operation that moved its asset,
    // so one transaction can't pin a dust sender on a larger deposit.
    // A row for the fee alone takes the first operation that involves us:
    const firstOurs =
      summaries.find(
        summary =>
          summary.fromAddress === ourAddress || summary.toAddress === ourAddress
      ) ?? summaries[0]
    const savedAction = summaries.find(
      summary => summary.savedAction != null
    )?.savedAction

    const date: number = Date.parse(tx.created_at) / 1000

    const networkFee = rawTx.fee_charged.toString()
    // A fee bump's outer account pays instead of the source account:
    const feePayer = rawTx.fee_account ?? rawTx.source_account
    const wePaidFee = feePayer === ourAddress

    // Parse memos from the raw transaction if available
    const edgeMemos: EdgeMemo[] = []
    try {
      const memoType: string | undefined = rawTx.memo_type
      const memo: string | undefined = rawTx.memo
      const memoBytesB64: string | undefined = rawTx.memo_bytes

      switch (memoType) {
        case 'text': {
          if (memo != null && memo !== '') {
            edgeMemos.push({
              type: 'text',
              memoName: 'memo_text',
              value: memo
            })
          }
          break
        }
        case 'id': {
          if (memo != null && memo !== '') {
            edgeMemos.push({
              type: 'number',
              memoName: 'memo_id',
              value: memo
            })
          }
          break
        }
        case 'hash':
        case 'return': {
          // Horizon provides memo_bytes as base64 for hash/return types
          let hexValue: string | undefined
          try {
            if (memoBytesB64 != null) {
              const bytes = base64.parse(memoBytesB64)
              hexValue = base16.stringify(bytes).toLowerCase()
            } else if (memo != null && memo !== '') {
              const bytes = base64.parse(memo)
              hexValue = base16.stringify(bytes).toLowerCase()
            }
          } catch (e) {}
          if (hexValue != null && hexValue !== '') {
            // Align to defined memoOptions: only 'memo_hash' exists; store 'return' as memo_hash too
            edgeMemos.push({
              type: 'hex',
              memoName: 'memo_hash', // TODO: `memoName` needs to be passed to the GUI as an enum instead, so we can localize the memo name
              value: hexValue,
              hidden: true
            })
          }
          break
        }
      }
    } catch (e) {
      this.log.warn('XLM: processTransaction memo parsing error', e)
    }

    const blockHeight = rawTx.ledger_attr > 0 ? rawTx.ledger_attr : 0
    if (blockHeight > this.tools.highestTxHeight) {
      this.tools.highestTxHeight = blockHeight
    }
    const common = {
      blockHeight,
      date,
      memos: edgeMemos,
      networkFees: [],
      signedTx: '',
      txid: tx.transaction_hash,
      walletId: this.walletId
    }
    const describe = (
      tokenId: EdgeTokenId
    ): Pick<
      EdgeTransaction,
      'assetAction' | 'otherParams' | 'ourReceiveAddresses' | 'savedAction'
    > => {
      const { fromAddress, toAddress } = movers.get(tokenId) ?? firstOurs
      // A swap only describes the assets it moved:
      const isSwapped =
        savedAction?.fromAsset.tokenId === tokenId ||
        savedAction?.toAsset.tokenId === tokenId
      return {
        assetAction: swapped.has(tokenId)
          ? { assetActionType: 'swap' }
          : undefined,
        otherParams: { fromAddress, toAddress },
        ourReceiveAddresses: toAddress === ourAddress ? [fromAddress] : [],
        savedAction: isSwapped ? savedAction : undefined
      }
    }

    // The fee comes out of XLM, so token sends and trustline changes
    // show in the XLM history too. The XLM row leaves parentNetworkFee
    // unset, since the core files any parentNetworkFee as the XLM fee,
    // and '0' there would erase the real one:
    let nativeAmount = amounts.get(null) ?? '0'
    if (wePaidFee) nativeAmount = sub(nativeAmount, networkFee)
    if (!eq(nativeAmount, '0')) {
      this.addTransaction(null, {
        ...common,
        ...describe(null),
        currencyCode: this.currencyInfo.currencyCode,
        isSend: nativeAmount.startsWith('-'),
        nativeAmount,
        networkFee: wePaidFee ? networkFee : '0',
        tokenId: null
      })
    }

    for (const [tokenId, amount] of amounts) {
      const currencyCode = this.getCurrencyCode(tokenId)
      if (tokenId == null || currencyCode == null) continue
      this.addTransaction(tokenId, {
        ...common,
        ...describe(tokenId),
        currencyCode,
        isSend: amount.startsWith('-'),
        nativeAmount: amount,
        networkFee: '0',
        parentNetworkFee: wePaidFee ? networkFee : '0',
        tokenId
      })
    }
  }

  /** Converts a Horizon amount to the asset's native units. */
  private toNativeAmount(
    tokenId: EdgeTokenId | undefined,
    amount: string
  ): string | undefined {
    if (tokenId === undefined) return
    const denom = this.getDenomination(tokenId)
    if (denom == null) return
    return mul(amount, denom.multiplier)
  }

  /**
   * Adds what an operation moves in or out of our assets to `amounts`,
   * and describes the operation, or returns undefined for a kind of
   * operation the history doesn't show.
   */
  private readOperation(
    op: StellarOperationRecord,
    amounts: Map<EdgeTokenId, string>
  ): StellarOperationSummary | undefined {
    const ourAddress = this.walletLocalData.publicKey
    const adjust = (
      tokenId: EdgeTokenId | undefined,
      amount: string,
      receive: boolean
    ): void => {
      const nativeAmount = this.toNativeAmount(tokenId, amount)
      if (tokenId === undefined || nativeAmount == null) return
      const total = amounts.get(tokenId) ?? '0'
      amounts.set(
        tokenId,
        receive ? add(total, nativeAmount) : sub(total, nativeAmount)
      )
    }

    switch (op.type) {
      // Account creations are always XLM, so Horizon gives them no asset_type:
      case OperationResponseType.createAccount: {
        const fromAddress = op.source_account
        const toAddress = op.account
        if (toAddress === ourAddress) adjust(null, op.starting_balance, true)
        if (fromAddress === ourAddress) adjust(null, op.starting_balance, false)
        return { fromAddress, toAddress, isSwap: false }
      }
      case OperationResponseType.payment: {
        const { from: fromAddress, to: toAddress } = op
        const tokenId = this.findTokenId(op)
        if (toAddress === ourAddress) adjust(tokenId, op.amount, true)
        if (fromAddress === ourAddress) adjust(tokenId, op.amount, false)
        return { fromAddress, toAddress, isSwap: false }
      }
      // Path payments can deliver a different asset than they spend:
      case OperationResponseType.pathPayment:
      case OperationResponseType.pathPaymentStrictSend: {
        const { from: fromAddress, to: toAddress } = op
        const sourceTokenId = this.findTokenId({
          asset_type: op.source_asset_type,
          asset_code: op.source_asset_code,
          asset_issuer: op.source_asset_issuer
        })
        const tokenId = this.findTokenId(op)
        if (toAddress === ourAddress) adjust(tokenId, op.amount, true)
        if (fromAddress === ourAddress) {
          adjust(sourceTokenId, op.source_amount, false)
        }
        // Paying ourselves one asset with another is a swap. Another
        // account's self-payment in the same transaction isn't ours:
        const isSwap =
          fromAddress === ourAddress &&
          toAddress === ourAddress &&
          sourceTokenId !== tokenId
        const fromAmount = this.toNativeAmount(sourceTokenId, op.source_amount)
        const toAmount = this.toNativeAmount(tokenId, op.amount)
        if (
          !isSwap ||
          sourceTokenId === undefined ||
          tokenId === undefined ||
          fromAmount == null ||
          toAmount == null
        ) {
          return { fromAddress, toAddress, isSwap }
        }
        const { pluginId } = this.currencyInfo
        const savedAction: EdgeTxActionSwap = {
          actionType: 'swap',
          swapInfo: {
            pluginId,
            displayName: 'Stellar DEX',
            isDex: true,
            supportEmail: 'support@edge.app'
          },
          isEstimate: false,
          fromAsset: {
            pluginId,
            tokenId: sourceTokenId,
            nativeAmount: fromAmount
          },
          toAsset: { pluginId, tokenId, nativeAmount: toAmount },
          payoutAddress: ourAddress,
          payoutWalletId: this.walletId
        }
        return { fromAddress, toAddress, isSwap, savedAction }
      }
      // Adding or removing a trustline only costs its fee:
      case OperationResponseType.changeTrust:
        return { fromAddress: op.trustor, isSwap: false }
    }
  }

  /**
   * Finds the wallet's tokenId for an asset Horizon names,
   * null for XLM, or undefined for a token this wallet doesn't know.
   */
  private findTokenId(asset: {
    asset_type: string
    asset_code?: string
    asset_issuer?: string
  }): EdgeTokenId | undefined {
    const { asset_type: type, asset_code: code, asset_issuer: issuer } = asset
    if (type === AssetType.native) return null
    if (code == null || issuer == null) return
    const tokenId = makeTokenId({ code, issuer })
    if (this.allTokensMap[tokenId] == null) return
    return tokenId
  }

  // Streaming version. Doesn't work in RN
  // async checkTransactionsInnerLoop () {
  //   const address = this.walletLocalData.publicKey
  //   const txHandler = (tx) => {
  //     this.log('Got something:')
  //     this.processTransaction(tx)
  //   }
  //   let close
  //   const errorHandler = (e) => {
  //     if (close) {
  //       close()
  //       close = null
  //       this.checkTransactionsInnerLoop()
  //     }
  //   }
  //   close = this.stellarServer.payments()
  //     .forAccount(address)
  //     .limit(TX_QUERY_PAGING_LIMIT)
  //     .cursor(this.otherData.lastOperationPagingToken)
  //     .stream({
  //       onmessage: txHandler,
  //       onerror: errorHandler
  //     })
  // }

  // Polling version
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  async checkTransactionsInnerLoop() {
    const blockHeight = this.walletLocalData.blockHeight

    const address = this.walletLocalData.publicKey
    let page
    let pagingToken
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    while (1) {
      try {
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
        if (!page) {
          page = await this.multicastServers('operations', address)
        } else {
          page = await page.next()
        }
        if (page.records.length === 0) {
          break
        }
        for (const tx of page.records) {
          pagingToken = await this.processTransaction(tx)
        }
      } catch (e: any) {
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
        if (e.response && e.response.title === 'Resource Missing') {
          this.log('Account not found. Probably not activated w/minimum XLM')
          this.syncTracker.updateHistoryRatio(null, 1)
          this.syncTracker.setHistoryRatios(this.enabledTokenIds, 1)
        } else {
          this.error(
            'checkTransactionsInnerLoop Error fetching transaction info: ',
            e
          )
        }
        return
      }
    }
    this.sendTransactionEvents()
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (pagingToken) {
      this.otherData.lastOperationPagingToken = pagingToken
      this.walletLocalDataDirty = true
    }
    this.walletLocalData.lastAddressQueryHeight = blockHeight
    this.syncTracker.updateHistoryRatio(null, 1)
    this.syncTracker.setHistoryRatios(this.enabledTokenIds, 1)
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  async checkUnconfirmedTransactionsFetch() {}

  async changeEnabledTokenIds(tokenIds: string[]): Promise<void> {
    await super.changeEnabledTokenIds(tokenIds)

    // Look for trustlines right away, so a newly enabled token shows
    // whether it needs activating without waiting for the next poll:
    await this.checkAccountInnerLoop()
  }

  // Check all account balance and other relevant info
  async checkAccountInnerLoop(): Promise<void> {
    const address = this.walletLocalData.publicKey
    const unactivatedTokenIds: string[] = []
    try {
      const account: Horizon.AccountResponse = await this.multicastServers(
        'loadAccount',
        address
      )
      if (account.sequence !== this.otherData.accountSequence) {
        this.otherData.accountSequence = account.sequence
      }
      const reserve = getAccountReserve(account, this.networkInfo.entryReserve)

      // Tokens this account has a trustline for:
      const trustedTokenIds = new Set<string>()
      const detectedTokenIds: string[] = []
      const lockedTokenAmounts: { [tokenId: string]: string } = {}
      for (const bal of account.balances) {
        if (bal.asset_type === AssetType.native) {
          const denom = this.getDenomination(null)
          this.lockedNativeAmount = add(
            reserve,
            mul(bal.selling_liabilities, denom.multiplier)
          )
          this.updateBalance(null, mul(bal.balance, denom.multiplier))
          continue
        }
        if (
          bal.asset_type !== AssetType.credit4 &&
          bal.asset_type !== AssetType.credit12
        ) {
          continue
        }

        const tokenId = makeTokenId({
          code: bal.asset_code,
          issuer: bal.asset_issuer
        })
        const token = this.allTokensMap[tokenId]
        if (token == null) continue
        trustedTokenIds.add(tokenId)

        const denom = token.denominations[0]
        const nativeAmount = mul(bal.balance, denom.multiplier)
        lockedTokenAmounts[tokenId] = mul(
          bal.selling_liabilities,
          denom.multiplier
        )
        this.updateBalance(tokenId, nativeAmount)
        if (gt(nativeAmount, '0') && !this.enabledTokenIds.includes(tokenId)) {
          detectedTokenIds.push(tokenId)
        }
      }

      for (const tokenId of this.enabledTokenIds) {
        if (trustedTokenIds.has(tokenId)) continue
        unactivatedTokenIds.push(tokenId)
        this.updateBalance(tokenId, '0')
      }
      this.lockedTokenAmounts = lockedTokenAmounts
      if (detectedTokenIds.length > 0) {
        this.currencyEngineCallbacks.onNewTokens(detectedTokenIds)
      }
      this.syncTracker.setBalanceRatios(this.enabledTokenIds, 1)
    } catch (e: any) {
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      if (e.response && e.response.title === 'Resource Missing') {
        this.log('Account not found. Probably not activated w/minimum XLM')
        // An account that doesn't exist can't hold trustlines:
        for (const tokenId of this.enabledTokenIds) {
          unactivatedTokenIds.push(tokenId)
          this.updateBalance(tokenId, '0')
        }
        this.syncTracker.updateBalanceRatio(null, 1)
        this.syncTracker.setBalanceRatios(this.enabledTokenIds, 1)
      } else {
        this.error(`checkAccountInnerLoop Error fetching address info: `, e)
        return
      }
    }

    if (
      !matchJson(unactivatedTokenIds, this.walletLocalData.unactivatedTokenIds)
    ) {
      this.walletLocalData.unactivatedTokenIds = unactivatedTokenIds
      this.walletLocalDataDirty = true
      this.currencyEngineCallbacks.onUnactivatedTokenIdsChanged(
        unactivatedTokenIds
      )
    }
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  checkBlockchainInnerLoop() {
    this.multicastServers('ledgers')
      .then(r => {
        const blockHeight = r.records[0].sequence
        this.updateBlockHeight(blockHeight)
      })
      .catch(e => {
        this.error(`checkBlockchainInnerLoop Error `, e)
      })
  }

  async queryFee(): Promise<void> {
    try {
      const response: ReturnType<typeof asFeeStats> =
        await this.multicastServers('feeStats')

      // Payments pay the ledger's base fee, which only rises above the
      // minimum during surge pricing. Horizon's fee percentiles mix in
      // smart contract fees, so bid from the base fee instead:
      const lastBaseFee = parseInt(response.last_ledger_base_fee)
      const baseFee = lastBaseFee > BASE_FEE ? lastBaseFee : BASE_FEE

      // Bid higher when the last ledger was nearly full,
      // since surge pricing may be starting:
      const congested = parseFloat(response.ledger_capacity_usage) >= 0.9
      this.fees = {
        low: baseFee,
        standard: congested ? baseFee * 2 : baseFee,
        high: congested ? baseFee * 10 : baseFee * 2
      }
    } catch (e: any) {
      this.error(`queryFee Error `, e)
    }
  }

  async clearBlockchainCache(): Promise<void> {
    this.activatedAccountsCache = {}
    this.lastMultiOpTxid = undefined
    await super.clearBlockchainCache()
    this.otherData.accountSequence = '0'
  }

  // ****************************************************************************
  // Public methods
  // ****************************************************************************

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  async startEngine() {
    this.addToLoop('queryFee', BLOCKCHAIN_POLL_MILLISECONDS)
    this.addToLoop('checkBlockchainInnerLoop', BLOCKCHAIN_POLL_MILLISECONDS)
    this.addToLoop('checkAccountInnerLoop', ADDRESS_POLL_MILLISECONDS)
    this.addToLoop('checkTransactionsInnerLoop', TRANSACTION_POLL_MILLISECONDS)
    await super.startEngine()
  }

  async resyncBlockchain(): Promise<void> {
    await this.killEngine()
    await this.clearBlockchainCache()
    await this.startEngine()
  }

  async makeSpend(edgeSpendInfoIn: EdgeSpendInfo): Promise<EdgeTransaction> {
    const { edgeSpendInfo, currencyCode, nativeBalance, denom } =
      this.makeSpendCheck(edgeSpendInfoIn)
    const { memos = [], tokenId } = edgeSpendInfo

    const activate = asMaybeActivateTokenParams(edgeSpendInfo.otherParams)
    if (activate != null) {
      return this.makeChangeTrust(
        edgeSpendInfo,
        nativeBalance,
        activate.activateTokenId,
        true
      )
    }
    const deactivate = asMaybeDeactivateTokenParams(edgeSpendInfo.otherParams)
    if (deactivate != null) {
      return this.makeChangeTrust(
        edgeSpendInfo,
        nativeBalance,
        deactivate.deactivateTokenId,
        false
      )
    }

    if (edgeSpendInfo.spendTargets.length !== 1) {
      throw new Error('Error: only one output allowed')
    }
    const { publicAddress } = edgeSpendInfo.spendTargets[0]
    let { nativeAmount } = edgeSpendInfo.spendTargets[0]

    if (publicAddress == null)
      throw new Error('makeSpend Missing publicAddress')
    if (nativeAmount == null) throw new NoAmountSpecifiedError()

    if (tokenId != null) {
      return await this.makeTokenSpend(
        edgeSpendInfo,
        tokenId,
        publicAddress,
        nativeAmount,
        nativeBalance
      )
    }

    // Check if destination address is activated
    const accountId = getAccountId(publicAddress)
    let mustCreateAccount = false
    if (!this.activatedAccountsCache[accountId]) {
      try {
        await this.multicastServers('loadAccount', accountId)
        this.activatedAccountsCache[accountId] = true
      } catch (e: any) {
        // Only a missing account is unactivated, and only for now.
        // Remember nothing, so the next attempt looks again:
        if (e?.response?.title !== 'Resource Missing') throw e
        mustCreateAccount = true
      }
    }

    // Creating an account takes its G address, so a muxed address can't:
    if (mustCreateAccount && accountId !== publicAddress) {
      throw new Error(
        'Recipient address not activated. A muxed (M) address can only receive funds after its account is activated'
      )
    }

    if (eq(nativeAmount, '0')) {
      throw new NoAmountSpecifiedError()
    }

    const exchangeAmount = div(nativeAmount, denom.multiplier, 7)

    let txBuilder = this.makeTxBuilder(edgeSpendInfo)

    if (mustCreateAccount) {
      txBuilder = txBuilder.addOperation(
        Operation.createAccount({
          destination: publicAddress,
          startingBalance: exchangeAmount
        })
      )
    } else {
      txBuilder = txBuilder.addOperation(
        Operation.payment({
          destination: publicAddress,
          asset: Asset.native(),
          amount: exchangeAmount
        })
      )
    }
    for (const memo of memos) txBuilder = txBuilder.addMemo(makeMemo(memo))
    const transaction = txBuilder.build()

    const networkFee = transaction.fee.toString()
    nativeAmount = add(networkFee, nativeAmount) // Add fee to total
    if (gt(nativeAmount, sub(nativeBalance, this.lockedNativeAmount))) {
      throw new InsufficientFundsError({ tokenId })
    }

    nativeAmount = `-${nativeAmount}`
    const edgeTransaction: EdgeTransaction = {
      blockHeight: 0, // blockHeight
      currencyCode, // currencyCode
      date: 0, // date
      isSend: nativeAmount.startsWith('-'),
      memos,
      nativeAmount, // nativeAmount
      networkFee, // networkFee
      networkFees: [],
      otherParams: {
        fromAddress: this.walletLocalData.publicKey,
        toAddress: publicAddress,
        unsignedTx: transaction.toXdr()
      },
      ourReceiveAddresses: [], // ourReceiveAddresses
      signedTx: '', // signedTx
      tokenId,
      txid: '', // txid
      walletId: this.walletId
    }

    this.warn('Stellar transaction prepared')
    this.warn(
      `${nativeAmount} ${this.walletLocalData.publicKey} -> ${publicAddress}`
    )
    return edgeTransaction
  }

  /**
   * Pays a token. The recipient needs an authorized trustline for it,
   * and the fee comes out of this account's spendable XLM.
   */
  private async makeTokenSpend(
    edgeSpendInfo: EdgeSpendInfo,
    tokenId: string,
    publicAddress: string,
    nativeAmount: string,
    tokenBalance: string
  ): Promise<EdgeTransaction> {
    const { memos = [] } = edgeSpendInfo
    const token = this.allTokensMap[tokenId]
    if (token == null) throw new Error(`Unknown token ${tokenId}`)
    if (eq(nativeAmount, '0')) throw new NoAmountSpecifiedError()
    // Tokens held in offers can't be sent:
    const lockedAmount = this.lockedTokenAmounts[tokenId] ?? '0'
    if (gt(nativeAmount, sub(tokenBalance, lockedAmount))) {
      throw new InsufficientFundsError({ tokenId })
    }

    const asset = getTokenAsset(token)
    const accountId = getAccountId(publicAddress)
    // The issuer takes back its own asset without a trustline:
    if (accountId !== asset.getIssuer()) {
      let recipient: Horizon.AccountResponse
      try {
        recipient = await this.multicastServers('loadAccount', accountId)
      } catch (e: any) {
        if (e?.response?.title !== 'Resource Missing') throw e
        throw new Error(
          `The recipient's Stellar account isn't activated, so it can't receive ${token.currencyCode} yet`
        )
      }
      const line = recipient.balances.find(
        bal =>
          (bal.asset_type === AssetType.credit4 ||
            bal.asset_type === AssetType.credit12) &&
          bal.asset_code === asset.getCode() &&
          bal.asset_issuer === asset.getIssuer()
      )
      if (line == null) {
        throw new Error(
          `The recipient hasn't added ${token.currencyCode} to their Stellar wallet, so it can't receive ${token.currencyCode} yet`
        )
      }
      if ('is_authorized' in line && !line.is_authorized) {
        throw new Error(
          `The ${token.currencyCode} issuer hasn't authorized the recipient to receive ${token.currencyCode}`
        )
      }
    }

    let txBuilder = this.makeTxBuilder(edgeSpendInfo).addOperation(
      Operation.payment({
        destination: publicAddress,
        asset,
        amount: div(nativeAmount, token.denominations[0].multiplier, 7)
      })
    )
    for (const memo of memos) txBuilder = txBuilder.addMemo(makeMemo(memo))
    const transaction = txBuilder.build()

    // The fee is paid in XLM:
    const parentNetworkFee = transaction.fee.toString()
    const spendableXlm = sub(
      this.getBalance({ tokenId: null }),
      this.lockedNativeAmount
    )
    if (gt(parentNetworkFee, spendableXlm)) {
      throw new InsufficientFundsError({
        tokenId: null,
        networkFee: parentNetworkFee
      })
    }

    return {
      blockHeight: 0,
      currencyCode: token.currencyCode,
      date: 0,
      isSend: true,
      memos,
      nativeAmount: `-${nativeAmount}`,
      networkFee: '0',
      networkFees: [],
      otherParams: {
        fromAddress: this.walletLocalData.publicKey,
        toAddress: publicAddress,
        unsignedTx: transaction.toXdr()
      },
      ourReceiveAddresses: [],
      parentNetworkFee,
      signedTx: '',
      tokenId,
      txid: '',
      walletId: this.walletId
    }
  }

  /** Starts a transaction from this account at the chosen fee. */
  private makeTxBuilder(edgeSpendInfo: EdgeSpendInfo): TransactionBuilder {
    const account = new Account(
      this.walletLocalData.publicKey,
      this.otherData.accountSequence
    )
    const feeSetting =
      edgeSpendInfo.networkFeeOption !== undefined &&
      edgeSpendInfo.networkFeeOption !== 'custom'
        ? this.fees[edgeSpendInfo.networkFeeOption]
        : this.fees.standard

    // Transactions must declare timebounds;
    // TimeoutInfinite leaves them unbounded:
    return new TransactionBuilder(account, {
      fee: String(feeSetting),
      networkPassphrase: this.networkInfo.networkPassphrase
    }).setTimeout(TimeoutInfinite)
  }

  /**
   * Adds or removes the trustline this account needs to hold a token.
   * Either way only the fee is spent: a trustline locks one entry's
   * reserve, which comes back when the trustline goes.
   */
  private makeChangeTrust(
    edgeSpendInfo: EdgeSpendInfo,
    nativeBalance: string,
    tokenId: string,
    activate: boolean
  ): EdgeTransaction {
    const token = this.allTokensMap[tokenId]
    if (token == null) throw new Error(`Unknown token ${tokenId}`)
    if (!activate && !eq(this.getBalance({ tokenId }), '0')) {
      throw new Error(
        `Send or swap all ${token.currencyCode} before removing it, since Stellar only removes empty trustlines`
      )
    }

    const transaction = this.makeTxBuilder(edgeSpendInfo)
      .addOperation(
        Operation.changeTrust({
          asset: getTokenAsset(token),
          // A zero limit removes the trustline:
          limit: activate ? undefined : '0'
        })
      )
      .build()

    const networkFee = transaction.fee.toString()
    const lockedAfter = activate
      ? add(this.lockedNativeAmount, this.networkInfo.entryReserve)
      : this.lockedNativeAmount
    if (gt(add(networkFee, lockedAfter), nativeBalance)) {
      throw new InsufficientFundsError({ tokenId: null, networkFee })
    }

    return {
      blockHeight: 0,
      currencyCode: this.currencyInfo.currencyCode,
      date: 0,
      isSend: true,
      memos: [],
      nativeAmount: `-${networkFee}`,
      networkFee,
      networkFees: [],
      otherParams: {
        fromAddress: this.walletLocalData.publicKey,
        unsignedTx: transaction.toXdr()
      },
      ourReceiveAddresses: [],
      signedTx: '',
      tokenId: null,
      txid: '',
      walletId: this.walletId
    }
  }

  async signTx(
    edgeTransaction: EdgeTransaction,
    privateKeys: JsonObject
  ): Promise<EdgeTransaction> {
    const stellarPrivateKeys = asStellarPrivateKeys(privateKeys)
    const otherParams = getOtherParams(edgeTransaction)

    // Only XLM sends can create the recipient's account.
    // Trustline changes have no recipient:
    if (edgeTransaction.tokenId == null && otherParams.toAddress != null) {
      const sendAmount = abs(
        add(edgeTransaction.nativeAmount, edgeTransaction.networkFee)
      )
      await this.checkRecipientMinimumBalance(
        this.getRecipientBalance,
        sendAmount,
        otherParams.toAddress
      )
    }

    // Do signing
    try {
      const transaction = TransactionBuilder.fromXdr(
        otherParams.unsignedTx,
        this.networkInfo.networkPassphrase
      )
      this.warn('Signing...')
      transaction.sign(Keypair.fromSecret(stellarPrivateKeys.stellarKey))
      edgeTransaction.signedTx = transaction.toXdr()
    } catch (e: any) {
      this.error(
        `FAILURE signTx\n${JSON.stringify(cleanTxLogs(edgeTransaction))} `,
        e
      )
      throw e
    }
    this.warn(`signTx\n${cleanTxLogs(edgeTransaction)}`)
    return edgeTransaction
  }

  async broadcastTx(
    edgeTransaction: EdgeTransaction
  ): Promise<EdgeTransaction> {
    const otherParams = getOtherParams(edgeTransaction)

    try {
      if (edgeTransaction.signedTx === '') {
        throw new Error('ErrorInvalidTransaction')
      }
      const transaction = TransactionBuilder.fromXdr(
        edgeTransaction.signedTx,
        this.networkInfo.networkPassphrase
      )
      this.warn(`Broadcasting...\n${cleanTxLogs(edgeTransaction)}`)
      const result = await this.multicastServers(
        'submitTransaction',
        transaction
      )
      edgeTransaction.txid = result.hash
      edgeTransaction.date = Date.now() / 1000
      if (otherParams.toAddress != null) {
        this.activatedAccountsCache[getAccountId(otherParams.toAddress)] = true
      }
      this.otherData.accountSequence = add(this.otherData.accountSequence, '1')
      this.walletLocalDataDirty = true
      this.warn(`SUCCESS broadcastTx\n${cleanTxLogs(edgeTransaction)}`)
    } catch (e: any) {
      this.error(
        `FAILURE broadcastTx\n${JSON.stringify(cleanTxLogs(edgeTransaction))} `,
        e
      )
      throw e
    }
    return edgeTransaction
  }

  engineGetActivationAssets = async (
    options: EdgeEngineGetActivationAssetsOptions
  ): Promise<EdgeGetActivationAssetsResults> => {
    // Trustlines are paid for in XLM from this same wallet:
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
    if (activateTokenIds == null) {
      throw new Error(
        `Must specify activateTokenIds for ${this.currencyInfo.currencyCode}`
      )
    }
    const { wallet, tokenId } = paymentInfo ?? { tokenId: null }
    if (tokenId !== null) {
      throw new Error(`Must activate with ${this.currencyInfo.currencyCode}`)
    }
    if (wallet?.id !== this.walletId) {
      throw new Error('Must pay with same wallet you are activating token with')
    }
    for (const activateTokenId of activateTokenIds) {
      if (
        activateTokenId == null ||
        this.allTokensMap[activateTokenId] == null
      ) {
        throw new Error(`Invalid tokenId to activate ${activateTokenId}`)
      }
    }

    // Each trustline locks its own reserve, so check that all of them
    // fit before broadcasting any:
    const count = String(activateTokenIds.length)
    const networkFee = mul(String(this.fees.standard), count)
    const lockedAfter = add(
      this.lockedNativeAmount,
      mul(this.networkInfo.entryReserve, count)
    )
    if (gt(add(networkFee, lockedAfter), this.getBalance({ tokenId: null }))) {
      throw new InsufficientFundsError({ tokenId: null, networkFee })
    }

    return {
      paymentWalletId: this.walletId,
      paymentTokenId: null,
      // The trustline reserve stays in the wallet, so only fees are spent:
      fromNativeAmount: '0',
      networkFee: {
        nativeAmount: networkFee,
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
            tokenId: null,
            otherParams: { activateTokenId }
          })
          const signedTx = await wallet.signTx(activationTx)
          const edgeTransaction = await wallet.broadcastTx(signedTx)
          this.warn(
            `SUCCESS activateWallet.approve()\n${cleanTxLogs(edgeTransaction)}`
          )
          transactions.push(edgeTransaction)
          await this.saveTx(edgeTransaction)

          // Horizon answers once the ledger closes, so the trustline
          // exists. Reloading the account counts its reserve before
          // the next activation checks what XLM is left:
          await this.checkAccountInnerLoop()
        }
        return { transactions }
      },
      close: async (): Promise<void> => {}
    }
  }
}

export async function makeCurrencyEngine(
  env: PluginEnvironment<StellarNetworkInfo>,
  tools: StellarTools,
  walletInfo: EdgeWalletInfo,
  opts: EdgeCurrencyEngineOptions
): Promise<EdgeCurrencyEngine> {
  const safeWalletInfo = asSafeStellarWalletInfo(walletInfo)
  const engine = new StellarEngine(env, tools, safeWalletInfo, opts)

  await engine.loadEngine()

  return engine
}

/** Converts an Edge memo to a Stellar one. */
function makeMemo(memo: EdgeMemo): Memo {
  switch (memo.type) {
    case 'hex':
      return Memo.hash(memo.value)
    case 'number':
      return Memo.id(memo.value)
    case 'text':
      return Memo.text(memo.value)
  }
}

/**
 * Returns the account a payment to this address lands in:
 * the G account behind a muxed (M) address, or else the address itself.
 * Horizon only looks accounts up by their G address.
 */
function getAccountId(address: string): string {
  return StrKey.isValidMed25519PublicKey(address)
    ? extractBaseAddress(address)
    : address
}
