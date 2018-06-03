/**
 * Created by paul on 7/7/17.
 */
// @flow

import { currencyInfo } from './currencyInfoXRP.js'
import type {
  EdgeCurrencyEngine,
  EdgeTransaction,
  EdgeCurrencyEngineCallbacks,
  EdgeCurrencyEngineOptions,
  EdgeSpendInfo,
  EdgeWalletInfo,
  EdgeMetaToken,
  EdgeCurrencyInfo,
  EdgeDenomination,
  EdgeFreshAddress,
  EdgeDataDump,
  EdgeCurrencyPlugin,
  EdgeIo
} from 'edge-core-js'
import { sprintf } from 'sprintf-js'
import { bns } from 'biggystring'
import {
  CustomTokenSchema,
  GetServerInfoSchema,
  GetBalancesSchema,
  GetTransactionsSchema
} from './xrpSchema.js'
import {
  DATA_STORE_FILE,
  DATA_STORE_FOLDER,
  WalletLocalData,
  type XrpCustomToken
} from './xrpTypes.js'
import { isHex, normalizeAddress, validateObject } from './utils.js'
import type { XrpGetTransaction, XrpGetTransactions } from './xrpTypes'

const ADDRESS_POLL_MILLISECONDS = 10000
const BLOCKHEIGHT_POLL_MILLISECONDS = 15000
const TRANSACTION_POLL_MILLISECONDS = 3000
const SAVE_DATASTORE_MILLISECONDS = 10000
// const ADDRESS_QUERY_LOOKBACK_BLOCKS = '8' // ~ 2 minutes
// Ripple has about 2s blocks
const ADDRESS_QUERY_LOOKBACK_BLOCKS = (30 * 60) // ~ one minute

const PRIMARY_CURRENCY = currencyInfo.currencyCode

type RippleParams = {
  preparedTx: Object
  // publicAddress?: string,
  // contractAddress?: string
}

class RippleEngine {
  walletInfo: EdgeWalletInfo
  edgeTxLibCallbacks: EdgeCurrencyEngineCallbacks
  walletLocalFolder: any
  rippleApi: Object
  engineOn: boolean
  addressesChecked: boolean
  tokenCheckStatus: { [currencyCode: string]: number } // Each currency code can be a 0-1 value
  walletLocalData: WalletLocalData
  walletLocalDataDirty: boolean
  transactionsChangedArray: Array<EdgeTransaction>
  currencyInfo: EdgeCurrencyInfo
  allTokens: Array<EdgeMetaToken>
  customTokens: Array<EdgeMetaToken>
  currentSettings: any
  timers: any
  walletId: string
  io: EdgeIo

  constructor (currencyPlugin: EdgeCurrencyPlugin, io_: any, walletInfo: EdgeWalletInfo, rippleApi: Object, opts: EdgeCurrencyEngineOptions) {
    // Validate that we are a valid EdgeCurrencyEngine:
    // eslint-disable-next-line no-unused-vars
    const test: EdgeCurrencyEngine = this

    const { walletLocalFolder, callbacks } = opts

    this.io = io_
    this.rippleApi = rippleApi
    this.engineOn = false
    this.addressesChecked = false
    this.tokenCheckStatus = {}
    this.walletLocalDataDirty = false
    this.transactionsChangedArray = []
    this.walletInfo = walletInfo
    this.walletId = walletInfo.id ? `${walletInfo.id} - ` : ''
    this.currencyInfo = currencyInfo
    this.allTokens = currencyInfo.metaTokens.slice(0)
    this.customTokens = []
    this.timers = {}

    if (typeof opts.optionalSettings !== 'undefined') {
      this.currentSettings = opts.optionalSettings
    } else {
      this.currentSettings = this.currencyInfo.defaultSettings
    }

    // Hard coded for testing
    // this.walletInfo.keys.rippleKey = '389b07b3466eed587d6bdae09a3613611de9add2635432d6cd1521af7bbc3757'
    // this.walletInfo.keys.rippleAddress = '0x9fa817e5A48DD1adcA7BEc59aa6E3B1F5C4BeA9a'
    this.edgeTxLibCallbacks = callbacks
    this.walletLocalFolder = walletLocalFolder

    if (typeof this.walletInfo.keys.rippleAddress !== 'string') {
      if (walletInfo.keys.rippleAddress) {
        this.walletInfo.keys.rippleAddress = walletInfo.keys.rippleAddress
      } else {
        const pubKeys = currencyPlugin.derivePublicKey(this.walletInfo)
        this.walletInfo.keys.rippleAddress = pubKeys.rippleAddress
      }
    }
    this.log(`Created Wallet Type ${this.walletInfo.type} for Currency Plugin ${this.currencyInfo.pluginName} `)
  }

