/**
 * Created by paul on 7/7/17.
 */
// @flow

import { txLibInfo } from './currencyInfoETH.js'
import type {
  AbcCurrencyEngine,
  AbcTransaction,
  AbcCurrencyPluginCallbacks,
  AbcMakeEngineOptions,
  AbcSpendInfo,
  AbcWalletInfo,
  AbcFreshAddress
} from 'airbitz-core-types'
import { calcMiningFee } from './miningFees.js'
import { sprintf } from 'sprintf-js'
import { bns } from 'biggystring'
import { NetworkFeesSchema } from './ethSchema.js'
import { DATA_STORE_FILE, DATA_STORE_FOLDER, WalletLocalData } from './ethTypes.js'
import { snooze, normalizeAddress, addHexPrefix, toDecimal, hexToBuf, bufToHex, validateObject, toHex } from './ethUtils.js'

const Buffer = require('buffer/').Buffer
const abi = require('../lib/export-fixes-bundle.js').ABI
const ethWallet = require('../lib/export-fixes-bundle.js').Wallet
const EthereumTx = require('../lib/export-fixes-bundle.js').Transaction

const ADDRESS_POLL_MILLISECONDS = 3000
const BLOCKHEIGHT_POLL_MILLISECONDS = 5000
const NETWORKFEES_POLL_MILLISECONDS = (60 * 10 * 1000) // 10 minutes
const SAVE_DATASTORE_MILLISECONDS = 10000
// const ADDRESS_QUERY_LOOKBACK_BLOCKS = '8' // ~ 2 minutes
const ADDRESS_QUERY_LOOKBACK_BLOCKS = (4 * 60 * 24 * 7) // ~ one week
const ETHERSCAN_API_KEY = ''

const PRIMARY_CURRENCY = txLibInfo.currencyInfo.currencyCode
const TOKEN_CODES = [PRIMARY_CURRENCY].concat(txLibInfo.supportedTokens)
const CHECK_UNCONFIRMED = true
const INFO_SERVERS = ['https://info1.edgesecure.co:8444']

let io

function getTokenInfo (token:string) {
  return txLibInfo.currencyInfo.metaTokens.find(element => {
    return element.currencyCode === token
  })
}

function unpadAddress (address: string): string {
  const unpadded = bns.add('0', address, 16)
  return unpadded
}

function padAddress (address: string): string {
  const normalizedAddress = normalizeAddress(address)
  const padding = 64 - normalizedAddress.length
  const zeroString = '0000000000000000000000000000000000000000000000000000000000000000'
  const out = '0x' + zeroString.slice(0, padding) + normalizedAddress
  return out
}

class EthereumParams {
  from:Array<string>
  to: Array<string>
  gas: string
  gasPrice: string
  gasUsed: string
  cumulativeGasUsed: string
  errorVal: number
  tokenRecipientAddress:string|null

  constructor (from:Array<string>,
               to:Array<string>,
               gas:string,
               gasPrice:string,
               gasUsed:string,
               cumulativeGasUsed:string,
               errorVal: number,
               tokenRecipientAddress:string|null) {
    this.from = from
    this.to = to
    this.gas = gas
    this.gasPrice = gasPrice
    this.gasUsed = gasUsed
    this.errorVal = errorVal
    this.cumulativeGasUsed = cumulativeGasUsed
    if (typeof tokenRecipientAddress === 'string') {
      this.tokenRecipientAddress = tokenRecipientAddress
    } else {
      this.tokenRecipientAddress = null
    }
  }
}

class EthereumEngine implements AbcCurrencyEngine {
  walletInfo:AbcWalletInfo
  abcTxLibCallbacks:AbcCurrencyPluginCallbacks
  walletLocalFolder:any
  engineOn:boolean
  addressesChecked: boolean
  tokenCheckStatus: { [currencyCode: string]: number } // Each currency code can be a 0-1 value
  walletLocalData:WalletLocalData
  walletLocalDataDirty:boolean
  transactionsChangedArray:Array<AbcTransaction>
  currentSettings:any

