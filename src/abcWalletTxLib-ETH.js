/**
 * Created by paul on 7/7/17.
 */
// @flow

import { txLibInfo } from './txLibInfo.js'
import { BN } from 'bn.js'
import { sprintf } from 'sprintf-js'
import { validate } from 'jsonschema'

const Buffer = require('buffer/').Buffer
const ethWallet = require('../lib/export-fixes-bundle.js').Wallet

const DATA_STORE_FOLDER = 'txEngineFolder'
const DATA_STORE_FILE = 'walletLocalData.json'
const ADDRESS_POLL_MILLISECONDS = 7000
const BLOCKHEIGHT_POLL_MILLISECONDS = 5000
const SAVE_DATASTORE_MILLISECONDS = 10000
const ADDRESS_QUERY_LOOKBACK_BLOCKS = (4 * 2) // ~ 2 minutes
// const ADDRESS_QUERY_LOOKBACK_BLOCKS = (4 * 60 * 24 * 7) // ~ one week
const ETHERSCAN_API_KEY = ''

const PRIMARY_CURRENCY = txLibInfo.getInfo.currencyCode
const TOKEN_CODES = [PRIMARY_CURRENCY].concat(txLibInfo.supportedTokens)

const baseUrl = 'https://api.etherscan.io/api'

// Utility functions
//
// satoshiToNative converts satoshi-like units to a big number string nativeAmount which is in Wei.
// amountSatoshi is 1/100,000,000 of an ether to match the satoshi units of bitcoin
//
// function satoshiToNative (amountSatoshi: number) {
//   const converter = new BN('10000000000', 10)
//   let nativeAmountBN = new BN(amountSatoshi.toString(), 10)
//   nativeAmountBN = nativeAmountBN.mul(converter)
//   const nativeAmount = nativeAmountBN.toString(10)
//   return nativeAmount
// }

function nativeToSatoshi (nativeAmount:string) {
  let nativeAmountBN = new BN(nativeAmount, 10)
  return nativeAmountBN.toNumber()
  // const converter = new BN('10000000000', 10)
  // const amountSatoshiBN = nativeAmountBN.div(converter)
  // const amountSatoshi = amountSatoshiBN.toNumber()
  // return amountSatoshi
}

const snooze = ms => new Promise(resolve => setTimeout(resolve, ms))

function validateObject (object, schema) {
  const result = validate(object, schema)

  if (result.errors.length === 0) {
    return true
  } else {
    for (const n in result.errors) {
      const errMsg = result.errors[n].message
      console.log(errMsg)
    }
    return false
  }
}

export function makeEthereumPlugin (opts:any) {
  const { io } = opts

  const randomBuffer = (size) => {
    const array = io.random(size)
    return Buffer.from(array)
  }

  return {
    getInfo: () => {
      const currencyDetails = txLibInfo.getInfo

      return currencyDetails
    },

    createMasterKeys: (walletType:string) => {
      if (walletType === 'ethereum') {
        const cryptoObj = {
          randomBytes: randomBuffer
        }
        ethWallet.overrideCrypto(cryptoObj)

        // let wallet = ethWallet.generate(false)
        // const masterPrivateKey = wallet.getPrivateKeyString()
        // const masterPublicKey = wallet.getAddressString()
        const masterPrivateKey = '0x389b07b3466eed587d6bdae09a3613611de9add2635432d6cd1521af7bbc3757'
        const masterPublicKey = '0x9fa817e5A48DD1adcA7BEc59aa6E3B1F5C4BeA9a'
        return { masterPrivateKey, masterPublicKey }
      } else {
        return null
      }
    },

    makeEngine: (keyInfo:any, opts:any = {}) => {
      const abcTxLib = new ABCTxLibETH(io, keyInfo, opts)

      return abcTxLib
    }
  }
}

class WalletLocalData {
  blockHeight:number
  lastAddressQueryHeight:number
  masterPublicKey:string
  totalBalances: {}
  enabledTokens:Array<string>
  transactionsObj:{}

  constructor (jsonString) {
    this.blockHeight = 0
    this.totalBalances = {
      ETH: '0',
      REP: '0',
      WINGS: '0'
    }

    this.transactionsObj = {}

    // Array of ABCTransaction objects sorted by date from newest to oldest
    for (let n = 0; n < TOKEN_CODES.length; n++) {
      const currencyCode = TOKEN_CODES[n]
      this.transactionsObj[currencyCode] = []
    }

    // // Array of txids to fetch
    this.lastAddressQueryHeight = 0

    this.masterPublicKey = ''
    this.enabledTokens = [PRIMARY_CURRENCY]
    if (jsonString != null) {
      const data = JSON.parse(jsonString)
      for (const k in data) {
        this[k] = data[k]
      }
    }
  }
}

