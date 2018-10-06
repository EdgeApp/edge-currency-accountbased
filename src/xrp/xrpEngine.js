/**
 * Created by paul on 7/7/17.
 */
// @flow

import { currencyInfo } from './xrpInfo.js'
import type {
  EdgeTransaction,
  EdgeSpendInfo,
  EdgeCurrencyEngineOptions,
  EdgeWalletInfo
} from 'edge-core-js'
import { error } from 'edge-core-js'

import { bns } from 'biggystring'
import {
  XrpGetServerInfoSchema,
  XrpGetBalancesSchema,
  // XrpOnTransactionSchema,
  XrpGetTransactionsSchema
} from './xrpSchema.js'
import {
  type XrpGetTransaction,
  type XrpGetTransactions,
  type XrpWalletOtherData
} from './xrpTypes.js'
import { XrpPlugin } from './xrpPlugin.js'
import {
  CurrencyEngine
} from '../common/engine.js'
import { validateObject, promiseAny, asyncWaterfall } from '../common/utils.js'

const ADDRESS_POLL_MILLISECONDS = 10000
const BLOCKHEIGHT_POLL_MILLISECONDS = 15000
const TRANSACTION_POLL_MILLISECONDS = 3000
const ADDRESS_QUERY_LOOKBACK_BLOCKS = (30 * 60) // ~ one minute

const PRIMARY_CURRENCY = currencyInfo.currencyCode

type XrpParams = {
  preparedTx: Object
  // publicAddress?: string,
  // contractAddress?: string
}

type XrpFunction = 'getFee' | 'getServerInfo' | 'getTransactions' | 'getBalances' | 'connect' | 'disconnect' | 'preparePayment' | 'sign' | 'submit'
export class XrpEngine extends CurrencyEngine {
  xrpPlugin: XrpPlugin
  otherData: XrpWalletOtherData
  // callbacksSetup: boolean

  constructor (currencyPlugin: XrpPlugin, io_: any, walletInfo: EdgeWalletInfo, opts: EdgeCurrencyEngineOptions) {
    super(currencyPlugin, io_, walletInfo, opts)
    this.xrpPlugin = currencyPlugin
    // this.callbacksSetup = false
  }

  async multicastServers (func: XrpFunction, ...params: any): Promise<any> {
    let out = { result: '' }
    switch (func) {
      // Functions that should waterfall from top to low priority servers
      case 'getFee':
      case 'getServerInfo':
      case 'getBalances':
      case 'getTransactions':
        const funcs = this.xrpPlugin.rippleApis.map(api => async () => {
          const result = await api[func](...params)
          return { server: api.serverName, result }
        })
        out = await asyncWaterfall(funcs)
        this.log(`XRP multicastServers ${func} ${out.server} won`)
        break

      // Functions that should multicast to all servers
      case 'connect':
      case 'disconnect':
      case 'submit':
        out = await promiseAny(this.xrpPlugin.rippleApis.map(async (api) => {
          const result = await api[func](...params)
          return { server: api.serverName, result }
        }))
        this.log(`XRP multicastServers ${func} ${out.server} won`)
        break

      // Client-side functions that should just pick one server since they don't actually connect
      case 'preparePayment':
      case 'sign':
        out.result = await this.xrpPlugin.rippleApis[0][func](...params)
        break
    }
    return out.result
  }

  // Poll on the blockheight
  async checkServerInfoInnerLoop () {
    try {
      const fee = await this.multicastServers('getFee')
      if (typeof fee === 'string') {
        this.otherData.recommendedFee = fee
        this.walletLocalDataDirty = true
      }
      const jsonObj = await this.multicastServers('getServerInfo')
      const valid = validateObject(jsonObj, XrpGetServerInfoSchema)
      if (valid) {
        const blockHeight: number = jsonObj.validatedLedger.ledgerVersion
        this.log(`Got block height ${blockHeight}`)
        if (this.walletLocalData.blockHeight !== blockHeight) {
          this.walletLocalData.blockHeight = blockHeight // Convert to decimal
          this.walletLocalDataDirty = true
          this.currencyEngineCallbacks.onBlockHeightChanged(this.walletLocalData.blockHeight)
        }
      } else {
        this.log('Invalid data returned from rippleApi.getServerInfo')
      }
    } catch (err) {
      this.log(`Error fetching height: ${JSON.stringify(err)}`)
    }
  }