  // *************************************
  // Private methods
  // *************************************
  async fetchGet (url: string) {
    const response = await this.io.fetch(url, {
      method: 'GET'
    })
    if (!response.ok) {
      const cleanUrl = url.replace(global.etherscanApiKey, 'private')
      throw new Error(
        `The server returned error code ${response.status} for ${cleanUrl}`
      )
    }
    return response.json()
  }

  // *************************************
  // Poll on the blockheight
  // *************************************
  async checkServerInfoInnerLoop () {
    try {
      const fee = await this.rippleApi.getFee()
      if (typeof fee === 'string') {
        this.walletLocalData.recommendedFee = fee
      }
      const jsonObj = await this.rippleApi.getServerInfo()
      const valid = validateObject(jsonObj, GetServerInfoSchema)
      if (valid) {
        const blockHeight: number = jsonObj.validatedLedger.ledgerVersion
        this.log(`Got block height ${blockHeight}`)
        if (this.walletLocalData.blockHeight !== blockHeight) {
          this.walletLocalData.blockHeight = blockHeight // Convert to decimal
          this.walletLocalDataDirty = true
          this.edgeTxLibCallbacks.onBlockHeightChanged(this.walletLocalData.blockHeight)
        }
      }
    } catch (err) {
      this.log(`Error fetching height: ${JSON.stringify(err)}`)
    }
  }

  processRippleTransaction (tx: XrpGetTransaction) {
    const ourReceiveAddresses:Array<string> = []

    const balanceChanges = tx.outcome.balanceChanges[this.walletLocalData.rippleAddress]
    if (balanceChanges) {
      for (const bc of balanceChanges) {
        const currencyCode: string = bc.currency
        const date: number = Date.parse(tx.outcome.timestamp) / 1000
        const blockHeight: number = tx.outcome.ledgerVersion

        let exchangeAmount: string = bc.value
        if (exchangeAmount.slice(0, 1) === '-') {
          exchangeAmount = bns.add(tx.outcome.fee, exchangeAmount)
        } else {
          ourReceiveAddresses.push(this.walletLocalData.rippleAddress)
        }
        const nativeAmount: string = bns.mul(exchangeAmount, '1000000')
        let networkFee: string
        let parentNetworkFee: string
        if (currencyCode === PRIMARY_CURRENCY) {
          networkFee = bns.mul(tx.outcome.fee, '1000000')
        } else {
          networkFee = '0'
          parentNetworkFee = bns.mul(tx.outcome.fee, '1000000')
        }

        const edgeTransaction: EdgeTransaction = {
          txid: tx.id.toLowerCase(),
          date,
          currencyCode,
          blockHeight,
          nativeAmount,
          networkFee,
          parentNetworkFee,
          ourReceiveAddresses,
          signedTx: 'has_been_signed',
          otherParams: {}
        }

        const idx = this.findTransaction(currencyCode, edgeTransaction.txid)
        if (idx === -1) {
          this.log(sprintf('New transaction: %s', edgeTransaction.txid))

          // New transaction not in database
          this.addTransaction(currencyCode, edgeTransaction)
        } else {
          // Already have this tx in the database. See if anything changed
          const transactionsArray = this.walletLocalData.transactionsObj[ currencyCode ]
          const edgeTx = transactionsArray[ idx ]

          if (
            edgeTx.blockHeight !== edgeTransaction.blockHeight ||
            edgeTx.networkFee !== edgeTransaction.networkFee ||
            edgeTx.nativeAmount !== edgeTransaction.nativeAmount
          ) {
            this.log(sprintf('Update transaction: %s height:%s',
              edgeTransaction.txid,
              edgeTransaction.blockHeight))
            this.updateTransaction(currencyCode, edgeTransaction, idx)
          } else {
            // this.log(sprintf('Old transaction. No Update: %s', tx.hash))
          }
        }
      }

      if (this.transactionsChangedArray.length > 0) {
        this.edgeTxLibCallbacks.onTransactionsChanged(
          this.transactionsChangedArray
        )
        this.transactionsChangedArray = []
      }
    }
  }