  constructor (io_:any, walletInfo:AbcWalletInfo, opts:AbcMakeEngineOptions) {
    const { walletLocalFolder, callbacks } = opts

    io = io_
    this.engineOn = false
    this.addressesChecked = false
    this.tokenCheckStatus = {}
    this.walletLocalDataDirty = false
    this.transactionsChangedArray = []
    this.walletInfo = walletInfo

    if (typeof opts.optionalSettings !== 'undefined') {
      this.currentSettings = opts.optionalSettings
    } else {
      this.currentSettings = txLibInfo.currencyInfo.defaultSettings
    }

    // Hard coded for testing
    // this.walletInfo.keys.ethereumKey = '389b07b3466eed587d6bdae09a3613611de9add2635432d6cd1521af7bbc3757'
    // this.walletInfo.keys.ethereumAddress = '0x9fa817e5A48DD1adcA7BEc59aa6E3B1F5C4BeA9a'
    this.abcTxLibCallbacks = callbacks
    this.walletLocalFolder = walletLocalFolder

    // Fix messed-up wallets that have a private key in the wrong place:
    if (typeof this.walletInfo.keys.ethereumKey !== 'string') {
      if (walletInfo.keys.keys && walletInfo.keys.keys.ethereumKey) {
        this.walletInfo.keys.ethereumKey = walletInfo.keys.keys.ethereumKey
      }
    }

    // Fix messed-up wallets that have a public address in the wrong place:
    if (typeof this.walletInfo.keys.ethereumAddress !== 'string') {
      if (walletInfo.keys.ethereumPublicAddress) {
        this.walletInfo.keys.ethereumAddress = walletInfo.keys.ethereumPublicAddress
      } else if (walletInfo.keys.keys && walletInfo.keys.keys.ethereumPublicAddress) {
        this.walletInfo.keys.ethereumAddress = walletInfo.keys.keys.ethereumPublicAddress
      } else {
        const privKey = hexToBuf(this.walletInfo.keys.ethereumKey)
        const wallet = ethWallet.fromPrivateKey(privKey)
        this.walletInfo.keys.ethereumAddress = wallet.getAddressString()
      }
    }
  }