  processRippleTransaction (tx: XrpGetTransaction) {
    const ourReceiveAddresses:Array<string> = []

    const balanceChanges = tx.outcome.balanceChanges[this.walletLocalData.publicKey]
    if (balanceChanges) {
      for (const bc of balanceChanges) {
        const currencyCode: string = bc.currency
        const date: number = Date.parse(tx.outcome.timestamp) / 1000
        const blockHeight: number = tx.outcome.ledgerVersion

        let exchangeAmount: string = bc.value
        if (exchangeAmount.slice(0, 1) === '-') {
          exchangeAmount = bns.add(tx.outcome.fee, exchangeAmount)
        } else {
          ourReceiveAddresses.push(this.walletLocalData.publicKey)
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
        this.addTransaction(currencyCode, edgeTransaction)
      }
    }
  }

  async checkTransactionsInnerLoop () {
    const address = this.walletLocalData.publicKey
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
      const transactions: XrpGetTransactions = await this.multicastServers('getTransactions', address, options)
      const valid = validateObject(transactions, XrpGetTransactionsSchema)
      if (valid) {
        this.log(`Fetched transactions count: ${transactions.length} startBlock:${startBlock}`)

        // Get transactions
        // Iterate over transactions in address
        for (let i = 0; i < transactions.length; i++) {
          const tx = transactions[i]
          this.processRippleTransaction(tx)
        }
        if (this.transactionsChangedArray.length > 0) {
          this.currencyEngineCallbacks.onTransactionsChanged(
            this.transactionsChangedArray
          )
          this.transactionsChangedArray = []
        }
        this.updateOnAddressesChecked()
      } else {
        this.log('Invalid data returned from rippleApi.getTransactions')
      }
    } catch (e) {
      this.log(e.code)
      this.log(e.message)
      this.log(e)
      this.log(`Error fetching transactions: ${JSON.stringify(e)}`)
    }
  }

  updateOnAddressesChecked () {
    if (this.addressesChecked) {
      return
    }
    this.addressesChecked = 1
    this.walletLocalData.lastAddressQueryHeight = this.walletLocalData.blockHeight
    this.currencyEngineCallbacks.onAddressesChecked(1)
  }

  async checkUnconfirmedTransactionsFetch () {

  }

