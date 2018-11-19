/**
 * Created by paul on 7/7/17.
 */
// @flow

// import { currencyInfo } from './stellarInfo.js'
import type {
  EdgeTransaction,
  EdgeSpendInfo,
  EdgeCurrencyEngineOptions,
  EdgeWalletInfo
} from 'edge-core-js'
import { error } from 'edge-core-js'

import { bns } from 'biggystring'
import {
  type StellarAccount,
  type StellarOperation,
  type StellarTransaction,
  type StellarWalletOtherData
} from './stellarTypes.js'
import { CurrencyEngine } from '../common/engine.js'
import { StellarPlugin } from '../stellar/stellarPlugin.js'
import {
  getDenomInfo,
  asyncWaterfall,
  promiseAny
} from '../common/utils.js'

const TX_QUERY_PAGING_LIMIT = 2
const ADDRESS_POLL_MILLISECONDS = 15000
const BLOCKCHAIN_POLL_MILLISECONDS = 30000
const TRANSACTION_POLL_MILLISECONDS = 5000

type StellarServerFunction =
  | 'payments'
  | 'loadAccount'
  | 'ledgers'
  | 'submitTransaction'

export class StellarEngine extends CurrencyEngine {
  stellarPlugin: StellarPlugin
  stellarApi: Object
  balancesChecked: number
  transactionsChecked: number
  activatedAccountsCache: { [publicAddress: string]: boolean }
  pendingTransactionsMap: { [txid: string]: Object }
  otherData: StellarWalletOtherData

  constructor (
    currencyPlugin: StellarPlugin,
    io_: any,
    walletInfo: EdgeWalletInfo,
    opts: EdgeCurrencyEngineOptions
  ) {
    super(currencyPlugin, io_, walletInfo, opts)
    this.stellarPlugin = currencyPlugin
    this.stellarApi = {}
    this.balancesChecked = 0
    this.transactionsChecked = 0
    this.activatedAccountsCache = {}
    this.pendingTransactionsMap = {}
  }

  async multicastServers (
    func: StellarServerFunction,
    ...params: any
  ): Promise<any> {
    let out = { result: '', server: '' }
    let funcs
    switch (func) {
      // Functions that should waterfall from top to low priority servers
      case 'loadAccount':
        funcs = this.stellarPlugin.stellarApiServers.map(api => async () => {
          const result = await api[func](...params)
          return { server: api.serverName, result }
        })
        out = await asyncWaterfall(funcs)
        break

      case 'ledgers':
        funcs = this.stellarPlugin.stellarApiServers.map(
          serverApi => async () => {
            const result = await serverApi
              .ledgers()
              .order('desc')
              .limit(1)
              .call()
            const blockHeight = result.records[0].sequence
            if (
              this.walletLocalData.blockHeight <= blockHeight &&
              blockHeight >= this.currencyPlugin.highestTxHeight
            ) {
              return { server: serverApi.serverName, result }
            } else {
              throw new Error('Height out of date')
            }
          }
        )
        out = await asyncWaterfall(funcs)
        break

      case 'payments':
        funcs = this.stellarPlugin.stellarApiServers.map(
          serverApi => async () => {
            const result = await serverApi
              .payments()
              .limit(TX_QUERY_PAGING_LIMIT)
              .cursor(this.otherData.lastPagingToken)
              .forAccount(...params)
              .call()
            return { server: serverApi.serverName, result }
          }
        )
        out = await asyncWaterfall(funcs)
        break

      // Functions that should multicast to all servers
      case 'submitTransaction':
        out = await promiseAny(
          this.stellarPlugin.stellarApiServers.map(async serverApi => {
            const result = await serverApi[func](...params)
            return { server: serverApi.serverName, result }
          })
        )
        break
    }
    this.log(`XLM multicastServers ${func} ${out.server} won`)
    return out.result
  }

