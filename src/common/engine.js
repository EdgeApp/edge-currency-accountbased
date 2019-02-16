/**
 * Created by paul on 7/7/17.
 */
// @flow

import { bns } from 'biggystring'
import type { Disklet } from 'disklet'
import {
  type EdgeCurrencyEngineCallbacks,
  type EdgeCurrencyEngineOptions,
  type EdgeCurrencyInfo,
  type EdgeCurrencyPlugin,
  type EdgeDataDump,
  type EdgeDenomination,
  type EdgeFreshAddress,
  type EdgeGetTransactionsOptions,
  type EdgeIo,
  type EdgeMetaToken,
  type EdgeSpendInfo,
  type EdgeTransaction,
  type EdgeWalletInfo,
  InsufficientFundsError,
  SpendToSelfError
} from 'edge-core-js/types'

import { CurrencyPlugin } from './plugin.js'
import { CustomTokenSchema, MakeSpendSchema } from './schema.js'
import {
  type CustomToken,
  DATA_STORE_FILE,
  TRANSACTION_STORE_FILE,
  TXID_LIST_FILE,
  TXID_MAP_FILE,
  WalletLocalData
} from './types.js'
import {
  getDenomInfo,
  isHex,
  normalizeAddress,
  validateObject
} from './utils.js'

const SAVE_DATASTORE_MILLISECONDS = 10000
const MAX_TRANSACTIONS = 1000
class CurrencyEngine {
  currencyPlugin: CurrencyPlugin
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
  transactionList: { [currencyCode: string]: Array<EdgeTransaction> }
  txIdMap: { [currencyCode: string]: { [txid: string]: number } } // Maps txid to index of tx in
  txIdList: { [currencyCode: string]: Array<string> } // Map of array of txids in chronological order
  transactionsChangedArray: Array<EdgeTransaction> // Transactions that have changed and need to be added
  currencyInfo: EdgeCurrencyInfo
  allTokens: Array<EdgeMetaToken>
  customTokens: Array<EdgeMetaToken>
  currentSettings: any
  timers: any
  walletId: string
  io: EdgeIo
  otherData: Object

  constructor (
    currencyPlugin: CurrencyPlugin,
    walletInfo: EdgeWalletInfo,
    opts: EdgeCurrencyEngineOptions
  ) {
    const currencyCode = currencyPlugin.currencyInfo.currencyCode
    const { walletLocalDisklet, callbacks } = opts

    this.currencyPlugin = currencyPlugin
    this.io = currencyPlugin.io
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
    this.walletId = walletInfo.id ? `${walletInfo.id} - ` : ''
    this.currencyInfo = currencyPlugin.currencyInfo
    this.allTokens = currencyPlugin.currencyInfo.metaTokens.slice(0)
    this.customTokens = []
    this.timers = {}

    this.transactionList[currencyCode] = []
    this.txIdMap[currencyCode] = {}
    this.txIdList[currencyCode] = []

    if (opts.optionalSettings === undefined) {
      this.currentSettings = opts.optionalSettings
    } else {
      this.currentSettings = this.currencyInfo.defaultSettings
    }

    this.currencyEngineCallbacks = callbacks
    this.walletLocalDisklet = walletLocalDisklet

    if (typeof this.walletInfo.keys.publicKey !== 'string') {
      this.walletInfo.keys.publicKey = walletInfo.keys.publicKey
    }
    this.log(
      `Created Wallet Type ${this.walletInfo.type} for Currency Plugin ${
        this.currencyInfo.pluginName
      }`
    )
  }

