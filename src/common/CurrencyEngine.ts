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
import {
  getTokenIdFromCurrencyCode,
  makeMetaTokens,
  validateToken
} from './tokenHelpers'
import {
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
  getDenomination,
  matchJson,
  normalizeAddress,
  safeErrorMessage
} from './utils'
import { validateMemos } from './validateMemos'

const SAVE_DATASTORE_MILLISECONDS = 10000
const MAX_TRANSACTIONS = 2500
const DROPPED_TX_TIME_GAP = 3600 * 24 // 1 Day

interface TxidList {
  [currencyCode: string]: string[]
}
interface TxidMap {
  [currencyCode: string]: { [txid: string]: number }
}
interface TransactionList {
  [currencyCode: string]: EdgeTransaction[]
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
  tokenCheckBalanceStatus: { [currencyCode: string]: number } // Each currency code can be a 0-1 value
  tokenCheckTransactionsStatus: { [currencyCode: string]: number } // Each currency code can be a 0-1 value
  walletLocalData: WalletLocalData
  walletLocalDataDirty: boolean

  /** The official core new-tx checkpoint, saved to synced storage. */
  seenTxCheckpoint: string | undefined

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
  enabledTokens: string[] = []

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
    this.tokenCheckBalanceStatus = {}
    this.tokenCheckTransactionsStatus = {}
    this.walletLocalDataDirty = false
    this.seenTxCheckpoint = opts.seenTxCheckpoint
    this.transactionEvents = []
    this.transactionList = {}
    this.transactionListDirty = false
    this.transactionsLoaded = false
    this.txIdMap = {}
    this.txIdList = {}
    this.walletInfo = walletInfo
    this.walletId = walletInfo.id
    this.currencyInfo = currencyInfo
    this.otherData = undefined
    this.minimumAddressBalance = '0'

    const { currencyCode } = currencyInfo
    this.transactionList[currencyCode] = []
    this.txIdMap[currencyCode] = {}
    this.txIdList[currencyCode] = []

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
      lastCheckedTxsDropped: 0,
      numUnconfirmedSpendTxs: 0,
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
      const mainnetCode = this.currencyInfo.currencyCode
      const sendCurrencyCode =
        tokenId != null ? this.allTokensMap[tokenId].currencyCode : mainnetCode
      const sendBalance =
        this.walletLocalData.totalBalances[sendCurrencyCode] ?? '0'
      const feeCurrencyCode = mainnetCode
      const feeBalance =
        this.walletLocalData.totalBalances[feeCurrencyCode] ?? '0'

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

    let isEmptyTransactions = true
    for (const cc of Object.keys(this.transactionList)) {
      if (
        this.transactionList[cc] != null &&
        this.transactionList[cc].length > 0
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
      for (const cc of Object.keys(this.transactionList)) {
        for (const tx of this.transactionList[cc]) {
          this.highestSeenCheckpoint = this.selectSeenTxCheckpoint(
            this.highestSeenCheckpoint,
            this.getTxCheckpoint(tx)
          )
        }
      }
    } else if (transactionList != null) {
      // Manually add transactions via addTransaction()
      for (const cc of Object.keys(transactionList)) {
        for (const edgeTransaction of transactionList[cc]) {
          this.addTransaction(cc, edgeTransaction)
        }
      }
    }
    for (const currencyCode in this.transactionList) {
      this.walletLocalData.numTransactions[currencyCode] =
        this.transactionList[currencyCode].length
    }
  }

