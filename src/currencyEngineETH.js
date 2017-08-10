/**
 * Created by paul on 7/7/17.
 */
// @flow

import { txLibInfo } from './currencyInfoETH.js'
import { BN } from 'bn.js'
import { sprintf } from 'sprintf-js'
import { validate } from 'jsonschema'
import { bns } from 'biggystring'

const Buffer = require('buffer/').Buffer
const abi = require('../lib/export-fixes-bundle.js').ABI
const ethWallet = require('../lib/export-fixes-bundle.js').Wallet
const EthereumTx = require('../lib/export-fixes-bundle.js').Transaction

const DATA_STORE_FOLDER = 'txEngineFolder'
const DATA_STORE_FILE = 'walletLocalData.json'
const ADDRESS_POLL_MILLISECONDS = 3000
const BLOCKHEIGHT_POLL_MILLISECONDS = 5000
const SAVE_DATASTORE_MILLISECONDS = 10000
// const ADDRESS_QUERY_LOOKBACK_BLOCKS = '8' // ~ 2 minutes
const ADDRESS_QUERY_LOOKBACK_BLOCKS = '40320' // (4 * 60 * 24 * 7) // ~ one week
const ETHERSCAN_API_KEY = ''

const PRIMARY_CURRENCY = txLibInfo.getInfo.currencyCode
const TOKEN_CODES = [PRIMARY_CURRENCY].concat(txLibInfo.supportedTokens)

const baseUrl = 'https://api.etherscan.io/api'
let io

// Utility functions
//
// satoshiToNative converts satoshi-like units to a big number string nativeAmount which is in Wei.
// amountSatoshi is 1/100,000,000 of an ether to match the satoshi units of bitcoin
//
function satoshiToNative (amountSatoshi: number) {
  const converter = new BN('10000000000', 10)
  let nativeAmountBN = new BN(amountSatoshi.toString(), 10)
  nativeAmountBN = nativeAmountBN.mul(converter)
  const nativeAmount = nativeAmountBN.toString(10)
  return nativeAmount
}

function nativeToSatoshi (nativeAmount:string) {
  let nativeAmountBN = new BN(nativeAmount, 10)
  // return nativeAmountBN.toNumber()
  const converter = new BN('10000000000', 10)
  const amountSatoshiBN = nativeAmountBN.div(converter)
  const amountSatoshi = amountSatoshiBN.toNumber()
  return amountSatoshi
}

const snooze = ms => new Promise(resolve => setTimeout(resolve, ms))