  async loadTransactions () {
    if (this.transactionsLoaded) {
      console.log('Transactions already loaded')
      return
    }
    this.transactionsLoaded = true

    const disklet = this.walletLocalDisklet
    let txIdList
    let txIdMap
    let transactionList
    try {
      const result = await disklet.getText(TXID_LIST_FILE)
      txIdList = JSON.parse(result)
    } catch (e) {
      this.log('Could not load txidList file. Failure is ok on new device')
      await disklet.setText(TXID_LIST_FILE, JSON.stringify(this.txIdList))
    }
    try {
      const result = await disklet.getText(TXID_MAP_FILE)
      txIdMap = JSON.parse(result)
    } catch (e) {
      this.log('Could not load txidMap file. Failure is ok on new device')
      await disklet.setText(TXID_MAP_FILE, JSON.stringify(this.txIdMap))
    }

    try {
      const result = await disklet.getText(TRANSACTION_STORE_FILE)
      transactionList = JSON.parse(result)
    } catch (e) {
      this.log(
        'Could not load transactionList file. Failure is ok on new device'
      )
      await disklet.setText(TXID_MAP_FILE, JSON.stringify(this.txIdMap))
    }

    let isEmptyTransactions = true
    for (const cc in this.transactionList) {
      if (this.transactionList.hasOwnProperty(cc)) {
        if (this.transactionList[cc] && this.transactionList[cc].length > 0) {
          isEmptyTransactions = false
          break
        }
      }
    }
    if (isEmptyTransactions) {
      // Easy, just copy everything over
      this.transactionList = transactionList || this.transactionList
      this.txIdList = txIdList || this.txIdList
      this.txIdMap = txIdMap || this.txIdMap
    } else {
      // Manually add transactions via addTransaction()
      for (const cc in transactionList) {
        if (transactionList.hasOwnProperty(cc)) {
          for (const edgeTransaction of transactionList[cc]) {
            this.addTransaction(cc, edgeTransaction)
          }
        }
      }
    }
  }

  async loadEngine (
    plugin: EdgeCurrencyPlugin,
    walletInfo: EdgeWalletInfo,
    opts: EdgeCurrencyEngineOptions
  ): Promise<void> {
    if (!this.walletInfo.keys.publicKey) {
      const pubKeys = await this.currencyPlugin.derivePublicKey(this.walletInfo)
      this.walletInfo.keys.publicKey = pubKeys.publicKey
    }

    const disklet = this.walletLocalDisklet
    try {
      const result = await disklet.getText(DATA_STORE_FILE)
      this.walletLocalData = new WalletLocalData(
        result,
        this.currencyInfo.currencyCode
      )
      this.walletLocalData.publicKey = this.walletInfo.keys.publicKey
    } catch (err) {
      try {
        this.log(err)
        this.log('No walletLocalData setup yet: Failure is ok')
        this.walletLocalData = new WalletLocalData(
          null,
          this.currencyInfo.currencyCode
        )
        this.walletLocalData.publicKey = this.walletInfo.keys.publicKey
        await disklet.setText(
          DATA_STORE_FILE,
          JSON.stringify(this.walletLocalData)
        )
      } catch (e) {
        this.log('Error writing to localDataStore. Engine not started:' + err)
        throw e
      }
    }

    for (const token of this.walletLocalData.enabledTokens) {
      this.tokenCheckBalanceStatus[token] = 0
      this.tokenCheckTransactionsStatus[token] = 0
    }
    this.doInitialBalanceCallback()
  }

  findTransaction (currencyCode: string, txid: string) {
    if (this.txIdMap[currencyCode]) {
      const index = this.txIdMap[currencyCode][txid]
      if (typeof index === 'number') {
        return index
      }
    }
    return -1
  }

  sortTxByDate (a: EdgeTransaction, b: EdgeTransaction) {
    return b.date - a.date
  }

  addTransaction (currencyCode: string, edgeTransaction: EdgeTransaction) {
    // Add or update tx in transactionList
    const txid = normalizeAddress(edgeTransaction.txid)
    const idx = this.findTransaction(currencyCode, txid)
    if (edgeTransaction.blockHeight > this.currencyPlugin.highestTxHeight) {
      this.currencyPlugin.highestTxHeight = edgeTransaction.blockHeight
    }

    let needsResort = false
    if (idx === -1) {
      needsResort = true
      this.log('addTransaction: adding and sorting:' + edgeTransaction.txid)
      if (typeof this.transactionList[currencyCode] === 'undefined') {
        this.transactionList[currencyCode] = []
      } else if (
        this.transactionList[currencyCode].length >= MAX_TRANSACTIONS
      ) {
        return
      }
      this.transactionList[currencyCode].push(edgeTransaction)

      this.transactionListDirty = true
      this.transactionsChangedArray.push(edgeTransaction)
    } else {
      // Already have this tx in the database. See if anything changed
      const transactionsArray = this.transactionList[currencyCode]
      const edgeTx = transactionsArray[idx]

      if (
        edgeTx.blockHeight < edgeTransaction.blockHeight ||
        (edgeTx.blockHeight === edgeTransaction.blockHeight &&
          (edgeTx.networkFee !== edgeTransaction.networkFee ||
            edgeTx.nativeAmount !== edgeTransaction.nativeAmount ||
            edgeTx.date !== edgeTransaction.date))
      ) {
        if (edgeTx.date !== edgeTransaction.date) {
          needsResort = true
        }
        this.log(
          `Update transaction: ${edgeTransaction.txid} height:${
            edgeTransaction.blockHeight
          }`
        )
        this.updateTransaction(currencyCode, edgeTransaction, idx)
      } else {
        // this.log(sprintf('Old transaction. No Update: %s', tx.hash))
      }
    }
    if (needsResort) {
      // Sort
      this.transactionList[currencyCode].sort(this.sortTxByDate)
      // Add to txidMap
      const txIdList: Array<string> = []
      let i = 0
      for (const tx of this.transactionList[currencyCode]) {
        if (!this.txIdMap[currencyCode]) {
          this.txIdMap[currencyCode] = {}
        }
        this.txIdMap[currencyCode][normalizeAddress(tx.txid)] = i
        txIdList.push(normalizeAddress(tx.txid))
        i++
      }
      this.txIdList[currencyCode] = txIdList
    }
  }