class EthereumParams {
  from:Array<string>
  to: Array<string>
  gas: string
  gasPrice: string
  gasUsed: string
  cumulativeGasUsed: string
  blockHash: string

  constructor (from:Array<string>,
               to:Array<string>,
               gas:string,
               gasPrice:string,
               gasUsed:string,
               cumulativeGasUsed:string,
               blockHash: string) {
    this.from = from
    this.to = to
    this.gas = gas
    this.gasPrice = gasPrice
    this.gasUsed = gasUsed
    this.cumulativeGasUsed = cumulativeGasUsed
    this.blockHash = blockHash
  }
}

class ABCTransaction {
  txid:string
  date:number
  currencyCode:string
  blockHeight:number
  blockHeightNative:string
  amountSatoshi:number
  nativeAmount:string
  networkFee:number
  nativeNetworkFee:string
  signedTx:string
  otherParams:EthereumParams

  constructor (txid:string,
               date:number,
               currencyCode:string,
               blockHeightNative:string,
               nativeAmount:string,
               nativeNetworkFee:string,
               signedTx:string,
               otherParams) {
    this.txid = txid
    this.date = date
    this.currencyCode = currencyCode
    this.blockHeightNative = blockHeightNative
    this.blockHeight = (new BN(blockHeightNative, 10)).toNumber(10)
    this.nativeAmount = nativeAmount
    this.amountSatoshi = nativeToSatoshi(nativeAmount)
    this.nativeNetworkFee = nativeNetworkFee
    this.networkFee = nativeToSatoshi(nativeNetworkFee)
    this.signedTx = signedTx
    this.otherParams = otherParams
  }
}

class ABCTxLibETH {
  io:any
  keyInfo:any
  abcTxLibCallbacks:any
  walletLocalFolder:any
  engineOn:boolean
  addressesChecked:boolean
  walletLocalData:any
  walletLocalDataDirty:boolean
  transactionsChangedArray:Array<{}>

  constructor (io:any, keyInfo:any, opts:any) {
    const { walletLocalFolder, callbacks } = opts

    this.engineOn = false
    this.addressesChecked = false
    this.walletLocalDataDirty = false
    this.walletLocalData = {}
    this.transactionsChangedArray = []
    this.io = io
    this.keyInfo = keyInfo
    this.abcTxLibCallbacks = callbacks
    this.walletLocalFolder = walletLocalFolder
  }

  // *************************************
  // Private methods
  // *************************************
  engineLoop () {
    this.engineOn = true
    try {
      this.doInitialCallbacks()
      this.blockHeightInnerLoop()
      this.checkAddressesInnerLoop()
      this.saveWalletLoop()
    } catch (err) {
      console.log(err)
    }
  }

  isTokenEnabled (token:string) {
    return this.walletLocalData.enabledTokens.indexOf(token) !== -1
  }

  async fetchGet (cmd:string) {
    let apiKey = ''
    if (ETHERSCAN_API_KEY.length > 5) {
      apiKey = '&apikey=' + ETHERSCAN_API_KEY
    }
    const url = sprintf('%s%s%s', baseUrl, cmd, apiKey)
    const response = await this.io.fetch(url, {
      method: 'GET'
    })
    return response.json()
  }

  async fetchPost (cmd:string, body:any) {
    let apiKey = ''
    if (ETHERSCAN_API_KEY.length > 5) {
      apiKey = '&apikey=' + ETHERSCAN_API_KEY
    }
    const response = this.io.fetch(baseUrl + cmd + apiKey, {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      method: 'POST',
      body: JSON.stringify(body)
    })
    return response.json()
  }

