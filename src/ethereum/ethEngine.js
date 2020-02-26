/**
 * Created by paul on 7/7/17.
 */
// @flow

import { bns } from 'biggystring'
import {
  type EdgeCurrencyEngineOptions,
  type EdgeCurrencyInfo,
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
  getOtherParams,
  normalizeAddress,
  toHex,
  validateObject
} from '../common/utils.js'
import { EthereumPlugin } from './ethBasedPlugin.js'
import { calcMiningFee } from './ethMiningFees.js'
import { EthereumNetwork } from './ethNetwork'
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
  type EthereumWalletOtherData
} from './ethTypes.js'

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
    opts: EdgeCurrencyEngineOptions,
    currencyInfo: EdgeCurrencyInfo
  ) {
    super(currencyPlugin, walletInfo, opts)
    const { pluginName } = this.currencyInfo
    if (typeof this.walletInfo.keys[`${pluginName}Key`] !== 'string') {
      if (walletInfo.keys.keys && walletInfo.keys.keys[`${pluginName}Key`]) {
        this.walletInfo.keys[`${pluginName}Key`] =
          walletInfo.keys.keys[`${pluginName}Key`]
      }
    }
    this.currencyPlugin = currencyPlugin
    this.initOptions = initOptions
    this.ethNetwork = new EthereumNetwork(this, this.currencyInfo)
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
      currencyCode: this.currencyInfo.currencyCode,
      blockHeight: 0,
      nativeAmount,
      networkFee: tx.fees.toString(10),
      ourReceiveAddresses,
      signedTx: '',
      otherParams
    }
    this.addTransaction(this.currencyInfo.currencyCode, edgeTransaction)
  }

  // currently only for Ethereum
  async checkUnconfirmedTransactionsInnerLoop() {
    const address = normalizeAddress(this.walletLocalData.publicKey)
    const lowerCaseCurrencyCode = this.currencyInfo.currencyCode.toLowerCase()
    const url = `${this.currencyInfo.defaultSettings.otherSettings.superethServers[0]}/v1/${lowerCaseCurrencyCode}/main/txs/${address}`
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

  // curreently for Ethereum but should allow other currencies
  async checkUpdateNetworkFees() {
    try {
      const infoServer = getEdgeInfoServer()
      const url = `${infoServer}/v1/networkFees/${this.currencyInfo.currencyCode}`
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
      this.log(
        `Error fetching ${this.currencyInfo.currencyCode} networkFees from Edge info server`
      )
      this.log(err)
    }

    // only for Ethereum, can keep hard-coded URL for now
    try {
      const lowerCaseCurrencyCode = this.currencyInfo.currencyCode.toLowerCase()
      const url = `https://www.ethgasstation.info/json/${lowerCaseCurrencyCode}gasAPI.json`
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
          this.log('Invalid safeLow value from EthGasStation')
          return
        }
        if (average < 1 || average > 3000) {
          this.log('Invalid average value from EthGasStation')
          return
        }
        if (fast < 1 || fast > 3000) {
          this.log('Invalid fastest value from EthGasStation')
          return
        }
        if (fastest < 1 || fastest > 3000) {
          this.log('Invalid fastest value from EthGasStation')
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
      this.log(
        `Error fetching ${this.currencyInfo.currencyCode} networkFees from EthGasStation`
      )
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
    if (
      this.currencyInfo.defaultSettings.otherSettings
        .checkUnconfirmedTransactions
    ) {
      this.addToLoop(
        'checkUnconfirmedTransactionsInnerLoop',
        UNCONFIRMED_TRANSACTION_POLL_MILLISECONDS
      )
    }

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
      throw new TypeError(`Invalid ${this.currencyInfo.pluginName} address`)
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
    if (currencyCode === this.currencyInfo.currencyCode && useDefaults) {
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
        this.log(err)
      }
    }

    if (currencyCode === this.currencyInfo.currencyCode) {
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
        data
      }
      otherParams = ethParams
    }

    const nativeBalance = this.walletLocalData.totalBalances[
      this.currencyInfo.currencyCode
    ]

    let nativeNetworkFee = bns.mul(gasPrice, gasLimit)
    let totalTxAmount = '0'
    let parentNetworkFee = null

    if (currencyCode === this.currencyInfo.currencyCode) {
      totalTxAmount = bns.add(nativeNetworkFee, nativeAmount)
      if (bns.gt(totalTxAmount, nativeBalance)) {
        throw new InsufficientFundsError()
      }
      nativeAmount = bns.mul(totalTxAmount, '-1')
    } else {
      parentNetworkFee = nativeNetworkFee

      if (bns.gt(nativeNetworkFee, nativeBalance)) {
        throw new InsufficientFundsError(
          `Insufficient ${this.currencyInfo.currencyCode} for transaction fee`
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

    if (edgeTransaction.currencyCode === this.currencyInfo.currencyCode) {
      // Remove the networkFee from the nativeAmount
      const nativeAmount = bns.add(
        edgeTransaction.nativeAmount,
        edgeTransaction.networkFee
      )
      nativeAmountHex = bns.mul('-1', nativeAmount, 16)
    } else {
      nativeAmountHex = bns.mul('-1', edgeTransaction.nativeAmount, 16)
    }
    const nonceArg = otherParams.nonceArg
    let nonceHex = nonceArg && toHex(nonceArg)
    if (!nonceHex) {
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
    }
    if (!nonceHex) {
      nonceHex = toHex(this.walletLocalData.otherData.nextNonce)
      this.walletLocalData.otherData.unconfirmedNextNonce = bns.add(
        this.walletLocalData.otherData.nextNonce,
        '1'
      )
    }

    let data
    if (otherParams.data != null) {
      data = otherParams.data
    } else if (
      edgeTransaction.currencyCode === this.currencyInfo.currencyCode
    ) {
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
      data,
      // EIP 155 chainId - ETH mainnet: 1, ETH ropsten: 3
      chainId: this.currencyInfo.defaultSettings.otherSettings.chainId
    }

    const privKey = Buffer.from(
      this.walletInfo.keys[`${this.currencyInfo.pluginName}Key`],
      'hex'
    )
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
    if (
      this.walletInfo.keys &&
      this.walletInfo.keys[`${this.currencyInfo.pluginName}Key`]
    ) {
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