  // Called by engine startup code
  async loadEngine(): Promise<void> {
    const { walletInfo } = this
    const { currencyCode } = this.currencyInfo

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
    this.tokenCheckBalanceStatus[currencyCode] = 0
    this.tokenCheckTransactionsStatus[currencyCode] = 0

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

  protected findTransaction(currencyCode: string, txid: string): number {
    if (this.txIdMap[currencyCode] != null) {
      const index = this.txIdMap[currencyCode][txid]
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
    currencyCode: string,
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
    const txid = normalizeAddress(edgeTransaction.txid)
    const idx = this.findTransaction(currencyCode, txid)

    let needsReSort = false
    // if transaction doesn't exist in database
    if (idx === -1) {
      if (
        // if unconfirmed spend then increment # unconfirmed spend TX's
        this.isSpendTx(edgeTransaction) &&
        edgeTransaction.blockHeight === 0
      ) {
        this.walletLocalData.numUnconfirmedSpendTxs++
        this.walletLocalDataDirty = true
      }

      needsReSort = true
      // if currency's transactionList is uninitialized then initialize
      if (typeof this.transactionList[currencyCode] === 'undefined') {
        this.transactionList[currencyCode] = []
      } else if (
        this.transactionList[currencyCode].length >= MAX_TRANSACTIONS
      ) {
        return
      }
      // add transaction to list of tx's, and array of changed transactions
      this.transactionList[currencyCode].push(edgeTransaction)
      this.walletLocalData.numTransactions[currencyCode] =
        this.transactionList[currencyCode].length
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
      const transactionsArray = this.transactionList[currencyCode]
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
        // If a spend transaction goes from unconfirmed to dropped or confirmed,
        // decrement numUnconfirmedSpendTxs
        if (
          this.isSpendTx(edgeTransaction) &&
          edgeTransaction.blockHeight !== 0 &&
          edgeTx.blockHeight === 0
        ) {
          this.walletLocalData.numUnconfirmedSpendTxs--
        }
        if (edgeTx.date !== edgeTransaction.date) {
          needsReSort = true
        }
        this.warn(
          `addTransaction: update ${edgeTransaction.txid} height:${edgeTransaction.blockHeight}`
        )
        this.walletLocalDataDirty = true
        this.updateTransaction(currencyCode, edgeTransaction, idx)
      } else {
        // this.log(sprintf('Old transaction. No Update: %s', tx.hash))
      }
    }
    if (needsReSort) {
      this.sortTransactions(currencyCode)
    }
  }

  protected sortTransactions(currencyCode: string): void {
    // Sort
    this.transactionList[currencyCode].sort(this.sortTxByDate)
    // Add to txidMap
    const txIdList: string[] = []
    let i = 0
    for (const tx of this.transactionList[currencyCode]) {
      if (this.txIdMap[currencyCode] == null) {
        this.txIdMap[currencyCode] = {}
      }
      this.txIdMap[currencyCode][normalizeAddress(tx.txid)] = i
      txIdList.push(normalizeAddress(tx.txid))
      i++
    }
    this.txIdList[currencyCode] = txIdList
  }

  // Called by EthereumNetwork
  checkDroppedTransactionsThrottled(): void {
    const now = Date.now() / 1000
    if (
      now - this.walletLocalData.lastCheckedTxsDropped >
      DROPPED_TX_TIME_GAP
    ) {
      this.checkDroppedTransactions(now)
      this.walletLocalData.lastCheckedTxsDropped = now
      this.walletLocalDataDirty = true
      this.sendTransactionEvents()
    }
  }

  protected checkDroppedTransactions(dateNow: number): void {
    let numUnconfirmedSpendTxs = 0
    for (const currencyCode in this.transactionList) {
      // const droppedTxIndices: Array<number> = []
      for (let i = 0; i < this.transactionList[currencyCode].length; i++) {
        const tx = this.transactionList[currencyCode][i]
        if (tx.blockHeight === 0) {
          const { otherParams = {} } = tx
          const lastSeen = otherParams.lastSeenTime
          if (dateNow - lastSeen > DROPPED_TX_TIME_GAP) {
            // droppedTxIndices.push(i)
            tx.blockHeight = -1
            tx.nativeAmount = '0'
            this.transactionEvents.push({ isNew: false, transaction: tx })
            // delete this.txIdMap[currencyCode][tx.txid]
          } else if (this.isSpendTx(tx)) {
            // Still have a pending spend transaction in the tx list
            numUnconfirmedSpendTxs++
          }
        }
      }
      // Delete transactions in reverse order
      // for (let i = droppedTxIndices.length - 1; i >= 0; i--) {
      //   const droppedIndex = droppedTxIndices[i]
      //   this.transactionList[currencyCode].splice(droppedIndex, 1)
      // }
      // if (droppedTxIndices.length) {
      //   this.sortTransactions(currencyCode)
      // }
    }
    this.walletLocalData.numUnconfirmedSpendTxs = numUnconfirmedSpendTxs
    this.walletLocalDataDirty = true
  }

  protected getUnconfirmedTxs(): EdgeTransaction[] {
    const transactions: EdgeTransaction[] = []
    for (const currencyCode in this.transactionList) {
      for (const tx of this.transactionList[currencyCode]) {
        if (tx.blockHeight === 0) {
          transactions.push(tx)
        }
      }
    }
    return transactions
  }

  // Called by EthereumNetwork
  updateBalance(currencyCode: string, balance: string): void {
    const currentBalance = this.walletLocalData.totalBalances[currencyCode]
    if (this.walletLocalData.totalBalances[currencyCode] == null) {
      this.walletLocalData.totalBalances[currencyCode] = '0'
    }
    if (currentBalance == null || !eq(balance, currentBalance)) {
      this.walletLocalData.totalBalances[currencyCode] = balance
      this.walletLocalDataDirty = true
      this.warn(`${currencyCode}: token Address balance: ${balance}`)
      const tokenId = getTokenIdFromCurrencyCode(
        currencyCode,
        this.currencyInfo.currencyCode,
        this.allTokensMap
      )
      if (tokenId === undefined) return
      this.currencyEngineCallbacks.onTokenBalanceChanged(tokenId, balance)
    }
    this.tokenCheckBalanceStatus[currencyCode] = 1
    this.updateOnAddressesChecked()
  }

  protected updateTransaction(
    currencyCode: string,
    edgeTransaction: EdgeTransaction,
    idx: number
  ): void {
    // Update the transaction
    this.transactionList[currencyCode][idx] = edgeTransaction
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
    for (const currencyCode of this.enabledTokens) {
      try {
        const tokenId = getTokenIdFromCurrencyCode(
          currencyCode,
          this.currencyInfo.currencyCode,
          this.allTokensMap
        )
        if (tokenId === undefined) continue
        this.currencyEngineCallbacks.onTokenBalanceChanged(
          tokenId,
          this.walletLocalData.totalBalances[currencyCode] ?? '0'
        )
      } catch (e: any) {
        this.error(
          `doInitialBalanceCallback Error for currencyCode ${currencyCode}`,
          e
        )
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
  getTokenInfo(currencyCode: string): EdgeMetaToken | undefined {
    return this.allTokens.find(element => {
      return element.currencyCode === currencyCode
    })
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

    const activeTokens = this.enabledTokens
    const perTokenSlice = 1 / activeTokens.length
    let totalStatus = 0
    let numComplete = 0
    for (const token of activeTokens) {
      const balanceStatus = this.tokenCheckBalanceStatus[token] ?? 0
      const txStatus = this.tokenCheckTransactionsStatus[token] ?? 0
      totalStatus += ((balanceStatus + txStatus) / 2) * perTokenSlice
      if (balanceStatus === 1 && txStatus === 1) {
        numComplete++
      }
    }
    if (numComplete === activeTokens.length) {
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
    this.tokenCheckBalanceStatus = {}
    this.tokenCheckTransactionsStatus = {}
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
    const { currencyCode } = this.currencyInfo

    const codes = new Set<string>()
    const ids = new Set<string>()
    for (const tokenId of tokenIds) {
      const token = this.allTokensMap[tokenId]
      if (token == null) continue

      codes.add(token.currencyCode)
      ids.add(tokenId)
    }

    this.enabledTokens = [...codes, currencyCode]
    this.enabledTokenIds = [...ids]
  }

  async changeEnabledTokenIds(tokenIds: string[]): Promise<void> {
    this.changeEnabledTokenIdsSync(tokenIds)
  }

  getBalance(options: EdgeTokenIdOptions): string {
    const { tokenId } = options
    const { currencyCode } =
      tokenId == null ? this.currencyInfo : this.allTokensMap[tokenId]

    const nativeBalance = this.walletLocalData.totalBalances[currencyCode]
    if (nativeBalance == null) {
      return '0'
    }
    return nativeBalance
  }

  getNumTransactions(options: EdgeTokenIdOptions): number {
    const { tokenId } = options
    const { currencyCode } =
      tokenId == null ? this.currencyInfo : this.allTokensMap[tokenId]

    if (this.walletLocalData.numTransactions[currencyCode] == null) {
      return 0
    } else {
      return this.walletLocalData.numTransactions[currencyCode]
    }
  }

  async getTransactions(
    options: EdgeGetTransactionsOptions
  ): Promise<EdgeTransaction[]> {
    const { startDate, endDate, tokenId } = options

    const { currencyCode } =
      tokenId == null ? this.currencyInfo : this.allTokensMap[tokenId]

    await this.loadTransactions()

    if (this.transactionList[currencyCode] == null) {
      return []
    }

    const returnArray = this.transactionList[currencyCode].filter(tx => {
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

    const { currencyCode } =
      tokenId == null ? this.currencyInfo : this.allTokensMap[tokenId]

    const nativeBalance =
      this.walletLocalData.totalBalances[currencyCode] ?? '0'

    // Bucket all spendTarget nativeAmounts by currencyCode
    const spendAmountMap: { [currencyCode: string]: string } = {}
    for (const spendTarget of edgeSpendInfo.spendTargets) {
      const { nativeAmount } = spendTarget
      if (nativeAmount == null) continue
      spendAmountMap[currencyCode] = spendAmountMap[currencyCode] ?? '0'
      spendAmountMap[currencyCode] = add(
        spendAmountMap[currencyCode],
        nativeAmount
      )
    }

    // Check each spend amount against relevant balance
    for (const [currencyCode, nativeAmount] of Object.entries(spendAmountMap)) {
      const nativeBalance =
        this.walletLocalData.totalBalances[currencyCode] ?? '0'
      if (!skipChecks && lt(nativeBalance, nativeAmount)) {
        throw new InsufficientFundsError({ tokenId })
      }
    }

    const denom = getDenomination(
      currencyCode,
      this.currencyInfo,
      this.allTokensMap
    )
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
      const denom = this.currencyInfo.denominations.find(
        denom => denom.name === this.currencyInfo.currencyCode
      )
      if (denom == null) throw new Error('Unknown denom')

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
    this.addTransaction(edgeTransaction.currencyCode, edgeTransaction)
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