  async processTransaction (tx: StellarOperation): Promise<string> {
    const ourReceiveAddresses: Array<string> = []

    let currencyCode = ''
    let exchangeAmount = ''
    let fromAddress = ''
    let toAddress, nativeAmount, networkFee
    if (tx.type === 'create_account') {
      fromAddress = tx.source_account
      toAddress = tx.account
      exchangeAmount = tx.starting_balance
      currencyCode = this.currencyInfo.currencyCode
    } else if (tx.type === 'payment') {
      fromAddress = tx.from
      toAddress = tx.to
      exchangeAmount = tx.amount
      if (tx.asset_type === 'native') {
        currencyCode = this.currencyInfo.currencyCode
      } else {
        currencyCode = tx.asset_type
      }
    }

    const date: number = Date.parse(tx.created_at) / 1000
    const denom = getDenomInfo(this.currencyInfo, currencyCode)
    if (denom && denom.multiplier) {
      nativeAmount = bns.mul(exchangeAmount, denom.multiplier)
    } else {
      throw new Error('ErrorDenomNotFound')
    }

    let rawTx: StellarTransaction
    try {
      rawTx = await tx.transaction()
      networkFee = rawTx.fee_paid.toString()
    } catch (e) {
      this.log(e)
      throw e
    }

    if (toAddress === this.walletLocalData.publicKey) {
      ourReceiveAddresses.push(fromAddress)
    } else {
      // This is a spend. Include fee in amount and make amount negative
      nativeAmount = bns.add(nativeAmount, networkFee)
      nativeAmount = '-' + nativeAmount
    }
    const edgeTransaction: EdgeTransaction = {
      txid: tx.transaction_hash,
      date,
      currencyCode,
      blockHeight: rawTx.ledger_attr, // API shows no ledger number ??
      nativeAmount,
      networkFee,
      parentNetworkFee: '0',
      ourReceiveAddresses,
      signedTx: 'has_been_signed',
      otherParams: {
        fromAddress,
        toAddress
      }
    }

    this.addTransaction(currencyCode, edgeTransaction)
    return tx.paging_token
  }

  // Streaming version. Doesn't work in RN
  // async checkTransactionsInnerLoop () {
  //   const address = this.walletLocalData.publicKey
  //   const txHandler = (tx) => {
  //     this.log('Got something:')
  //     this.processTransaction(tx)
  //   }
  //   let close
  //   const errorHandler = (e) => {
  //     if (close) {
  //       close()
  //       close = null
  //       this.checkTransactionsInnerLoop()
  //     }
  //   }
  //   close = this.stellarServer.payments()
  //     .forAccount(address)
  //     .limit(TX_QUERY_PAGING_LIMIT)
  //     .cursor(this.otherData.lastPagingToken)
  //     .stream({
  //       onmessage: txHandler,
  //       onerror: errorHandler
  //     })
  // }

  // Polling version
  async checkTransactionsInnerLoop () {
    const address = this.walletLocalData.publicKey
    let page
    let pagingToken
    while (1) {
      try {
        if (!page) {
          page = await this.multicastServers('payments', address)
        } else {
          page = await page.next()
        }
        if (page.records.length === 0) {
          break
        }
        for (const tx of page.records) {
          pagingToken = await this.processTransaction(tx)
        }
      } catch (e) {
        pagingToken = undefined
      }
    }
    if (this.transactionsChangedArray.length > 0) {
      this.currencyEngineCallbacks.onTransactionsChanged(
        this.transactionsChangedArray
      )
      this.transactionsChangedArray = []
    }
    if (pagingToken) {
      this.otherData.lastPagingToken = pagingToken
      this.walletLocalDataDirty = true
    }
    this.transactionsChecked = 1
    this.updateOnAddressesChecked()
  }

  updateOnAddressesChecked () {
    if (this.addressesChecked === 1) {
      return
    }
    this.addressesChecked =
      (this.balancesChecked + this.transactionsChecked) / 2
    this.currencyEngineCallbacks.onAddressesChecked(this.addressesChecked)
  }

  async checkUnconfirmedTransactionsFetch () {}

