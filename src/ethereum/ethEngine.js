/**
 * Created by paul on 7/7/17.
 */
// @flow

import type {
  EdgeTransaction,
  EdgeSpendInfo,
  EdgeCurrencyEngineOptions,
  EdgeWalletInfo
} from 'edge-core-js'
import { validateObject, normalizeAddress, addHexPrefix } from '../common/utils.js'
import {
  EtherscanGetBlockHeight,
  EtherscanGetTransactions,
  EtherscanGetAccountBalance,
  EtherscanGetTokenTransactions,
  SuperEthGetUnconfirmedTransactions
} from './ethSchema.js'
import { bns } from 'biggystring'

import {
  type EtherscanTransaction,
  type EthereumTxOtherParams,
  type EthereumWalletOtherData
} from './ethTypes.js'
import { EthereumPlugin } from './ethPlugin.js'
import { CurrencyEngine } from '../common/engine.js'
import { currencyInfo } from './ethInfo.js'

const PRIMARY_CURRENCY = currencyInfo.currencyCode
const ACCOUNT_POLL_MILLISECONDS = 20000
const BLOCKCHAIN_POLL_MILLISECONDS = 20000
const TRANSACTION_POLL_MILLISECONDS = 20000
const UNCONFIRMED_TRANSACTION_POLL_MILLISECONDS = 3000
const ADDRESS_QUERY_LOOKBACK_BLOCKS = 4 * 60 * 24 * 7 // ~ one week
const NUM_TRANSACTIONS_TO_QUERY = 50

export class EthereumEngine extends CurrencyEngine {
  ethereumPlugin: EthereumPlugin
  otherData: EthereumWalletOtherData

  constructor (
    currencyPlugin: EthereumPlugin,
    io_: any,
    walletInfo: EdgeWalletInfo,
    opts: EdgeCurrencyEngineOptions
  ) {
    super(currencyPlugin, io_, walletInfo, opts)
    if (typeof this.walletInfo.keys.ethereumKey !== 'string') {
      if (walletInfo.keys.keys && walletInfo.keys.keys.ethereumKey) {
        this.walletInfo.keys.ethereumKey = walletInfo.keys.keys.ethereumKey
      }
    }
    this.currencyPlugin = currencyPlugin
  }

  async fetchGetEtherscan (server: string, cmd: string) {
    let apiKey = ''
    if (global.etherscanApiKey && global.etherscanApiKey.length > 5) {
      apiKey = '&apikey=' + global.etherscanApiKey
    }
    const url = `${server}/api${cmd}${apiKey}`
    return this.fetchGet(url)
  }

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

  async fetchPostBlockcypher (cmd: string, body: any) {
    let apiKey = ''
    if (global.blockcypherApiKey && global.blockcypherApiKey.length > 5) {
      apiKey = '&token=' + global.blockcypherApiKey
    }
    const url = `${this.currentSettings.otherSettings.blockcypherApiServers[0]}/${cmd}${apiKey}`
    const response = await this.io.fetch(url, {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      method: 'POST',
      body: JSON.stringify(body)
    })
    return response.json()
  }

  async checkBlockchainInnerLoop () {
    try {
      const jsonObj = await this.fetchGetEtherscan(
        this.currencyInfo.defaultSettings.otherSettings.etherscanApiServers[0],
        '?module=proxy&action=eth_blockNumber'
      )
      const valid = validateObject(jsonObj, EtherscanGetBlockHeight)
      if (valid) {
        const blockHeight: number = parseInt(jsonObj.result, 16)
        this.log(`Got block height ${blockHeight}`)
        if (this.walletLocalData.blockHeight !== blockHeight) {
          this.walletLocalData.blockHeight = blockHeight // Convert to decimal
          this.walletLocalDataDirty = true
          this.currencyEngineCallbacks.onBlockHeightChanged(
            this.walletLocalData.blockHeight
          )
        }
      }
    } catch (err) {
      this.log('Error fetching height: ' + err)
    }
  }