function validateObject (object, schema) {
  const result = validate(object, schema)

  if (result.errors.length === 0) {
    return true
  } else {
    for (const n in result.errors) {
      const errMsg = result.errors[n].message
      io.console.error(errMsg)
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

function toHex (num:string) {
  return bns.add(num, '0', 16)
}

function toDecimal (num:string) {
  return bns.add(num, '0')
}

function getTokenInfo (token:string) {
  return txLibInfo.getInfo.metaTokens.find(element => {
    return element.currencyCode === token
  })
}

// function hexToDecimal (hex:string) {
//   const noHexPrefix = hex.replace('0x', '')
//   const hexBN = new BN(noHexPrefix, 16)
//   const decimal = hexBN.toString(10)
//   return decimal
// }

class WalletLocalData {
  blockHeight:string
  lastAddressQueryHeight:string
  nextNonce:string
  ethereumPublicAddress:string
  totalBalances: any
  enabledTokens:Array<string>
  transactionsObj:any

  constructor (jsonString) {
    this.blockHeight = '0'
    this.totalBalances = {
      ETH: '0',
      REP: '0',
      WINGS: '0'
    }

    this.transactionsObj = {}
    this.nextNonce = '0'

    // Array of ABCTransaction objects sorted by date from newest to oldest
    for (let currencyCode of TOKEN_CODES) {
      this.transactionsObj[currencyCode] = []
    }

    this.lastAddressQueryHeight = '0'

    this.ethereumPublicAddress = ''
    this.enabledTokens = TOKEN_CODES
    if (jsonString !== null) {
      const data = JSON.parse(jsonString)

      if (typeof data.blockHeight === 'string') this.blockHeight = data.blockHeight
      if (typeof data.lastAddressQueryHeight === 'string') this.lastAddressQueryHeight = data.lastAddressQueryHeight
      if (typeof data.nextNonce === 'string') this.nextNonce = data.nextNonce
      if (typeof data.ethereumPublicAddress === 'string') this.ethereumPublicAddress = data.ethereumPublicAddress
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
  errorVal: number
  tokenRecipientAddress:string|null

  constructor (from:Array<string>,
               to:Array<string>,
               gas:string,
               gasPrice:string,
               gasUsed:string,
               cumulativeGasUsed:string,
               blockHash: string,
               errorVal: number,
               tokenRecipientAddress:string|null) {
    this.from = from
    this.to = to
    this.gas = gas
    this.gasPrice = gasPrice
    this.gasUsed = gasUsed
    this.errorVal = errorVal
    this.cumulativeGasUsed = cumulativeGasUsed
    this.blockHash = blockHash
    if (typeof tokenRecipientAddress === 'string') {
      this.tokenRecipientAddress = tokenRecipientAddress
    } else {
      this.tokenRecipientAddress = null
    }
  }
}

class ABCTransaction {
  txid:string
  date:number
  currencyCode:string
  amountSatoshi:number
  blockHeight:string
  nativeAmount:string
  networkFee:string
  ourReceiveAddresses:Array<string>
  signedTx:string
  otherParams:EthereumParams

  constructor (txid:string,
               date:number,
               currencyCode:string,
               blockHeight:string,
               nativeAmount:string,
               networkFee:string,
               ourReceiveAddresses:Array<string>,
               signedTx:string,
               otherParams:EthereumParams) {
    this.txid = txid
    this.date = date
    this.currencyCode = currencyCode
    this.blockHeight = blockHeight
    if (otherParams.errorVal === 0) {
      this.nativeAmount = nativeAmount
    } else {
      this.nativeAmount = '0'
    }
    this.amountSatoshi = nativeToSatoshi(nativeAmount)
    this.ourReceiveAddresses = ourReceiveAddresses
    this.networkFee = networkFee
    this.signedTx = signedTx
    this.otherParams = otherParams
  }
}

class EthereumEngine {
  keyInfo:any
  abcTxLibCallbacks:any
  walletLocalFolder:any
  engineOn:boolean
  addressesChecked:boolean
  walletLocalData:WalletLocalData
  walletLocalDataDirty:boolean
  transactionsChangedArray:Array<{}>

  constructor (io_:any, keyInfo:any, opts:any) {
    const { walletLocalFolder, callbacks } = opts

    io = io_
    this.engineOn = false
    this.addressesChecked = false
    this.walletLocalDataDirty = false
    this.transactionsChangedArray = []
    this.keyInfo = keyInfo

    // Hard coded for testing
    this.keyInfo.keys.ethereumKey = '389b07b3466eed587d6bdae09a3613611de9add2635432d6cd1521af7bbc3757'
    this.keyInfo.keys.ethereumPublicAddress = '0x9fa817e5A48DD1adcA7BEc59aa6E3B1F5C4BeA9a'
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
      io.console.error(err)
    }
  }

  async fetchGetEtherscan (cmd:string) {
    let apiKey = ''
    if (ETHERSCAN_API_KEY.length > 5) {
      apiKey = '&apikey=' + ETHERSCAN_API_KEY
    }
    const url = sprintf('%s%s%s', baseUrl, cmd, apiKey)
    return this.fetchGet(url)
  }

  async fetchGet (url:string) {
    const response = await io.fetch(url, {
      method: 'GET'
    })
    return response.json()
  }

  async fetchPost (cmd:string, body:any) {
    let apiKey = ''
    if (ETHERSCAN_API_KEY.length > 5) {
      apiKey = '&apikey=' + ETHERSCAN_API_KEY
    }
    const response = await io.fetch(baseUrl + cmd + apiKey, {
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
        const jsonObj = await this.fetchGetEtherscan('?module=proxy&action=eth_blockNumber')
        const valid = validateObject(jsonObj, {
          'type': 'object',
          'properties': {
            'result': {'type': 'string'}
          },
          'required': ['result']
        })

        if (valid) {
          const blockHeight = jsonObj.result.slice(2)
          if (!bns.eq(this.walletLocalData.blockHeight, blockHeight)) {
            this.walletLocalData.blockHeight = toDecimal(blockHeight) // Convert to decimal
            this.walletLocalDataDirty = true
            io.console.info(
              'Block height changed: ' + this.walletLocalData.blockHeight
            )
            this.abcTxLibCallbacks.onBlockHeightChanged(
              this.walletLocalData.blockHeight
            )
          }
        }
      } catch (err) {
        io.console.info('Error fetching height: ' + err)
      }
      try {
        await snooze(BLOCKHEIGHT_POLL_MILLISECONDS)
      } catch (err) {
        io.console.error(err)
      }
    }
  }

  processEtherscanTransaction (tx:any) {
    let netNativeAmount:string // Amount received into wallet
    let ourReceiveAddresses:Array<string> = []

    // const nativeValueBN = new BN(tx.value, 10)

    if (tx.from.toLowerCase() === this.walletLocalData.ethereumPublicAddress.toLowerCase()) {
      netNativeAmount = bns.sub('0', tx.value)

      if (bns.gte(tx.nonce, this.walletLocalData.nextNonce)) {
        this.walletLocalData.nextNonce = bns.add(tx.nonce, '1')
      }
    } else {
      netNativeAmount = bns.add('0', tx.value)
      ourReceiveAddresses.push(this.walletLocalData.ethereumPublicAddress.toLowerCase())
    }
    // const gasPriceBN = new BN(tx.gasPrice, 10)
    // const gasUsedBN = new BN(tx.gasUsed, 10)
    // const etherUsedBN = gasPriceBN.mul(gasUsedBN)
    const nativeNetworkFee:string = bns.mul(tx.gasPrice, tx.gasUsed)
    // const nativeNetworkFee = etherUsedBN.toString(10)

    const ethParams = new EthereumParams(
      [ tx.from ],
      [ tx.to ],
      tx.gas,
      tx.gasPrice,
      tx.gasUsed,
      tx.cumulativeGasUsed,
      tx.blockHeight,
      parseInt(tx.isError),
      null
    )

    let abcTransaction = new ABCTransaction(
      tx.hash,
      parseInt(tx.timeStamp),
      'ETH',
      tx.blockNumber,
      netNativeAmount,
      nativeNetworkFee,
      ourReceiveAddresses,
      'nosignature',
      ethParams
    )

    const idx = this.findTransaction(PRIMARY_CURRENCY, tx.hash)
    if (idx === -1) {
      io.console.info(sprintf('New transaction: %s', tx.hash))

      // New transaction not in database
      this.addTransaction(PRIMARY_CURRENCY, abcTransaction)

      this.abcTxLibCallbacks.onTransactionsChanged(
        this.transactionsChangedArray
      )
      this.transactionsChangedArray = []
    } else {
      // Already have this tx in the database. See if anything changed
      const transactionsArray = this.walletLocalData.transactionsObj[ PRIMARY_CURRENCY ]
      const abcTx = transactionsArray[ idx ]

      if (
        abcTx.blockHeight !== abcTransaction.blockHeight ||
        abcTx.networkFee !== abcTransaction.networkFee ||
        abcTx.nativeAmount !== abcTransaction.nativeAmount ||
        abcTx.otherParams.errorVal !== abcTransaction.otherParams.errorVal
      ) {
        io.console.info(sprintf('Update transaction: %s height:%s', tx.hash, tx.blockNumber))
        this.updateTransaction(PRIMARY_CURRENCY, abcTransaction, idx)
        this.abcTxLibCallbacks.onTransactionsChanged(
          this.transactionsChangedArray
        )
        this.transactionsChangedArray = []
      } else {
        io.console.info(sprintf('Old transaction. No Update: %s', tx.hash))
      }
    }
  }

  processBlockCypherTransaction (tx:any) {
    // let netNativeAmountBN = new BN('0', 10) // Amount received into wallet
    //
    // const nativeValueBN = new BN(tx.value, 10)
    //
    // if (tx.from.toLowerCase() === this.walletLocalData.ethereumPublicAddress.toLowerCase()) {
    //   netNativeAmountBN.iadd(nativeValueBN)
    //   const newNonceBN = new BN(tx.nonce, 16)
    //   const nonceBN = new BN(this.walletLocalData.nextNonce)
    //
    //   if (newNonceBN.gte(nonceBN)) {
    //     newNonceBN.iadd(new BN('1', 10))
    //     this.walletLocalData.nextNonce = newNonceBN.toNumber()
    //   }
    // }
    //
    // if (tx.from === this.walletLocalData.ethereumPublicAddress) {
    //   netNativeAmountBN.isub(nativeValueBN)
    // } else {
    //   netNativeAmountBN.iadd(nativeValueBN)
    // }
    // const netNativeAmount = netNativeAmountBN.toString(10)
    //
    // const gasPriceBN = new BN(tx.gasPrice, 10)
    // const gasUsedBN = new BN(tx.gasUsed, 10)
    // const etherUsedBN = gasPriceBN.mul(gasUsedBN)
    // const networkFee = etherUsedBN.toString(10)
    const fromAddress = '0x' + tx.inputs.addresses[0]
    const toAddress = '0x' + tx.outputs.addresses[0]
    const epochTime = Date.parse(tx.received) / 1000
    let ourReceiveAddresses:Array<string> = []

    let nativeAmount
    if (fromAddress === this.walletLocalData.ethereumPublicAddress) {
      nativeAmount = (0 - tx.total).toString(10)
    } else {
      nativeAmount = tx.total.toString(10)
      ourReceiveAddresses.push(this.walletLocalData.ethereumPublicAddress)
    }

    const ethParams = new EthereumParams(
      [ fromAddress ],
      [ toAddress ],
      '',
      '',
      tx.fees.toString(10),
      '',
      tx.block_height,
      0,
      null
    )

    let abcTransaction = new ABCTransaction(
      tx.hash,
      epochTime,
      'ETH',
      tx.blockNumber,
      nativeAmount,
      tx.fees.toString(10),
      ourReceiveAddresses,
      'iwassignedyoucantrustme',
      ethParams
    )

    const idx = this.findTransaction(PRIMARY_CURRENCY, tx.hash)
    if (idx === -1) {
      io.console.info(sprintf('processBlockCypherTransaction: New transaction: %s', tx.hash))

      // New transaction not in database
      this.addTransaction(PRIMARY_CURRENCY, abcTransaction)

      this.abcTxLibCallbacks.onTransactionsChanged(
        this.transactionsChangedArray
      )
      this.transactionsChangedArray = []
    } else {
      // Already have this tx in the database. See if anything changed
      const transactionsArray = this.walletLocalData.transactionsObj[ PRIMARY_CURRENCY ]
      const abcTx = transactionsArray[ idx ]

      if (abcTx.blockHeightNative !== tx.blockNumber) {
        io.console.info(sprintf('processBlockCypherTransaction: Update transaction: %s height:%s', tx.hash, tx.blockNumber))
        this.updateTransaction(PRIMARY_CURRENCY, abcTransaction, idx)
        this.abcTxLibCallbacks.onTransactionsChanged(
          this.transactionsChangedArray
        )
        this.transactionsChangedArray = []
      } else {
        io.console.info(sprintf('processBlockCypherTransaction: Old transaction. No Update: %s', tx.hash))
      }
    }
  }

  async checkAddressFetch (tk:string, url:string) {
    let checkAddressSuccess = true
    let jsonObj = {}
    let valid = false

    try {
      jsonObj = await this.fetchGetEtherscan(url)
      valid = validateObject(jsonObj, {
        'type': 'object',
        'properties': {
          'result': {'type': 'string'}
        },
        'required': ['result']
      })
      if (valid) {
        const balance = jsonObj.result
        io.console.info(tk + ': token Address balance: ' + balance)
        // const balanceBN = new BN(balance, 10)
        // const oldBalanceBN = new BN(this.walletLocalData.totalBalances[tk], 10)

        if (!bns.eq(balance, this.walletLocalData.totalBalances[tk])) {
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
    return checkAddressSuccess
  }

  async checkTransactionsFetch () {
    const address = this.walletLocalData.ethereumPublicAddress
    const endBlock = '999999999'
    let startBlock = '0'
    let checkAddressSuccess = true
    let url = ''
    let jsonObj = {}
    let valid = false

    if (bns.gt(this.walletLocalData.lastAddressQueryHeight, ADDRESS_QUERY_LOOKBACK_BLOCKS)) {
      // Only query for transactions as far back as ADDRESS_QUERY_LOOKBACK_BLOCKS from the last time we queried transactions
      startBlock = bns.sub(this.walletLocalData.lastAddressQueryHeight, ADDRESS_QUERY_LOOKBACK_BLOCKS)
    }

    try {
      url = sprintf('?module=account&action=txlist&address=%s&startblock=%d&endblock=%d&sort=asc', address, startBlock, endBlock)
      jsonObj = await this.fetchGetEtherscan(url)
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
        io.console.info('Fetched transactions count: ' + transactions.length)

        // Get transactions
        // Iterate over transactions in address
        for (const n in transactions) {
          const tx = transactions[n]
          this.processEtherscanTransaction(tx)
        }
        if (checkAddressSuccess === true && this.addressesChecked === false) {
          this.addressesChecked = true
          this.abcTxLibCallbacks.onAddressesChecked(1)
        }
      } else {
        checkAddressSuccess = false
      }
    } catch (e) {
      io.console.error(e)
      checkAddressSuccess = false
    }
    if (checkAddressSuccess) {
      this.walletLocalData.lastAddressQueryHeight = this.walletLocalData.blockHeight
    }
    return checkAddressSuccess
  }

  async checkUnconfirmedTransactionsFetch () {
    const address = this.walletLocalData.ethereumPublicAddress
    const url = sprintf('https://api.blockcypher.com/v1/eth/main/txs')
    const jsonObj = await this.fetchGet(url)

    const valid = validateObject(jsonObj, {
      'type': 'array',
      'items': {
        'type': 'object',
        'properties': {
          'block_height': { 'type': 'number' },
          'fees': { 'type': 'number' },
          'received': { 'type': 'string' },
          'addresses': {
            'type': 'array',
            'items': { 'type': 'string' }
          },
          'inputs': {
            'type': 'array',
            'items': {
              'type': 'object',
              'properties': {
                'addresses': {
                  'type': 'array',
                  'items': { 'type': 'string' }
                }
              },
              'required': [
                'addresses'
              ]
            }
          },
          'outputs': {
            'type': 'array',
            'items': {
              'type': 'object',
              'properties': {
                'addresses': {
                  'type': 'array',
                  'items': { 'type': 'string' }
                }
              },
              'required': [
                'addresses'
              ]
            }
          }
        },
        'required': [
          'fees',
          'received',
          'addresses',
          'inputs',
          'outputs'
        ]
      }
    })

    if (valid) {
      const transactions = jsonObj

      for (const tx of transactions) {
        if (
          tx.inputs[0].addresses[0] === address ||
          tx.outputs[0].addresses[0] === address
        ) {
          this.processBlockCypherTransaction(tx)
        }
      }
    }
  }

  // **********************************************
  // Check all addresses for new transactions
  // **********************************************
  async checkAddressesInnerLoop () {
    while (this.engineOn) {
      // Ethereum only has one address
      const address = this.walletLocalData.ethereumPublicAddress
      let url = ''
      let promiseArray = []

      // ************************************
      // Fetch token balances
      // ************************************
      // https://api.etherscan.io/api?module=account&action=tokenbalance&contractaddress=0x57d90b64a1a57749b0f932f1a3395792e12e7055&address=0xe04f27eb70e025b78871a2ad7eabe85e61212761&tag=latest&apikey=YourApiKeyToken
      for (let n = 0; n < TOKEN_CODES.length; n++) {
        const tk = TOKEN_CODES[ n ]

        if (tk === PRIMARY_CURRENCY) {
          url = sprintf('?module=account&action=balance&address=%s&tag=latest', address)
        } else {
          if (this.getTokenStatus(tk)) {
            const tokenInfo = getTokenInfo(tk)
            if (tokenInfo && typeof tokenInfo.contractAddress === 'string') {
              url = sprintf('?module=account&action=tokenbalance&contractaddress=%s&address=%s&tag=latest', tokenInfo.contractAddress, this.walletLocalData.ethereumPublicAddress)
            } else {
              continue
            }
          } else {
            continue
          }
        }

        promiseArray.push(this.checkAddressFetch(tk, url))
      }

      promiseArray.push(this.checkTransactionsFetch())
      // promiseArray.push(this.checkUnconfirmedTransactionsFetch())

      try {
        const results = await Promise.all(promiseArray)
        io.console.info(results)
        await snooze(ADDRESS_POLL_MILLISECONDS)
      } catch (e) {
        io.console.error('Error fetching address transactions: ' + address)
        try {
          await snooze(ADDRESS_POLL_MILLISECONDS)
        } catch (e) {

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

  sortTxByDate (a:ABCTransaction, b:ABCTransaction) {
    return b.date - a.date
  }

  addTransaction (currencyCode:string, abcTransaction:ABCTransaction) {
    // Add or update tx in transactionsObj
    const idx = this.findTransaction(currencyCode, abcTransaction.txid)

    if (idx === -1) {
      io.console.info('addTransaction: adding and sorting:' + abcTransaction.txid)
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
    io.console.info('updateTransaction:' + abcTransaction.txid)
  }

  // *************************************
  // Save the wallet data store
  // *************************************
  async saveWalletLoop () {
    while (this.engineOn) {
      try {
        if (this.walletLocalDataDirty) {
          io.console.info('walletLocalDataDirty. Saving...')
          const walletJson = JSON.stringify(this.walletLocalData)
          await this.walletLocalFolder
            .folder(DATA_STORE_FOLDER)
            .file(DATA_STORE_FILE)
            .setText(walletJson)
          this.walletLocalDataDirty = false
        } else {
          io.console.info('walletLocalData clean')
        }
        await snooze(SAVE_DATASTORE_MILLISECONDS)
      } catch (err) {
        io.console.error(err)
        try {
          await snooze(SAVE_DATASTORE_MILLISECONDS)
        } catch (err) {
          io.console.error(err)
        }
      }
    }
  }

  doInitialCallbacks () {
    this.abcTxLibCallbacks.onBlockHeightChanged(
      this.walletLocalData.blockHeight
    )

    for (let currencyCode of TOKEN_CODES) {
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
        io.console.info(err)
        io.console.info('No walletLocalData setup yet: Failure is ok')
        this.walletLocalData = new WalletLocalData(null)
        this.walletLocalData.ethereumPublicAddress = this.keyInfo.keys.ethereumPublicAddress
        await this.walletLocalFolder
          .folder(DATA_STORE_FOLDER)
          .file(DATA_STORE_FILE)
          .setText(JSON.stringify(this.walletLocalData))
        this.engineLoop()
      } catch (e) {
        io.console.error('Error writing to localDataStore. Engine not started:' + err)
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
  getBlockHeight ():string {
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
  getTokenStatus (token:string) {
    return this.walletLocalData.enabledTokens.indexOf(token) !== -1
  }

  // synchronous
  getBalance (options:any) {
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
      return (new Error('Error: invalid ABCSpendInfo'))
    }

    // Ethereum can only have one output
    if (abcSpendInfo.spendTargets.length !== 1) {
      return (new Error('Error: only one output allowed'))
    }

    let tokenInfo = {}
    tokenInfo.contractAddress = ''

    if (typeof abcSpendInfo.currencyCode === 'string') {
      if (!this.getTokenStatus(abcSpendInfo.currencyCode)) {
        throw (new Error('Error: Token not supported or enabled'))
      } else {
        tokenInfo = getTokenInfo(abcSpendInfo.currencyCode)
        if (!tokenInfo || typeof tokenInfo.contractAddress !== 'string') {
          throw (new Error('Error: Token not supported or invalid contract address'))
        }
      }
    } else {
      abcSpendInfo.currencyCode = 'ETH'
    }
    const currencyCode = abcSpendInfo.currencyCode

    // ******************************
    // Get the fee amount

    let ethParams = {}
    let gasLimit
    let gasPrice
    if (currencyCode === PRIMARY_CURRENCY) {
      gasLimit = '40000'
      gasPrice = '40000000000' // 40 Gwei

      ethParams = new EthereumParams(
        [this.walletLocalData.ethereumPublicAddress],
        [abcSpendInfo.spendTargets[0].publicAddress],
        gasLimit,
        gasPrice,
        '0',
        '0',
        '0',
        0,
        null
      )
    } else {
      gasLimit = '60000'
      gasPrice = '40000000000' // 40 Gwei

      ethParams = new EthereumParams(
        [this.walletLocalData.ethereumPublicAddress],
        [tokenInfo.contractAddress],
        gasLimit,
        gasPrice,
        '0',
        '0',
        '0',
        0,
        abcSpendInfo.spendTargets[0].publicAddress
      )
    }

    // Use nativeAmount if available. Otherwise convert from amountSatoshi
    let nativeAmount = '0'
    if (typeof abcSpendInfo.spendTargets[0].nativeAmount === 'string') {
      nativeAmount = abcSpendInfo.spendTargets[0].nativeAmount
    } else if (typeof abcSpendInfo.spendTargets[0].amountSatoshi === 'number') {
      nativeAmount = satoshiToNative(abcSpendInfo.spendTargets[0].amountSatoshi)
    } else {
      throw (new Error('Error: no amount specified'))
    }

    const InsufficientFundsError = new Error('Insufficient funds')
    InsufficientFundsError.name = 'InsufficientFundsError'

    // Check for insufficient funds
    // let nativeAmountBN = new BN(nativeAmount, 10)
    // const gasPriceBN = new BN(gasPrice, 10)
    // const gasLimitBN = new BN(gasLimit, 10)
    // const nativeNetworkFeeBN = gasPriceBN.mul(gasLimitBN)
    // const balanceEthBN = new BN(this.walletLocalData.totalBalances.ETH, 10)

    const balanceEth = this.walletLocalData.totalBalances.ETH
    const nativeNetworkFee = bns.mul(gasPrice, gasLimit)

    if (currencyCode === PRIMARY_CURRENCY) {
      const totalTxAmount = bns.add(nativeNetworkFee, nativeAmount)
      if (bns.gt(totalTxAmount, balanceEth)) {
        throw (InsufficientFundsError)
      }
    } else {
      if (bns.gt(nativeNetworkFee, balanceEth)) {
        throw (InsufficientFundsError)
      } else {
        const balanceToken = this.walletLocalData.totalBalances[currencyCode]
        if (bns.gt(nativeAmount, balanceToken)) {
          throw (InsufficientFundsError)
        }
      }
    }

    // const negativeOneBN = new BN('-1', 10)
    // nativeAmountBN.imul(negativeOneBN)
    // nativeAmount = nativeAmountBN.toString(10)
    nativeAmount = bns.mul(nativeAmount, '-1')

    // **********************************
    // Create the unsigned ABCTransaction

    const abcTransaction = new ABCTransaction(
      '', // txid
      0, // date
      currencyCode, // currencyCode
      '0', // blockHeightNative
      nativeAmount, // nativeAmount
      '0', // networkFee
      [], // ourReceiveAddresses
      '0', // signedTx
      ethParams // otherParams
    )

    return abcTransaction
  }

  // asynchronous
  async signTx (abcTransaction:ABCTransaction) {
    // Do signing

    const gasLimitHex = toHex(abcTransaction.otherParams.gas)
    const gasPriceHex = toHex(abcTransaction.otherParams.gasPrice)
    let nativeAmountHex = bns.mul('-1', abcTransaction.nativeAmount, 16)

    // const nonceBN = new BN(this.walletLocalData.nextNonce.toString(10), 10)
    // const nonceHex = '0x' + nonceBN.toString(16)
    //
    const nonceHex = toHex(this.walletLocalData.nextNonce)
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

    io.console.info(wallet.getAddressString())

    const tx = new EthereumTx(txParams)
    tx.sign(privKey)

    abcTransaction.signedTx = bufToHex(tx.serialize())
    abcTransaction.txid = bufToHex(tx.hash())
    abcTransaction.date = Date.now() / 1000

    return abcTransaction
  }

  // asynchronous
  async broadcastTx (abcTransaction:ABCTransaction) {
    try {
      const url = sprintf('?module=proxy&action=eth_sendRawTransaction&hex=%s', abcTransaction.signedTx)
      const jsonObj = await this.fetchGetEtherscan(url)

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
      io.console.info('Sent transaction to network. Response:')
      io.console.info(jsonObj)

      if (typeof jsonObj.error !== 'undefined') {
        io.console.warn('Error sending transaction')
        if (jsonObj.error.message.includes('nonce is too low')) {
          this.walletLocalData.nextNonce = bns.add(this.walletLocalData.nextNonce, '1')
          io.console.warn('Nonce too low. Incrementing to ' + this.walletLocalData.nextNonce.toString())
          // Nonce error. Increment nonce and try again
          const abcTx = await this.signTx(abcTransaction)
          return await this.broadcastTx(abcTx)
        } else {
          throw (jsonObj.error)
        }
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

export { EthereumEngine }