  updateTransaction (
    currencyCode: string,
    edgeTransaction: EdgeTransaction,
    idx: number
  ) {
    // Update the transaction
    this.transactionList[currencyCode][idx] = edgeTransaction
    this.transactionListDirty = true
    this.transactionsChangedArray.push(edgeTransaction)
    this.log('updateTransaction:' + edgeTransaction.txid)
  }

  // *************************************
  // Save the wallet data store
  // *************************************
  async saveWalletLoop () {
    const disklet = this.walletLocalDisklet
    const promises = []
    if (this.walletLocalDataDirty) {
      this.log('walletLocalDataDirty. Saving...')
      const jsonString = JSON.stringify(this.walletLocalData)
      promises.push(
        disklet
          .setText(DATA_STORE_FILE, jsonString)
          .then(() => {
            this.walletLocalDataDirty = false
          })
          .catch(e => {
            this.log('Error saving walletLocalData')
            this.log(e)
          })
      )
    }
    if (this.transactionListDirty) {
      await this.loadTransactions()
      this.log('transactionListDirty. Saving...')
      let jsonString = JSON.stringify(this.transactionList)
      promises.push(
        disklet.setText(TRANSACTION_STORE_FILE, jsonString).catch(e => {
          this.log('Error saving transactionList')
          this.log(e)
        })
      )
      jsonString = JSON.stringify(this.txIdList)
      promises.push(
        disklet.setText(TXID_LIST_FILE, jsonString).catch(e => {
          this.log('Error saving txIdList')
          this.log(e)
        })
      )
      jsonString = JSON.stringify(this.txIdMap)
      promises.push(
        disklet.setText(TXID_MAP_FILE, jsonString).catch(e => {
          this.log('Error saving txIdMap')
          this.log(e)
        })
      )
      await Promise.all(promises)
      this.transactionListDirty = false
    } else {
      await Promise.all(promises)
    }
  }

  doInitialBalanceCallback () {
    for (const currencyCode of this.walletLocalData.enabledTokens) {
      try {
        this.currencyEngineCallbacks.onBalanceChanged(
          currencyCode,
          this.walletLocalData.totalBalances[currencyCode]
        )
      } catch (e) {
        this.log('Error for currencyCode', currencyCode, e)
      }
    }
  }

  doInitialTransactionsCallback () {
    for (const currencyCode of this.walletLocalData.enabledTokens) {
      try {
        this.currencyEngineCallbacks.onTransactionsChanged(
          this.transactionList[currencyCode]
        )
      } catch (e) {
        this.log('Error for currencyCode', currencyCode, e)
      }
    }
  }
  async addToLoop (func: string, timer: number) {
    try {
      // $FlowFixMe
      await this[func]()
    } catch (e) {
      this.log('Error in Loop:', func, e)
    }
    if (this.engineOn) {
      this.timers[func] = setTimeout(() => {
        if (this.engineOn) {
          this.addToLoop(func, timer)
        }
      }, timer)
    }
    return true
  }

  getTokenInfo (token: string) {
    return this.allTokens.find(element => {
      return element.currencyCode === token
    })
  }

  updateOnAddressesChecked () {
    if (this.addressesChecked) {
      return
    }

    const activeTokens = this.walletLocalData.enabledTokens
    const perTokenSlice = 1 / activeTokens.length
    let totalStatus = 0
    let numComplete = 0
    for (const token of activeTokens) {
      const balanceStatus = this.tokenCheckBalanceStatus[token] || 0
      const txStatus = this.tokenCheckTransactionsStatus[token] || 0
      totalStatus += (balanceStatus + txStatus) / 2 * perTokenSlice
      if (balanceStatus === 1 && txStatus === 1) {
        numComplete++
      }
    }
    if (numComplete === activeTokens.length) {
      totalStatus = 1
      this.addressesChecked = true
    }
    this.currencyEngineCallbacks.onAddressesChecked(totalStatus)
  }