  async checkTransactionsInnerLoop () {
    const address = this.walletLocalData.rippleAddress
    let startBlock:number = 0
    if (this.walletLocalData.lastAddressQueryHeight > ADDRESS_QUERY_LOOKBACK_BLOCKS) {
      // Only query for transactions as far back as ADDRESS_QUERY_LOOKBACK_BLOCKS from the last time we queried transactions
      startBlock = this.walletLocalData.lastAddressQueryHeight - ADDRESS_QUERY_LOOKBACK_BLOCKS
    }

    try {
      let options
      if (startBlock > ADDRESS_QUERY_LOOKBACK_BLOCKS) {
        options = { minLedgerVersion: startBlock }
      }
      const transactions: XrpGetTransactions = await this.rippleApi.getTransactions(address, options)
      const valid = validateObject(transactions, GetTransactionsSchema)
      if (valid) {
        this.log('Fetched transactions count: ' + transactions.length)

        // Get transactions
        // Iterate over transactions in address
        for (let i = 0; i < transactions.length; i++) {
          const tx = transactions[i]
          this.processRippleTransaction(tx)
        }
        this.updateOnAddressesChecked()
      }
    } catch (e) {
      console.log(e.code)
      console.log(e.message)
      console.log(e)
      console.log(`Error fetching transactions: ${JSON.stringify(e)}`)
      this.log(`Error fetching transactions: ${JSON.stringify(e)}`)
    }
  }

  updateOnAddressesChecked () {
    if (this.addressesChecked) {
      return
    }
    this.addressesChecked = true
    this.walletLocalData.lastAddressQueryHeight = this.walletLocalData.blockHeight
    this.edgeTxLibCallbacks.onAddressesChecked(1)
  }

  async checkUnconfirmedTransactionsFetch () {

  }

  // **********************************************
  // Check all addresses for new transactions
  // **********************************************
  async checkAddressesInnerLoop () {
    const address = this.walletLocalData.rippleAddress
    try {
      // Ripple only has one address
      const jsonObj = await this.rippleApi.getBalances(address)
      const valid = validateObject(jsonObj, GetBalancesSchema)
      if (valid) {
        for (const bal of jsonObj) {
          const currencyCode = bal.currency
          const exchangeAmount = bal.value
          const nativeAmount = bns.mul(exchangeAmount, '1000000')

          if (typeof this.walletLocalData.totalBalances[currencyCode] === 'undefined') {
            this.walletLocalData.totalBalances[currencyCode] = '0'
          }

          if (this.walletLocalData.totalBalances[currencyCode] !== nativeAmount) {
            this.walletLocalData.totalBalances[currencyCode] = nativeAmount
            this.edgeTxLibCallbacks.onBalanceChanged(currencyCode, nativeAmount)
          }
        }
      }
    } catch (e) {
      this.log(`Error fetching address info: ${JSON.stringify(e)}`)
    }
  }

  findTransaction (currencyCode: string, txid: string) {
    if (typeof this.walletLocalData.transactionsObj[currencyCode] === 'undefined') {
      return -1
    }

    const currency = this.walletLocalData.transactionsObj[currencyCode]
    return currency.findIndex(element => {
      return normalizeAddress(element.txid) === normalizeAddress(txid)
    })
  }

