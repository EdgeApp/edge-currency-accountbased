import { abs, add, div, eq, gt, gte, lt, sub } from 'biggystring'
import { Disklet } from 'disklet'
import {
  EdgeCurrencyEngine,
  EdgeCurrencyEngineCallbacks,
  EdgeCurrencyEngineOptions,
  EdgeCurrencyInfo,
  EdgeCurrencyTools,
  EdgeDataDump,
  EdgeDenomination,
  EdgeEnginePrivateKeyOptions,
  EdgeFreshAddress,
  EdgeGetTransactionsOptions,
  EdgeIo,
  EdgeLog,
  EdgeMetaToken,
  EdgeSpendInfo,
  EdgeSubscribedAddress,
  EdgeToken,
  EdgeTokenId,
  EdgeTokenIdOptions,
  EdgeTokenMap,
  EdgeTransaction,
  EdgeTransactionEvent,
  InsufficientFundsError,
  JsonObject,
  SpendToSelfError
} from 'edge-core-js/types'

import { PluginEnvironment } from './innerPlugin'
import { makePeriodicTask, PeriodicTask } from './periodicTask'
import { makeMetaTokens, validateToken } from './tokenHelpers'
import {
  asMaybeOtherParamsLastSeenTime,
  asWalletLocalData,
  DATA_STORE_FILE,
  EdgeTransactionHelperAmounts,
  SafeCommonWalletInfo,
  TRANSACTION_STORE_FILE,
  TXID_LIST_FILE,
  TXID_MAP_FILE,
  WalletLocalData
} from './types'
import {
  cleanTxLogs,
  matchJson,
  normalizeAddress,
  safeErrorMessage
} from './utils'
import { validateMemos } from './validateMemos'

const SAVE_DATASTORE_MILLISECONDS = 10000
const MAX_TRANSACTIONS = 2500
const DROPPED_TX_TIME_GAP = 3600 * 24 // 1 Day

interface TxidList {
  [tokenId: string]: string[]
}
interface TxidMap {
  [tokenId: string]: { [txid: string]: number }
}
interface TransactionList {
  [tokenId: string]: EdgeTransaction[]
}

export class CurrencyEngine<
  Tools extends EdgeCurrencyTools & {
    io: EdgeIo
    currencyInfo: EdgeCurrencyInfo
  },
  SafeWalletInfo extends SafeCommonWalletInfo
