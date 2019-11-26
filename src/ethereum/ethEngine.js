/**
 * Created by paul on 7/7/17.
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
import EthereumUtil from 'ethereumjs-util'
import ethWallet from 'ethereumjs-wallet'

import { CurrencyEngine } from '../common/engine.js'
import {
  addHexPrefix,
  asyncWaterfall,
  bufToHex,
  getEdgeInfoServer,
  normalizeAddress,
  toHex,
  validateObject
} from '../common/utils.js'
import { currencyInfo } from './ethInfo.js'
import { calcMiningFee } from './ethMiningFees.js'
import { EthereumNetwork } from './ethNetwork'
import { EthereumPlugin } from './ethPlugin.js'
import {
  EthGasStationSchema,
  NetworkFeesSchema,
  SuperEthGetUnconfirmedTransactions
} from './ethSchema.js'
import {
  type EthereumFee,
  type EthereumFeesGasPrice,
  type EthereumInitOptions,
  type EthereumTxOtherParams,
  type EthereumWalletOtherData,
  type EtherscanTransaction
} from './ethTypes.js'

const PRIMARY_CURRENCY = currencyInfo.currencyCode
const UNCONFIRMED_TRANSACTION_POLL_MILLISECONDS = 3000
const NETWORKFEES_POLL_MILLISECONDS = 60 * 10 * 1000 // 10 minutes
const WEI_MULTIPLIER = 100000000

export class EthereumEngine extends CurrencyEngine {
  otherData: EthereumWalletOtherData
  initOptions: EthereumInitOptions
  ethNetwork: EthereumNetwork

  constructor(
    currencyPlugin: EthereumPlugin,
    walletInfo: EdgeWalletInfo,
    initOptions: EthereumInitOptions,
    opts: EdgeCurrencyEngineOptions
  ) {
    super(currencyPlugin, walletInfo, opts)
    if (typeof this.walletInfo.keys.ethereumKey !== 'string') {
      if (walletInfo.keys.keys && walletInfo.keys.keys.ethereumKey) {
        this.walletInfo.keys.ethereumKey = walletInfo.keys.keys.ethereumKey
      }
    }
    this.currencyPlugin = currencyPlugin
    this.initOptions = initOptions
    this.ethNetwork = new EthereumNetwork(this)
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
      // is a spend
      if (tx.from.toLowerCase() === tx.to.toLowerCase()) {
        // Spend to self. netNativeAmount is just the fee
        netNativeAmount = bns.mul(nativeNetworkFee, '-1')
      } else {
        // spend to someone else
        netNativeAmount = bns.sub('0', tx.value)

        // For spends, include the network fee in the transaction amount
        netNativeAmount = bns.sub(netNativeAmount, nativeNetworkFee)
      }
    } else {
      // Receive transaction
      netNativeAmount = bns.add('0', tx.value)
      ourReceiveAddresses.push(this.walletLocalData.publicKey.toLowerCase())
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

    return edgeTransaction
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
      blockHeight: 0,
      nativeAmount,
      networkFee: tx.fees.toString(10),
      ourReceiveAddresses,
      signedTx: '',
      otherParams
    }
    this.addTransaction('ETH', edgeTransaction)
  }

  async checkUnconfirmedTransactionsInnerLoop() {
    const address = normalizeAddress(this.walletLocalData.publicKey)
    const url = `${
      this.currencyInfo.defaultSettings.otherSettings.superethServers[0]
    }/v1/eth/main/txs/${address}`
    let jsonObj = null
    try {
      jsonObj = await this.ethNetwork.fetchGet(url)
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

  async checkUpdateNetworkFees() {
    try {
      const infoServer = getEdgeInfoServer()
      const url = `${infoServer}/v1/networkFees/ETH`
      const jsonObj = await this.ethNetwork.fetchGet(url)
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
      const jsonObj = await this.ethNetwork.fetchGet(url)
      const valid = validateObject(jsonObj, EthGasStationSchema)

      if (valid) {
        const fees = this.walletLocalData.otherData.networkFees
        const ethereumFee: EthereumFee = fees.default
        if (!ethereumFee.gasPrice) {
          return
        }
        const gasPrice: EthereumFeesGasPrice = ethereumFee.gasPrice

        const safeLow = jsonObj.safeLow
        let average = jsonObj.average
        let fast = jsonObj.fast
        let fastest = jsonObj.fastest

        // Sanity checks
        if (safeLow < 1 || safeLow > 3000) {
          console.log('Invalid safeLow value from EthGasStation')
          return
        }
        if (average < 1 || average > 3000) {
          console.log('Invalid average value from EthGasStation')
          return
        }
        if (fast < 1 || fast > 3000) {
          console.log('Invalid fastest value from EthGasStation')
          return
        }
        if (fastest < 1 || fastest > 3000) {
          console.log('Invalid fastest value from EthGasStation')
          return
        }

        // Correct inconsistencies
        if (average <= safeLow) average = safeLow + 1
        if (fast <= average) fast = average + 1
        if (fastest <= fast) fastest = fast + 1

        let lowFee = safeLow
        let standardFeeLow = fast
        let standardFeeHigh = (fast + fastest) * 0.75
        let highFee = fastest

        lowFee = (Math.round(lowFee) * WEI_MULTIPLIER).toString()
        standardFeeLow = (
          Math.round(standardFeeLow) * WEI_MULTIPLIER
        ).toString()
        standardFeeHigh = (
          Math.round(standardFeeHigh) * WEI_MULTIPLIER
        ).toString()
        highFee = (Math.round(highFee) * WEI_MULTIPLIER).toString()

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
    this.addToLoop('checkUpdateNetworkFees', NETWORKFEES_POLL_MILLISECONDS)
    this.addToLoop(
      'checkUnconfirmedTransactionsInnerLoop',
      UNCONFIRMED_TRANSACTION_POLL_MILLISECONDS
    )

    this.ethNetwork.needsLoop()

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

    const spendTarget = edgeSpendInfo.spendTargets[0]
    const publicAddress = spendTarget.publicAddress
    if (!EthereumUtil.isValidAddress(publicAddress)) {
      throw new TypeError('Invalid Ethereum address')
    }

    const data =
      spendTarget.otherParams != null ? spendTarget.otherParams.data : undefined

    let otherParams: Object = {}

    const miningFees = calcMiningFee(
      edgeSpendInfo,
      this.walletLocalData.otherData.networkFees
    )
    const { gasPrice, useDefaults } = miningFees
    let { gasLimit } = miningFees
    let nativeAmount = edgeSpendInfo.spendTargets[0].nativeAmount
    if (currencyCode === PRIMARY_CURRENCY && useDefaults) {
      const estimateGasParams = {
        to: publicAddress,
        gas: '0xffffff',
        value: bns.add(nativeAmount, '0', 16)
      }
      try {
        const funcs = []
        funcs.push(async () => {
          return this.ethNetwork.multicastServers(
            'eth_estimateGas',
            estimateGasParams
          )
        })
        const result = await asyncWaterfall(funcs, 5000)
        gasLimit = bns.add(result.result, '0')
      } catch (err) {
        console.log(err)
      }
    }

    if (currencyCode === PRIMARY_CURRENCY) {
      const ethParams: EthereumTxOtherParams = {
        from: [this.walletLocalData.publicKey],
        to: [publicAddress],
        gas: gasLimit,
        gasPrice: gasPrice,
        gasUsed: '0',
        cumulativeGasUsed: '0',
        errorVal: 0,
        tokenRecipientAddress: null,
        data: data
      }
      otherParams = ethParams
    } else {
      let contractAddress = ''
      if (data) {
        contractAddress = publicAddress
      } else {
        const tokenInfo = this.getTokenInfo(currencyCode)
        if (!tokenInfo || typeof tokenInfo.contractAddress !== 'string') {
          throw new Error(
            'Error: Token not supported or invalid contract address'
          )
        }

        contractAddress = tokenInfo.contractAddress
      }

      const ethParams: EthereumTxOtherParams = {
        from: [this.walletLocalData.publicKey],
        to: [contractAddress],
        gas: gasLimit,
        gasPrice: gasPrice,
        gasUsed: '0',
        cumulativeGasUsed: '0',
        errorVal: 0,
        tokenRecipientAddress: publicAddress,
        data: data
      }
      otherParams = ethParams
    }

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
        throw new InsufficientFundsError('Insufficient ETH for transaction fee')
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
    if (edgeTransaction.otherParams.data != null) {
      data = edgeTransaction.otherParams.data
    } else if (edgeTransaction.currencyCode === PRIMARY_CURRENCY) {
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

    this.log('signTx txParams', txParams)
    const tx = new EthereumTx(txParams)
    tx.sign(privKey)

    edgeTransaction.signedTx = bufToHex(tx.serialize())
    edgeTransaction.txid = bufToHex(tx.hash())
    edgeTransaction.date = Date.now() / 1000

    return edgeTransaction
  }

  async broadcastTx(
    edgeTransaction: EdgeTransaction
  ): Promise<EdgeTransaction> {
    const result = await this.ethNetwork.multicastServers(
      'broadcastTx',
      edgeTransaction
    )

    // Success
    this.log(`SUCCESS broadcastTx\n${JSON.stringify(result)}`)
    this.log('edgeTransaction = ', edgeTransaction)

    return edgeTransaction
  }

  getDisplayPrivateSeed() {
    if (this.walletInfo.keys && this.walletInfo.keys.ethereumKey) {
      return this.walletInfo.keys.ethereumKey
    }
    return ''
  }

  getDisplayPublicSeed() {
    if (this.walletInfo.keys && this.walletInfo.keys.publicKey) {
      return this.walletInfo.keys.publicKey
    }
    return ''
  }
}

export { CurrencyEngine }