  sortTxByDate (a: EdgeTransaction, b: EdgeTransaction) {
    return b.date - a.date
  }

  addTransaction (currencyCode: string, edgeTransaction: EdgeTransaction) {
    // Add or update tx in transactionsObj
    const idx = this.findTransaction(currencyCode, edgeTransaction.txid)

    if (idx === -1) {
      this.log('addTransaction: adding and sorting:' + edgeTransaction.txid)
      if (typeof this.walletLocalData.transactionsObj[currencyCode] === 'undefined') {
        this.walletLocalData.transactionsObj[currencyCode] = []
      }
      this.walletLocalData.transactionsObj[currencyCode].push(edgeTransaction)

      // Sort
      this.walletLocalData.transactionsObj[currencyCode].sort(this.sortTxByDate)
      this.walletLocalDataDirty = true
      this.transactionsChangedArray.push(edgeTransaction)
    } else {
      this.updateTransaction(currencyCode, edgeTransaction, idx)
    }
  }

  updateTransaction (currencyCode: string, edgeTransaction: EdgeTransaction, idx: number) {
    // Update the transaction
    this.walletLocalData.transactionsObj[currencyCode][idx] = edgeTransaction
    this.walletLocalDataDirty = true
    this.transactionsChangedArray.push(edgeTransaction)
    this.log('updateTransaction:' + edgeTransaction.txid)
  }

  // *************************************
  // Save the wallet data store
  // *************************************
  async saveWalletLoop () {
    if (this.walletLocalDataDirty) {
      try {
        this.log('walletLocalDataDirty. Saving...')
        const walletJson = JSON.stringify(this.walletLocalData)
        await this.walletLocalFolder
          .folder(DATA_STORE_FOLDER)
          .file(DATA_STORE_FILE)
          .setText(walletJson)
        this.walletLocalDataDirty = false
      } catch (err) {
        this.log(err)
      }
    }
  }

  doInitialCallbacks () {
    for (const currencyCode of this.walletLocalData.enabledTokens) {
      try {
        this.edgeTxLibCallbacks.onTransactionsChanged(
          this.walletLocalData.transactionsObj[currencyCode]
        )
        this.edgeTxLibCallbacks.onBalanceChanged(currencyCode, this.walletLocalData.totalBalances[currencyCode])
      } catch (e) {
        this.log('Error for currencyCode', currencyCode, e)
      }
    }
  }