  // *************************************
  // Private methods
  // *************************************
  async fetchGetEtherscan (cmd:string) {
    let apiKey = ''
    if (ETHERSCAN_API_KEY.length > 5) {
      apiKey = '&apikey=' + ETHERSCAN_API_KEY
    }
    const url = sprintf('%s/api%s%s', this.currentSettings.otherSettings.etherscanApiServers[0], cmd, apiKey)
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
    const url = sprintf('%s/api%s%s', this.currentSettings.otherSettings.etherscanApiServers[0], cmd, apiKey)
    const response = await io.fetch(url, {
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
          const hexBlockHeight:string = jsonObj.result.slice(2)
          const blockHeight:number = parseInt(toDecimal(hexBlockHeight))
          if (this.walletLocalData.blockHeight !== blockHeight) {
            this.walletLocalData.blockHeight = blockHeight // Convert to decimal
            this.walletLocalDataDirty = true
            io.console.info(
              'Block height changed: ' + this.walletLocalData.blockHeight.toString()
            )
            this.abcTxLibCallbacks.onBlockHeightChanged(this.walletLocalData.blockHeight)
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

    const nativeNetworkFee:string = bns.mul(tx.gasPrice, tx.gasUsed)

    if (tx.from.toLowerCase() === this.walletLocalData.ethereumAddress.toLowerCase()) {
      netNativeAmount = bns.sub('0', tx.value)

      // For spends, include the network fee in the transaction amount
      netNativeAmount = bns.sub(netNativeAmount, nativeNetworkFee)

      if (bns.gte(tx.nonce, this.walletLocalData.nextNonce)) {
        this.walletLocalData.nextNonce = bns.add(tx.nonce, '1')
      }
    } else {
      netNativeAmount = bns.add('0', tx.value)
      ourReceiveAddresses.push(this.walletLocalData.ethereumAddress.toLowerCase())
    }

    const ethParams = new EthereumParams(
      [ tx.from ],
      [ tx.to ],
      tx.gas,
      tx.gasPrice,
      tx.gasUsed,
      tx.cumulativeGasUsed,
      parseInt(tx.isError),
      null
    )

    let abcTransaction:AbcTransaction = {
      txid: tx.hash,
      date: parseInt(tx.timeStamp),
      currencyCode: 'ETH',
      blockHeight: parseInt(tx.blockNumber),
      nativeAmount: netNativeAmount,
      networkFee: nativeNetworkFee,
      ourReceiveAddresses,
      signedTx: 'unsigned_right_now',
      otherParams: ethParams
    }

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
        // io.console.info(sprintf('Old transaction. No Update: %s', tx.hash))
      }
    }
  }

  processEtherscanTokenTransaction (tx:any, currencyCode: string) {
    let netNativeAmount:string // Amount received into wallet
    let ourReceiveAddresses:Array<string> = []

    // const nativeValueBN = new BN(tx.value, 10)
    const paddedAddress = padAddress(this.walletLocalData.ethereumAddress)
    let fromAddress
    let toAddress

    if (tx.topics[1] === paddedAddress) {
      netNativeAmount = bns.sub('0', tx.data)
      fromAddress = this.walletLocalData.ethereumAddress
      toAddress = unpadAddress(tx.topics[2])
    } else {
      fromAddress = unpadAddress(tx.topics[1])
      toAddress = this.walletLocalData.ethereumAddress
      netNativeAmount = bns.add('0', tx.data)
      ourReceiveAddresses.push(this.walletLocalData.ethereumAddress.toLowerCase())
    }
    // const nativeNetworkFee:string = bns.mul(tx.gasPrice, tx.gasUsed)

    const ethParams = new EthereumParams(
      [ fromAddress ],
      [ toAddress ],
      '',
      tx.gasPrice,
      tx.gasUsed,
      '',
      0,
      null
    )

    let abcTransaction:AbcTransaction = {
      txid: tx.transactionHash,
      date: parseInt(tx.timeStamp),
      currencyCode,
      blockHeight: parseInt(bns.add('0', tx.blockNumber)),
      nativeAmount: netNativeAmount,
      networkFee: '0',
      ourReceiveAddresses,
      signedTx: 'unsigned_right_now',
      otherParams: ethParams
    }

    const idx = this.findTransaction(currencyCode, tx.transactionHash)
    if (idx === -1) {
      // console.log(sprintf('New token transaction: %s', tx.transactionHash))

      // New transaction not in database
      this.addTransaction(currencyCode, abcTransaction)

      this.abcTxLibCallbacks.onTransactionsChanged(
        this.transactionsChangedArray
      )
      this.transactionsChangedArray = []
    } else {
      // Already have this tx in the database. See if anything changed
      const transactionsArray = this.walletLocalData.transactionsObj[ currencyCode ]
      const abcTx = transactionsArray[ idx ]

      if (
        abcTx.blockHeight !== abcTransaction.blockHeight ||
        abcTx.networkFee !== abcTransaction.networkFee ||
        abcTx.nativeAmount !== abcTransaction.nativeAmount ||
        abcTx.otherParams.errorVal !== abcTransaction.otherParams.errorVal
      ) {
        // console.log(sprintf('Update token transaction: %s height:%s', abcTx.txid, abcTx.blockHeight))
        this.updateTransaction(currencyCode, abcTransaction, idx)
        this.abcTxLibCallbacks.onTransactionsChanged(
          this.transactionsChangedArray
        )
        this.transactionsChangedArray = []
      } else {
        // console.log(sprintf('Old transaction. No Update: %s', abcTx.txid))
      }
    }
  }

  processUnconfirmedTransaction (tx:any) {
    const fromAddress = '0x' + tx.inputs[0].addresses[0]
    const toAddress = '0x' + tx.outputs[0].addresses[0]
    const epochTime = Date.parse(tx.received) / 1000
    let ourReceiveAddresses:Array<string> = []

    let nativeAmount: string
    if (normalizeAddress(fromAddress) === normalizeAddress(this.walletLocalData.ethereumAddress)) {
      nativeAmount = (0 - tx.total).toString(10)
      nativeAmount = bns.sub(nativeAmount, tx.fees.toString(10))
    } else {
      nativeAmount = tx.total.toString(10)
      ourReceiveAddresses.push(this.walletLocalData.ethereumAddress)
    }

    const ethParams = new EthereumParams(
      [ fromAddress ],
      [ toAddress ],
      '',
      '',
      tx.fees.toString(10),
      '',
      0,
      null
    )

    let abcTransaction:AbcTransaction = {
      txid: addHexPrefix(tx.hash),
      date: epochTime,
      currencyCode: 'ETH',
      blockHeight: tx.block_height,
      nativeAmount,
      networkFee: tx.fees.toString(10),
      ourReceiveAddresses,
      signedTx: 'iwassignedyoucantrustme',
      otherParams: ethParams
    }

    const idx = this.findTransaction(PRIMARY_CURRENCY, tx.hash)
    if (idx === -1) {
      io.console.info(sprintf('processUnconfirmedTransaction: New transaction: %s', tx.hash))

      // New transaction not in database
      this.addTransaction(PRIMARY_CURRENCY, abcTransaction)

      this.abcTxLibCallbacks.onTransactionsChanged(
        this.transactionsChangedArray
      )
      this.transactionsChangedArray = []
    } else {
      // Already have this tx in the database. See if anything changed
      const transactionsArray:Array<AbcTransaction> = this.walletLocalData.transactionsObj[ PRIMARY_CURRENCY ]
      const abcTx:AbcTransaction = transactionsArray[ idx ]

      if (abcTx.blockHeight < tx.block_height || abcTx.date > epochTime) {
        io.console.info(sprintf('processUnconfirmedTransaction: Update transaction: %s height:%s', tx.hash, tx.blockNumber))
        this.updateTransaction(PRIMARY_CURRENCY, abcTransaction, idx)
        this.abcTxLibCallbacks.onTransactionsChanged(
          this.transactionsChangedArray
        )
        this.transactionsChangedArray = []
      } else {
        io.console.info(sprintf('processUnconfirmedTransaction: Old transaction. No Update: %s', tx.hash))
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
        // io.console.info(tk + ': token Address balance: ' + balance)

        if (typeof this.walletLocalData.totalBalances[tk] === 'undefined') {
          this.walletLocalData.totalBalances[tk] = '0'
        }
        if (!bns.eq(balance, this.walletLocalData.totalBalances[tk])) {
          this.walletLocalData.totalBalances[tk] = balance

          this.abcTxLibCallbacks.onBalanceChanged(tk, balance)
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
    const address = this.walletLocalData.ethereumAddress
    const endBlock:number = 999999999
    let startBlock:number = 0
    let checkAddressSuccess = true
    let url = ''
    let jsonObj = {}
    let valid = false
    if (this.walletLocalData.lastAddressQueryHeight > ADDRESS_QUERY_LOOKBACK_BLOCKS) {
      // Only query for transactions as far back as ADDRESS_QUERY_LOOKBACK_BLOCKS from the last time we queried transactions
      startBlock = this.walletLocalData.lastAddressQueryHeight - ADDRESS_QUERY_LOOKBACK_BLOCKS
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
        // io.console.info('Fetched transactions count: ' + transactions.length)

        // Get transactions
        // Iterate over transactions in address
        for (let i = 0; i < transactions.length; i++) {
          const tx = transactions[i]
          this.processEtherscanTransaction(tx)
          this.tokenCheckStatus[ PRIMARY_CURRENCY ] = ((i + 1) / transactions.length)
          if (i % 10 === 0) {
            this.updateOnAddressesChecked()
          }
        }
        if (transactions.length === 0) {
          this.tokenCheckStatus[ PRIMARY_CURRENCY ] = 1
        }
        this.updateOnAddressesChecked()
      } else {
        checkAddressSuccess = false
      }
    } catch (e) {
      io.console.error(e)
      checkAddressSuccess = false
    }
    return checkAddressSuccess
  }

  updateOnAddressesChecked () {
    if (this.addressesChecked) {
      return
    }
    const numTokens = this.walletLocalData.enabledTokens.length
    const perTokenSlice = 1 / numTokens
    let numCompleteStatus = 0
    let totalStatus = 0
    for (const token of this.walletLocalData.enabledTokens) {
      const status = this.tokenCheckStatus[token]
      totalStatus += status * perTokenSlice
      if (status === 1) {
        numCompleteStatus++
      }
    }
    if (numCompleteStatus === this.walletLocalData.enabledTokens.length) {
      this.addressesChecked = true
      // console.log('onAddressesChecked: 1')
      this.abcTxLibCallbacks.onAddressesChecked(1)
      this.walletLocalData.lastAddressQueryHeight = this.walletLocalData.blockHeight
    } else {
      // console.log('onAddressesChecked: ' + totalStatus.toString())
      this.abcTxLibCallbacks.onAddressesChecked(totalStatus)
    }
  }

  async checkTokenTransactionsFetch (currencyCode: string) {
    const address = padAddress(this.walletLocalData.ethereumAddress)
    let startBlock:number = 0
    let checkAddressSuccess = true
    let url = ''
    let jsonObj = {}
    let valid = false
    if (this.walletLocalData.lastAddressQueryHeight > ADDRESS_QUERY_LOOKBACK_BLOCKS) {
      // Only query for transactions as far back as ADDRESS_QUERY_LOOKBACK_BLOCKS from the last time we queried transactions
      startBlock = this.walletLocalData.lastAddressQueryHeight - ADDRESS_QUERY_LOOKBACK_BLOCKS
    }

    const tokenInfo = getTokenInfo(currencyCode)
    let contractAddress = ''
    if (tokenInfo && typeof tokenInfo.contractAddress === 'string') {
      contractAddress = tokenInfo.contractAddress
    } else {
      return
    }

    try {
      url = sprintf('?module=logs&action=getLogs&fromBlock=%d&toBlock=latest&address=%s&topic0=0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef&topic0_1_opr=and&topic1=%s&topic1_2_opr=or&topic2=%s&apikey=YourApiKeyToken',
        startBlock, contractAddress, address, address)
      jsonObj = await this.fetchGetEtherscan(url)
      valid = validateObject(jsonObj, {
        'type': 'object',
        'properties': {
          'result': {
            'type': 'array',
            'items': {
              'type': 'object',
              'properties': {
                'data': {'type': 'string'},
                'blockNumber': {'type': 'string'},
                'timeStamp': {'type': 'string'},
                'transactionHash': {'type': 'string'},
                'gasPrice': {'type': 'string'},
                'gasUsed': {'type': 'string'},
                'topics': {
                  'type': 'array',
                  'items': { 'type': 'string' }
                }
              },
              'required': [
                'data',
                'blockNumber',
                'timeStamp',
                'transactionHash',
                'gasPrice',
                'gasUsed',
                'topics'
              ]
            }
          }
        },
        'required': ['result']
      })

      if (valid) {
        const transactions = jsonObj.result
        // console.log('Fetched transactions count: ' + transactions.length)

        // Get transactions
        // Iterate over transactions in address
        for (let i = 0; i < transactions.length; i++) {
          const tx = transactions[i]
          this.processEtherscanTokenTransaction(tx, currencyCode)
          this.tokenCheckStatus[currencyCode] = ((i + 1) / transactions.length)
          if (i % 10 === 0) {
            this.updateOnAddressesChecked()
          }
        }
        if (transactions.length === 0) {
          this.tokenCheckStatus[currencyCode] = 1
        }
        this.updateOnAddressesChecked()
      } else {
        checkAddressSuccess = false
      }
    } catch (e) {
      io.console.error(e)
      checkAddressSuccess = false
    }
    return checkAddressSuccess
  }

  async checkUnconfirmedTransactionsFetch () {
    const address = normalizeAddress(this.walletLocalData.ethereumAddress)
    const url = sprintf('%s/v1/eth/main/txs/%s', this.currentSettings.otherSettings.superethServers[0], address)
    let jsonObj = null
    try {
      jsonObj = await this.fetchGet(url)
    } catch (e) {
      console.log(e)
      console.log('Failed to fetch unconfirmed transactions')
      return
    }

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
          normalizeAddress(tx.inputs[0].addresses[0]) === address ||
          normalizeAddress(tx.outputs[0].addresses[0]) === address
        ) {
          this.processUnconfirmedTransaction(tx)
        }
      }
    } else {
      console.log('Invalid data for unconfirmed transactions')
    }
  }