  // Check all account balance and other relevant info
  async checkAccountInnerLoop () {
    const address = this.walletLocalData.publicKey
    try {
      const jsonObj = await this.multicastServers('getBalances', address)
      const valid = validateObject(jsonObj, XrpGetBalancesSchema)
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
            this.currencyEngineCallbacks.onBalanceChanged(currencyCode, nativeAmount)
          }
        }
      } else {
        this.log('Invalid data returned from rippleApi.getBalances')
      }
    } catch (e) {
      this.log(`Error fetching address info: ${JSON.stringify(e)}`)
    }
  }

  async clearBlockchainCache () {
    await super.clearBlockchainCache()
  }

  // ****************************************************************************
  // Public methods
  // ****************************************************************************

  // setupCallbacks () {
  //   // Callbacks are persistent so only do once
  //   if (!this.callbacksSetup) {
  //     this.currencyPlugin.connectionPool.on('ledger', (ledger) => {
  //       this.log('Ledger A closed', ledger)
  //     })
  //     this.currencyPlugin.connectionPool.on('transaction', (tx) => {
  //       const valid = validateObject(tx, XrpOnTransactionSchema)
  //       if (valid) {
  //         if (
  //           tx.Data.transaction.Account.toLowerCase() === this.walletLocalData.publicKey.toLowerCase() ||
  //           tx.Data.transaction.Destination.toLowerCase() === this.walletLocalData.publicKey.toLowerCase()
  //         ) {
  //           this.checkTransactionsInnerLoop()
  //         }
  //       } else {
  //         this.log('Invalid data from connectionPool on Transaction')
  //       }
  //     })
  //     this.callbacksSetup = true
  //   }
  // }

  // joinPool () {
  //   this.setupCallbacks()
  //   this.currencyPlugin.connectionPool.subscribeAccount(this.walletLocalData.publicKey)
  //   if (isEmpty(this.currencyPlugin.connectionClients)) {
  //     for (const s of this.currencyInfo.defaultSettings.otherSettings.rippledServers) {
  //       this.currencyPlugin.connectionPool.addServer(s)
  //     }
  //   }
  //   this.currencyPlugin.connectionClients[this.walletId] = true
  // }

  // leavePool () {
  //   this.currencyPlugin.connectionPool.unsubscribeAccount(this.walletLocalData.publicKey)
  //   const t = this.currencyPlugin.connectionPool.getRanking()
  //   this.log(t)
  //   delete this.currencyPlugin.connectionClients[this.walletId]
  //   if (isEmpty(this.currencyPlugin.connectionClients)) {
  //     for (const s of this.currencyInfo.defaultSettings.otherSettings.rippledServers) {
  //       this.currencyPlugin.connectionPool.removeServer(s)
  //     }
  //   }
  // }
  async startEngine () {
    this.engineOn = true
    // this.joinPool()
    // try {
    //   const result = await this.currencyPlugin.connectionPool.send({
    //     command: 'account_info',
    //     account: this.walletLocalData.publicKey
    //   }, {
    //     serverTimeout: 1500,
    //     overallTimeout: 10000
    //   })
    //   console.log(result)
    // } catch (e) {
    //   console.log('Error', e.message)
    // }
    await this.multicastServers('connect')
    this.addToLoop('checkServerInfoInnerLoop', BLOCKHEIGHT_POLL_MILLISECONDS)
    this.addToLoop('checkAccountInnerLoop', ADDRESS_POLL_MILLISECONDS)
    this.addToLoop('checkTransactionsInnerLoop', TRANSACTION_POLL_MILLISECONDS)
    super.startEngine()
  }

  async killEngine () {
    // Set status flag to false
    this.engineOn = false
    // Clear Inner loops timers
    // TODO: make common
    for (const timer in this.timers) {
      clearTimeout(this.timers[timer])
    }
    this.timers = {}
    await this.multicastServers('disconnect')
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
      throw (new error.NoAmountSpecifiedError())
    }

    const nativeBalance = this.walletLocalData.totalBalances[currencyCode]
    const nativeNetworkFee = bns.mul(this.otherData.recommendedFee, '1000000')

    if (currencyCode === PRIMARY_CURRENCY) {
      const totalTxAmount = bns.add(nativeNetworkFee, nativeAmount)
      const virtualTxAmount = bns.add(totalTxAmount, '20000000')
      if (bns.gt(virtualTxAmount, nativeBalance)) {
        throw new error.InsufficientFundsError()
      }
    }

    const exchangeAmount = bns.div(nativeAmount, '1000000', 6)
    let uniqueIdentifier
    if (
      edgeSpendInfo.spendTargets[0].otherParams &&
      edgeSpendInfo.spendTargets[0].otherParams.uniqueIdentifier
    ) {
      if (typeof edgeSpendInfo.spendTargets[0].otherParams.uniqueIdentifier === 'string') {
        uniqueIdentifier = parseInt(edgeSpendInfo.spendTargets[0].otherParams.uniqueIdentifier)
      } else {
        throw new Error('Error invalid destinationtag')
      }
    }
    const payment = {
      source: {
        address: this.walletLocalData.publicKey,
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
        tag: uniqueIdentifier
      }
    }

    let preparedTx = {}
    try {
      preparedTx = await this.multicastServers('preparePayment',
        this.walletLocalData.publicKey,
        payment,
        { maxLedgerVersionOffset: 300 }
      )
    } catch (err) {
      this.log(err)
      throw new Error('Error in preparePayment')
    }

    const otherParams: XrpParams = {
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

    this.log('Payment transaction prepared...')
    return edgeTransaction
  }

  // asynchronous
  async signTx (edgeTransaction: EdgeTransaction): Promise<EdgeTransaction> {
    // Do signing
    const txJson = edgeTransaction.otherParams.preparedTx.txJSON
    const privateKey = this.walletInfo.keys.rippleKey

    const { signedTransaction, id } = await this.multicastServers('sign', txJson, privateKey)
    this.log('Payment transaction signed...')

    edgeTransaction.signedTx = signedTransaction
    edgeTransaction.txid = id.toLowerCase()
    edgeTransaction.date = Date.now() / 1000

    return edgeTransaction
  }

  // asynchronous
  async broadcastTx (edgeTransaction: EdgeTransaction): Promise<EdgeTransaction> {
    await this.multicastServers('submit', edgeTransaction.signedTx)
    return edgeTransaction
  }

  getDisplayPrivateSeed () {
    if (this.walletInfo.keys && this.walletInfo.keys.rippleKey) {
      return this.walletInfo.keys.rippleKey
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