  log (...text: Array<any>) {
    text[0] = `${this.walletId.slice(0, 5)}: ${text[0].toString()}`
    console.log(...text)
  }

  async startEngine () {
    this.addToLoop('saveWalletLoop', SAVE_DATASTORE_MILLISECONDS)
  }

  // *************************************
  // Public methods
  // *************************************

  async killEngine () {
    // Set status flag to false
    this.engineOn = false
    // Clear Inner loops timers
    for (const timer in this.timers) {
      clearTimeout(this.timers[timer])
    }
    this.timers = {}
  }

  updateSettings (settings: any) {
    this.currentSettings = settings
  }

  async clearBlockchainCache (): Promise<void> {
    const temp = JSON.stringify({
      enabledTokens: this.walletLocalData.enabledTokens,
      publicKey: this.walletLocalData.publicKey
    })
    this.walletLocalData = new WalletLocalData(
      temp,
      this.currencyInfo.currencyCode
    )
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

  getBlockHeight (): number {
    return parseInt(this.walletLocalData.blockHeight)
  }

  enableTokensSync (tokens: Array<string>) {
    for (const token of tokens) {
      if (this.walletLocalData.enabledTokens.indexOf(token) === -1) {
        this.walletLocalData.enabledTokens.push(token)
      }
    }
  }

  async enableTokens (tokens: Array<string>) {
    this.enableTokensSync(tokens)
  }

  disableTokensSync (tokens: Array<string>) {
    for (const token of tokens) {
      const index = this.walletLocalData.enabledTokens.indexOf(token)
      if (index !== -1) {
        this.walletLocalData.enabledTokens.splice(index, 1)
      }
    }
  }

  async disableTokens (tokens: Array<string>) {
    this.disableTokensSync(tokens)
  }

  async getEnabledTokens (): Promise<Array<string>> {
    return this.walletLocalData.enabledTokens
  }

  async addCustomToken (obj: any) {
    const valid = validateObject(obj, CustomTokenSchema)

    if (valid) {
      const tokenObj: CustomToken = obj
      // If token is already in currencyInfo, error as it cannot be changed
      for (const tk of this.currencyInfo.metaTokens) {
        if (
          tk.currencyCode.toLowerCase() ===
            tokenObj.currencyCode.toLowerCase() ||
          tk.currencyName.toLowerCase() === tokenObj.currencyName.toLowerCase()
        ) {
          throw new Error('ErrorCannotModifyToken')
        }
      }

      // Validate the token object
      if (tokenObj.currencyCode.toUpperCase() !== tokenObj.currencyCode) {
        throw new Error('ErrorInvalidCurrencyCode')
      }
      if (
        tokenObj.currencyCode.length < 2 ||
        tokenObj.currencyCode.length > 7
      ) {
        throw new Error('ErrorInvalidCurrencyCodeLength')
      }
      if (
        tokenObj.currencyName.length < 3 ||
        tokenObj.currencyName.length > 20
      ) {
        throw new Error('ErrorInvalidCurrencyNameLength')
      }
      if (
        bns.lt(tokenObj.multiplier, '1') ||
        bns.gt(tokenObj.multiplier, '100000000000000000000000000000000')
      ) {
        throw new Error('ErrorInvalidMultiplier')
      }
      let contractAddress = tokenObj.contractAddress
        .replace('0x', '')
        .toLowerCase()
      if (!isHex(contractAddress) || contractAddress.length !== 40) {
        throw new Error('ErrorInvalidContractAddress')
      }
      contractAddress = '0x' + contractAddress

      for (const tk of this.customTokens) {
        if (
          tk.currencyCode.toLowerCase() ===
            tokenObj.currencyCode.toLowerCase() ||
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
        contractAddress
      }

      this.customTokens.push(edgeMetaToken)
      this.allTokens = this.currencyInfo.metaTokens.concat(this.customTokens)
      this.enableTokensSync([edgeMetaToken.currencyCode])
    } else {
      throw new Error('Invalid custom token object')
    }
  }

  getTokenStatus (token: string) {
    return this.walletLocalData.enabledTokens.indexOf(token) !== -1
  }

  getBalance (options: any): string {
    let currencyCode = this.currencyInfo.currencyCode

    if (typeof options !== 'undefined') {
      const valid = validateObject(options, {
        type: 'object',
        properties: {
          currencyCode: { type: 'string' }
        }
      })

      if (valid) {
        currencyCode = options.currencyCode
      }
    }

    if (
      typeof this.walletLocalData.totalBalances[currencyCode] === 'undefined'
    ) {
      return '0'
    } else {
      const nativeBalance = this.walletLocalData.totalBalances[currencyCode]
      return nativeBalance
    }
  }

  getNumTransactions (options: any): number {
    let currencyCode = this.currencyInfo.currencyCode

    const valid = validateObject(options, {
      type: 'object',
      properties: {
        currencyCode: { type: 'string' }
      }
    })

    if (valid) {
      currencyCode = options.currencyCode
    }

    if (typeof this.transactionList[currencyCode] === 'undefined') {
      return 0
    } else {
      return this.transactionList[currencyCode].length
    }
  }

  async getTransactions (
    options: EdgeGetTransactionsOptions
  ): Promise<Array<EdgeTransaction>> {
    let currencyCode: string = this.currencyInfo.currencyCode

    const valid: boolean = validateObject(options, {
      type: 'object',
      properties: {
        currencyCode: { type: 'string' }
      }
    })

    if (valid) {
      currencyCode = options.currencyCode || currencyCode
    }

    await this.loadTransactions()

    if (typeof this.transactionList[currencyCode] === 'undefined') {
      return []
    }

    let startIndex: number = 0
    let startEntries: number = 0
    if (options === null) {
      return this.transactionList[currencyCode].slice(0)
    }
    if (options.startIndex && options.startIndex > 0) {
      startIndex = options.startIndex
      if (startIndex >= this.transactionList[currencyCode].length) {
        startIndex = this.transactionList[currencyCode].length - 1
      }
    }
    if (options.startEntries && options.startEntries > 0) {
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

    if (startEntries) {
      returnArray = this.transactionList[currencyCode].slice(
        startIndex,
        startEntries + startIndex
      )
    } else {
      returnArray = this.transactionList[currencyCode].slice(startIndex)
    }
    return returnArray
  }

  getFreshAddress (options: any): EdgeFreshAddress {
    return { publicAddress: this.walletLocalData.publicKey }
  }

  addGapLimitAddresses (addresses: Array<string>, options: any) {}

  isAddressUsed (address: string, options: any) {
    return false
  }

  dumpData (): EdgeDataDump {
    const dataDump: EdgeDataDump = {
      walletId: this.walletId.split(' - ')[0],
      walletType: this.walletInfo.type,
      pluginType: this.currencyInfo.pluginName,
      data: {
        walletLocalData: this.walletLocalData
      }
    }
    return dataDump
  }

  makeSpend (edgeSpendInfo: EdgeSpendInfo): Object {
    const valid = validateObject(edgeSpendInfo, MakeSpendSchema)

    if (!valid) {
      throw new Error('Error: Invalid EdgeSpendInfo')
    }

    for (const st of edgeSpendInfo.spendTargets) {
      if (st.publicAddress === this.walletLocalData.publicKey) {
        throw new SpendToSelfError()
      }
    }

    let currencyCode: string = ''
    if (typeof edgeSpendInfo.currencyCode === 'string') {
      currencyCode = edgeSpendInfo.currencyCode
      if (!this.getTokenStatus(currencyCode)) {
        throw new Error('Error: Token not supported or enabled')
      }
    } else {
      currencyCode = this.currencyInfo.currencyCode
    }

    const nativeBalance = this.walletLocalData.totalBalances[currencyCode]
    if (!nativeBalance || bns.eq(nativeBalance, '0')) {
      throw new InsufficientFundsError()
    }

    edgeSpendInfo.currencyCode = currencyCode
    const denom = getDenomInfo(
      this.currencyInfo,
      currencyCode,
      this.customTokens
    )
    if (!denom) {
      throw new Error('InternalErrorInvalidCurrencyCode')
    }

    return { edgeSpendInfo, nativeBalance, currencyCode, denom }
  }

  async saveTx (edgeTransaction: EdgeTransaction) {
    this.addTransaction(edgeTransaction.currencyCode, edgeTransaction)
    this.currencyEngineCallbacks.onTransactionsChanged([edgeTransaction])
  }
}

export { CurrencyEngine }