  async checkAccountFetch (tk: string, url: string) {
    let jsonObj = {}
    let valid = false

    try {
      jsonObj = await this.fetchGetEtherscan(
        this.currencyInfo.defaultSettings.otherSettings.etherscanApiServers[0],
        url)
      valid = validateObject(jsonObj, EtherscanGetAccountBalance)
      if (valid) {
        const balance = jsonObj.result

        if (typeof this.walletLocalData.totalBalances[tk] === 'undefined') {
          this.walletLocalData.totalBalances[tk] = '0'
        }
        if (!bns.eq(balance, this.walletLocalData.totalBalances[tk])) {
          this.walletLocalData.totalBalances[tk] = balance
          this.log(tk + ': token Address balance: ' + balance)
          this.currencyEngineCallbacks.onBalanceChanged(tk, balance)
          this.tokenCheckBalanceStatus[tk] = 1
          this.updateOnAddressesChecked()
        }
      }
    } catch (e) {
      this.log(`Error checking token balance: ${tk}`)
    }
  }

  async checkAccountInnerLoop () {
    const address = this.walletLocalData.publicKey
    try {
      // Ethereum only has one address
      let url = ''
      const promiseArray = []

      // ************************************
      // Fetch token balances
      // ************************************
      // https://api.etherscan.io/api?module=account&action=tokenbalance&contractaddress=0x57d90b64a1a57749b0f932f1a3395792e12e7055&address=0xe04f27eb70e025b78871a2ad7eabe85e61212761&tag=latest&apikey=YourApiKeyToken
      for (const tk of this.walletLocalData.enabledTokens) {
        if (tk === PRIMARY_CURRENCY) {
          url = `?module=account&action=balance&address=${address}&tag=latest`
        } else {
          const tokenInfo = this.getTokenInfo(tk)
          if (tokenInfo && typeof tokenInfo.contractAddress === 'string') {
            url = `?module=account&action=tokenbalance&contractaddress=${tokenInfo.contractAddress}&address=${this.walletLocalData.publicKey}&tag=latest`
          } else {
            continue
          }
        }
        promiseArray.push(this.checkAccountFetch(tk, url))
      }
      await Promise.all(promiseArray)
    } catch (e) {}
  }

  processEtherscanTransaction (tx: EtherscanTransaction, currencyCode: string) {
    let netNativeAmount: string // Amount received into wallet
    const ourReceiveAddresses: Array<string> = []
    let nativeNetworkFee: string

    if (tx.contractAddress) {
      nativeNetworkFee = '0'
    } else {
      nativeNetworkFee = bns.mul(tx.gasPrice, tx.gasUsed)
    }

    if (
      tx.from.toLowerCase() ===
      this.walletLocalData.publicKey.toLowerCase()
    ) {
      if (tx.from.toLowerCase() === tx.to.toLowerCase()) {
        // Spend to self. netNativeAmount is just the fee
        netNativeAmount = bns.mul(nativeNetworkFee, '-1')
      } else {
        netNativeAmount = bns.sub('0', tx.value)

        // For spends, include the network fee in the transaction amount
        netNativeAmount = bns.sub(netNativeAmount, nativeNetworkFee)

        if (bns.gte(tx.nonce, this.walletLocalData.otherData.nextNonce)) {
          this.walletLocalData.otherData.nextNonce = bns.add(tx.nonce, '1')
        }
      }
    } else {
      // Receive transaction
      netNativeAmount = bns.add('0', tx.value)
      ourReceiveAddresses.push(
        this.walletLocalData.publicKey.toLowerCase()
      )
    }

    const otherParams: EthereumTxOtherParams = {
      from: [tx.from],
      to: [tx.to],
      gas: tx.gas,
      gasPrice: tx.gasPrice,
      gasUsed: tx.gasUsed,
      cumulativeGasUsed: tx.cumulativeGasUsed,
      errorVal: parseInt(tx.isError),
      tokenRecipientAddress: null
    }

    const edgeTransaction: EdgeTransaction = {
      txid: tx.hash,
      date: parseInt(tx.timeStamp),
      currencyCode,
      blockHeight: parseInt(tx.blockNumber),
      nativeAmount: netNativeAmount,
      networkFee: nativeNetworkFee,
      ourReceiveAddresses,
      signedTx: 'unsigned_right_now',
      otherParams
    }

    this.addTransaction(currencyCode, edgeTransaction)
  }

