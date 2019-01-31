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
import { error } from 'edge-core-js'
import {
  validateObject,
  normalizeAddress,
  toHex,
  bufToHex,
  getEdgeInfoServer,
  addHexPrefix
} from '../common/utils.js'
import {
  EtherscanGetBlockHeight,
  EtherscanGetTransactions,
  EtherscanGetAccountBalance,
  EtherscanGetAccountNonce,
  EtherscanGetTokenTransactions,
  EthGasStationSchema,
  NetworkFeesSchema,
  SuperEthGetUnconfirmedTransactions
} from './ethSchema.js'
import { bns } from 'biggystring'

import {
  type EtherscanTransaction,
  type EthereumTxOtherParams,
  type EthereumFee,
  type EthereumFeesGasPrice,
  type EthereumWalletOtherData
} from './ethTypes.js'
import { EthereumPlugin } from './ethPlugin.js'
import { CurrencyEngine } from '../common/engine.js'
import { currencyInfo } from './ethInfo.js'
import { calcMiningFee } from './ethMiningFees.js'

const abi = require('./export-fixes-bundle.js').ABI
const ethWallet = require('./export-fixes-bundle.js').Wallet
const EthereumTx = require('./export-fixes-bundle.js').Transaction

const PRIMARY_CURRENCY = currencyInfo.currencyCode
const ACCOUNT_POLL_MILLISECONDS = 20000
const BLOCKCHAIN_POLL_MILLISECONDS = 20000
const TRANSACTION_POLL_MILLISECONDS = 20000
const UNCONFIRMED_TRANSACTION_POLL_MILLISECONDS = 3000
const NETWORKFEES_POLL_MILLISECONDS = 60 * 10 * 1000 // 10 minutes
const ADDRESS_QUERY_LOOKBACK_BLOCKS = 4 * 60 * 24 * 7 // ~ one week
const NUM_TRANSACTIONS_TO_QUERY = 50