  // Check all account balance and other relevant info
  async checkAccountInnerLoop () {
    const address = this.walletLocalData.publicKey
    try {
      const account: StellarAccount = await this.multicastServers(
        'loadAccount',
        address
      )
      if (account.sequence !== this.otherData.accountSequence) {
        this.otherData.accountSequence = account.sequence
      }
      for (const bal of account.balances) {
        let currencyCode
        if (bal.asset_type === 'native') {
          currencyCode = this.currencyInfo.currencyCode
          this.log('--Got balances--')
        } else {
          currencyCode = bal.asset_type
        }
        const denom = getDenomInfo(this.currencyInfo, currencyCode)
        if (denom && denom.multiplier) {
          const nativeAmount = bns.mul(bal.balance, denom.multiplier)
          if (
            typeof this.walletLocalData.totalBalances[currencyCode] ===
            'undefined'
          ) {
            this.walletLocalData.totalBalances[currencyCode] = '0'
          }

          if (
            this.walletLocalData.totalBalances[currencyCode] !== nativeAmount
          ) {
            this.walletLocalData.totalBalances[currencyCode] = nativeAmount
            this.currencyEngineCallbacks.onBalanceChanged(
              currencyCode,
              nativeAmount
            )
          }
        }
      }
      this.balancesChecked = 1
      this.updateOnAddressesChecked()
    } catch (e) {
      this.log(`Error fetching address info: ${JSON.stringify(e)}`)
    }
  }

  checkBlockchainInnerLoop () {
    this.multicastServers('ledgers')
      .then(r => {
        const blockHeight = r.records[0].sequence
        if (this.walletLocalData.blockHeight !== blockHeight) {
          this.walletLocalData.blockHeight = blockHeight
          this.walletLocalDataDirty = true
          this.currencyEngineCallbacks.onBlockHeightChanged(
            this.walletLocalData.blockHeight
          )
        }
      })
      .catch(e => {
        this.log(e)
      })
  }

  async clearBlockchainCache (): Promise<void> {
    this.balancesChecked = 0
    this.transactionsChecked = 0
    this.activatedAccountsCache = {}
    this.otherData.accountSequence = 0
    this.pendingTransactionsMap = {}
    await super.clearBlockchainCache()
  }

  // ****************************************************************************
  // Public methods
  // ****************************************************************************

  async startEngine () {
    this.engineOn = true
    this.addToLoop('checkBlockchainInnerLoop', BLOCKCHAIN_POLL_MILLISECONDS)
    this.addToLoop('checkAccountInnerLoop', ADDRESS_POLL_MILLISECONDS)
    this.addToLoop('checkTransactionsInnerLoop', TRANSACTION_POLL_MILLISECONDS)
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
  }

  async resyncBlockchain (): Promise<void> {
    await this.killEngine()
    await this.clearBlockchainCache()
    await this.startEngine()
  }