  async checkTransactionsFetch (startBlock: number, currencyCode: string): Promise<boolean> {
    const address = this.walletLocalData.publicKey
    let checkAddressSuccess = false
    let page = 1
    let startUrl
    let contractAddress = ''
    let schema

    if (currencyCode !== PRIMARY_CURRENCY) {
      const tokenInfo = this.getTokenInfo(currencyCode)
      if (tokenInfo && typeof tokenInfo.contractAddress === 'string') {
        contractAddress = tokenInfo.contractAddress
        startUrl = `?action=tokentx&contractaddress=${contractAddress}&module=account`
        schema = EtherscanGetTokenTransactions
      } else {
        return false
      }
    } else {
      startUrl = `?action=txlist&module=account`
      schema = EtherscanGetTransactions
    }

    try {
      while (1) {
        const url = `${startUrl}&address=${address}&startblock=${startBlock}&endblock=999999999&sort=asc&page=${page}&offset=${NUM_TRANSACTIONS_TO_QUERY}`
        const jsonObj = await this.fetchGetEtherscan(
          this.currencyInfo.defaultSettings.otherSettings.etherscanApiServers[0],
          url
        )
        const valid = validateObject(jsonObj, schema)
        if (valid) {
          const transactions = jsonObj.result
          for (let i = 0; i < transactions.length; i++) {
            const tx = transactions[i]
            this.processEtherscanTransaction(tx, currencyCode)
          }
          if (transactions.length < NUM_TRANSACTIONS_TO_QUERY) {
            checkAddressSuccess = true
            break
          }
          page++
        } else {
          break
        }
      }
    } catch (e) {
      this.log(`Error checkTransactionsFetch ETH: ${this.walletLocalData.publicKey}`, e)
    }

    if (checkAddressSuccess) {
      this.tokenCheckTransactionsStatus[currencyCode] = 1
      this.updateOnAddressesChecked()
      return true
    } else {
      return false
    }
  }

  processUnconfirmedTransaction (tx: Object) {
    const fromAddress = '0x' + tx.inputs[0].addresses[0]
    const toAddress = '0x' + tx.outputs[0].addresses[0]
    const epochTime = Date.parse(tx.received) / 1000
    const ourReceiveAddresses: Array<string> = []

    let nativeAmount: string
    if (
      normalizeAddress(fromAddress) ===
      normalizeAddress(this.walletLocalData.publicKey)
    ) {
      if (fromAddress === toAddress) {
        // Spend to self
        nativeAmount = bns.sub('0', tx.fees.toString(10))
      } else {
        nativeAmount = (0 - tx.total).toString(10)
        nativeAmount = bns.sub(nativeAmount, tx.fees.toString(10))
      }
    } else {
      nativeAmount = tx.total.toString(10)
      ourReceiveAddresses.push(this.walletLocalData.publicKey)
    }

    const otherParams: EthereumTxOtherParams = {
      from: [fromAddress],
      to: [toAddress],
      gas: '',
      gasPrice: '',
      gasUsed: tx.fees.toString(10),
      cumulativeGasUsed: '',
      errorVal: 0,
      tokenRecipientAddress: null
    }

    const edgeTransaction: EdgeTransaction = {
      txid: addHexPrefix(tx.hash),
      date: epochTime,
      currencyCode: 'ETH',
      blockHeight: tx.block_height,
      nativeAmount,
      networkFee: tx.fees.toString(10),
      ourReceiveAddresses,
      signedTx: 'iwassignedyoucantrustme',
      otherParams
    }
    this.addTransaction('ETH', edgeTransaction)
  }