type BroadcastResults = {
  incrementNonce: boolean,
  decrementNonce: boolean
}

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
    const url = `${
      this.currencyInfo.defaultSettings.otherSettings.blockcypherApiServers[0]
    }/${cmd}${apiKey}`
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
        url
      )
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

  async checkAccountNonceFetch (address: string) {
    const url = `?module=proxy&action=eth_getTransactionCount&address=${address}&tag=latest`
    try {
      const jsonObj = await this.fetchGetEtherscan(
        this.currencyInfo.defaultSettings.otherSettings.etherscanApiServers[0],
        url
      )
      const valid = validateObject(jsonObj, EtherscanGetAccountNonce)
      const nonce = bns.add('0', jsonObj.result)
      if (valid && this.walletLocalData.otherData.nextNonce !== nonce) {
        this.walletLocalData.otherData.nextNonce = nonce
        this.walletLocalDataDirty = true
      }
    } catch (e) {
      this.log(`Error checking account nonce`, e)
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
            url = `?module=account&action=tokenbalance&contractaddress=${
              tokenInfo.contractAddress
            }&address=${this.walletLocalData.publicKey}&tag=latest`
          } else {
            continue
          }
        }
        promiseArray.push(this.checkAccountFetch(tk, url))
      }
      promiseArray.push(this.checkAccountNonceFetch(address))
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
          this.currencyInfo.defaultSettings.otherSettings
            .etherscanApiServers[0],
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

  async checkUpdateNetworkFees () {
    try {
      const infoServer = getEdgeInfoServer()
      const url = `${infoServer}/v1/networkFees/ETH`
      const jsonObj = await this.fetchGet(url)
      const valid = validateObject(jsonObj, NetworkFeesSchema)

      if (valid) {
        if (
          JSON.stringify(this.walletLocalData.otherData.networkFees) !==
          JSON.stringify(jsonObj)
        ) {
          this.walletLocalData.otherData.networkFees = jsonObj
          this.walletLocalDataDirty = true
        }
      } else {
        this.log('Error: Fetched invalid networkFees')
      }
    } catch (err) {
      this.log('Error fetching networkFees from Edge info server')
      this.log(err)
    }

    try {
      const url = 'https://www.ethgasstation.info/json/ethgasAPI.json'
      const jsonObj = await this.fetchGet(url)
      const valid = validateObject(jsonObj, EthGasStationSchema)

      if (valid) {
        const fees = this.walletLocalData.otherData.networkFees
        const ethereumFee: EthereumFee = fees['default']
        if (!ethereumFee.gasPrice) {
          return
        }
        const gasPrice: EthereumFeesGasPrice = ethereumFee.gasPrice

        const safeLow = Math.floor(jsonObj.safeLow / 10)
        let average = Math.floor(jsonObj.average / 10)
        let fastest = Math.floor(jsonObj.fastest / 10)

        // Sanity checks
        if (safeLow < 1 || safeLow > 300) {
          console.log('Invalid safeLow value from EthGasStation')
          return
        }
        if (average < 1 || average > 300) {
          console.log('Invalid average value from EthGasStation')
          return
        }
        if (fastest < 1 || fastest > 300) {
          console.log('Invalid fastest value from EthGasStation')
          return
        }

        const lowFee = (safeLow * 1000000000).toString()

        if (average <= safeLow) average = safeLow + 1
        const standardFeeLow = (average * 1000000000).toString()

        if (fastest <= average) fastest = average + 1
        const highFee = (fastest * 1000000000).toString()

        // We use a value that is somewhere in between average and fastest for the standardFeeHigh
        const standardFeeHigh = (
          Math.floor((average + fastest) * 0.75) * 1000000000
        ).toString()

        if (
          gasPrice.lowFee !== lowFee ||
          gasPrice.standardFeeLow !== standardFeeLow ||
          gasPrice.highFee !== highFee ||
          gasPrice.standardFeeHigh !== standardFeeHigh
        ) {
          gasPrice.lowFee = lowFee
          gasPrice.standardFeeLow = standardFeeLow
          gasPrice.highFee = highFee
          gasPrice.standardFeeHigh = standardFeeHigh
          this.walletLocalDataDirty = true
        }
      } else {
        this.log('Error: Fetched invalid networkFees from EthGasStation')
      }
    } catch (err) {
      this.log('Error fetching networkFees from EthGasStation')
      this.log(err)
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
    this.addToLoop('checkUpdateNetworkFees', NETWORKFEES_POLL_MILLISECONDS)
    this.addToLoop('checkTransactionsInnerLoop', TRANSACTION_POLL_MILLISECONDS)
    this.addToLoop('checkUnconfirmedTransactionsInnerLoop', UNCONFIRMED_TRANSACTION_POLL_MILLISECONDS)
    super.startEngine()
  }

  async resyncBlockchain (): Promise<void> {
    await this.killEngine()
    await this.clearBlockchainCache()
    await this.startEngine()
  }

  // synchronous
  async makeSpend (edgeSpendInfoIn: EdgeSpendInfo) {
    const { edgeSpendInfo, currencyCode } = super.makeSpend(edgeSpendInfoIn)

    // Ethereum can only have one output
    if (edgeSpendInfo.spendTargets.length !== 1) {
      throw new Error('Error: only one output allowed')
    }

    let tokenInfo = {}
    tokenInfo.contractAddress = ''

    if (currencyCode !== PRIMARY_CURRENCY) {
      tokenInfo = this.getTokenInfo(currencyCode)
      if (!tokenInfo || typeof tokenInfo.contractAddress !== 'string') {
        throw new Error(
          'Error: Token not supported or invalid contract address'
        )
      }
    }

    let otherParams: Object = {}
    const { gasLimit, gasPrice } = calcMiningFee(
      edgeSpendInfo,
      this.walletLocalData.otherData.networkFees
    )

    const publicAddress = edgeSpendInfo.spendTargets[0].publicAddress

    if (currencyCode === PRIMARY_CURRENCY) {
      const ethParams: EthereumTxOtherParams = {
        from: [this.walletLocalData.publicKey],
        to: [publicAddress],
        gas: gasLimit,
        gasPrice: gasPrice,
        gasUsed: '0',
        cumulativeGasUsed: '0',
        errorVal: 0,
        tokenRecipientAddress: null
      }
      otherParams = ethParams
    } else {
      let contractAddress = ''
      if (typeof tokenInfo.contractAddress === 'string') {
        contractAddress = tokenInfo.contractAddress
      } else {
        throw new Error('makeSpend: Invalid contract address')
      }

      const ethParams: EthereumTxOtherParams = {
        from: [this.walletLocalData.publicKey],
        to: [contractAddress],
        gas: gasLimit,
        gasPrice: gasPrice,
        gasUsed: '0',
        cumulativeGasUsed: '0',
        errorVal: 0,
        tokenRecipientAddress: publicAddress
      }
      otherParams = ethParams
    }

    const ErrorInsufficientFundsMoreEth = new Error(
      'Insufficient ETH for transaction fee'
    )
    ErrorInsufficientFundsMoreEth.name = 'ErrorInsufficientFundsMoreEth'

    let nativeAmount = edgeSpendInfo.spendTargets[0].nativeAmount
    const balanceEth = this.walletLocalData.totalBalances[this.currencyInfo.currencyCode]
    let nativeNetworkFee = bns.mul(gasPrice, gasLimit)
    let totalTxAmount = '0'
    let parentNetworkFee = null

    if (currencyCode === PRIMARY_CURRENCY) {
      totalTxAmount = bns.add(nativeNetworkFee, nativeAmount)
      if (bns.gt(totalTxAmount, balanceEth)) {
        throw new error.InsufficientFundsError()
      }
      nativeAmount = bns.mul(totalTxAmount, '-1')
    } else {
      parentNetworkFee = nativeNetworkFee

      if (bns.gt(nativeNetworkFee, balanceEth)) {
        throw ErrorInsufficientFundsMoreEth
      }

      nativeNetworkFee = '0' // Do not show a fee for token transactions.
      nativeAmount = bns.mul(nativeAmount, '-1')
    }
    // **********************************
    // Create the unsigned EdgeTransaction

    const edgeTransaction: EdgeTransaction = {
      txid: '', // txid
      date: 0, // date
      currencyCode, // currencyCode
      blockHeight: 0, // blockHeight
      nativeAmount, // nativeAmount
      networkFee: nativeNetworkFee, // networkFee
      ourReceiveAddresses: [], // ourReceiveAddresses
      signedTx: '0', // signedTx
      otherParams // otherParams
    }

    if (parentNetworkFee) {
      edgeTransaction.parentNetworkFee = parentNetworkFee
    }

    return edgeTransaction
  }

  // asynchronous
  async signTx (edgeTransaction: EdgeTransaction): Promise<EdgeTransaction> {
    // Do signing

    const gasLimitHex = toHex(edgeTransaction.otherParams.gas)
    const gasPriceHex = toHex(edgeTransaction.otherParams.gasPrice)
    let nativeAmountHex

    if (edgeTransaction.currencyCode === PRIMARY_CURRENCY) {
      // Remove the networkFee from the nativeAmount
      const nativeAmount = bns.add(
        edgeTransaction.nativeAmount,
        edgeTransaction.networkFee
      )
      nativeAmountHex = bns.mul('-1', nativeAmount, 16)
    } else {
      nativeAmountHex = bns.mul('-1', edgeTransaction.nativeAmount, 16)
    }

    const nonceHex = toHex(this.walletLocalData.otherData.nextNonce)

    let data
    if (edgeTransaction.currencyCode === PRIMARY_CURRENCY) {
      data = ''
    } else {
      const dataArray = abi.simpleEncode(
        'transfer(address,uint256):(uint256)',
        edgeTransaction.otherParams.tokenRecipientAddress,
        nativeAmountHex
      )
      data = '0x' + Buffer.from(dataArray).toString('hex')
      nativeAmountHex = '0x00'
    }

    const txParams = {
      nonce: nonceHex,
      gasPrice: gasPriceHex,
      gasLimit: gasLimitHex,
      to: edgeTransaction.otherParams.to[0],
      value: nativeAmountHex,
      data: data,
      // EIP 155 chainId - mainnet: 1, ropsten: 3
      chainId: 1
    }

    const privKey = Buffer.from(this.walletInfo.keys.ethereumKey, 'hex')
    const wallet = ethWallet.fromPrivateKey(privKey)

    this.log(wallet.getAddressString())

    const tx = new EthereumTx(txParams)
    tx.sign(privKey)

    edgeTransaction.signedTx = bufToHex(tx.serialize())
    edgeTransaction.txid = bufToHex(tx.hash())
    edgeTransaction.date = Date.now() / 1000

    return edgeTransaction
  }

  async broadcastEtherscan (
    edgeTransaction: EdgeTransaction
  ): Promise<BroadcastResults> {
    const result: BroadcastResults = {
      incrementNonce: false,
      decrementNonce: false
    }
    const transactionParsed = JSON.stringify(edgeTransaction, null, 2)

    this.log(`Etherscan: sent transaction to network:\n${transactionParsed}\n`)
    const url = `?module=proxy&action=eth_sendRawTransaction&hex=${
      edgeTransaction.signedTx
    }`
    const jsonObj = await this.fetchGetEtherscan(
      this.currencyInfo.defaultSettings.otherSettings.etherscanApiServers[0],
      url
    )

    this.log('broadcastEtherscan jsonObj:', jsonObj)

    if (typeof jsonObj.error !== 'undefined') {
      this.log('EtherScan: Error sending transaction')
      if (
        jsonObj.error.code === -32000 ||
        jsonObj.error.message.includes('nonce is too low') ||
        jsonObj.error.message.includes('nonce too low') ||
        jsonObj.error.message.includes('incrementing the nonce') ||
        jsonObj.error.message.includes('replacement transaction underpriced')
      ) {
        result.incrementNonce = true
      } else {
        throw jsonObj.error
      }
      return result
    } else if (typeof jsonObj.result === 'string') {
      // Success!!
      return result
    } else {
      throw new Error('Invalid return value on transaction send')
    }
  }

  async broadcastBlockCypher (
    edgeTransaction: EdgeTransaction
  ): Promise<BroadcastResults> {
    const result: BroadcastResults = {
      incrementNonce: false,
      decrementNonce: false
    }

    const transactionParsed = JSON.stringify(edgeTransaction, null, 2)
    this.log(
      `Blockcypher: sending transaction to network:\n${transactionParsed}\n`
    )

    const url = 'v1/eth/main/txs/push'
    const hexTx = edgeTransaction.signedTx.replace('0x', '')
    const jsonObj = await this.fetchPostBlockcypher(url, { tx: hexTx })

    this.log('broadcastBlockCypher jsonObj:', jsonObj)
    if (typeof jsonObj.error !== 'undefined') {
      this.log('BlockCypher: Error sending transaction')
      if (
        typeof jsonObj.error === 'string' &&
        jsonObj.error.includes('Account nonce ') &&
        jsonObj.error.includes('higher than transaction')
      ) {
        result.incrementNonce = true
      } else if (
        typeof jsonObj.error === 'string' &&
        jsonObj.error.includes('Error validating transaction') &&
        jsonObj.error.includes('orphaned, missing reference')
      ) {
        result.decrementNonce = true
      } else {
        throw jsonObj.error
      }
      return result
    } else if (jsonObj.tx && typeof jsonObj.tx.hash === 'string') {
      this.log(`Blockcypher success sending txid ${jsonObj.tx.hash}`)
      // Success!!
      return result
    } else {
      throw new Error('Invalid return value on transaction send')
    }
  }

  async broadcastTx (
    edgeTransaction: EdgeTransaction
  ): Promise<EdgeTransaction> {
    const results: Array<BroadcastResults | null> = [null, null]
    const errors: Array<Error | null> = [null, null]

    // Because etherscan will allow use of a nonce that's too high, only use it if Blockcypher fails
    // If we can fix this or replace etherscan, then we can use an array of promises instead of await
    // on each broadcast type
    try {
      results[0] = await this.broadcastBlockCypher(edgeTransaction)
    } catch (e) {
      errors[0] = e
    }

    if (errors[0]) {
      try {
        results[1] = await this.broadcastEtherscan(edgeTransaction)
      } catch (e) {
        errors[1] = e
      }
    }

    // Use code below once we actually use a Promise array and simultaneously broadcast with a Promise.all()
    //
    // for (let i = 0; i < results.length; i++) {
    //   results[i] = null
    //   errors[i] = null
    //   try {
    //     results[i] = await results[i]
    //   } catch (e) {
    //     errors[i] = e
    //   }
    // }

    let allErrored = true

    for (const e of errors) {
      if (!e) {
        allErrored = false
        break
      }
    }

    let anyResultIncNonce = false
    let anyResultDecrementNonce = false

    for (const r: BroadcastResults | null of results) {
      if (r && r.incrementNonce) {
        anyResultIncNonce = true
      }
      if (r && r.decrementNonce) {
        anyResultDecrementNonce = true
      }
    }

    this.log('broadcastTx errors:', errors)
    this.log('broadcastTx results:', results)

    if (allErrored) {
      throw errors[0] // Can only throw one error so throw the first one
    }

    if (anyResultDecrementNonce) {
      this.walletLocalData.otherData.nextNonce = bns.add(
        this.walletLocalData.otherData.nextNonce,
        '-1'
      )
      this.log(
        'nextNonce too high. Decrementing to ' +
          this.walletLocalData.otherData.nextNonce.toString()
      )
      // Nonce error. Increment nonce and try again
      const edgeTx = await this.signTx(edgeTransaction)
      const out = await this.broadcastTx(edgeTx)
      return out
    }

    if (anyResultIncNonce) {
      // All servers returned a nonce-too-low. Increment and retry sign and broadcast
      this.walletLocalData.otherData.nextNonce = bns.add(
        this.walletLocalData.otherData.nextNonce,
        '1'
      )
      this.log(
        'nextNonce too low. Incrementing to ' +
          this.walletLocalData.otherData.nextNonce.toString()
      )
      // Nonce error. Increment nonce and try again
      const edgeTx = await this.signTx(edgeTransaction)
      const out = await this.broadcastTx(edgeTx)
      return out
    }
    // Success
    this.walletLocalData.otherData.nextNonce = bns.add(
      this.walletLocalData.otherData.nextNonce,
      '1'
    )
    this.walletLocalDataDirty = true

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
