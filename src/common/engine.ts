import { add, eq, gt, lt } from 'biggystring'
import { Disklet } from 'disklet'
import {
  EdgeCurrencyCodeOptions,
  EdgeCurrencyEngineCallbacks,
  EdgeCurrencyEngineOptions,
  EdgeCurrencyInfo,
  EdgeCurrencyTools,
  EdgeDataDump,
  EdgeDenomination,
  EdgeFreshAddress,
  EdgeGetTransactionsOptions,
  EdgeIo,
  EdgeLog,
  EdgeMetaToken,
  EdgeSpendInfo,
  EdgeTokenMap,
  EdgeTransaction,
  EdgeWalletInfo,
  InsufficientFundsError,
  SpendToSelfError
} from 'edge-core-js/types'

import { PluginEnvironment } from './innerPlugin'
import {
  asCurrencyCodeOptions,
  checkCustomToken,
  checkEdgeSpendInfo
} from './schema'
import {
  CustomToken,
  DATA_STORE_FILE,
  TRANSACTION_STORE_FILE,
  TXID_LIST_FILE,
  TXID_MAP_FILE,
  WalletLocalData
} from './types'
import {
  cleanTxLogs,
  getDenomInfo,
  normalizeAddress,
  safeErrorMessage
} from './utils'

const SAVE_DATASTORE_MILLISECONDS = 10000
const MAX_TRANSACTIONS = 1000
const DROPPED_TX_TIME_GAP = 3600 * 24 // 1 Day

export class CurrencyEngine<
  T extends EdgeCurrencyTools & { io: EdgeIo; currencyInfo: EdgeCurrencyInfo }