  async checkUnconfirmedTransactionsInnerLoop () {
    const address = normalizeAddress(this.walletLocalData.publicKey)
    const url = `${this.currencyInfo.defaultSettings.otherSettings.superethServers[0]}/v1/eth/main/txs/${address}`
    let jsonObj = null
    try {
      jsonObj = await this.fetchGet(url)
    } catch (e) {
      this.log(e)
      this.log('Failed to fetch unconfirmed transactions')
      return
    }

    const valid = validateObject(jsonObj, SuperEthGetUnconfirmedTransactions)
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
      this.log('Invalid data for unconfirmed transactions')
    }
  }

  async checkTransactionsInnerLoop () {
    const blockHeight = this.walletLocalData.blockHeight
    let startBlock: number = 0
    const promiseArray = []

    if (
      this.walletLocalData.lastAddressQueryHeight >
      ADDRESS_QUERY_LOOKBACK_BLOCKS
    ) {
      // Only query for transactions as far back as ADDRESS_QUERY_LOOKBACK_BLOCKS from the last time we queried transactions
      startBlock =
        this.walletLocalData.lastAddressQueryHeight -
        ADDRESS_QUERY_LOOKBACK_BLOCKS
    }

    for (const currencyCode of this.walletLocalData.enabledTokens) {
      promiseArray.push(this.checkTransactionsFetch(startBlock, currencyCode))
    }

    const resultArray = await Promise.all(promiseArray)
    let successCount = 0
    for (const r of resultArray) {
      if (r) successCount++
    }
    if (successCount === promiseArray.length) {
      this.walletLocalData.lastAddressQueryHeight = blockHeight
    }
  }

  async clearBlockchainCache () {
    await super.clearBlockchainCache()
    this.otherData.nextNonce = '0'
  }

  // ****************************************************************************
  // Public methods
  // ****************************************************************************

  async startEngine () {
    this.engineOn = true
    this.addToLoop('checkBlockchainInnerLoop', BLOCKCHAIN_POLL_MILLISECONDS)
    this.addToLoop('checkAccountInnerLoop', ACCOUNT_POLL_MILLISECONDS)
    this.addToLoop('checkTransactionsInnerLoop', TRANSACTION_POLL_MILLISECONDS)
    this.addToLoop('checkUnconfirmedTransactionsInnerLoop', UNCONFIRMED_TRANSACTION_POLL_MILLISECONDS)
    super.startEngine()
  }

  async killEngine () {
    // Set status flag to false
    this.engineOn = false
    // Clear Inner loops timers
    for (const timer in this.timers) {
      clearTimeout(this.timers[timer])
    }
    this.timers = {}
    this.log('killEngine')
    // this.leavePool()
  }

  async resyncBlockchain (): Promise<void> {
    await this.killEngine()
    await this.clearBlockchainCache()
    await this.startEngine()
  }

  // synchronous
  async makeSpend (edgeSpendInfo: EdgeSpendInfo) {
    const edgeTransaction: EdgeTransaction = {
      txid: '', // txid
      date: 0, // date
      currencyCode: '', // currencyCode
      blockHeight: 0, // blockHeight
      nativeAmount: '', // nativeAmount
      networkFee: '', // networkFee
      ourReceiveAddresses: [], // ourReceiveAddresses
      signedTx: '0', // signedTx
      otherParams: {}
    }

    this.log('Payment transaction prepared...')
    return edgeTransaction
  }

  // asynchronous
  async signTx (edgeTransaction: EdgeTransaction): Promise<EdgeTransaction> {
    return edgeTransaction
  }

  // asynchronous
  async broadcastTx (
    edgeTransaction: EdgeTransaction
  ): Promise<EdgeTransaction> {
    return edgeTransaction
  }

  getDisplayPrivateSeed () {
    if (this.walletInfo.keys && this.walletInfo.keys.rippleKey) {
      return this.walletInfo.keys.ethereumKey
    }
    return ''
  }

  getDisplayPublicSeed () {
    if (this.walletInfo.keys && this.walletInfo.keys.publicKey) {
      return this.walletInfo.keys.publicKey
    }
    return ''
  }
}

export { CurrencyEngine }
