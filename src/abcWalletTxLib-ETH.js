/**
 * Created by paul on 7/7/17.
 */
// @flow

import { txLibInfo } from './txLibInfo.js'
import { BN } from 'bn.js'
import { sprintf } from 'sprintf-js'
import { validate } from 'jsonschema'

const Buffer = require('buffer/').Buffer
const abi = require('../lib/export-fixes-bundle.js').ABI
const ethWallet = require('../lib/export-fixes-bundle.js').Wallet
const EthereumTx = require('../lib/export-fixes-bundle.js').Transaction

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

function bufToHex (buf:any) {
  const signedTxBuf = Buffer.from(buf)
  const hex = '0x' + signedTxBuf.toString('hex')
  return hex
}

function hexToBuf (hex:string) {
  const noHexPrefix = hex.replace('0x', '')
  const noHexPrefixBN = new BN(noHexPrefix, 16)
  const array = noHexPrefixBN.toArray()
  const buf = Buffer.from(array)
  return buf
}

function decimalToHex (decimal:string) {
  const decimalBN = new BN(decimal, 10)
  const hex = '0x' + decimalBN.toString(16)
  return hex
}

// function hexToDecimal (hex:string) {
//   const noHexPrefix = hex.replace('0x', '')
//   const hexBN = new BN(noHexPrefix, 16)
//   const decimal = hexBN.toString(10)
//   return decimal
// }

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
        // const ethereumKey = wallet.getPrivateKeyString()
        // const ethereumPublicAddress = wallet.getAddressString()
        const ethereumKey = '0x389b07b3466eed587d6bdae09a3613611de9add2635432d6cd1521af7bbc3757'
        const ethereumPublicAddress = '0x9fa817e5A48DD1adcA7BEc59aa6E3B1F5C4BeA9a'
        return { ethereumKey, ethereumPublicAddress }
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
  nextNonce:number
  ethereumPublicAddress:string
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
    this.nextNonce = 0

    // Array of ABCTransaction objects sorted by date from newest to oldest
    for (let n = 0; n < TOKEN_CODES.length; n++) {
      const currencyCode = TOKEN_CODES[n]
      this.transactionsObj[currencyCode] = []
    }

    // // Array of txids to fetch
    this.lastAddressQueryHeight = 0

    this.ethereumPublicAddress = ''
    this.enabledTokens = [PRIMARY_CURRENCY]
    if (jsonString !== null) {
      const data = JSON.parse(jsonString)

      if (typeof data.blockHeight !== 'undefined') this.blockHeight = data.blockHeight
      if (typeof data.lastAddressQueryHeight !== 'undefined') this.lastAddressQueryHeight = data.lastAddressQueryHeight
      if (typeof data.nextNonce !== 'undefined') this.nextNonce = data.nextNonce
      if (typeof data.ethereumPublicAddress !== 'undefined') this.ethereumPublicAddress = data.ethereumPublicAddress
      if (typeof data.totalBalances !== 'undefined') this.totalBalances = data.totalBalances
      if (typeof data.enabledTokens !== 'undefined') this.enabledTokens = data.enabledTokens
      if (typeof data.transactionsObj !== 'undefined') this.transactionsObj = data.transactionsObj
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
  tokenRecipientAddress:string|null

  constructor (from:Array<string>,
               to:Array<string>,
               gas:string,
               gasPrice:string,
               gasUsed:string,
               cumulativeGasUsed:string,
               blockHash: string,
               tokenRecipientAddress:string|null) {
    this.from = from
    this.to = to
    this.gas = gas
    this.gasPrice = gasPrice
    this.gasUsed = gasUsed
    this.cumulativeGasUsed = cumulativeGasUsed
    this.blockHash = blockHash
    if (typeof tokenRecipientAddress === 'string') {
      this.tokenRecipientAddress = tokenRecipientAddress
    } else {
      tokenRecipientAddress = null
    }
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
               otherParams:any) {
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

    if (tx.from.toLowerCase() === this.walletLocalData.ethereumPublicAddress.toLowerCase()) {
      netNativeAmountBN.iadd(nativeValueBN)
      const newNonceBN = new BN(tx.nonce, 16)
      const nonceBN = new BN(this.walletLocalData.nextNonce)

      if (newNonceBN.gte(nonceBN)) {
        newNonceBN.iadd(new BN('1', 10))
        this.walletLocalData.nextNonce = newNonceBN.toNumber()
      }
    }

    if (tx.from === this.walletLocalData.ethereumPublicAddress) {
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
      tx.blockHeight,
      null
    )

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

  getTokenInfo (token:string) {
    return txLibInfo.getInfo.metaTokens.find(element => {
      return element.currencyCode === token
    })
  }

  // **********************************************
  // Check all addresses for new transactions
  // **********************************************
  async checkAddressesInnerLoop () {
    while (this.engineOn) {
      // Ethereum only has one address
      const address = this.walletLocalData.ethereumPublicAddress
      let checkAddressSuccess = true
      let url = ''
      let jsonObj = {}
      let valid = false

      // ************************************
      // Fetch token balances
      // ************************************
      // https://api.etherscan.io/api?module=account&action=tokenbalance&contractaddress=0x57d90b64a1a57749b0f932f1a3395792e12e7055&address=0xe04f27eb70e025b78871a2ad7eabe85e61212761&tag=latest&apikey=YourApiKeyToken
      for (let n = 0; n < TOKEN_CODES.length; n++) {
        const tk = TOKEN_CODES[n]

        if (tk === PRIMARY_CURRENCY) {
          url = sprintf('?module=account&action=balance&address=%s&tag=latest', address)
        } else {
          if (this.isTokenEnabled(tk)) {
            const tokenInfo = this.getTokenInfo(tk)
            url = sprintf('?module=account&action=tokenbalance&contractaddress=%s&address=%s&tag=latest', tokenInfo.contractAddress, this.walletLocalData.ethereumPublicAddress)
          } else {
            continue
          }
        }
        try {
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
            console.log(tk + ': token Address balance: ' + balance)
            const balanceBN = new BN(balance, 10)
            const oldBalanceBN = new BN(this.walletLocalData.totalBalances[tk], 10)

            if (!balanceBN.eq(oldBalanceBN)) {
              this.walletLocalData.totalBalances[tk] = balance

              const balanceSatoshi = nativeToSatoshi(this.walletLocalData.totalBalances[tk])
              this.abcTxLibCallbacks.onBalanceChanged(tk, balanceSatoshi, this.walletLocalData.totalBalances[tk])
            }
          } else {
            checkAddressSuccess = false
          }
        } catch (e) {
          checkAddressSuccess = false
        }
      }

      // ************************************
      // Fetch transactions
      // ************************************
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
                  'nonce': {'type': 'string'},
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
                  'nonce',
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
          if (checkAddressSuccess === true && this.addressesChecked === false) {
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
      this.walletLocalData.ethereumPublicAddress = this.keyInfo.keys.ethereumPublicAddress
      this.engineLoop()
    } catch (err) {
      try {
        console.log(err)
        console.log('No walletLocalData setup yet: Failure is ok')
        this.walletLocalData = new WalletLocalData(null)
        this.walletLocalData.ethereumPublicAddress = this.keyInfo.keys.ethereumPublicAddress
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
      if (this.walletLocalData.enabledTokens.indexOf(token) === -1) {
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
    return this.walletLocalData.ethereumPublicAddress
  }

  // synchronous
  addGapLimitAddresses (addresses:Array<string>, options:any) {
  }

  // synchronous
  isAddressUsed (address:string, options:any) {
    return false
  }

  // synchronous
  makeSpend (abcSpendInfo:any) {
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
      return (new Error('Error: invalid ABCSpendInfo'))
    }

    // Ethereum can only have one output
    if (abcSpendInfo.spendTargets.length !== 1) {
      return (new Error('Error: only one output allowed'))
    }

    if (typeof abcSpendInfo.spendTargets[0].currencyCode === 'string') {
      if (!this.isTokenEnabled(abcSpendInfo.spendTargets[0].currencyCode)) {
        return (new Error('Error: Token not supported or enabled'))
      }
    } else {
      abcSpendInfo.spendTargets[0].currencyCode = 'ETH'
    }
    const currencyCode = abcSpendInfo.spendTargets[0].currencyCode

    // ******************************
    // Get the fee amount

    let ethParams = {}
    if (currencyCode === PRIMARY_CURRENCY) {
      const gasLimit = '21000'
      const gasPrice = '28000000000' // 28 Gwei

      ethParams = new EthereumParams(
        [this.walletLocalData.ethereumPublicAddress],
        [abcSpendInfo.spendTargets[0].publicAddress],
        gasLimit,
        gasPrice,
        '0',
        '0',
        '0',
        null
      )
    } else {
      const gasLimit = '40000'
      const gasPrice = '28000000000' // 28 Gwei

      ethParams = new EthereumParams(
        [this.walletLocalData.ethereumPublicAddress],
        [this.getTokenInfo(currencyCode).contractAddress],
        gasLimit,
        gasPrice,
        '0',
        '0',
        '0',
        abcSpendInfo.spendTargets[0].publicAddress
      )
    }

    // Use nativeAmount if available. Otherwise convert from amountSatoshi
    let nativeAmount = '0'
    if (typeof abcSpendInfo.spendTargets[0].nativeAmount === 'string') {
      nativeAmount = abcSpendInfo.spendTargets[0].nativeAmount
    } else {
      const nativeAmountBN = new BN(abcSpendInfo.spendTargets[0].amountSatoshi.toString(), 10)
      nativeAmount = nativeAmountBN.toString(10)
    }

    // **********************************
    // Create the unsigned ABCTransaction

    const abcTransaction = new ABCTransaction(
      '', // txid
      0, // date
      currencyCode, // currencyCode
      '0', // blockHeightNative
      nativeAmount, // nativeAmount
      '0', // nativeNetworkFee
      '0', // signedTx
      ethParams // otherParams
    )

    return abcTransaction
  }

  // asynchronous
  async signTx (abcTransaction:ABCTransaction) {
    // Do signing

    const gasLimitHex = decimalToHex(abcTransaction.otherParams.gas)
    const gasPriceHex = decimalToHex(abcTransaction.otherParams.gasPrice)
    let nativeAmountHex = decimalToHex(abcTransaction.nativeAmount)

    const nonceBN = new BN(this.walletLocalData.nextNonce.toString(10), 10)
    const nonceHex = '0x' + nonceBN.toString(16)

    let data
    if (abcTransaction.currencyCode === PRIMARY_CURRENCY) {
      data = ''
    } else {
      const dataArray = abi.simpleEncode(
        'transfer(address,uint256):(uint256)',
        abcTransaction.otherParams.tokenRecipientAddress,
        nativeAmountHex
      )
      data = '0x' + Buffer.from(dataArray).toString('hex')
      nativeAmountHex = '0x00'
    }

    const txParams = {
      nonce: nonceHex,
      gasPrice: gasPriceHex,
      gasLimit: gasLimitHex,
      to: abcTransaction.otherParams.to[0],
      value: nativeAmountHex,
      data: data,
      // EIP 155 chainId - mainnet: 1, ropsten: 3
      chainId: 1
    }

    const privKey = hexToBuf(this.keyInfo.keys.ethereumKey)
    const wallet = ethWallet.fromPrivateKey(privKey)

    console.log(wallet.getAddressString())

    const tx = new EthereumTx(txParams)
    tx.sign(privKey)

    abcTransaction.signedTx = bufToHex(tx.serialize())
    abcTransaction.txid = bufToHex(tx.hash())
    abcTransaction.date = (new Date()).getTime()

    return abcTransaction
  }

  // asynchronous
  async broadcastTx (abcTransaction:ABCTransaction) {
    try {
      const url = sprintf('?module=proxy&action=eth_sendRawTransaction&hex=%s', abcTransaction.signedTx)
      const jsonObj = await this.fetchGet(url)

      // {
      //   "jsonrpc": "2.0",
      //   "error": {
      //   "code": -32010,
      //     "message": "Transaction nonce is too low. Try incrementing the nonce.",
      //     "data": null
      // },
      //   "id": 1
      // }

      // {
      //   "jsonrpc": "2.0",
      //   "result": "0xe3d056a756e98505460f599cb2a58db062da8705eb36ea3539cb42f82d69099b",
      //   "id": 1
      // }
      console.log('Sent transaction to network. Response:')
      console.log(jsonObj)

      if (typeof jsonObj.error === 'string') {
        throw (jsonObj.error)
      } else if (typeof jsonObj.result === 'string') {
        // Success!!
        return abcTransaction
      }
    } catch (e) {
      throw (e)
    }
  }

  // asynchronous
  async saveTx (abcTransaction:ABCTransaction) {
    this.addTransaction(abcTransaction.currencyCode, abcTransaction)

    this.abcTxLibCallbacks.onTransactionsChanged([abcTransaction])
  }
}