  // *************************************
  // Poll on the blockheight
  // *************************************
  async blockHeightInnerLoop () {
    while (this.engineOn) {
      try {
        const jsonObj = await this.fetchGet('?module=proxy&action=eth_blockNumber')
        const valid = validateObject(jsonObj, {
          'type': 'object',
          'properties': {
            'result': {'type': 'string'}
          },
          'required': ['result']
        })

        if (valid) {
          const heightHex = jsonObj.result.slice(2)
          const heightBN = new BN(heightHex, 16)
          const blockHeight = heightBN.toNumber()
          if (this.walletLocalData.blockHeight !== blockHeight) {
            this.walletLocalData.blockHeight = blockHeight
            this.walletLocalDataDirty = true
            console.log(
              'Block height changed: ' + this.walletLocalData.blockHeight
            )
            this.abcTxLibCallbacks.onBlockHeightChanged(
              this.walletLocalData.blockHeight
            )
          }
        }
      } catch (err) {
        console.log('Error fetching height: ' + err)
      }
      try {
        await snooze(BLOCKHEIGHT_POLL_MILLISECONDS)
      } catch (err) {
        console.log(err)
      }
    }
  }

  processTransaction (tx:any) {
    //
    // Calculate the amount sent from the wallet
    //

    let netNativeAmountBN = new BN('0', 10) // Amount received into wallet

    const nativeValueBN = new BN(tx.value, 10)

    if (tx.to === this.walletLocalData.masterPublicKey) {
      netNativeAmountBN.iadd(nativeValueBN)
    }

    if (tx.from === this.walletLocalData.masterPublicKey) {
      netNativeAmountBN.isub(nativeValueBN)
    }
    const netNativeAmount = netNativeAmountBN.toString(10)

    const gasPriceBN = new BN(tx.gasPrice, 10)
    const gasUsedBN = new BN(tx.gasUsed, 10)
    const etherUsedBN = gasPriceBN.mul(gasUsedBN)
    const networkFee = etherUsedBN.toString(10)

    const ethParams = new EthereumParams(
      [tx.from],
      [tx.to],
      tx.gas,
      tx.gasPrice,
      tx.gasUsed,
      tx.cumulativeGasUsed,
      tx.blockHeight)

    let abcTransaction = new ABCTransaction(
      tx.hash,
      parseInt(tx.timeStamp),
      'ETH',
      tx.blockNumber,
      netNativeAmount,
      networkFee,
      'iwassignedyoucantrustme',
      ethParams
    )

    const idx = this.findTransaction(PRIMARY_CURRENCY, tx.hash)
    if (idx === -1) {
      console.log(sprintf('New transaction: %s', tx.hash))

      // New transaction not in database
      this.addTransaction(PRIMARY_CURRENCY, abcTransaction)

      this.abcTxLibCallbacks.onTransactionsChanged(
        this.transactionsChangedArray
      )
      this.transactionsChangedArray = []
    } else {
      // Already have this tx in the database. See if anything changed
      const transactionsArray = this.walletLocalData.transactionsObj[PRIMARY_CURRENCY]
      const abcTx = transactionsArray[idx]

      if (abcTx.blockHeightNative !== tx.blockNumber) {
        console.log(sprintf('Update transaction: %s height:%s', tx.hash, tx.blockNumber))
        this.updateTransaction(PRIMARY_CURRENCY, abcTransaction, idx)
        this.abcTxLibCallbacks.onTransactionsChanged(
          this.transactionsChangedArray
        )
        this.transactionsChangedArray = []
      } else {
        console.log(sprintf('Old transaction. No Update: %s', tx.hash))
      }
    }
  }