> implements EdgeCurrencyEngine
{
  tools: Tools
  walletInfo: SafeWalletInfo
  currencyEngineCallbacks: EdgeCurrencyEngineCallbacks
  walletLocalDisklet: Disklet
  engineOn: boolean
  addressesChecked: boolean
  tokenCheckBalanceStatus: Map<EdgeTokenId, number> // Each tokenId can be a 0-1 value
  tokenCheckTransactionsStatus: Map<EdgeTokenId, number> // Each tokenId code can be a 0-1 value
  walletLocalData: WalletLocalData
  walletLocalDataDirty: boolean

  /** The official core new-tx checkpoint, saved to synced storage. */
  seenTxCheckpoint: string | undefined
  subscribedAddresses: EdgeSubscribedAddress[]

  /**
   * The highest transaction checkpoint we have seen.
   * This will be saved to `seenTxCheckpoint` once we finish syncing.
   */
  highestSeenCheckpoint: string | undefined

  transactionListDirty: boolean
  transactionsLoaded: boolean
  transactionList: TransactionList
  txIdMap: TxidMap // Maps txid to index of tx in
  txIdList: TxidList // Map of array of txids in chronological order
  transactionEvents: EdgeTransactionEvent[] // Transaction events when new transactions are added or have changed
  currencyInfo: EdgeCurrencyInfo
  currentSettings: any
  private readonly tasks = new Map<string, PeriodicTask>()
  walletId: string
  log: EdgeLog
  warn: (message: string, e?: Error) => void
  error: (message: string, e?: Error) => void
  otherData: unknown
  minimumAddressBalance: string

  // Tokens:
  allTokens: EdgeMetaToken[] = []
  allTokensMap: EdgeTokenMap = {}
  builtinTokens: EdgeTokenMap = {}
  customTokens: EdgeTokenMap = {}
  enabledTokenIds: string[] = []

  // Helpers
  checkBalances: (
    amounts: EdgeTransactionHelperAmounts,
    tokenId: EdgeTokenId
  ) => void

  makeEdgeTransactionAmounts: (
    nativeAmountSend: string,
    nativeAmountFee: string,
    tokenId: EdgeTokenId
  ) => EdgeTransactionHelperAmounts

  constructor(
    env: PluginEnvironment<{}>,
    tools: Tools,
    walletInfo: SafeWalletInfo,
    opts: EdgeCurrencyEngineOptions
  ) {
    const { builtinTokens, currencyInfo } = env
    const {
      callbacks,
      customTokens,
      enabledTokenIds,
      log,
      walletLocalDisklet
    } = opts

    this.tools = tools
    this.log = log
    this.warn = (message, e?) => this.log.warn(message + safeErrorMessage(e))
    this.error = (message, e?) => this.log.error(message + safeErrorMessage(e))
    this.engineOn = false
    this.addressesChecked = false
    this.tokenCheckBalanceStatus = new Map()
    this.tokenCheckTransactionsStatus = new Map()
    this.walletLocalDataDirty = false
    this.seenTxCheckpoint = opts.seenTxCheckpoint
    // Sync in-memory decoy addresses with what core has saved
    this.subscribedAddresses = opts.subscribedAddresses ?? []
    this.transactionEvents = []
    this.transactionListDirty = false
    this.transactionsLoaded = false
    this.walletInfo = walletInfo
    this.walletId = walletInfo.id
    this.currencyInfo = currencyInfo
    this.otherData = undefined
    this.minimumAddressBalance = '0'

    // Use empty string null tokenId
    this.transactionList = { '': [] }
    this.txIdMap = { '': {} }
    this.txIdList = { '': [] }

    // Configure tokens:
    this.builtinTokens = builtinTokens
    this.changeCustomTokensSync(customTokens)
    this.changeEnabledTokenIdsSync(enabledTokenIds)

    if (opts.userSettings != null) {
      this.currentSettings = opts.userSettings
    } else {
      this.currentSettings = this.currencyInfo.defaultSettings
    }

    this.currencyEngineCallbacks = callbacks
    this.walletLocalDisklet = walletLocalDisklet

    if (typeof this.walletInfo.keys.publicKey !== 'string') {
      this.walletInfo.keys.publicKey = walletInfo.keys.publicKey
    }
    this.walletLocalData = {
      blockHeight: 0,
      highestTxBlockHeight: 0,
      lastAddressQueryHeight: 0,
      lastTransactionQueryHeight: {},
      lastTransactionDate: {},
      publicKey: '',
      totalBalances: {},
      numTransactions: {},
      unactivatedTokenIds: [],
      otherData: undefined
    }
    this.log(
      `Created Wallet Type ${this.walletInfo.type} for Currency Plugin ${this.currencyInfo.pluginId}`
    )

    // Helpers
    this.checkBalances = (
      amounts: EdgeTransactionHelperAmounts,
      tokenId: EdgeTokenId
    ): void => {
      const { nativeAmount, parentNetworkFee } = amounts
      const sendBalance = this.getBalance({ tokenId })
      const feeBalance = this.getBalance({ tokenId: null })

      if (gt(abs(nativeAmount), sendBalance)) {
        throw new InsufficientFundsError({ tokenId })
      }
      if (parentNetworkFee != null && gt(parentNetworkFee, feeBalance)) {
        throw new InsufficientFundsError({
          networkFee: parentNetworkFee,
          tokenId: null
        })
      }
    }
    this.makeEdgeTransactionAmounts = (
      nativeAmountSend: string,
      nativeAmountFee: string,
      tokenId: EdgeTokenId
    ): EdgeTransactionHelperAmounts => {
      let nativeAmount = `-${nativeAmountSend}`
      let networkFee = nativeAmountFee
      let parentNetworkFee

      const isToken = tokenId != null

      if (isToken) {
        parentNetworkFee = networkFee
        networkFee = '0'
      } else {
        nativeAmount = sub(nativeAmount, networkFee)
      }

      return {
        nativeAmount,
        networkFee,
        parentNetworkFee
      }
    }
  }

  getCurrencyCode(tokenId: null): string
  getCurrencyCode(tokenId: EdgeTokenId): string | undefined
  getCurrencyCode(tokenId: EdgeTokenId): string | undefined {
    if (tokenId == null) {
      return this.currencyInfo.currencyCode
    } else {
      return this.allTokensMap[tokenId]?.currencyCode
    }
  }

  getDenomination(tokenId: null): EdgeDenomination
  getDenomination(tokenId: EdgeTokenId): EdgeDenomination | undefined
  getDenomination(tokenId: EdgeTokenId): EdgeDenomination | undefined {
    if (tokenId == null) {
      const mainnetDenom = this.currencyInfo.denominations.find(
        d => d.name === this.currencyInfo.currencyCode
      )
      if (mainnetDenom == null) {
        throw new Error(
          `Improbable case where we cannot find the mainnet denom`
        )
      }
      return mainnetDenom
    } else {
      const tokenDenom = this.allTokensMap[tokenId]?.denominations?.find(
        d => d.name === this.allTokensMap[tokenId]?.currencyCode
      )
      return tokenDenom
    }
  }

  protected isSpendTx(edgeTransaction: EdgeTransaction): boolean {
    if (edgeTransaction.nativeAmount !== '') {
      if (edgeTransaction.nativeAmount.slice(0, 1) === '-') {
        return true
      }
      if (gt(edgeTransaction.nativeAmount, '0')) {
        return false
      }
    }
    let out = true
    if (edgeTransaction.ourReceiveAddresses.length > 0) {
      for (const addr of edgeTransaction.ourReceiveAddresses) {
        if (addr === this.walletLocalData.publicKey) {
          out = false
        }
      }
    }
    return out
  }

  private isTransactionNew(edgeTransaction: EdgeTransaction): boolean {
    const txCheckpoint = this.getTxCheckpoint(edgeTransaction)
    if (
      // Undefined seenTxCheckpoint means we're syncing for the very first time
      // and should not emit new transaction notifications.
      this.seenTxCheckpoint != null &&
      // We want the tx checkpoint to be `>` our existing one, not `>=`:
      txCheckpoint !== this.seenTxCheckpoint
    ) {
      // Return true if the transaction's checkpoint is selected
      return (
        this.selectSeenTxCheckpoint(txCheckpoint, this.seenTxCheckpoint) ===
        txCheckpoint
      )
    }
    return false
  }

  protected setOtherData(raw: any): void {}

  /**
   * Migrates transaction data from currency code keys to tokenId keys, if necessary.
   * Old format: keyed by currency codes (e.g., "ETH", "USDC")
   * New format: keyed by tokenIds (e.g., "", "a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48")
   */
  private migrateCurrencyCodeToTokenId<T>(
    data: Record<string, T> | undefined
  ): Record<string, T> | undefined {
    if (data == null) {
      return data
    }

    // Check if migration is needed - if data already has empty string key, it's already migrated
    if (data[''] != null) {
      return data
    }

    const migrated: Record<string, T> = {}

    for (const [currencyCode, value] of Object.entries(data)) {
      let newKey: string

      // Native currency maps to empty string
      if (currencyCode === this.currencyInfo.currencyCode) {
        newKey = ''
      } else {
        // Find tokenId in allTokensMap that matches this currency code
        const tokenId = Object.keys(this.allTokensMap).find(
          tid => this.allTokensMap[tid]?.currencyCode === currencyCode
        )

        if (tokenId != null) {
          newKey = tokenId
        } else {
          // No matching token found
          continue
        }
      }

      migrated[newKey] = value
    }

    return migrated
  }

  protected async loadTransactions(): Promise<void> {
    if (this.transactionsLoaded) {
      this.log('Transactions already loaded')
      return
    }
    this.transactionsLoaded = true

    const disklet = this.walletLocalDisklet

    let txIdList: TxidList | undefined
    try {
      const result = await disklet.getText(TXID_LIST_FILE)
      txIdList = JSON.parse(result)
    } catch (e: any) {
      this.log('Could not load txidList file. Failure is ok on new device')
      await disklet.setText(TXID_LIST_FILE, JSON.stringify(this.txIdList))
    }

    let txIdMap: TxidMap | undefined
    try {
      const result = await disklet.getText(TXID_MAP_FILE)
      txIdMap = JSON.parse(result)
    } catch (e: any) {
      this.log('Could not load txidMap file. Failure is ok on new device')
      await disklet.setText(TXID_MAP_FILE, JSON.stringify(this.txIdMap))
    }

    let transactionList: TransactionList | undefined
    try {
      const result = await disklet.getText(TRANSACTION_STORE_FILE)
      transactionList = JSON.parse(result)
    } catch (e: any) {
      if (e.code === 'ENOENT' || e.message?.includes('No such file') === true) {
        this.log(
          'Could not load transactionList file. Failure is ok on new device'
        )
        await disklet.setText(
          TRANSACTION_STORE_FILE,
          JSON.stringify(this.transactionList)
        )
      } else {
        this.log.crash(e, { currencyPluginId: this.currencyInfo.pluginId })
      }
    }

    // Migrate old data from currency codes to tokenIds if needed
    const needsMigration =
      (txIdList != null &&
        Object.keys(txIdList).length > 0 &&
        txIdList[''] == null) ||
      (txIdMap != null &&
        Object.keys(txIdMap).length > 0 &&
        txIdMap[''] == null) ||
      (transactionList != null &&
        Object.keys(transactionList).length > 0 &&
        transactionList[''] == null)

    if (needsMigration) {
      this.log.warn(
        'Migrating transaction data from currency codes to tokenIds'
      )
      txIdList = this.migrateCurrencyCodeToTokenId(txIdList) ?? this.txIdList
      txIdMap = this.migrateCurrencyCodeToTokenId(txIdMap) ?? this.txIdMap
      transactionList =
        this.migrateCurrencyCodeToTokenId(transactionList) ??
        this.transactionList
      this.transactionListDirty = true
      this.log.warn('Migration complete')
    }

    let isEmptyTransactions = true
    for (const tid of Object.keys(this.transactionList)) {
      if (
        this.transactionList[tid] != null &&
        this.transactionList[tid].length > 0
      ) {
        isEmptyTransactions = false
        break
      }
    }

    if (isEmptyTransactions) {
      // Easy, just copy everything over
      this.transactionList = transactionList ?? this.transactionList
      this.txIdList = txIdList ?? this.txIdList
      this.txIdMap = txIdMap ?? this.txIdMap

      // But we do need to update our checkpoints:
      for (const tid of Object.keys(this.transactionList)) {
        for (const tx of this.transactionList[tid]) {
          this.highestSeenCheckpoint = this.selectSeenTxCheckpoint(
            this.highestSeenCheckpoint,
            this.getTxCheckpoint(tx)
          )
        }
      }
    } else if (transactionList != null) {
      // Manually add transactions via addTransaction()
      for (const tokenId of Object.keys(transactionList)) {
        for (const edgeTransaction of transactionList[tokenId]) {
          this.addTransaction(tokenId, edgeTransaction)
        }
      }
    }
    for (const tokenId of Object.keys(this.transactionList)) {
      this.walletLocalData.numTransactions[tokenId] =
        this.transactionList[tokenId].length
    }
  }

  // Called by engine startup code
  async loadEngine(): Promise<void> {
    const { walletInfo } = this

    if (this.walletInfo.keys.publicKey == null) {
      this.walletInfo.keys.publicKey = walletInfo.keys.publicKey
    }

    const disklet = this.walletLocalDisklet
    try {
      const result = await disklet.getText(DATA_STORE_FILE)
      this.walletLocalData = asWalletLocalData(JSON.parse(result))
      this.walletLocalData.publicKey = this.walletInfo.keys.publicKey
    } catch (err) {
      try {
        this.log('No walletLocalData setup yet: Failure is ok')
        this.walletLocalData = asWalletLocalData({})
        this.walletLocalData.publicKey = this.walletInfo.keys.publicKey
        await disklet.setText(
          DATA_STORE_FILE,
          JSON.stringify(this.walletLocalData)
        )
      } catch (e: any) {
        this.error('Error writing to localDataStore. Engine not started: ', e)
        throw e
      }
    }
    this.setOtherData(this.walletLocalData.otherData ?? {})
    this.walletLocalDataDirty = !matchJson(
      this.otherData,
      this.walletLocalData.otherData
    )

    // Add the native token currency
    this.tokenCheckBalanceStatus.set(null, 0)
    this.tokenCheckTransactionsStatus.set(null, 0)

    this.doInitialBalanceCallback()
    this.doInitialUnactivatedTokenIdsCallback()

    // If we have no checkpoint, load all transactions into memory.
    // This will set up `highestSeenCheckpoint`, which gets copied to
    // `seenTxCheckpoint` when the sync completes.
    if (this.seenTxCheckpoint == null) {
      await this.loadTransactions()
      // We still need an initial checkpoint,
      // even if we don't have any txs:
      if (this.highestSeenCheckpoint == null) {
        this.highestSeenCheckpoint = '0'
      }
    }
  }

  protected findTransaction(tokenId: EdgeTokenId, txid: string): number {
    const safeTokenId = tokenId ?? ''
    if (this.txIdMap[safeTokenId] != null) {
      const index = this.txIdMap[safeTokenId][txid]
      if (typeof index === 'number') {
        return index
      }
    }
    return -1
  }

  protected sortTxByDate(a: EdgeTransaction, b: EdgeTransaction): number {
    return b.date - a.date
  }

  // Add or update tx in transactionList
  // Called by EthereumNetwork
  addTransaction(
    tokenId: EdgeTokenId,
    edgeTransaction: EdgeTransaction,
    lastSeenTime?: number
  ): void {
    this.log('executing addTransaction: ', edgeTransaction.txid)
    // set otherParams if not already set
    if (edgeTransaction.otherParams == null) {
      edgeTransaction.otherParams = {}
    }

    if (edgeTransaction.blockHeight < 1) {
      edgeTransaction.otherParams.lastSeenTime =
        lastSeenTime ?? Math.round(Date.now() / 1000)
    }
    this.updateConfirmations(edgeTransaction)
    const txid = normalizeAddress(edgeTransaction.txid)
    const idx = this.findTransaction(tokenId, txid)

    const safeTokenId = tokenId ?? ''
    let needsReSort = false
    // if transaction doesn't exist in database
    if (idx === -1) {
      needsReSort = true
      // if currency's transactionList is uninitialized then initialize
      if (typeof this.transactionList[safeTokenId] === 'undefined') {
        this.transactionList[safeTokenId] = []
      } else if (this.transactionList[safeTokenId].length >= MAX_TRANSACTIONS) {
        return
      }
      // add transaction to list of tx's, and array of changed transactions
      this.transactionList[safeTokenId].push(edgeTransaction)
      this.walletLocalData.numTransactions[safeTokenId] =
        this.transactionList[safeTokenId].length
      this.walletLocalDataDirty = true

      this.transactionListDirty = true
      const isNew = this.isTransactionNew(edgeTransaction)
      this.transactionEvents.push({ isNew, transaction: edgeTransaction })
      this.highestSeenCheckpoint = this.selectSeenTxCheckpoint(
        this.getTxCheckpoint(edgeTransaction),
        this.highestSeenCheckpoint
      )
      this.warn(`addTransaction new tx: ${edgeTransaction.txid}`)
    } else {
      // Already have this tx in the database. See if anything changed
      const transactionsArray = this.transactionList[safeTokenId]
      const edgeTx = transactionsArray[idx]

      const { otherParams: otherParamsOld = {} } = edgeTx
      const { otherParams: otherParamsNew = {} } = edgeTransaction
      if (
        // if something in the transaction has changed?
        edgeTx.blockHeight < edgeTransaction.blockHeight ||
        (edgeTx.blockHeight === 0 && edgeTransaction.blockHeight < 0) ||
        (edgeTx.blockHeight === edgeTransaction.blockHeight &&
          (edgeTx.networkFee !== edgeTransaction.networkFee ||
            edgeTx.nativeAmount !== edgeTransaction.nativeAmount ||
            otherParamsOld.lastSeenTime !== otherParamsNew.lastSeenTime ||
            edgeTx.date !== edgeTransaction.date))
      ) {
        if (edgeTx.date !== edgeTransaction.date) {
          needsReSort = true
        }
        this.warn(
          `addTransaction: update ${edgeTransaction.txid} height:${edgeTransaction.blockHeight}`
        )
        this.walletLocalDataDirty = true
        this.updateTransaction(safeTokenId, edgeTransaction, idx)
      } else {
        // this.log(sprintf('Old transaction. No Update: %s', tx.hash))
      }
    }
    if (needsReSort) {
      this.sortTransactions(safeTokenId)
    }
  }

  protected sortTransactions(tokenId: EdgeTokenId): void {
    const safeTokenId = tokenId ?? ''
    // Sort
    this.transactionList[safeTokenId].sort(this.sortTxByDate)
    // Add to txidMap
    const txIdList: string[] = []
    let i = 0
    for (const tx of this.transactionList[safeTokenId]) {
      if (this.txIdMap[safeTokenId] == null) {
        this.txIdMap[safeTokenId] = {}
      }
      this.txIdMap[safeTokenId][normalizeAddress(tx.txid)] = i
      txIdList.push(normalizeAddress(tx.txid))
      i++
    }
    this.txIdList[safeTokenId] = txIdList
  }

  protected getUnconfirmedTxs(): EdgeTransaction[] {
    const transactions: EdgeTransaction[] = []
    for (const tokenId of Object.keys(this.transactionList)) {
      for (const tx of this.transactionList[tokenId]) {
        if (tx.blockHeight === 0) {
          transactions.push(tx)
        }
      }
    }
    return transactions
  }

  // null tokenId to be stored as empty string to maintain JSON compatibility
  getBalance(opts: EdgeTokenIdOptions): string {
    return this.walletLocalData.totalBalances[opts.tokenId ?? ''] ?? '0'
  }

  updateBalance(tokenId: EdgeTokenId, balance: string): void {
    const currentBalance = this.getBalance({ tokenId })

    if (!eq(balance, currentBalance)) {
      this.walletLocalData.totalBalances[tokenId ?? ''] = balance
      this.walletLocalDataDirty = true
      this.warn(`${tokenId}: token Address balance: ${balance}`)
      this.currencyEngineCallbacks.onTokenBalanceChanged(tokenId, balance)
    }
    this.tokenCheckBalanceStatus.set(tokenId, 1)
    this.updateOnAddressesChecked()
  }

  updateConfirmations(tx: EdgeTransaction): boolean {
    // No update needed for these status
    switch (tx.confirmations) {
      case 'confirmed':
      case 'dropped':
      case 'failed': {
        return false
      }
      // don't use syncing status
      case undefined:
      case 'syncing': {
        tx.confirmations = 'unconfirmed'
        return this.updateConfirmations(tx)
      }
    }

    // Fix negative block heights
    tx.blockHeight = Math.max(0, tx.blockHeight)

    if (
      typeof tx.confirmations === 'number' ||
      (tx.confirmations === 'unconfirmed' && tx.blockHeight > 0)
    ) {
      const numConfirmations = Math.max(
        1,
        this.walletLocalData.blockHeight - tx.blockHeight + 1
      )
      const requiredConfirmations = this.currencyInfo.requiredConfirmations ?? 1

      // confirmations exceed required, mark as confirmed
      if (numConfirmations >= requiredConfirmations) {
        tx.confirmations = 'confirmed'
        return true
      } else if (numConfirmations !== tx.confirmations) {
        // less than required confirmations, update the confirmation count
        tx.confirmations = numConfirmations
        return true
      }
      return false
    }

    // See if the transaction should be dropped
    if (tx.confirmations === 'unconfirmed' && tx.blockHeight === 0) {
      const otherParams = asMaybeOtherParamsLastSeenTime(tx.otherParams)
      if (otherParams != null) {
        const lastSeen = otherParams.lastSeenTime
        if (Date.now() / 1000 - lastSeen > DROPPED_TX_TIME_GAP) {
          tx.confirmations = 'dropped'
          tx.nativeAmount = '0'
          return true
        }
      }
    }

    return false
  }

  updateBlockHeight(blockHeight: number): void {
    if (this.walletLocalData.blockHeight === blockHeight) return

    this.walletLocalData.blockHeight = blockHeight
    this.walletLocalDataDirty = true
    this.currencyEngineCallbacks.onBlockHeightChanged(blockHeight)

    const activeTokenIds = [null, ...this.enabledTokenIds]

    for (const tokenId of activeTokenIds) {
      const txList = this.transactionList[tokenId ?? ''] ?? []
      for (let i = 0; i < txList.length; i++) {
        const tx = txList[i]
        const didUpdate = this.updateConfirmations(tx)
        if (didUpdate) {
          this.updateTransaction(tokenId, tx, i)
        }
      }
    }
    this.sendTransactionEvents()
  }

  protected updateTransaction(
    tokenId: EdgeTokenId,
    edgeTransaction: EdgeTransaction,
    idx: number
  ): void {
    const safeTokenId = tokenId ?? ''
    // Update the transaction
    this.transactionList[safeTokenId][idx] = edgeTransaction
    this.transactionListDirty = true
    this.transactionEvents.push({ isNew: false, transaction: edgeTransaction })
    this.warn(`updateTransaction: ${edgeTransaction.txid}`)
  }

  /**
   * Save the wallet data store.
   */
  protected async saveWalletLoop(): Promise<void> {
    const disklet = this.walletLocalDisklet
    const promises = []
    if (this.transactionListDirty) {
      await this.loadTransactions()
      this.log('transactionListDirty. Saving...')
      let jsonString = JSON.stringify(this.transactionList)
      promises.push(
        disklet.setText(TRANSACTION_STORE_FILE, jsonString).catch(e => {
          this.error('Error saving transactionList ', e)
        })
      )
      jsonString = JSON.stringify(this.txIdList)
      promises.push(
        disklet.setText(TXID_LIST_FILE, jsonString).catch(e => {
          this.error('Error saving txIdList ', e)
        })
      )
      jsonString = JSON.stringify(this.txIdMap)
      promises.push(
        disklet.setText(TXID_MAP_FILE, jsonString).catch(e => {
          this.error('Error saving txIdMap ', e)
        })
      )
      await Promise.all(promises)
      this.transactionListDirty = false
    }
    if (this.walletLocalDataDirty) {
      this.log('walletLocalDataDirty. Saving...')
      this.walletLocalData.otherData = this.otherData
      const jsonString = JSON.stringify(this.walletLocalData)
      await disklet
        .setText(DATA_STORE_FILE, jsonString)
        .then(() => {
          this.walletLocalDataDirty = false
        })
        .catch(e => {
          this.error('Error saving walletLocalData ', e)
        })
    }
  }

  protected doInitialBalanceCallback(): void {
    for (const tokenId of [null, ...this.enabledTokenIds]) {
      try {
        this.currencyEngineCallbacks.onTokenBalanceChanged(
          tokenId,
          this.getBalance({ tokenId })
        )
      } catch (e: any) {
        this.error(`doInitialBalanceCallback Error for tokenId ${tokenId}`, e)
      }
    }
  }

  protected doInitialUnactivatedTokenIdsCallback(): void {
    try {
      if (
        this.walletLocalData.unactivatedTokenIds != null &&
        this.walletLocalData.unactivatedTokenIds.length > 0
      ) {
        this.currencyEngineCallbacks.onUnactivatedTokenIdsChanged(
          this.walletLocalData.unactivatedTokenIds
        )
      }
    } catch (e: any) {
      this.error(`doInitialUnactivatedTokenIdsCallback Error`, e)
    }
  }

  /**
   * Schedule a periodic task.
   * Names are unique. If we already have a task with the same name,
   * scheduling another one won't do anything.
   * If the callback is missing, it will default to calling `this[name]`.
   */
  protected addToLoop(
    name: string,
    msGap: number,
    callback: () => Promise<void> | undefined = async () => {
      // @ts-expect-error
      await this[name]()
    }
  ): void {
    if (this.tasks.get(name) != null) return

    const onError = (error: unknown): void => {
      this.log(name + ': ' + String(error))
    }
    const task = makePeriodicTask(callback, msGap, { onError })
    this.tasks.set(name, task)
    if (this.engineOn) task.start()
  }

  protected removeFromLoop(name: string): void {
    this.tasks.get(name)?.stop()
    this.tasks.delete(name)
  }

  // Called by EthereumNetwork
  getTokenInfo(tokenId: EdgeTokenId): EdgeToken | undefined {
    if (tokenId == null) return undefined
    return this.allTokensMap[tokenId]
  }

  /**
   * Gets a checkpoint from a transaction based on if the checkpoint is
   * block-height.
   *
   * Other currencies can override this method to implement their own logic for
   * picking a checkpoint based on what is stored in the checkpoint.
   */
  getTxCheckpoint(edgeTransaction: EdgeTransaction): string {
    return edgeTransaction.blockHeight.toString()
  }

  /**
   * Picks a checkpoint based on if the checkpoint is a block-height. It always
   * chooses the largest block-height.
   *
   * Other currencies can override this method to implement their own logic for
   * picking a checkpoint based on what is stored in the checkpoint.
   */
  selectSeenTxCheckpoint(
    checkpointA?: string,
    checkpointB?: string
  ): string | undefined {
    // If either is null, return the other one:
    if (checkpointA == null) return checkpointB
    if (checkpointB == null) return checkpointA

    // Pick the bigger one:
    return parseInt(checkpointA) > parseInt(checkpointB)
      ? checkpointA
      : checkpointB
  }

  sendTransactionEvents(): void {
    if (this.transactionEvents.length > 0) {
      this.currencyEngineCallbacks.onTransactions(this.transactionEvents)
      this.transactionEvents = []

      // Once we send transactions to the core, the user might see some
      // notifications. We *never* want to show these notifications again,
      // so update the core's last-seen checkpoint, ignoring sync status:
      this.updateSeenTxCheckpoint()
    }
  }

  // Called by EthereumNetwork
  updateOnAddressesChecked(): void {
    if (this.addressesChecked) {
      return
    }

    const activeTokenIds = [null, ...this.enabledTokenIds]
    const perTokenSlice = 1 / activeTokenIds.length
    let totalStatus = 0
    let numComplete = 0
    for (const tokenId of activeTokenIds) {
      const balanceStatus = this.tokenCheckBalanceStatus.get(tokenId) ?? 0
      const txStatus = this.tokenCheckTransactionsStatus.get(tokenId) ?? 0
      totalStatus += ((balanceStatus + txStatus) / 2) * perTokenSlice
      if (balanceStatus === 1 && txStatus === 1) {
        numComplete++
      }
    }
    if (numComplete === activeTokenIds.length) {
      totalStatus = 1
      this.addressesChecked = true
    }
    this.log(`${this.walletId} syncRatio of: ${totalStatus}`)
    // note that sometimes callback does not get triggered on Android debug
    this.currencyEngineCallbacks.onAddressesChecked(totalStatus)

    // Only call the callback if the wallet is fully synced.
    // This ensure that all initial syncs, without a defined seenTxCheckpoint,
    // will not incorrectly update the seenTxCheckpoint in the middle of an
    // initial sync.
    if (this.addressesChecked) this.updateSeenTxCheckpoint()
  }

  /**
   * Sync the wallet to 100% no matter what.
   */
  setOneHundoSyncRatio(): void {
    // We need to make sure the wallet state is updated so it never gets a
    // sync ratio of less than 1 from updateOnAddressesChecked. This
    // is coupled logic that you need to know about. Setting this.addressesChecked
    // is all that's needed to short circuit the logic in updateOnAddressesChecked.
    // Go read updateOnAddressesChecked to understand.
    this.addressesChecked = true

    // Need to sent the sync ratio up the core and to the client (GUI):
    this.currencyEngineCallbacks.onAddressesChecked(1)
  }

  updateSeenTxCheckpoint(): void {
    const bestCheckpoint = this.selectSeenTxCheckpoint(
      this.highestSeenCheckpoint,
      this.seenTxCheckpoint
    )
    if (bestCheckpoint == null) return
    if (bestCheckpoint === this.seenTxCheckpoint) return

    this.seenTxCheckpoint = bestCheckpoint
    this.currencyEngineCallbacks.onSeenTxCheckpoint(this.seenTxCheckpoint)
  }

  protected async clearBlockchainCache(): Promise<void> {
    this.walletLocalData = asWalletLocalData({
      publicKey: this.walletLocalData.publicKey
    })
    this.walletLocalDataDirty = true
    this.addressesChecked = false
    this.tokenCheckBalanceStatus = new Map()
    this.tokenCheckTransactionsStatus = new Map()
    this.transactionList = {}
    this.txIdList = {}
    this.txIdMap = {}
    this.transactionListDirty = true
    this.setOtherData({})
    await this.saveWalletLoop()
  }

  // *************************************
  // Public methods
  // *************************************

  async startEngine(): Promise<void> {
    this.addToLoop('saveWalletLoop', SAVE_DATASTORE_MILLISECONDS)

    this.engineOn = true
    for (const [, task] of this.tasks) {
      task.start()
    }
  }

  async killEngine(): Promise<void> {
    this.engineOn = false

    for (const [, task] of this.tasks) {
      task.stop()
    }
  }

  async changeUserSettings(userSettings: Object): Promise<void> {
    this.currentSettings = userSettings
  }

  getBlockHeight(): number {
    return this.walletLocalData.blockHeight
  }

  private changeCustomTokensSync(customTokens: EdgeTokenMap): void {
    this.customTokens = {}
    for (const tokenId of Object.keys(customTokens)) {
      const token = customTokens[tokenId]
      try {
        validateToken(token)
      } catch (e) {
        this.log.warn(
          `Dropping custom token "${token.currencyCode}" / ${tokenId}`
        )
        continue
      }
      this.customTokens[tokenId] = token
    }

    this.allTokensMap = { ...this.customTokens, ...this.builtinTokens }
    this.allTokens = makeMetaTokens(this.allTokensMap)
  }

  async changeCustomTokens(tokens: EdgeTokenMap): Promise<void> {
    this.changeCustomTokensSync(tokens)
  }

  private changeEnabledTokenIdsSync(tokenIds: string[]): void {
    const codes = new Set<string>()
    const ids = new Set<string>()
    for (const tokenId of tokenIds) {
      const token = this.allTokensMap[tokenId]
      if (token == null) continue

      codes.add(token.currencyCode)
      ids.add(tokenId)
    }

    this.enabledTokenIds = [...ids]
  }

  async changeEnabledTokenIds(tokenIds: string[]): Promise<void> {
    this.changeEnabledTokenIdsSync(tokenIds)
  }

  getNumTransactions(options: EdgeTokenIdOptions): number {
    const safeTokenId = options.tokenId ?? ''
    if (this.walletLocalData.numTransactions[safeTokenId] == null) {
      return 0
    } else {
      return this.walletLocalData.numTransactions[safeTokenId]
    }
  }

  async getTransactions(
    options: EdgeGetTransactionsOptions
  ): Promise<EdgeTransaction[]> {
    const { startDate, endDate, tokenId } = options
    const safeTokenId = tokenId ?? ''

    await this.loadTransactions()

    if (this.transactionList[safeTokenId] == null) {
      return []
    }

    const returnArray = this.transactionList[safeTokenId].filter(tx => {
      return (
        new Date(tx.date) >= (startDate ?? new Date(0)) &&
        new Date(tx.date) <= (endDate ?? new Date())
      )
    })

    return returnArray
  }

  async getFreshAddress(_options: any): Promise<EdgeFreshAddress> {
    return { publicAddress: this.walletLocalData.publicKey }
  }

  async addGapLimitAddresses(_addresses: string[]): Promise<void> {}

  async isAddressUsed(_address: string): Promise<boolean> {
    return false
  }

  async dumpData(): Promise<EdgeDataDump> {
    const dataDump: EdgeDataDump = {
      walletId: this.walletId.split(' - ')[0],
      walletType: this.walletInfo.type,
      data: {
        pluginType: { pluginId: this.currencyInfo.pluginId },
        walletLocalData: this.walletLocalData
      }
    }
    return dataDump
  }

  makeSpendCheck(edgeSpendInfo: EdgeSpendInfo): {
    edgeSpendInfo: EdgeSpendInfo
    nativeBalance: string
    currencyCode: string
    denom: EdgeDenomination
    skipChecks: boolean
  } {
    const { skipChecks = false, tokenId } = edgeSpendInfo
    validateMemos(edgeSpendInfo, this.currencyInfo)

    for (const st of edgeSpendInfo.spendTargets) {
      if (!skipChecks && st.publicAddress === this.walletLocalData.publicKey) {
        throw new SpendToSelfError()
      }
    }

    if (tokenId != null && !this.enabledTokenIds.includes(tokenId)) {
      throw new Error('Error: Token not enabled')
    }

    const currencyCode = this.getCurrencyCode(tokenId)
    if (currencyCode == null) throw new Error('Unknown tokenId')

    const nativeBalance = this.getBalance({ tokenId })

    // Bucket all spendTarget nativeAmounts by currencyCode
    const spendAmountMap = new Map<EdgeTokenId, string>()
    for (const spendTarget of edgeSpendInfo.spendTargets) {
      const { nativeAmount } = spendTarget
      if (nativeAmount == null) continue
      const currentSpendAmount = spendAmountMap.get(tokenId) ?? '0'
      spendAmountMap.set(tokenId, add(currentSpendAmount, nativeAmount))
    }

    // Check each spend amount against relevant balance
    for (const [tokenId, nativeAmount] of spendAmountMap) {
      const nativeBalance = this.getBalance({ tokenId })
      if (!skipChecks && lt(nativeBalance, nativeAmount)) {
        throw new InsufficientFundsError({ tokenId })
      }
    }

    const denom = this.getDenomination(tokenId)
    if (denom == null) {
      throw new Error('InternalErrorInvalidCurrencyCode')
    }

    return { edgeSpendInfo, nativeBalance, currencyCode, denom, skipChecks }
  }

  async checkRecipientMinimumBalance(
    getBalance: (address: string) => Promise<string>,
    sendAmount: string,
    recipient: string
  ): Promise<void> {
    if (gte(sendAmount, this.minimumAddressBalance)) return

    const balance = await getBalance(recipient)
    if (lt(add(sendAmount, balance), this.minimumAddressBalance)) {
      const denom = this.getDenomination(null)

      const exchangeDenomString = div(
        this.minimumAddressBalance,
        denom.multiplier
      )
      throw new Error(
        `Recipient address not activated. A minimum ${exchangeDenomString} ${this.currencyInfo.currencyCode} transfer is required to send funds to this address`
      )
    }
  }

  // called by GUI after sliding to confirm
  async saveTx(edgeTransaction: EdgeTransaction): Promise<void> {
    // add the transaction to disk and fire off callback (alert in GUI)
    this.addTransaction(edgeTransaction.tokenId, edgeTransaction)
    this.transactionEvents.forEach(txEvent =>
      this.warn(
        `executing back in saveTx and this.transactionsChangedArray is: ${cleanTxLogs(
          txEvent.transaction
        )}`
      )
    )

    this.sendTransactionEvents()
  }

  //
  // Virtual functions to be override by extension:
  //

  async resyncBlockchain(): Promise<void> {
    throw new Error('not implemented')
  }

  async makeSpend(
    edgeSpendInfoIn: EdgeSpendInfo,
    opts?: EdgeEnginePrivateKeyOptions
  ): Promise<EdgeTransaction> {
    throw new Error('not implemented')
  }

  async signTx(
    edgeTransaction: EdgeTransaction,
    privateKeys: JsonObject
  ): Promise<EdgeTransaction> {
    throw new Error('not implemented')
  }

  async broadcastTx(
    edgeTransaction: EdgeTransaction,
    opts?: EdgeEnginePrivateKeyOptions
  ): Promise<EdgeTransaction> {
    throw new Error('not implemented')
  }
}
