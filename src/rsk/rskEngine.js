/**
 * Created by alepc253 on 6/19/19.
 */
// @flow

import { bns } from 'biggystring'
import {
  type EdgeCurrencyEngineOptions,
  type EdgeSpendInfo,
  type EdgeTransaction,
  type EdgeWalletInfo,
  InsufficientFundsError
} from 'edge-core-js/types'
import abi from 'ethereumjs-abi'
import EthereumTx from 'ethereumjs-tx'
import ethWallet from 'ethereumjs-wallet'
import parse from 'url-parse'

import { CurrencyEngine } from '../common/engine.js'
import {
  addHexPrefix,
  asyncWaterfall,
  bufToHex,
  getOtherParams,
  normalizeAddress,
  promiseAny,
  shuffleArray,
  toHex,
  validateObject
} from '../common/utils.js'
import { currencyInfo } from './rskInfo.js'
import { calcMiningFee } from './rskMiningFees.js'
import { RskPlugin } from './rskPlugin.js'
import {
  EtherscanGetAccountBalance,
  EtherscanGetAccountNonce,
  EtherscanGetBlockHeight,
  EtherscanGetTokenTransactions,
  EtherscanGetTransactions,
  SuperEthGetUnconfirmedTransactions
} from './rskSchema.js'
import {
  type EtherscanTransaction,
  type RskInitOptions,
  type RskTxOtherParams,
  type RskWalletOtherData
} from './rskTypes.js'

const PRIMARY_CURRENCY = currencyInfo.currencyCode
const ACCOUNT_POLL_MILLISECONDS = 20000
const BLOCKCHAIN_POLL_MILLISECONDS = 20000
const TRANSACTION_POLL_MILLISECONDS = 20000
// const UNCONFIRMED_TRANSACTION_POLL_MILLISECONDS = 3000
const NETWORKFEES_POLL_MILLISECONDS = 60 * 10 * 1000 // 10 minutes
const ADDRESS_QUERY_LOOKBACK_BLOCKS = 4 * 60 * 24 * 7 // ~ one week
const NUM_TRANSACTIONS_TO_QUERY = 50
// const WEI_MULTIPLIER = 100000000

type EthFunction =
  | 'broadcastTx'
  | 'eth_blockNumber'
  | 'eth_getTransactionCount'
  | 'eth_getBalance'
  | 'getTokenBalance'
  | 'getTransactions'

type BroadcastResults = {
  incrementNonce: boolean,
  decrementNonce: boolean
}

async function broadcastWrapper(promise: Promise<Object>, server: string) {
  const out = {
    result: await promise,
    server
  }
  return out
}

export class RskEngine extends CurrencyEngine {
  rskPlugin: RskPlugin
  otherData: RskWalletOtherData
  initOptions: RskInitOptions

  constructor(
    currencyPlugin: RskPlugin,
    walletInfo: EdgeWalletInfo,
    initOptions: RskInitOptions,
    opts: EdgeCurrencyEngineOptions
  ) {
    super(currencyPlugin, walletInfo, opts)
    if (typeof this.walletInfo.keys.rskKey !== 'string') {
      if (walletInfo.keys.keys && walletInfo.keys.keys.rskKey) {
        this.walletInfo.keys.rskKey = walletInfo.keys.keys.rskKey
      }
    }
    this.currencyPlugin = currencyPlugin
    this.initOptions = initOptions
  }

  async fetchGetBlockScout(server: string, cmd: string) {
    const url = `${server}/api?${cmd}`
    return this.fetchGet(url)
  }

  async fetchGet(url: string) {
    const response = await this.io.fetch(url, {
      method: 'GET'
    })
    if (!response.ok) {
      throw new Error(
        `The server returned error code ${response.status} for ${url}`
      )
    }
    return response.json()
  }

  checkPrimaryCurrencyIsEnabled() {
    if (!this.walletLocalData.enabledTokens.includes('RBTC')) {
      this.walletLocalData.enabledTokens.push('RBTC')
    }
  }