  // **********************************************
  // Check all addresses for new transactions
  // **********************************************
  async checkAddressesInnerLoop () {
    while (this.engineOn) {
      // Ethereum only has one address
      const address = this.walletLocalData.masterPublicKey
      let checkAddressSuccess = 0
      let url
      let jsonObj
      let valid
      try {
        // Get balance
        url = sprintf('?module=account&action=balance&address=%s&tag=latest', address)
        jsonObj = await this.fetchGet(url)
        valid = validateObject(jsonObj, {
          'type': 'object',
          'properties': {
            'result': {'type': 'string'}
          },
          'required': ['result']
        })

        if (valid) {
          const balance = jsonObj.result
          console.log('Address balance: ' + balance)
          const balanceBN = new BN(balance, 10)
          const oldBalanceBN = new BN(this.walletLocalData.totalBalances.ETH, 10)

          if (!balanceBN.eq(oldBalanceBN)) {
            this.walletLocalData.totalBalances.ETH = balance

            const balanceSatoshi = nativeToSatoshi(this.walletLocalData.totalBalances.ETH)
            this.abcTxLibCallbacks.onBalanceChanged('ETH', balanceSatoshi, this.walletLocalData.totalBalances.ETH)
          }
          checkAddressSuccess++
        }
      } catch (e) {
        console.log('Error fetching address balance: ' + address)
      }

      try {
        const endBlock = 999999999
        let startBlock = 0

        if (this.walletLocalData.lastAddressQueryHeight > ADDRESS_QUERY_LOOKBACK_BLOCKS) {
          startBlock = this.walletLocalData.lastAddressQueryHeight - ADDRESS_QUERY_LOOKBACK_BLOCKS
        }

        url = sprintf('?module=account&action=txlist&address=%s&startblock=%d&endblock=%d&sort=asc', address, startBlock, endBlock)
        jsonObj = await this.fetchGet(url)
        valid = validateObject(jsonObj, {
          'type': 'object',
          'properties': {
            'result': {
              'type': 'array',
              'items': {
                'type': 'object',
                'properties': {
                  'blockNumber': {'type': 'string'},
                  'timeStamp': {'type': 'string'},
                  'hash': {'type': 'string'},
                  'from': {'type': 'string'},
                  'to': {'type': 'string'},
                  'value': {'type': 'string'},
                  'gas': {'type': 'string'},
                  'gasPrice': {'type': 'string'},
                  'cumulativeGasUsed': {'type': 'string'},
                  'gasUsed': {'type': 'string'},
                  'confirmations': {'type': 'string'}
                },
                'required': [
                  'blockNumber',
                  'timeStamp',
                  'hash',
                  'from',
                  'to',
                  'value',
                  'gas',
                  'gasPrice',
                  'cumulativeGasUsed',
                  'gasUsed',
                  'confirmations'
                ]
              }
            }
          },
          'required': ['result']
        })

        if (valid) {
          const transactions = jsonObj.result
          console.log('Fetched transactions count: ' + transactions.length)

          // Get transactions
          // Iterate over transactions in address
          for (const n in transactions) {
            const tx = transactions[n]
            this.processTransaction(tx)
          }
          checkAddressSuccess++
          if (checkAddressSuccess >= 2 && this.addressesChecked === false) {
            this.addressesChecked = true
            this.abcTxLibCallbacks.onAddressesChecked(1)
          }
        }
        await snooze(ADDRESS_POLL_MILLISECONDS)
      } catch (e) {
        console.log('Error fetching address transactions: ' + address)
        try {
          await snooze(BLOCKHEIGHT_POLL_MILLISECONDS)
        } catch (err) {
          console.log(err)
        }
      }
    }
  }

  findTransaction (currencyCode:string, txid:string) {
    if (typeof this.walletLocalData.transactionsObj[currencyCode] === 'undefined') {
      return -1
    }

    const currency = this.walletLocalData.transactionsObj[currencyCode]
    return currency.findIndex(element => {
      return element.txid === txid
    })
  }

  findAddress (address:string) {
    return this.walletLocalData.addressArray.findIndex(element => {
      return element.address === address
    })
  }

  sortTxByDate (a:ABCTransaction, b:ABCTransaction) {
    return b.date - a.date
  }

  addTransaction (currencyCode:string, abcTransaction:ABCTransaction) {
    // Add or update tx in transactionsObj
    const idx = this.findTransaction(currencyCode, abcTransaction.txid)

    if (idx === -1) {
      console.log('addTransaction: adding and sorting:' + abcTransaction.txid)
      if (typeof this.walletLocalData.transactionsObj[currencyCode] === 'undefined') {
        this.walletLocalData.transactionsObj[currencyCode] = []
      }
      this.walletLocalData.transactionsObj[currencyCode].push(abcTransaction)

      // Sort
      this.walletLocalData.transactionsObj[currencyCode].sort(this.sortTxByDate)
      this.walletLocalDataDirty = true
      this.transactionsChangedArray.push(abcTransaction)
    } else {
      this.updateTransaction(currencyCode, abcTransaction, idx)
    }
  }

  updateTransaction (currencyCode:string, abcTransaction:ABCTransaction, idx:number) {
    // Update the transaction
    this.walletLocalData.transactionsObj[currencyCode][idx] = abcTransaction
    this.walletLocalDataDirty = true
    this.transactionsChangedArray.push(abcTransaction)
    console.log('updateTransaction:' + abcTransaction.txid)
  }