  // synchronous
  async makeSpend (edgeSpendInfoIn: EdgeSpendInfo) {
    const { edgeSpendInfo, currencyCode, nativeBalance, denom } = super.makeSpend(edgeSpendInfoIn)

    if (edgeSpendInfo.spendTargets.length !== 1) {
      throw new Error('Error: only one output allowed')
    }
    const publicAddress = edgeSpendInfo.spendTargets[0].publicAddress
    // Check if destination address is activated
    let mustCreateAccount = false
    const activated = this.activatedAccountsCache[publicAddress]
    if (activated === false) {
      mustCreateAccount = true
    } else if (activated === undefined) {
      try {
        await this.multicastServers('loadAccount', publicAddress)
        this.activatedAccountsCache[publicAddress] = true
      } catch (e) {
        this.activatedAccountsCache[publicAddress] = false
        mustCreateAccount = true
      }
    }

    let nativeAmount = '0'
    if (typeof edgeSpendInfo.spendTargets[0].nativeAmount === 'string') {
      nativeAmount = edgeSpendInfo.spendTargets[0].nativeAmount
    } else {
      throw new error.NoAmountSpecifiedError()
    }

    if (bns.eq(nativeAmount, '0')) {
      throw new error.NoAmountSpecifiedError()
    }

    const exchangeAmount = bns.div(nativeAmount, denom.multiplier, 7)

    const account = new this.stellarApi.Account(
      this.walletLocalData.publicKey,
      this.otherData.accountSequence
    )
    let memoId: ?string
    if (
      edgeSpendInfo.spendTargets[0].otherParams &&
      edgeSpendInfo.spendTargets[0].otherParams.uniqueIdentifier
    ) {
      memoId = edgeSpendInfo.spendTargets[0].otherParams.uniqueIdentifier
    }
    const txBuilder = new this.stellarApi.TransactionBuilder(account)
    let transaction

    if (mustCreateAccount) {
      transaction = txBuilder.addOperation(
        this.stellarApi.Operation.createAccount({
          destination: publicAddress,
          startingBalance: exchangeAmount
        })
      )
    } else {
      transaction = txBuilder.addOperation(
        this.stellarApi.Operation.payment({
          destination: publicAddress,
          asset: this.stellarApi.Asset.native(),
          amount: exchangeAmount
        })
      )
    }
    if (memoId) {
      const memo = this.stellarApi.Memo.id(memoId)
      transaction = transaction.addMemo(memo)
    }
    transaction = transaction.build()

    const networkFee = transaction.fee.toString()
    nativeAmount = bns.add(networkFee, nativeAmount) // Add fee to total
    const nativeBalance2 = bns.sub(nativeBalance, '10000000') // Subtract the 1 min XLM
    if (bns.gt(nativeAmount, nativeBalance2)) {
      throw new error.InsufficientFundsError()
    }

    nativeAmount = `-${nativeAmount}`
    const idInternal = Buffer.from(this.io.random(32)).toString('hex')
    const edgeTransaction: EdgeTransaction = {
      txid: '', // txid
      date: 0, // date
      currencyCode, // currencyCode
      blockHeight: 0, // blockHeight
      nativeAmount, // nativeAmount
      networkFee, // networkFee
      ourReceiveAddresses: [], // ourReceiveAddresses
      signedTx: '0', // signedTx
      otherParams: {
        idInternal,
        fromAddress: this.walletLocalData.publicKey,
        toAddress: publicAddress
      }
    }
    this.pendingTransactionsMap = {}
    this.pendingTransactionsMap[idInternal] = transaction

    this.log('Stellar transaction prepared')
    this.log(`idInternal: ${idInternal}`)
    this.log(
      `${nativeAmount} ${this.walletLocalData.publicKey} -> ${publicAddress}`
    )
    return edgeTransaction
  }

  // asynchronous
  async signTx (edgeTransaction: EdgeTransaction): Promise<EdgeTransaction> {
    // Do signing
    try {
      const idInternal = edgeTransaction.otherParams.idInternal
      const transaction = this.pendingTransactionsMap[idInternal]
      if (!transaction) {
        throw new Error('ErrorInvalidTransaction')
      }
      this.log('Signing...')
      const keypair = this.stellarApi.Keypair.fromSecret(
        this.walletInfo.keys.stellarKey
      )
      await transaction.sign(keypair)
    } catch (e) {
      this.log(e)
      throw e
    }
    return edgeTransaction
  }

  // asynchronous
  async broadcastTx (
    edgeTransaction: EdgeTransaction
  ): Promise<EdgeTransaction> {
    try {
      const idInternal = edgeTransaction.otherParams.idInternal
      const transaction = this.pendingTransactionsMap[idInternal]
      if (!transaction) {
        throw new Error('ErrorInvalidTransaction')
      }
      this.log('Broadcasting...')
      const result = await this.multicastServers(
        'submitTransaction',
        transaction
      )
      edgeTransaction.txid = result.hash
      edgeTransaction.date = Date.now() / 1000
      this.activatedAccountsCache[edgeTransaction.otherParams.toAddress] = true
      this.otherData.accountSequence++
      this.walletLocalDataDirty = true
    } catch (e) {
      this.log(e)
      throw e
    }
    return edgeTransaction
  }

  getDisplayPrivateSeed () {
    if (this.walletInfo.keys && this.walletInfo.keys.stellarKey) {
      return this.walletInfo.keys.stellarKey
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