  async checkBlockchainInnerLoop() {
    try {
      const jsonObj = await this.multicastServers('eth_blockNumber')
      const valid = validateObject(jsonObj, EtherscanGetBlockHeight)
      if (valid) {
        const blockHeight: number = parseInt(jsonObj.result, 16)
        this.log(`Got block height ${blockHeight}`)
        if (this.walletLocalData.blockHeight !== blockHeight) {
          this.checkDroppedTransactionsThrottled()
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

  updateBalance(tk: string, balance: string) {
    if (typeof this.walletLocalData.totalBalances[tk] === 'undefined') {
      this.walletLocalData.totalBalances[tk] = '0'
    }
    if (!bns.eq(balance, this.walletLocalData.totalBalances[tk])) {
      this.walletLocalData.totalBalances[tk] = balance
      this.log(tk + ': token Address balance: ' + balance)
      this.currencyEngineCallbacks.onBalanceChanged(tk, balance)
    }
    this.tokenCheckBalanceStatus[tk] = 1
    this.updateOnAddressesChecked()
  }

  async checkAccountFetch(address: string) {
    let jsonObj = {}
    let valid = false

    try {
      jsonObj = await this.multicastServers('eth_getBalance', address)
      valid = validateObject(jsonObj, EtherscanGetAccountBalance)
      if (valid) {
        const balance = jsonObj.result
        this.updateBalance('RBTC', balance)
      }
    } catch (e) {
      const errorMsg = e.toString()
      //  Blockscout returns 404 for new accounts
      if (
        errorMsg.includes('&action=eth_get_balance') &&
        errorMsg.includes('error code 404')
      ) {
        const balance = '0'
        this.updateBalance('RBTC', balance)
      } else {
        this.log(`Error checking token balance: RBTC`, errorMsg)
      }
    }
  }

  async checkTokenBalanceFetch(
    address: string,
    contractAddress: string,
    tk: string
  ) {
    let jsonObj = {}
    let valid = false

    try {
      jsonObj = await this.multicastServers(
        'getTokenBalance',
        address,
        contractAddress
      )
      valid = validateObject(jsonObj, EtherscanGetAccountBalance)
      if (valid) {
        const balance = jsonObj.result
        this.updateBalance(tk, balance)
      }
    } catch (e) {
      this.log(`Error checking token balance: ${tk}`)
    }
  }

  async checkAccountNonceFetch(address: string) {
    try {
      const jsonObj = await this.multicastServers(
        'eth_getTransactionCount',
        address
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

  async checkAccountInnerLoop() {
    const address = this.walletLocalData.publicKey
    try {
      // Ethereum only has one address
      const promiseArray = []
      this.checkPrimaryCurrencyIsEnabled()

      // ************************************
      // Fetch token balances
      // ************************************
      // https://api.etherscan.io/api?module=account&action=tokenbalance&contractaddress=0x57d90b64a1a57749b0f932f1a3395792e12e7055&address=0xe04f27eb70e025b78871a2ad7eabe85e61212761&tag=latest&apikey=YourApiKeyToken
      for (const tk of this.walletLocalData.enabledTokens) {
        if (tk === PRIMARY_CURRENCY) {
          promiseArray.push(this.checkAccountFetch(address))
        } else {
          const tokenInfo = this.getTokenInfo(tk)
          if (tokenInfo && typeof tokenInfo.contractAddress === 'string') {
            promiseArray.push(
              this.checkTokenBalanceFetch(
                address,
                tokenInfo.contractAddress,
                tk
              )
            )
          } else {
            continue
          }
        }
      }
      promiseArray.push(this.checkAccountNonceFetch(address))
      await Promise.all(promiseArray)
    } catch (e) {}
  }

  processEtherscanTransaction(tx: EtherscanTransaction, currencyCode: string) {
    let netNativeAmount: string // Amount received into wallet
    const ourReceiveAddresses: Array<string> = []
    let nativeNetworkFee: string

    if (tx.contractAddress) {
      nativeNetworkFee = '0'
    } else {
      nativeNetworkFee = bns.mul(tx.gasPrice, tx.gasUsed)
    }

    if (
      tx.from.toLowerCase() === this.walletLocalData.publicKey.toLowerCase()
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
      ourReceiveAddresses.push(this.walletLocalData.publicKey.toLowerCase())
    }

    const otherParams: RskTxOtherParams = {
      from: [tx.from],
      to: [tx.to],
      gas: tx.gas,
      gasPrice: tx.gasPrice,
      gasUsed: tx.gasUsed,
      cumulativeGasUsed: tx.cumulativeGasUsed,
      errorVal: parseInt(tx.isError),
      tokenRecipientAddress: null
    }

    let blockHeight = parseInt(tx.blockNumber)
    if (blockHeight < 0) blockHeight = 0
    const edgeTransaction: EdgeTransaction = {
      txid: tx.hash,
      date: parseInt(tx.timeStamp),
      currencyCode,
      blockHeight,
      nativeAmount: netNativeAmount,
      networkFee: nativeNetworkFee,
      ourReceiveAddresses,
      signedTx: '',
      otherParams
    }

    this.addTransaction(currencyCode, edgeTransaction)
  }

  async checkTransactionsFetch(
    startBlock: number,
    currencyCode: string
  ): Promise<boolean> {
    const address = this.walletLocalData.publicKey
    let checkAddressSuccess = false
    let page = 1
    let contractAddress = ''
    let schema

    if (currencyCode !== PRIMARY_CURRENCY) {
      const tokenInfo = this.getTokenInfo(currencyCode)
      if (tokenInfo && typeof tokenInfo.contractAddress === 'string') {
        contractAddress = tokenInfo.contractAddress
        schema = EtherscanGetTokenTransactions
      } else {
        return false
      }
    } else {
      schema = EtherscanGetTransactions
    }

    try {
      while (1) {
        const offset = NUM_TRANSACTIONS_TO_QUERY
        const jsonObj = await this.multicastServers('getTransactions', {
          currencyCode,
          address,
          startBlock,
          page,
          offset,
          contractAddress
        })
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
      this.log(
        `Error checkTransactionsFetch RBTC: ${this.walletLocalData.publicKey}`,
        e
      )
    }

    if (checkAddressSuccess) {
      this.tokenCheckTransactionsStatus[currencyCode] = 1
      this.updateOnAddressesChecked()
      return true
    } else {
      return false
    }
  }

  processUnconfirmedTransaction(tx: Object) {
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

    const otherParams: RskTxOtherParams = {
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
      currencyCode: 'RBTC',
      blockHeight: 0,
      nativeAmount,
      networkFee: tx.fees.toString(10),
      ourReceiveAddresses,
      signedTx: '',
      otherParams
    }
    this.addTransaction('RBTC', edgeTransaction)
  }

  async checkUnconfirmedTransactionsInnerLoop() {
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
    if (this.transactionsChangedArray.length > 0) {
      this.currencyEngineCallbacks.onTransactionsChanged(
        this.transactionsChangedArray
      )
      this.transactionsChangedArray = []
    }
  }

  async checkTransactionsInnerLoop() {
    const blockHeight = this.walletLocalData.blockHeight
    let startBlock: number = 0
    const promiseArray = []
    this.checkPrimaryCurrencyIsEnabled()

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

    let resultArray = []
    try {
      resultArray = await Promise.all(promiseArray)
    } catch (e) {
      this.log('Failed to query transactions')
      this.log(e.name)
      this.log(e.message)
    }
    let successCount = 0
    for (const r of resultArray) {
      if (r) successCount++
    }
    if (successCount === promiseArray.length) {
      this.walletLocalData.lastAddressQueryHeight = blockHeight
    }
    if (this.transactionsChangedArray.length > 0) {
      this.currencyEngineCallbacks.onTransactionsChanged(
        this.transactionsChangedArray
      )
      this.transactionsChangedArray = []
    }
  }

  async checkUpdateNetworkFees() {
    const actualGasPrice = parseInt(
      this.walletLocalData.otherData.networkFees.default.gasPrice.standardFeeLow
    )
    try {
      const jsonObj = await this.fetchPostPublicNode('eth_gasPrice', [])
      const newGasPrice = parseInt(jsonObj.result, 16)

      if (newGasPrice !== actualGasPrice) {
        // check first if changed
        this.walletLocalData.otherData.networkFees.default.gasPrice.standardFeeLow = newGasPrice.toString()
        this.walletLocalData.otherData.networkFees.default.gasPrice.standardFeeHigh = Math.round(
          newGasPrice * 1.25
        ).toString()
        this.walletLocalData.otherData.networkFees.default.gasPrice.standardFeeLowAmount = newGasPrice.toString()
        this.walletLocalData.otherData.networkFees.default.gasPrice.standardFeeHighAmount = Math.round(
          newGasPrice * 1.25
        ).toString()
        this.walletLocalData.otherData.networkFees.default.gasPrice.highFee = Math.round(
          newGasPrice * 1.5
        ).toString()
        this.walletLocalDataDirty = true
      }
    } catch (err) {
      this.log('Error fetching networkFees')
      this.log(err)
    }
  }

  async multicastServers(func: EthFunction, ...params: any): Promise<any> {
    let out = { result: '', server: 'no server' }
    let funcs, funcs2, url
    switch (func) {
      case 'broadcastTx': {
        const promises = []
        promises.push(
          broadcastWrapper(this.broadcastPublicNode(params[0]), 'public-node')
        )
        out = await promiseAny(promises)

        this.log(`multicastServers ${func} ${out.server} won`)
        break
      }

      case 'eth_blockNumber':
        funcs = this.currencyInfo.defaultSettings.otherSettings.etherscanApiServers.map(
          server => async () => {
            const result = await this.fetchGetBlockScout(
              server,
              'module=block&action=eth_block_number'
            )
            if (typeof result.result !== 'string') {
              const msg = `Invalid return value eth_blockNumber in ${server}`
              this.log(msg)
              throw new Error(msg)
            }
            return { server, result }
          }
        )
        funcs2 = async () => {
          const result = await this.fetchPostPublicNode('eth_blockNumber', [])
          return { server: 'public-node', result }
        }
        funcs.push(funcs2)
        // Randomize array
        funcs = shuffleArray(funcs)
        out = await asyncWaterfall(funcs)
        break

      case 'eth_getTransactionCount':
        funcs = []
        funcs2 = async () => {
          const result = await this.fetchPostPublicNode(
            'eth_getTransactionCount',
            [params[0], 'latest']
          )
          return { server: 'public-node', result }
        }
        funcs.push(funcs2)
        // Randomize array
        funcs = shuffleArray(funcs)
        out = await asyncWaterfall(funcs)
        break
      case 'eth_getBalance':
        url = `module=account&action=eth_get_balance&address=${params[0]}&block=latest`
        funcs = this.currencyInfo.defaultSettings.otherSettings.etherscanApiServers.map(
          server => async () => {
            const result = await this.fetchGetBlockScout(server, url)
            if (typeof result.result !== 'string') {
              const msg = `Invalid return value eth_getBalance in ${server}`
              this.log(msg)
              throw new Error(msg)
            }
            // Convert to decimal
            result.result = bns.add(result.result, '0')
            return { server, result }
          }
        )
        funcs2 = async () => {
          const result = await this.fetchPostPublicNode('eth_getBalance', [
            params[0],
            'latest'
          ])
          // Convert to decimal
          result.result = bns.add(result.result, '0')
          return { server: 'public-node', result }
        }
        funcs.push(funcs2)
        // Randomize array
        funcs = shuffleArray(funcs)
        out = await asyncWaterfall(funcs)
        break
      case 'getTokenBalance':
        url = `module=account&action=tokenbalance&contractaddress=${params[1]}&address=${params[0]}`
        funcs = this.currencyInfo.defaultSettings.otherSettings.etherscanApiServers.map(
          server => async () => {
            const result = await this.fetchGetBlockScout(server, url)
            if (typeof result.result !== 'string') {
              const msg = `Invalid return value getTokenBalance in ${server}`
              this.log(msg)
              throw new Error(msg)
            }
            return { server, result }
          }
        )
        // Randomize array
        funcs = shuffleArray(funcs)
        out = await asyncWaterfall(funcs)
        break

      case 'getTransactions': {
        const {
          currencyCode,
          address,
          startBlock,
          page,
          offset,
          contractAddress
        } = params[0]
        let startUrl
        if (currencyCode === 'RBTC') {
          startUrl = `action=txlist&module=account`
        } else {
          startUrl = `action=tokentx&contractaddress=${contractAddress}&module=account`
        }
        url = `${startUrl}&address=${address}&startblock=${startBlock}&endblock=999999999&sort=asc&page=${page}&offset=${offset}`
        funcs = this.currencyInfo.defaultSettings.otherSettings.etherscanApiServers.map(
          server => async () => {
            const result = await this.fetchGetBlockScout(server, url)
            if (
              typeof result.result !== 'object' ||
              typeof result.result.length !== 'number'
            ) {
              const msg = `Invalid return value getTransactions in ${server}`
              this.log(msg)
              throw new Error(msg)
            }
            return { server, result }
          }
        )
        // Randomize array
        funcs = shuffleArray(funcs)
        out = await asyncWaterfall(funcs)
        break
      }
    }
    this.log(`multicastServers ${func} ${out.server} won`)

    return out.result
  }

  async clearBlockchainCache() {
    await super.clearBlockchainCache()
    this.otherData.nextNonce = '0'
    this.otherData.unconfirmedNextNonce = '0'
  }

  // ****************************************************************************
  // Public methods
  // ****************************************************************************

  async startEngine() {
    this.engineOn = true
    this.checkPrimaryCurrencyIsEnabled()
    this.addToLoop('checkBlockchainInnerLoop', BLOCKCHAIN_POLL_MILLISECONDS)
    this.addToLoop('checkAccountInnerLoop', ACCOUNT_POLL_MILLISECONDS)
    this.addToLoop('checkUpdateNetworkFees', NETWORKFEES_POLL_MILLISECONDS)
    this.addToLoop('checkTransactionsInnerLoop', TRANSACTION_POLL_MILLISECONDS)
    // this.addToLoop(
    //   'checkUnconfirmedTransactionsInnerLoop',
    //   UNCONFIRMED_TRANSACTION_POLL_MILLISECONDS
    // )
    super.startEngine()
  }

  async resyncBlockchain(): Promise<void> {
    await this.killEngine()
    await this.clearBlockchainCache()
    await this.startEngine()
  }

  async makeSpend(edgeSpendInfoIn: EdgeSpendInfo) {
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
      const ethParams: RskTxOtherParams = {
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

      const ethParams: RskTxOtherParams = {
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

    let nativeAmount = edgeSpendInfo.spendTargets[0].nativeAmount
    const balanceEth = this.walletLocalData.totalBalances[
      this.currencyInfo.currencyCode
    ]
    let nativeNetworkFee = bns.mul(gasPrice, gasLimit)
    let totalTxAmount = '0'
    let parentNetworkFee = null

    if (currencyCode === PRIMARY_CURRENCY) {
      totalTxAmount = bns.add(nativeNetworkFee, nativeAmount)
      if (bns.gt(totalTxAmount, balanceEth)) {
        throw new InsufficientFundsError()
      }
      nativeAmount = bns.mul(totalTxAmount, '-1')
    } else {
      parentNetworkFee = nativeNetworkFee

      if (bns.gt(nativeNetworkFee, balanceEth)) {
        throw new InsufficientFundsError(
          'Insufficient RBTC for transaction fee'
        )
      }
      const balanceToken = this.walletLocalData.totalBalances[currencyCode]
      if (bns.gt(nativeAmount, balanceToken)) {
        throw new InsufficientFundsError()
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
      signedTx: '', // signedTx
      otherParams // otherParams
    }

    if (parentNetworkFee) {
      edgeTransaction.parentNetworkFee = parentNetworkFee
    }

    return edgeTransaction
  }

  async signTx(edgeTransaction: EdgeTransaction): Promise<EdgeTransaction> {
    const otherParams = getOtherParams(edgeTransaction)

    // Do signing
    const gasLimitHex = toHex(otherParams.gas)
    const gasPriceHex = toHex(otherParams.gasPrice)
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

    let nonceHex
    // Use an unconfirmed nonce if
    // 1. We have unconfirmed spending txs in the transaction list
    // 2. It is greater than the confirmed nonce
    // 3. Is no more than 5 higher than confirmed nonce
    if (
      this.walletLocalData.numUnconfirmedSpendTxs &&
      bns.gt(
        this.walletLocalData.otherData.unconfirmedNextNonce,
        this.walletLocalData.otherData.nextNonce
      )
    ) {
      const diff = bns.sub(
        this.walletLocalData.otherData.unconfirmedNextNonce,
        this.walletLocalData.otherData.nextNonce
      )
      if (bns.lte(diff, '5')) {
        nonceHex = toHex(this.walletLocalData.otherData.unconfirmedNextNonce)
        this.walletLocalData.otherData.unconfirmedNextNonce = bns.add(
          this.walletLocalData.otherData.unconfirmedNextNonce,
          '1'
        )
        this.walletLocalDataDirty = true
      } else {
        const e = new Error('Excessive pending spend transactions')
        e.name = 'ErrorExcessivePendingSpends'
        throw e
      }
    }
    if (!nonceHex) {
      nonceHex = toHex(this.walletLocalData.otherData.nextNonce)
      this.walletLocalData.otherData.unconfirmedNextNonce = bns.add(
        this.walletLocalData.otherData.nextNonce,
        '1'
      )
    }

    let data
    if (edgeTransaction.currencyCode === PRIMARY_CURRENCY) {
      data = ''
    } else {
      const dataArray = abi.simpleEncode(
        'transfer(address,uint256):(uint256)',
        otherParams.tokenRecipientAddress,
        nativeAmountHex
      )
      data = '0x' + Buffer.from(dataArray).toString('hex')
      nativeAmountHex = '0x00'
    }

    const txParams = {
      nonce: nonceHex,
      gasPrice: gasPriceHex,
      gasLimit: gasLimitHex,
      to: otherParams.to[0],
      value: nativeAmountHex,
      data: data,
      // EIP 155 chainId - mainnet: 1, ropsten: 3, rsk: 30
      chainId: 30
    }

    const privKey = Buffer.from(this.walletInfo.keys.rskKey, 'hex')
    const wallet = ethWallet.fromPrivateKey(privKey)

    this.log(wallet.getAddressString())

    this.log('signTx txParams', txParams)
    const tx = new EthereumTx(txParams)
    tx.sign(privKey)

    edgeTransaction.signedTx = bufToHex(tx.serialize())
    edgeTransaction.txid = bufToHex(tx.hash())
    edgeTransaction.date = Date.now() / 1000

    return edgeTransaction
  }

  async fetchPostPublicNode(method: string, params: Object) {
    const url = `https://public-node.rsk.co`
    const body = {
      id: 1,
      jsonrpc: '2.0',
      method,
      params
    }
    const response = await this.io.fetch(url, {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      method: 'POST',
      body: JSON.stringify(body)
    })
    const parsedUrl = parse(url, {}, true)
    if (!response.ok) {
      throw new Error(
        `The server returned error code ${response.status} for ${parsedUrl.hostname}`
      )
    }
    const jsonObj = await response.json()
    return jsonObj
  }

  async broadcastPublicNode(
    edgeTransaction: EdgeTransaction
  ): Promise<BroadcastResults> {
    const transactionParsed = JSON.stringify(edgeTransaction, null, 2)

    const method = 'eth_sendRawTransaction'
    const params = [edgeTransaction.signedTx]

    const jsonObj = await this.fetchPostPublicNode(method, params)

    if (typeof jsonObj.error !== 'undefined') {
      this.log('Public Node: Error sending transaction')
      throw jsonObj.error
    } else if (typeof jsonObj.result === 'string') {
      // Success!!
      this.log(
        `Public Node: sent transaction to network:\n${transactionParsed}\n`
      )
      return jsonObj
    } else {
      throw new Error('Invalid return value on transaction send')
    }
  }

  async broadcastTx(
    edgeTransaction: EdgeTransaction
  ): Promise<EdgeTransaction> {
    const result = await this.multicastServers('broadcastTx', edgeTransaction)

    // Success
    this.log(`SUCCESS broadcastTx\n${JSON.stringify(result)}`)
    this.log('edgeTransaction = ', edgeTransaction)

    return edgeTransaction
  }

  getDisplayPrivateSeed() {
    const { rskKey, rskMnemonic } = this.walletInfo.keys
    if (rskMnemonic != null) return rskMnemonic
    if (rskKey != null) return '0x' + rskKey.replace(/^0x/, '')
    return ''
  }

  getDisplayPublicSeed() {
    return this.walletInfo.keys.publicKey || ''
  }
}

export { CurrencyEngine }