  // *************************************
  // Save the wallet data store
  // *************************************
  async saveWalletLoop () {
    while (this.engineOn) {
      try {
        if (this.walletLocalDataDirty) {
          console.log('walletLocalDataDirty. Saving...')
          const walletJson = JSON.stringify(this.walletLocalData)
          await this.walletLocalFolder
            .folder(DATA_STORE_FOLDER)
            .file(DATA_STORE_FILE)
            .setText(walletJson)
          this.walletLocalDataDirty = false
        } else {
          console.log('walletLocalData clean')
        }
        await snooze(SAVE_DATASTORE_MILLISECONDS)
      } catch (err) {
        console.log(err)
        try {
          await snooze(SAVE_DATASTORE_MILLISECONDS)
        } catch (err) {
          console.log(err)
        }
      }
    }
  }

  doInitialCallbacks () {
    this.abcTxLibCallbacks.onBlockHeightChanged(
      this.walletLocalData.blockHeight
    )

    for (let n = 0; n < TOKEN_CODES.length; n++) {
      const currencyCode = TOKEN_CODES[n]
      this.abcTxLibCallbacks.onTransactionsChanged(
        this.walletLocalData.transactionsObj[currencyCode]
      )
      this.abcTxLibCallbacks.onBalanceChanged(currencyCode, this.walletLocalData.totalBalances[currencyCode])
    }
  }

  // *************************************
  // Public methods
  // *************************************

  async startEngine () {
    try {
      const result =
        await this.walletLocalFolder
        .folder(DATA_STORE_FOLDER)
        .file(DATA_STORE_FILE)
        .getText(DATA_STORE_FOLDER, 'walletLocalData')

      this.walletLocalData = new WalletLocalData(result)
      this.walletLocalData.masterPublicKey = this.keyInfo.keys.masterPublicKey
      this.engineLoop()
    } catch (err) {
      try {
        console.log(err)
        console.log('No walletLocalData setup yet: Failure is ok')
        this.walletLocalData = new WalletLocalData(null)
        this.walletLocalData.masterPublicKey = this.keyInfo.keys.masterPublicKey
        await this.walletLocalFolder
          .folder(DATA_STORE_FOLDER)
          .file(DATA_STORE_FILE)
          .setText(JSON.stringify(this.walletLocalData))
        this.engineLoop()
      } catch (e) {
        console.log('Error writing to localDataStore. Engine not started:' + err)
      }
    }
  }

  killEngine () {
    // disconnect network connections
    // clear caches

    this.engineOn = false

    return true
  }

  // synchronous
  getBlockHeight () {
    return this.walletLocalData.blockHeight
  }

  // asynchronous
  enableTokens (tokens:Array<string>) {
    for (let n = 0; n < tokens.length; n++) {
      const token = tokens[n]
      if (this.walletLocalData.enabledTokens.indexOf(token) !== -1) {
        this.walletLocalData.enabledTokens.push(token)
      }
    }
    // return Promise.resolve(dataStore.enableTokens(tokens))
  }

  // synchronous
  getTokenStatus () {
    // return dataStore.getTokensStatus()
  }

  // synchronous
  getBalance (options:any) {
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

    if (typeof this.walletLocalData.totalBalances[currencyCode] === 'undefined') {
      return 0
    } else {
      const balanceSatoshi = nativeToSatoshi(this.walletLocalData.totalBalances[currencyCode])
      return balanceSatoshi
    }
  }