> {
  tools: T
  walletInfo: EdgeWalletInfo
  currencyEngineCallbacks: EdgeCurrencyEngineCallbacks
  walletLocalDisklet: Disklet
  engineOn: boolean
  addressesChecked: boolean
  tokenCheckBalanceStatus: { [currencyCode: string]: number } // Each currency code can be a 0-1 value
  tokenCheckTransactionsStatus: { [currencyCode: string]: number } // Each currency code can be a 0-1 value
  walletLocalData: WalletLocalData
  walletLocalDataDirty: boolean
  transactionListDirty: boolean
  transactionsLoaded: boolean
  transactionList: { [currencyCode: string]: EdgeTransaction[] }
  txIdMap: { [currencyCode: string]: { [txid: string]: number } } // Maps txid to index of tx in
  txIdList: { [currencyCode: string]: string[] } // Map of array of txids in chronological order
  transactionsChangedArray: EdgeTransaction[] // Transactions that have changed and need to be added
  currencyInfo: EdgeCurrencyInfo
  allTokens: EdgeMetaToken[]
  allTokensMap: EdgeTokenMap
  customTokens: EdgeMetaToken[]
  enabledTokens: string[]
  currentSettings: any
  timers: any
  walletId: string
  io: EdgeIo
  log: EdgeLog
  warn: (message: string, e?: Error) => void
  error: (message: string, e?: Error) => void
  otherData: { [key: string]: any }

  constructor(
    env: PluginEnvironment<{}>,
    tools: T,
    walletInfo: EdgeWalletInfo,
    opts: EdgeCurrencyEngineOptions
  ) {
    const { io, currencyInfo } = tools
    const { currencyCode } = currencyInfo
    const { walletLocalDisklet, callbacks, customTokens } = opts

    this.tools = tools
    this.io = io
    this.log = opts.log
    this.warn = (message, e?) => this.log.warn(message + safeErrorMessage(e))
    this.error = (message, e?) => this.log.error(message + safeErrorMessage(e))
    this.engineOn = false
    this.addressesChecked = false
    this.tokenCheckBalanceStatus = {}
    this.tokenCheckTransactionsStatus = {}
    this.walletLocalDataDirty = false
    this.transactionsChangedArray = []
    this.transactionList = {}
    this.transactionListDirty = false
    this.transactionsLoaded = false
    this.txIdMap = {}
    this.txIdList = {}
    this.walletInfo = walletInfo
    this.walletId = walletInfo.id != null ? `${walletInfo.id} - ` : ''
    this.currencyInfo = currencyInfo
    this.allTokens = currencyInfo.metaTokens.slice(0)
    this.enabledTokens = []
    this.customTokens = []
    this.allTokensMap = { ...customTokens, ...env.builtinTokens }
    this.timers = {}

    this.transactionList[currencyCode] = []
    this.txIdMap[currencyCode] = {}
    this.txIdList[currencyCode] = []

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
      lastAddressQueryHeight: 0,
      lastTransactionQueryHeight: {},
      lastTransactionDate: {},
      publicKey: '',
      totalBalances: {},
      lastCheckedTxsDropped: 0,
      numUnconfirmedSpendTxs: 0,
      numTransactions: {},
      otherData: {}
    }
    this.otherData = {}
    this.log(
      `Created Wallet Type ${this.walletInfo.type} for Currency Plugin ${this.currencyInfo.pluginId}`
    )
  }

  isSpendTx(edgeTransaction: EdgeTransaction): boolean {
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

  async loadTransactions(): Promise<void> {
    if (this.transactionsLoaded) {
      this.log('Transactions already loaded')
      return
    }
    this.transactionsLoaded = true

    const disklet = this.walletLocalDisklet
    let txIdList: { [currencyCode: string]: string[] } | undefined
    let txIdMap:
      | { [currencyCode: string]: { [txid: string]: number } }
      | undefined
    let transactionList:
      | { [currencyCode: string]: EdgeTransaction[] }
      | undefined
    try {
      const result = await disklet.getText(TXID_LIST_FILE)
      txIdList = JSON.parse(result)
    } catch (e: any) {
      this.log('Could not load txidList file. Failure is ok on new device')
      await disklet.setText(TXID_LIST_FILE, JSON.stringify(this.txIdList))
    }
    try {
      const result = await disklet.getText(TXID_MAP_FILE)
      txIdMap = JSON.parse(result)
    } catch (e: any) {
      this.log('Could not load txidMap file. Failure is ok on new device')
      await disklet.setText(TXID_MAP_FILE, JSON.stringify(this.txIdMap))
    }

    try {
      const result = await disklet.getText(TRANSACTION_STORE_FILE)
      transactionList = JSON.parse(result)
    } catch (e: any) {
      if (e.code === 'ENOENT') {
        this.log(
          'Could not load transactionList file. Failure is ok on new device'
        )
        await disklet.setText(
          TRANSACTION_STORE_FILE,
          JSON.stringify(this.transactionList)
        )
      } else {
        this.log.crash(e, this.walletLocalData)
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

  async loadEngine(
    plugin: EdgeCurrencyTools,
    walletInfo: EdgeWalletInfo,
    opts: EdgeCurrencyEngineOptions
  ): Promise<void> {
    const { currencyCode } = this.currencyInfo

    if (this.walletInfo.keys.publicKey == null) {
      const pubKeys = await this.tools.derivePublicKey(this.walletInfo)
      this.walletInfo.keys.publicKey = pubKeys.publicKey
    }

    const disklet = this.walletLocalDisklet
    try {
      const result = await disklet.getText(DATA_STORE_FILE)
      this.walletLocalData = new WalletLocalData(result)
      this.walletLocalData.publicKey = this.walletInfo.keys.publicKey
    } catch (err) {
      try {
        this.log('No walletLocalData setup yet: Failure is ok')
        this.walletLocalData = new WalletLocalData(null)
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

    // Add the native token currency
    this.tokenCheckBalanceStatus[currencyCode] = 0
    this.tokenCheckTransactionsStatus[currencyCode] = 0
    this.enabledTokens.push(currencyCode)

    const { customTokens = {}, enabledTokenIds = [] } = opts

    // Add all of the custom tokens
    for (const token of Object.keys(customTokens)) {
      const {
        currencyCode,
        denominations,
        displayName,
        networkLocation = {}
      } = customTokens[token]
      this.addCustomToken({
        currencyCode,
        currencyName: displayName,
        denominations,
        displayName,
        multiplier: denominations[0].multiplier,
        networkLocation,
        contractAddress: networkLocation?.contractAddress
      }).catch(e => this.log(e.message))
    }

    // Create a map for fast searching
    const initMap: { [tokenId: string]: boolean } = {}
    const tokenIdMap = enabledTokenIds.reduce((map, tokenId) => {
      map[tokenId] = true
      return map
    }, initMap)

    // Add all the enabled known tokens
    const addTokenPromises = this.allTokens.map(
      async ({
        currencyCode,
        contractAddress = '',
        currencyName,
        denominations
      }) =>
        await this.tools
          .getTokenId?.({
            currencyCode,
            displayName: currencyName,
            denominations,
            networkLocation: { contractAddress }
          })
          .then(tokenId => {
            if (
              tokenIdMap[tokenId] &&
              !this.enabledTokens.includes(currencyCode)
            ) {
              this.enabledTokens.push(currencyCode)
              this.walletLocalData.totalBalances[currencyCode] = '0'
              this.tokenCheckBalanceStatus[currencyCode] = 0
              this.tokenCheckTransactionsStatus[currencyCode] = 0
            }
          })
          .catch()
    )

    await Promise.all(addTokenPromises)

    this.doInitialBalanceCallback()
  }

  findTransaction(currencyCode: string, txid: string): number {
    if (this.txIdMap[currencyCode] != null) {
      const index = this.txIdMap[currencyCode][txid]
      if (typeof index === 'number') {
        return index
      }
    }
    return -1
  }

  sortTxByDate(a: EdgeTransaction, b: EdgeTransaction): number {
    return b.date - a.date
  }

  // Add or update tx in transactionList
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
      this.transactionsChangedArray.push(edgeTransaction)
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

  sortTransactions(currencyCode: string): void {
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

  checkDroppedTransactionsThrottled(): void {
    const now = Date.now() / 1000
    if (
      now - this.walletLocalData.lastCheckedTxsDropped >
      DROPPED_TX_TIME_GAP
    ) {
      this.checkDroppedTransactions(now)
      this.walletLocalData.lastCheckedTxsDropped = now
      this.walletLocalDataDirty = true
      if (this.transactionsChangedArray.length > 0) {
        this.currencyEngineCallbacks.onTransactionsChanged(
          this.transactionsChangedArray
        )
        this.transactionsChangedArray = []
      }
    }
  }

  checkDroppedTransactions(dateNow: number): void {
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
            this.transactionsChangedArray.push(tx)
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

  updateBalance(tk: string, balance: string): void {
    if (this.walletLocalData.totalBalances[tk] == null) {
      this.walletLocalData.totalBalances[tk] = '0'
    }
    if (!eq(balance, this.walletLocalData.totalBalances[tk])) {
      this.walletLocalData.totalBalances[tk] = balance
      this.walletLocalDataDirty = true
      this.warn(`${tk}: token Address balance: ${balance}`)
      this.currencyEngineCallbacks.onBalanceChanged(tk, balance)
    }
    this.tokenCheckBalanceStatus[tk] = 1
    this.updateOnAddressesChecked()
  }

  updateTransaction(
    currencyCode: string,
    edgeTransaction: EdgeTransaction,
    idx: number
  ): void {
    // Update the transaction
    this.transactionList[currencyCode][idx] = edgeTransaction
    this.transactionListDirty = true
    this.transactionsChangedArray.push(edgeTransaction)
    this.warn(`updateTransaction: ${edgeTransaction.txid}`)
  }

  // *************************************
  // Save the wallet data store
  // *************************************
  async saveWalletLoop(): Promise<void> {
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

  doInitialBalanceCallback(): void {
    for (const currencyCode of this.enabledTokens) {
      try {
        this.currencyEngineCallbacks.onBalanceChanged(
          currencyCode,
          this.walletLocalData.totalBalances[currencyCode]
        )
      } catch (e: any) {
        this.error(
          `doInitialBalanceCallback Error for currencyCode ${currencyCode}`,
          e
        )
      }
    }
  }

  doInitialTransactionsCallback(): void {
    for (const currencyCode of this.enabledTokens) {
      try {
        this.currencyEngineCallbacks.onTransactionsChanged(
          this.transactionList[currencyCode]
        )
      } catch (e: any) {
        this.error(
          `doInitialTransactionsCallback Error for currencyCode ${currencyCode}`,
          e
        )
      }
    }
  }

  async addToLoop(func: string, timer: number): Promise<boolean> {
    try {
      // @ts-expect-error
      await this[func]()
    } catch (e: any) {
      this.error(`Error in Loop: ${func} `, e)
    }
    if (this.engineOn) {
      this.timers[func] = setTimeout(() => {
        if (this.engineOn) {
          this.addToLoop(func, timer).catch(e => this.log(e.message))
        }
      }, timer)
    }
    return true
  }

  getTokenInfo(token: string): EdgeMetaToken | undefined {
    return this.allTokens.find(element => {
      return element.currencyCode === token
    })
  }

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
  }

  async startEngine(): Promise<void> {
    this.addToLoop('saveWalletLoop', SAVE_DATASTORE_MILLISECONDS).catch(
      () => {}
    )
  }

  // *************************************
  // Public methods
  // *************************************

  async killEngine(): Promise<void> {
    // Set status flag to false
    this.engineOn = false
    // Clear Inner loops timers
    for (const timer in this.timers) {
      clearTimeout(this.timers[timer])
    }
    this.timers = {}
  }

  async changeUserSettings(userSettings: Object): Promise<void> {
    this.currentSettings = userSettings
  }

  async clearBlockchainCache(): Promise<void> {
    const temp = JSON.stringify({ publicKey: this.walletLocalData.publicKey })
    this.walletLocalData = new WalletLocalData(temp)
    this.walletLocalDataDirty = true
    this.addressesChecked = false
    this.tokenCheckBalanceStatus = {}
    this.tokenCheckTransactionsStatus = {}
    this.transactionList = {}
    this.txIdList = {}
    this.txIdMap = {}
    this.transactionListDirty = true
    this.otherData = this.walletLocalData.otherData
    await this.saveWalletLoop()
  }

  getBlockHeight(): number {
    return this.walletLocalData.blockHeight
  }

  enableTokensSync(tokens: string[]): void {
    const initValue: { [currencyCode: string]: boolean } = {}
    const tokenMap = tokens.reduce((map, currencyCode) => {
      map[currencyCode] = true
      return map
    }, initValue)

    for (const token of this.allTokens) {
      const { currencyCode } = token
      if (
        tokenMap[currencyCode] &&
        !this.enabledTokens.includes(currencyCode)
      ) {
        this.enabledTokens.push(currencyCode)
        // Initialize balance
        this.walletLocalData.totalBalances[currencyCode] = '0'
        this.currencyEngineCallbacks.onBalanceChanged(
          currencyCode,
          this.walletLocalData.totalBalances[currencyCode]
        )
      }
    }

    // For now, also check the allTokensMap and hopefully remove allTokens
    // in the future
    for (const edgeToken of Object.values(this.allTokensMap)) {
      const { currencyCode } = edgeToken
      if (
        tokenMap[currencyCode] &&
        !this.enabledTokens.includes(currencyCode)
      ) {
        this.enabledTokens.push(currencyCode)
        // Initialize balance
        this.walletLocalData.totalBalances[currencyCode] = '0'
        this.currencyEngineCallbacks.onBalanceChanged(
          currencyCode,
          this.walletLocalData.totalBalances[currencyCode]
        )
      }
    }
  }

  async enableTokens(tokens: string[]): Promise<void> {
    this.enableTokensSync(tokens)
  }

  disableTokensSync(tokens: string[]): void {
    for (const currencyCode of tokens) {
      if (currencyCode === this.currencyInfo.currencyCode) {
        continue
      }
      const index = this.enabledTokens.indexOf(currencyCode)
      if (index !== -1) {
        this.enabledTokens.splice(index, 1)
      }
    }
  }

  async disableTokens(tokens: string[]): Promise<void> {
    this.disableTokensSync(tokens)
  }

  async getEnabledTokens(): Promise<string[]> {
    return this.enabledTokens
  }

  async addCustomToken(
    obj: CustomToken,
    contractAddress?: string
  ): Promise<void> {
    checkCustomToken(obj)

    const tokenObj: CustomToken = obj
    // If token is already in currencyInfo, error as it cannot be changed
    for (const tk of this.currencyInfo.metaTokens) {
      if (
        tk.currencyCode.toLowerCase() === tokenObj.currencyCode.toLowerCase() ||
        tk.currencyName.toLowerCase() === tokenObj.currencyName.toLowerCase()
      ) {
        throw new Error('ErrorCannotModifyToken')
      }
    }

    // Validate the token object
    if (tokenObj.currencyCode.toUpperCase() !== tokenObj.currencyCode) {
      throw new Error('ErrorInvalidCurrencyCode')
    }
    if (tokenObj.currencyCode.length < 2 || tokenObj.currencyCode.length > 7) {
      throw new Error('ErrorInvalidCurrencyCodeLength')
    }
    if (tokenObj.currencyName.length < 3 || tokenObj.currencyName.length > 20) {
      throw new Error('ErrorInvalidCurrencyNameLength')
    }
    if (
      lt(tokenObj.multiplier, '1') ||
      gt(tokenObj.multiplier, '100000000000000000000000000000000')
    ) {
      throw new Error('ErrorInvalidMultiplier')
    }

    for (const tk of this.customTokens) {
      if (
        tk.currencyCode.toLowerCase() === tokenObj.currencyCode.toLowerCase() ||
        tk.currencyName.toLowerCase() === tokenObj.currencyName.toLowerCase()
      ) {
        // Remove old token first then re-add it to incorporate any modifications
        const idx = this.customTokens.findIndex(
          element => element.currencyCode === tokenObj.currencyCode
        )
        if (idx !== -1) {
          this.customTokens.splice(idx, 1)
        }
      }
    }

    // Create a token object for inclusion in customTokens
    const denom: EdgeDenomination = {
      name: tokenObj.currencyCode,
      multiplier: tokenObj.multiplier
    }
    const edgeMetaToken: EdgeMetaToken = {
      currencyCode: tokenObj.currencyCode,
      currencyName: tokenObj.currencyName,
      denominations: [denom],
      contractAddress: contractAddress ?? tokenObj.contractAddress
    }

    this.customTokens.push(edgeMetaToken)
    this.allTokens = this.currencyInfo.metaTokens.concat(this.customTokens)

    if (this.tools.getTokenId != null) {
      const tokenId = await this.tools.getTokenId(obj)
      this.allTokensMap = { [tokenId]: obj, ...this.allTokensMap }
    }
    this.enableTokensSync([edgeMetaToken.currencyCode])
  }

  getTokenStatus(token: string): boolean {
    return this.enabledTokens.includes(token)
  }

  getBalance(options: EdgeCurrencyCodeOptions): string {
    const cleanOptions = asCurrencyCodeOptions(options)
    const { currencyCode = this.currencyInfo.currencyCode } = cleanOptions

    if (this.walletLocalData.totalBalances[currencyCode] == null) {
      return '0'
    }
    const nativeBalance = this.walletLocalData.totalBalances[currencyCode]
    return nativeBalance
  }

  getNumTransactions(options: EdgeCurrencyCodeOptions): number {
    const cleanOptions = asCurrencyCodeOptions(options)
    const { currencyCode = this.currencyInfo.currencyCode } = cleanOptions

    if (this.walletLocalData.numTransactions[currencyCode] == null) {
      return 0
    } else {
      return this.walletLocalData.numTransactions[currencyCode]
    }
  }

  async getTransactions(
    options: EdgeGetTransactionsOptions
  ): Promise<EdgeTransaction[]> {
    const cleanOptions = asCurrencyCodeOptions(options)
    const { currencyCode = this.currencyInfo.currencyCode } = cleanOptions

    await this.loadTransactions()

    if (this.transactionList[currencyCode] == null) {
      return []
    }

    let startIndex: number = 0
    let startEntries: number = 0
    if (options === null) {
      return this.transactionList[currencyCode].slice(0)
    }
    if (options.startIndex != null && options.startIndex > 0) {
      startIndex = options.startIndex
      if (startIndex >= this.transactionList[currencyCode].length) {
        startIndex = this.transactionList[currencyCode].length - 1
      }
    }
    if (options.startEntries != null && options.startEntries > 0) {
      startEntries = options.startEntries
      if (
        startEntries + startIndex >
        this.transactionList[currencyCode].length
      ) {
        // Don't read past the end of the transactionList
        startEntries = this.transactionList[currencyCode].length - startIndex
      }
    }

    // Copy the appropriate entries from the arrayTransactions
    let returnArray = []

    if (startEntries !== 0) {
      returnArray = this.transactionList[currencyCode].slice(
        startIndex,
        startEntries + startIndex
      )
    } else {
      returnArray = this.transactionList[currencyCode].slice(startIndex)
    }
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
    const { skipChecks = false } = edgeSpendInfo
    checkEdgeSpendInfo(edgeSpendInfo)

    for (const st of edgeSpendInfo.spendTargets) {
      if (st.publicAddress === this.walletLocalData.publicKey) {
        throw new SpendToSelfError()
      }
    }

    let currencyCode: string = ''
    if (typeof edgeSpendInfo.currencyCode === 'string') {
      currencyCode = edgeSpendInfo.currencyCode
      if (currencyCode !== this.currencyInfo.currencyCode) {
        if (!this.getTokenStatus(currencyCode)) {
          throw new Error('Error: Token not supported or enabled')
        }
      }
    } else {
      currencyCode = this.currencyInfo.currencyCode
    }

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
        throw new InsufficientFundsError()
      }
    }

    edgeSpendInfo.currencyCode = currencyCode
    const denom = getDenomInfo(
      this.currencyInfo,
      currencyCode,
      this.customTokens,
      this.allTokensMap
    )
    if (denom == null) {
      throw new Error('InternalErrorInvalidCurrencyCode')
    }

    return { edgeSpendInfo, nativeBalance, currencyCode, denom, skipChecks }
  }

  // called by GUI after sliding to confirm
  async saveTx(edgeTransaction: EdgeTransaction): Promise<void> {
    // add the transaction to disk and fire off callback (alert in GUI)
    this.addTransaction(edgeTransaction.currencyCode, edgeTransaction)
    this.transactionsChangedArray.forEach(tx =>
      this.warn(
        `executing back in saveTx and this.transactionsChangedArray is: ${cleanTxLogs(
          tx
        )}`
      )
    )

    if (this.transactionsChangedArray.length > 0) {
      this.currencyEngineCallbacks.onTransactionsChanged(
        this.transactionsChangedArray
      )
    }
  }
}