  getTokenInfo (token: string) {
    return this.allTokens.find(element => {
      return element.currencyCode === token
    })
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

  log (...text: Array<any>) {
    text[0] = `${this.walletId}${text[0]}`
    console.log(...text)
  }

  // *************************************
  // Public methods
  // *************************************

  updateSettings (settings: any) {
    this.currentSettings = settings
  }

  async startEngine () {
    this.engineOn = true
    this.doInitialCallbacks()
    await this.rippleApi.connect()
    this.addToLoop('checkServerInfoInnerLoop', BLOCKHEIGHT_POLL_MILLISECONDS)
    this.addToLoop('checkAddressesInnerLoop', ADDRESS_POLL_MILLISECONDS)
    this.addToLoop('checkTransactionsInnerLoop', TRANSACTION_POLL_MILLISECONDS)
    this.addToLoop('saveWalletLoop', SAVE_DATASTORE_MILLISECONDS)
  }

  async killEngine () {
    // Set status flag to false
    this.engineOn = false
    // Clear Inner loops timers
    for (const timer in this.timers) {
      clearTimeout(this.timers[timer])
    }
    this.timers = {}
    await this.rippleApi.disconnect()
  }

  async resyncBlockchain (): Promise<void> {
    await this.killEngine()
    const temp = JSON.stringify({
      enabledTokens: this.walletLocalData.enabledTokens,
      rippleAddress: this.walletLocalData.rippleAddress
    })
    this.walletLocalData = new WalletLocalData(temp)
    this.walletLocalDataDirty = true
    await this.saveWalletLoop()
    await this.startEngine()
  }

  // synchronous
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

  // asynchronous
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

  // asynchronous
  async disableTokens (tokens: Array<string>) {
    this.disableTokensSync(tokens)
  }

  async getEnabledTokens (): Promise<Array<string>> {
    return this.walletLocalData.enabledTokens
  }

  async addCustomToken (tokenObj: any) {
    const valid = validateObject(tokenObj, CustomTokenSchema)

    if (valid) {
      const ethTokenObj: XrpCustomToken = tokenObj
      // If token is already in currencyInfo, error as it cannot be changed
      for (const tk of this.currencyInfo.metaTokens) {
        if (
          tk.currencyCode.toLowerCase() === ethTokenObj.currencyCode.toLowerCase() ||
          tk.currencyName.toLowerCase() === ethTokenObj.currencyName.toLowerCase()
        ) {
          throw new Error('ErrorCannotModifyToken')
        }
      }

      // Validate the token object
      if (ethTokenObj.currencyCode.toUpperCase() !== ethTokenObj.currencyCode) {
        throw new Error('ErrorInvalidCurrencyCode')
      }
      if (ethTokenObj.currencyCode.length < 2 || ethTokenObj.currencyCode.length > 7) {
        throw new Error('ErrorInvalidCurrencyCodeLength')
      }
      if (ethTokenObj.currencyName.length < 3 || ethTokenObj.currencyName.length > 20) {
        throw new Error('ErrorInvalidCurrencyNameLength')
      }
      if (bns.lt(ethTokenObj.multiplier, '1') || bns.gt(ethTokenObj.multiplier, '100000000000000000000000000000000')) {
        throw new Error('ErrorInvalidMultiplier')
      }
      let contractAddress = ethTokenObj.contractAddress.replace('0x', '').toLowerCase()
      if (!isHex(contractAddress) || contractAddress.length !== 40) {
        throw new Error('ErrorInvalidContractAddress')
      }
      contractAddress = '0x' + contractAddress

      for (const tk of this.customTokens) {
        if (
          tk.currencyCode.toLowerCase() === ethTokenObj.currencyCode.toLowerCase() ||
          tk.currencyName.toLowerCase() === ethTokenObj.currencyName.toLowerCase()
        ) {
          // Remove old token first then re-add it to incorporate any modifications
          const idx = this.customTokens.findIndex(element => element.currencyCode === ethTokenObj.currencyCode)
          if (idx !== -1) {
            this.customTokens.splice(idx, 1)
          }
        }
      }

      // Create a token object for inclusion in customTokens
      const denom: EdgeDenomination = {
        name: ethTokenObj.currencyCode,
        multiplier: ethTokenObj.multiplier
      }
      const edgeMetaToken: EdgeMetaToken = {
        currencyCode: ethTokenObj.currencyCode,
        currencyName: ethTokenObj.currencyName,
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

  // synchronous
  getTokenStatus (token: string) {
    return this.walletLocalData.enabledTokens.indexOf(token) !== -1
  }

  // synchronous
  getBalance (options: any): string {
    let currencyCode = PRIMARY_CURRENCY

    if (typeof options !== 'undefined') {
      const valid = validateObject(options, {
        'type': 'object',
        'properties': {
          'currencyCode': {'type': 'string'}
        }
      })

      if (valid) {
        currencyCode = options.currencyCode
      }
    }

    if (typeof this.walletLocalData.totalBalances[currencyCode] === 'undefined') {
      return '0'
    } else {
      const nativeBalance = this.walletLocalData.totalBalances[currencyCode]
      return nativeBalance
    }
  }

  // synchronous
  getNumTransactions (options: any): number {
    let currencyCode = PRIMARY_CURRENCY

    const valid = validateObject(options, {
      'type': 'object',
      'properties': {
        'currencyCode': {'type': 'string'}
      }
    })

    if (valid) {
      currencyCode = options.currencyCode
    }

    if (typeof this.walletLocalData.transactionsObj[currencyCode] === 'undefined') {
      return 0
    } else {
      return this.walletLocalData.transactionsObj[currencyCode].length
    }
  }

  // asynchronous
  async getTransactions (options: any) {
    let currencyCode:string = PRIMARY_CURRENCY

    const valid:boolean = validateObject(options, {
      'type': 'object',
      'properties': {
        'currencyCode': {'type': 'string'}
      }
    })

    if (valid) {
      currencyCode = options.currencyCode
    }

    if (typeof this.walletLocalData.transactionsObj[currencyCode] === 'undefined') {
      return []
    }

    let startIndex:number = 0
    let numEntries:number = 0
    if (options === null) {
      return this.walletLocalData.transactionsObj[currencyCode].slice(0)
    }
    if (options.startIndex !== null && options.startIndex > 0) {
      startIndex = options.startIndex
      if (
        startIndex >=
        this.walletLocalData.transactionsObj[currencyCode].length
      ) {
        startIndex =
          this.walletLocalData.transactionsObj[currencyCode].length - 1
      }
    }
    if (options.numEntries !== null && options.numEntries > 0) {
      numEntries = options.numEntries
      if (
        numEntries + startIndex >
        this.walletLocalData.transactionsObj[currencyCode].length
      ) {
        // Don't read past the end of the transactionsObj
        numEntries =
          this.walletLocalData.transactionsObj[currencyCode].length -
          startIndex
      }
    }

    // Copy the appropriate entries from the arrayTransactions
    let returnArray = []

    if (numEntries) {
      returnArray = this.walletLocalData.transactionsObj[currencyCode].slice(
        startIndex,
        numEntries + startIndex
      )
    } else {
      returnArray = this.walletLocalData.transactionsObj[currencyCode].slice(
        startIndex
      )
    }
    return returnArray
  }

  // synchronous
  getFreshAddress (options: any): EdgeFreshAddress {
    return { publicAddress: this.walletLocalData.rippleAddress }
  }

  // synchronous
  addGapLimitAddresses (addresses: Array<string>, options: any) {
  }

  // synchronous
  isAddressUsed (address: string, options: any) {
    return false
  }

  // synchronous
  async makeSpend (edgeSpendInfo: EdgeSpendInfo) {
    // Validate the spendInfo
    const valid = validateObject(edgeSpendInfo, {
      'type': 'object',
      'properties': {
        'currencyCode': { 'type': 'string' },
        'networkFeeOption': { 'type': 'string' },
        'spendTargets': {
          'type': 'array',
          'items': {
            'type': 'object',
            'properties': {
              'currencyCode': { 'type': 'string' },
              'publicAddress': { 'type': 'string' },
              'nativeAmount': { 'type': 'string' },
              'destMetadata': { 'type': 'object' },
              'destWallet': { 'type': 'object' }
            },
            'required': [
              'publicAddress'
            ]
          }
        }
      },
      'required': [ 'spendTargets' ]
    })

    if (!valid) {
      throw (new Error('Error: invalid ABCSpendInfo'))
    }

    // Ripple can only have one output
    if (edgeSpendInfo.spendTargets.length !== 1) {
      throw (new Error('Error: only one output allowed'))
    }

    // let tokenInfo = {}
    // tokenInfo.contractAddress = ''
    //
    let currencyCode: string = ''
    if (typeof edgeSpendInfo.currencyCode === 'string') {
      currencyCode = edgeSpendInfo.currencyCode
    } else {
      currencyCode = 'XRP'
    }
    edgeSpendInfo.currencyCode = currencyCode

    let publicAddress = ''

    if (typeof edgeSpendInfo.spendTargets[0].publicAddress === 'string') {
      publicAddress = edgeSpendInfo.spendTargets[0].publicAddress
    } else {
      throw new Error('No valid spendTarget')
    }

    let nativeAmount = '0'
    if (typeof edgeSpendInfo.spendTargets[0].nativeAmount === 'string') {
      nativeAmount = edgeSpendInfo.spendTargets[0].nativeAmount
    } else {
      throw (new Error('Error: no amount specified'))
    }

    if (bns.eq(nativeAmount, '0')) {
      throw (new Error('ErrorNoAmountSpecified'))
    }

    const InsufficientFundsError = new Error('Insufficient funds')
    InsufficientFundsError.name = 'ErrorInsufficientFunds'
    const InsufficientFundsXrpError = new Error('Insufficient XRP for transaction fee')
    InsufficientFundsXrpError.name = 'ErrorInsufficientFundsMoreEth'

    const nativeBalance = this.walletLocalData.totalBalances[currencyCode]
    const nativeNetworkFee = bns.mul(this.walletLocalData.recommendedFee, '1000000')

    if (currencyCode === PRIMARY_CURRENCY) {
      const totalTxAmount = bns.add(nativeNetworkFee, nativeAmount)
      if (bns.gt(totalTxAmount, nativeBalance)) {
        throw (InsufficientFundsError)
      }
    }

    const exchangeAmount = bns.div(nativeAmount, '1000000', 6)
    let tag

    if (
      edgeSpendInfo.spendTargets[0].otherParams &&
      edgeSpendInfo.spendTargets[0].otherParams.destinationTag
    ) {
      if (typeof edgeSpendInfo.spendTargets[0].otherParams.destinationTag === 'number') {
        tag = edgeSpendInfo.spendTargets[0].otherParams.destinationTag
      } else {
        throw new Error('Error invalid destinationtag')
      }
    }
    const payment = {
      source: {
        address: this.walletLocalData.rippleAddress,
        maxAmount: {
          value: exchangeAmount,
          currency: currencyCode
        }
      },
      destination: {
        address: publicAddress,
        amount: {
          value: exchangeAmount,
          currency: currencyCode
        },
        tag
      }
    }

    let preparedTx = {}
    try {
      preparedTx = await this.rippleApi.preparePayment(
        this.walletLocalData.rippleAddress,
        payment,
        { maxLedgerVersionOffset: 300 }
      )
    } catch (err) {
      throw new Error('Error in preparePayment')
    }

    const otherParams: RippleParams = {
      preparedTx
    }

    nativeAmount = '-' + nativeAmount

    const edgeTransaction: EdgeTransaction = {
      txid: '', // txid
      date: 0, // date
      currencyCode, // currencyCode
      blockHeight: 0, // blockHeight
      nativeAmount, // nativeAmount
      networkFee: nativeNetworkFee, // networkFee
      ourReceiveAddresses: [], // ourReceiveAddresses
      signedTx: '0', // signedTx
      otherParams
    }

    console.log('Payment transaction prepared...')
    return edgeTransaction
  }

  // asynchronous
  async signTx (edgeTransaction: EdgeTransaction): Promise<EdgeTransaction> {
    // Do signing
    const txJson = edgeTransaction.otherParams.preparedTx.txJSON
    const privateKey = this.walletInfo.keys.rippleKey

    const { signedTransaction, id } = this.rippleApi.sign(txJson, privateKey)
    console.log('Payment transaction signed...')

    edgeTransaction.signedTx = signedTransaction
    edgeTransaction.txid = id.toLowerCase()
    edgeTransaction.date = Date.now() / 1000

    return edgeTransaction
  }

  // asynchronous
  async broadcastTx (edgeTransaction: EdgeTransaction): Promise<EdgeTransaction> {
    await this.rippleApi.submit(edgeTransaction.signedTx)
    return edgeTransaction
  }

  // asynchronous
  async saveTx (edgeTransaction: EdgeTransaction) {
    this.addTransaction(edgeTransaction.currencyCode, edgeTransaction)
    this.edgeTxLibCallbacks.onTransactionsChanged([edgeTransaction])
  }

  getDisplayPrivateSeed () {
    if (this.walletInfo.keys && this.walletInfo.keys.rippleKey) {
      return this.walletInfo.keys.rippleKey
    }
    return ''
  }

  getDisplayPublicSeed () {
    if (this.walletInfo.keys && this.walletInfo.keys.rippleAddress) {
      return this.walletInfo.keys.rippleAddress
    }
    return ''
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
}

export { RippleEngine }