  // **********************************************
  // Check all addresses for new transactions
  // **********************************************
  async checkAddressesInnerLoop () {
    while (this.engineOn) {
      // Ethereum only has one address
      const address = this.walletLocalData.ethereumAddress
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
              url = sprintf('?module=account&action=tokenbalance&contractaddress=%s&address=%s&tag=latest', tokenInfo.contractAddress, this.walletLocalData.ethereumAddress)
              promiseArray.push(this.checkTokenTransactionsFetch(tk))
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
      if (CHECK_UNCONFIRMED) {
        promiseArray.push(this.checkUnconfirmedTransactionsFetch())
      }

      try {
        /* const results = */ await Promise.all(promiseArray)
        // io.console.info(results)
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
      return normalizeAddress(element.txid) === normalizeAddress(txid)
    })
  }

  sortTxByDate (a:AbcTransaction, b:AbcTransaction) {
    return b.date - a.date
  }

  addTransaction (currencyCode:string, abcTransaction:AbcTransaction) {
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

  updateTransaction (currencyCode:string, abcTransaction:AbcTransaction, idx:number) {
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
          // io.console.info('walletLocalData clean')
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

  async checkUpdateNetworkFees () {
    while (this.engineOn) {
      try {
        const url = sprintf('%s/v1/networkFees/ETH', INFO_SERVERS[0])
        const jsonObj = await this.fetchGet(url)
        const valid = validateObject(jsonObj, NetworkFeesSchema)

        if (valid) {
          io.console.info('Fetched valid networkFees')
          io.console.info(jsonObj)
          this.walletLocalData.networkFees = jsonObj
        } else {
          io.console.info('Error: Fetched invalid networkFees')
        }
      } catch (err) {
        io.console.info('Error fetching networkFees:')
        io.console.info(err)
      }
      try {
        await snooze(NETWORKFEES_POLL_MILLISECONDS)
      } catch (err) {
        io.console.error(err)
      }
    }
  }

  doInitialCallbacks () {
    this.abcTxLibCallbacks.onBlockHeightChanged(
      parseInt(this.walletLocalData.blockHeight)
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

  updateSettings (settings:any) {
    this.currentSettings = settings
  }

  async startEngine () {
    this.engineOn = true
    try {
      this.doInitialCallbacks()
    } catch (err) {
      io.console.error(err)
    }
    try {
      this.blockHeightInnerLoop()
    } catch (err) {
      io.console.error(err)
    }
    try {
      this.checkAddressesInnerLoop()
    } catch (err) {
      io.console.error(err)
    }
    try {
      this.checkUpdateNetworkFees()
    } catch (err) {
      io.console.error(err)
    }
    try {
      this.saveWalletLoop()
    } catch (err) {
      io.console.error(err)
    }
  }

  async killEngine () {
    // disconnect network connections
    this.engineOn = false
  }

  // synchronous
  getBlockHeight ():number {
    return parseInt(this.walletLocalData.blockHeight)
  }

  // asynchronous
  async enableTokens (tokens:Array<string>) {
    for (const token of tokens) {
      if (this.walletLocalData.enabledTokens.indexOf(token) === -1) {
        this.walletLocalData.enabledTokens.push(token)
      }
    }
  }

  // synchronous
  getTokenStatus (token:string) {
    return this.walletLocalData.enabledTokens.indexOf(token) !== -1
  }

  // synchronous
  getBalance (options:any):string {
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
  getNumTransactions (options:any):number {
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
  getFreshAddress (options:any): AbcFreshAddress {
    return { publicAddress: this.walletLocalData.ethereumAddress }
  }

  // synchronous
  addGapLimitAddresses (addresses:Array<string>, options:any) {
  }

  // synchronous
  isAddressUsed (address:string, options:any) {
    return false
  }

  // synchronous
  async makeSpend (abcSpendInfo:AbcSpendInfo) {
    // Validate the spendInfo
    const valid = validateObject(abcSpendInfo, {
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

    // Ethereum can only have one output
    if (abcSpendInfo.spendTargets.length !== 1) {
      throw (new Error('Error: only one output allowed'))
    }

    let tokenInfo = {}
    tokenInfo.contractAddress = ''

    let currencyCode:string = ''
    if (typeof abcSpendInfo.currencyCode === 'string') {
      currencyCode = abcSpendInfo.currencyCode
      if (!this.getTokenStatus(currencyCode)) {
        throw (new Error('Error: Token not supported or enabled'))
      } else if (currencyCode !== 'ETH') {
        tokenInfo = getTokenInfo(currencyCode)
        if (!tokenInfo || typeof tokenInfo.contractAddress !== 'string') {
          throw (new Error('Error: Token not supported or invalid contract address'))
        }
      }
    } else {
      currencyCode = 'ETH'
    }
    abcSpendInfo.currencyCode = currencyCode

    // ******************************
    // Get the fee amount

    let ethParams = {}
    const { gasLimit, gasPrice } = calcMiningFee(abcSpendInfo, this.walletLocalData.networkFees)

    let publicAddress = ''
    if (typeof abcSpendInfo.spendTargets[0].publicAddress === 'string') {
      publicAddress = abcSpendInfo.spendTargets[0].publicAddress
    } else {
      throw new Error('No valid spendTarget')
    }

    if (currencyCode === PRIMARY_CURRENCY) {
      ethParams = new EthereumParams(
        [this.walletLocalData.ethereumAddress],
        [publicAddress],
        gasLimit,
        gasPrice,
        '0',
        '0',
        0,
        null
      )
    } else {
      let contractAddress = ''
      if (typeof tokenInfo.contractAddress === 'string') {
        contractAddress = tokenInfo.contractAddress
      } else {
        throw new Error('makeSpend: Invalid contract address')
      }
      ethParams = new EthereumParams(
        [this.walletLocalData.ethereumAddress],
        [contractAddress],
        gasLimit,
        gasPrice,
        '0',
        '0',
        0,
        publicAddress
      )
    }

    let nativeAmount = '0'
    if (typeof abcSpendInfo.spendTargets[0].nativeAmount === 'string') {
      nativeAmount = abcSpendInfo.spendTargets[0].nativeAmount
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
      const balanceToken = this.walletLocalData.totalBalances[currencyCode]
      if (bns.gt(nativeAmount, balanceToken)) {
        throw (InsufficientFundsError)
      }
    }

    // const negativeOneBN = new BN('-1', 10)
    // nativeAmountBN.imul(negativeOneBN)
    // nativeAmount = nativeAmountBN.toString(10)
    nativeAmount = bns.mul(nativeAmount, '-1')

    // **********************************
    // Create the unsigned AbcTransaction

    const abcTransaction:AbcTransaction = {
      txid: '', // txid
      date: 0, // date
      currencyCode, // currencyCode
      blockHeight: 0, // blockHeight
      nativeAmount, // nativeAmount
      networkFee: '0', // networkFee
      ourReceiveAddresses: [], // ourReceiveAddresses
      signedTx: '0', // signedTx
      otherParams: ethParams // otherParams
    }

    return abcTransaction
  }

  // asynchronous
  async signTx (abcTransaction:AbcTransaction):Promise<AbcTransaction> {
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

    const privKey = hexToBuf(this.walletInfo.keys.ethereumKey)
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
  async broadcastTx (abcTransaction:AbcTransaction):Promise<AbcTransaction> {
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
      } else {
        throw new Error('Invalid return valid on transaction send')
      }
    } catch (e) {
      throw (e)
    }
    return abcTransaction
  }

  // asynchronous
  async saveTx (abcTransaction:AbcTransaction) {
    this.addTransaction(abcTransaction.currencyCode, abcTransaction)

    this.abcTxLibCallbacks.onTransactionsChanged([abcTransaction])
  }
}

export { EthereumEngine }