  // synchronous
  getNumTransactions (options:any) {
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
  async getTransactions (options:any) {
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
  getFreshAddress (options:any) {
    return this.walletLocalData.masterPublicKey
  }

  // synchronous
  addGapLimitAddresses (addresses:Array<string>, options:any) {
  }

  // synchronous
  isAddressUsed (address:string, options:any) {
    return false
  }

  // synchronous
  async makeSpend (abcSpendInfo:any) {
    // Validate the spendInfo
    const valid = validateObject(abcSpendInfo, {
      'type': 'object',
      'properties': {
        'networkFeeOption': { 'type': 'string' },
        'spendTargets': {
          'type': 'array',
          'items': {
            'type': 'object',
            'properties': {
              'currencyCode': { 'type': 'string' },
              'publicAddress': { 'type': 'string' },
              'amountSatoshi': { 'type': 'number' },
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

    // ******************************
    // Get the fee amount
    // let networkFee:number = 50000
    // if (abcSpendInfo.networkFeeOption === 'high') {
    //   networkFee += 10000
    // } else if (abcSpendInfo.networkFeeOption === 'low') {
    //   networkFee -= 10000
    // } else if (abcSpendInfo.networkFeeOption === 'custom') {
    //   if (
    //     abcSpendInfo.customNetworkFee == null ||
    //     abcSpendInfo.customNetworkFee <= 0
    //   ) {
    //     throw (new Error('Invalid custom fee'))
    //   } else {
    //     networkFee = abcSpendInfo.customNetworkFee
    //   }
    // }
    //
    // // ******************************
    // // Calculate the total to send
    // let totalSpends = {}
    // totalSpends[ PRIMARY_CURRENCY ] = 0
    // let outputs = []
    // const spendTargets = abcSpendInfo.spendTargets
    //
    // for (let n in spendTargets) {
    //   const spendTarget = spendTargets[ n ]
    //   if (spendTarget.amountSatoshi <= 0) {
    //     throw (new Error('Error: invalid spendTarget amount'))
    //   }
    //   let currencyCode = PRIMARY_CURRENCY
    //   if (spendTarget.currencyCode != null) {
    //     currencyCode = spendTarget.currencyCode
    //   }
    //   if (totalSpends[ currencyCode ] == null) {
    //     totalSpends[ currencyCode ] = 0
    //   }
    //   totalSpends[ currencyCode ] += spendTarget.amountSatoshi
    //   outputs.push({
    //     currencyCode,
    //     address: spendTarget.publicAddress,
    //     amount: spendTarget.amountSatoshi
    //   })
    // }
    // totalSpends[ PRIMARY_CURRENCY ] += networkFee
    //
    // for (const n in totalSpends) {
    //   const totalSpend = totalSpends[ n ]
    //   // XXX check if spends exceed totals
    //   if (totalSpend > this.walletLocalData.totalBalances[ n ]) {
    //     throw (new Error('Error: insufficient balance for token:' + n))
    //   }
    // }
    //
    // // ****************************************************
    // // Pick inputs. Picker will use all funds in an address
    // let totalInputAmounts = {}
    // let inputs = []
    // const addressArray = this.walletLocalData.addressArray
    // // Get a new address for change if needed
    // const changeAddress = this.addressFromIndex(
    //   this.walletLocalData.unusedAddressIndex
    // )
    //
    // for (let currencyCode in totalSpends) {
    //   for (let n in addressArray) {
    //     let addressObj = addressArray[ n ]
    //     if (addressObj.amounts[ currencyCode ] > 0) {
    //       if (totalInputAmounts[ currencyCode ] == null) {
    //         totalInputAmounts[ currencyCode ] = 0
    //       }
    //
    //       totalInputAmounts[ currencyCode ] += addressObj.amounts[ currencyCode ]
    //       inputs.push({
    //         currencyCode,
    //         address: addressObj.address,
    //         amount: addressObj.amounts[ currencyCode ]
    //       })
    //     }
    //     if (totalInputAmounts[ currencyCode ] >= totalSpends[ currencyCode ]) {
    //       break
    //     }
    //   }
    //
    //   if (totalInputAmounts[ currencyCode ] < totalSpends[ currencyCode ]) {
    //     throw (new Error('Error: insufficient funds for token:' + currencyCode))
    //   }
    //   if (totalInputAmounts[ currencyCode ] > totalSpends[ currencyCode ]) {
    //     outputs.push({
    //       currencyCode,
    //       address: changeAddress,
    //       amount: totalInputAmounts[ currencyCode ] - totalSpends[ currencyCode ]
    //     })
    //   }
    // }
    //
    // // **********************************
    // // Create the unsigned ABCTransaction
    // const abcTransaction = new ABCTransaction(
    //   null,
    //   null,
    //   null,
    //   null,
    //   totalSpends[ PRIMARY_CURRENCY ],
    //   networkFee,
    //   null,
    //   { inputs, outputs }
    // )
    //
    // return abcTransaction
  }

  // asynchronous
  async signTx (abcTransaction:ABCTransaction) {
    // Do signing
    abcTransaction.signedTx = ''
    return abcTransaction
  }

  // asynchronous
  async broadcastTx (abcTransaction:ABCTransaction) {
    const prom = new Promise((resolve, reject) => {
      this.fetchPost('spend', abcTransaction.otherParams)
        .then(function (response) {
          return response.json()
        })
        .then(jsonObj => {
          // Copy params from returned transaction object to our abcTransaction object
          abcTransaction.blockHeight = jsonObj.blockHeight
          abcTransaction.txid = jsonObj.txid
          abcTransaction.date = jsonObj.txDate
          resolve(abcTransaction)
        })
        .catch(e => {
          reject(new Error('Error: broadcastTx failed'))
        })
    })
    return prom
  }

  // asynchronous
  async saveTx (abcTransaction:ABCTransaction) {
    return abcTransaction
  }
}
