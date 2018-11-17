/**
 * Created by paul on 7/7/17.
 */
// @flow

import type {
  EdgeTransaction,
  EdgeSpendInfo,
  EdgeWalletInfo,
  EdgeCurrencyEngineOptions,
  EdgeFreshAddress
} from 'edge-core-js'
import { error } from 'edge-core-js'
import { bns } from 'biggystring'
import { MakeSpendSchema } from '../common/schema.js'
import { CurrencyEngine } from '../common/engine.js'
import { validateObject, promiseAny, asyncWaterfall, getDenomInfo } from '../common/utils.js'
import { type EosTransaction, type EosWalletOtherData, type EosTransactionSuperNode } from './eosTypes.js'
import { EosTransactionSuperNodeSchema } from './eosSchema.js'
import { eosConfig, EosPlugin } from './eosPlugin.js'
import eosjs from 'eosjs'

const ADDRESS_POLL_MILLISECONDS = 10000
const BLOCKCHAIN_POLL_MILLISECONDS = 15000
const TRANSACTION_POLL_MILLISECONDS = 3000
const ADDRESS_QUERY_LOOKBACK_BLOCKS = 3 * 60

type EosFunction = 'getActionsSuperNode' | 'getActions' | 'getCurrencyBalance' | 'transaction'

export class EosEngine extends CurrencyEngine {
  // TODO: Add currency specific params
  // Store any per wallet specific data in the `currencyEngine` object. Add any params
  // to the EosEngine class definition in eosEngine.js and initialize them in the
  // constructor()
  eosPlugin: EosPlugin
  balancesChecked: number
  transactionsChecked: number
  activatedAccountsCache: { [publicAddress: string]: boolean }
  otherData: EosWalletOtherData

  constructor (
    currencyPlugin: EosPlugin,
    io_: any,
    walletInfo: EdgeWalletInfo,
    opts: EdgeCurrencyEngineOptions
  ) {
    super(currencyPlugin, io_, walletInfo, opts)
    if (typeof this.walletInfo.keys.ownerPublicKey !== 'string') {
      if (walletInfo.keys.ownerPublicKey) {
        this.walletInfo.keys.ownerPublicKey = walletInfo.keys.ownerPublicKey
      } else {
        const pubKeys = currencyPlugin.derivePublicKey(this.walletInfo)
        this.walletInfo.keys.ownerPublicKey = pubKeys.ownerPublicKey
      }
    }

    this.eosPlugin = currencyPlugin
    this.balancesChecked = 0
    this.transactionsChecked = 0
    this.activatedAccountsCache = {}
  }

  // Poll on the blockheight
  async checkBlockchainInnerLoop () {
    try {
      const result = await new Promise((resolve, reject) => {
        this.eosPlugin.eosServer.getInfo((error, info) => {
          if (error) reject(error)
          else resolve(info)
        })
      })
      const blockHeight = result.head_block_num
      if (this.walletLocalData.blockHeight !== blockHeight) {
        this.walletLocalData.blockHeight = blockHeight
        this.walletLocalDataDirty = true
        this.currencyEngineCallbacks.onBlockHeightChanged(
          this.walletLocalData.blockHeight
        )
      }
    } catch (e) {
      this.log(`Error fetching height: ${JSON.stringify(e)}`)
    }
  }

  processTransactionSuperNode (action: EosTransactionSuperNode) {
    const result = validateObject(action, EosTransactionSuperNodeSchema)
    if (!result) {
      this.log('Invalid supernode tx')
      return
    }

    const {
      txid,
      date,
      currencyCode,
      blockHeight,
      networkFee,
      parentNetworkFee,
      signedTx,
      metadata,
      otherParams,
      exchangeAmount
    } = action
    const ourReceiveAddresses = []
    const denom = getDenomInfo(this.currencyInfo, currencyCode)
    if (!denom) {
      this.log(`Received unsupported currencyCode: ${currencyCode}`)
      return
    }
    let nativeAmount = bns.mul(exchangeAmount, denom.multiplier)
    if (otherParams.toAddress === this.walletLocalData.otherData.accountName) {
      ourReceiveAddresses.push(otherParams.toAddress)
    } else {
      nativeAmount = `-${nativeAmount}`
    }

    const edgeTransaction: EdgeTransaction = {
      txid,
      date: Date.parse(date) / 1000,
      currencyCode,
      blockHeight,
      nativeAmount,
      networkFee,
      parentNetworkFee,
      ourReceiveAddresses,
      signedTx,
      metadata,
      otherParams
    }

    this.addTransaction(currencyCode, edgeTransaction)
  }

  processTransaction (action: EosTransaction) {
    const ourReceiveAddresses = []
    const date = Date.parse(action.block_time) / 1000
    const blockHeight = action.block_num
    if (!action.action_trace) {
      this.log('Invalid EOS transaction data. No action_trace')
      return
    }
    const txid = action.action_trace.trx_id

    if (!action.action_trace.act) {
      this.log('Invalid EOS transaction data. No action_trace.act')
      return
    }
    const name = action.action_trace.act.name
    // this.log('------------------------------------------------')
    // this.log(`Txid: ${txid}`)
    // this.log(`Action type: ${name}`)
    if (name === 'transfer') {
      if (!action.action_trace.act.data) {
        this.log('Invalid EOS transaction data. No action_trace.act.data')
        return
      }
      const { from, to, memo, quantity } = action.action_trace.act.data
      const split = quantity.split(' ')
      const [exchangeAmount, currencyCode] = split

      const denom = getDenomInfo(this.currencyInfo, currencyCode)
      if (!denom) {
        throw new Error('ErrorInvalidCurrencyCode')
      }
      let nativeAmount = bns.mul(exchangeAmount, denom.multiplier)
      if (to === this.walletLocalData.otherData.accountName) {
        ourReceiveAddresses.push(to)
      } else {
        nativeAmount = `-${nativeAmount}`
      }

      const edgeTransaction: EdgeTransaction = {
        txid,
        date,
        currencyCode,
        blockHeight,
        nativeAmount,
        networkFee: '0',
        parentNetworkFee: '0',
        ourReceiveAddresses,
        signedTx: 'has_been_signed',
        metadata: {
          notes: memo
        },
        otherParams: { fromAddress: from, toAddress: to }
      }

      this.addTransaction(currencyCode, edgeTransaction)

      // this.log(`From: ${from}`)
      // this.log(`To: ${to}`)
      // this.log(`Memo: ${memo}`)
      // this.log(`Amount: ${exchangeAmount}`)
      // this.log(`currencyCode: ${currencyCode}`)
    }
  }

  async checkTransactionsInnerLoop () {
    try {
      let startBlock: number = 0
      if (this.walletLocalData.lastAddressQueryHeight > ADDRESS_QUERY_LOOKBACK_BLOCKS) {
        // Only query for transactions as far back as ADDRESS_QUERY_LOOKBACK_BLOCKS from the last time we queried transactions
        startBlock = this.walletLocalData.lastAddressQueryHeight - ADDRESS_QUERY_LOOKBACK_BLOCKS
      }

      let actions
      try {
        // Try super nodes first
        const url =
          `/v1/history/get_actions/` +
          this.walletLocalData.otherData.accountName +
          `/transfer?pure=false&blockHeight=` + startBlock.toString()
        const result = await this.multicastServers('getActionsSuperNode', url)
        actions = await result.json()
        if (actions.length) {
          for (const action of actions) {
            this.processTransactionSuperNode(action)
          }
        }
        this.transactionsChecked = 1
      } catch (e) {
        // Try regular nodes
        const actionsObject = await this.multicastServers('getActions',
          this.walletLocalData.otherData.accountName
        )
        if (actionsObject.actions && actionsObject.actions.length > 0) {
          actions = actionsObject.actions
        } else {
          actions = []
        }
        if (actions.length) {
          for (const action of actions) {
            this.processTransaction(action)
          }
        }
        this.transactionsChecked = 1
      }

      this.updateOnAddressesChecked()
    } catch (e) {
      this.log(e)
    }
    if (this.transactionsChangedArray.length > 0) {
      this.currencyEngineCallbacks.onTransactionsChanged(
        this.transactionsChangedArray
      )
      this.transactionsChangedArray = []
    }
  }

  updateOnAddressesChecked () {
    if (this.addressesChecked === 1) {
      return
    }
    this.addressesChecked =
      (this.balancesChecked + this.transactionsChecked) / 2
    this.currencyEngineCallbacks.onAddressesChecked(this.addressesChecked)
  }

  async multicastServers (func: EosFunction, ...params: any): Promise<any> {
    let out = { result: '', server: 'no server' }
    switch (func) {
      case 'getActionsSuperNode':
        const funcs = this.currencyInfo.defaultSettings.otherSettings.eosSuperNodes.map(server => async () => {
          const url = server + params[0]
          const result = await this.io.fetch(url)
          return { server, result }
        })
        out = await asyncWaterfall(funcs)
        this.log(`EOS multicastServers ${func} ${out.server} won`)
        break

      case 'getActions':
      case 'getCurrencyBalance':
      case 'transaction':
        out = await promiseAny(
          this.currencyInfo.defaultSettings.otherSettings.eosNodes.map(async server => {
            const config = Object.assign({}, eosConfig)
            config.httpEndpoint = server
            const eosServer = eosjs(eosConfig)
            const result = await eosServer[func](...params)
            return { server: server, result }
          })
        )
        break
    }
    this.log(`EOS multicastServers ${func} ${out.server} won`)

    return out.result
  }

  // Check all account balance and other relevant info
  async checkAccountInnerLoop () {
    const publicKey = this.walletLocalData.publicKey
    try {
      // Check if the publicKey has an account accountName
      if (!this.walletLocalData.otherData.accountName) {
        const accounts = await new Promise((resolve, reject) => {
          this.eosPlugin.eosServer.getKeyAccounts(publicKey, (error, result) => {
            if (error) reject(error)
            resolve(result)
            // array of account names, can be multiples
            // output example: { account_names: [ 'itamnetwork1', ... ] }
          })
        })
        if (accounts.account_names && accounts.account_names.length > 0) {
          this.walletLocalData.otherData.accountName = accounts.account_names[0]
        }
      }

      // Check balance on account
      if (this.walletLocalData.otherData.accountName) {
        const results = await this.multicastServers('getCurrencyBalance',
          'eosio.token',
          this.walletLocalData.otherData.accountName
        )
        if (results && results.length > 0) {
          for (const r of results) {
            if (typeof r === 'string') {
              const balanceArray = r.split(' ')
              if (balanceArray.length === 2) {
                const exchangeAmount = balanceArray[0]
                const currencyCode = balanceArray[1]
                let nativeAmount = ''

                // Convert exchange amount to native amount
                const denom = getDenomInfo(this.currencyInfo, currencyCode)
                if (denom && denom.multiplier) {
                  nativeAmount = bns.mul(exchangeAmount, denom.multiplier)
                } else {
                  this.log(
                    `Received balance for unsupported currencyCode: ${currencyCode}`
                  )
                }

                if (!this.walletLocalData.totalBalances[currencyCode]) {
                  this.walletLocalData.totalBalances[currencyCode] = '0'
                }
                if (
                  !bns.eq(
                    this.walletLocalData.totalBalances[currencyCode],
                    nativeAmount
                  )
                ) {
                  this.walletLocalData.totalBalances[ currencyCode ] = nativeAmount
                  this.currencyEngineCallbacks.onBalanceChanged(
                    currencyCode,
                    nativeAmount
                  )
                }
              }
            }
          }
        }
      }
      this.balancesChecked = 1
      this.updateOnAddressesChecked()
    } catch (e) {
      this.log(`Error fetching account: ${JSON.stringify(e)}`)
    }
  }

  async clearBlockchainCache (): Promise<void> {
    this.activatedAccountsCache = {}
    await super.clearBlockchainCache()
  }

  // ****************************************************************************
  // Public methods
  // ****************************************************************************

  // This routine is called once a wallet needs to start querying the network
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

  getFreshAddress (options: any): EdgeFreshAddress {
    if (this.walletLocalData.otherData.accountName) {
      return { publicAddress: this.walletLocalData.otherData.accountName }
    } else {
      // Account is not yet active. Return the publicKeys so the user can activate the account
      return {
        publicAddress: '',
        publicKey: this.walletInfo.keys.publicKey,
        ownerPublicKey: this.walletInfo.keys.ownerPublicKey
      }
    }
  }

  // synchronous
  async makeSpend (edgeSpendInfo: EdgeSpendInfo) {
    // Validate the spendInfo
    const valid = validateObject(edgeSpendInfo, MakeSpendSchema)

    if (!valid) {
      throw new Error('Error: invalid EdgeSpendInfo')
    }

    if (edgeSpendInfo.spendTargets.length !== 1) {
      throw new Error('Error: only one output allowed')
    }

    let currencyCode: string = ''
    if (typeof edgeSpendInfo.currencyCode === 'string') {
      currencyCode = edgeSpendInfo.currencyCode
    } else {
      currencyCode = 'EOS'
    }
    edgeSpendInfo.currencyCode = currencyCode

    let publicAddress = ''

    if (typeof edgeSpendInfo.spendTargets[0].publicAddress === 'string') {
      publicAddress = edgeSpendInfo.spendTargets[0].publicAddress
    } else {
      throw new Error('No valid spendTarget')
    }

    // Check if destination address is activated
    let mustCreateAccount = false
    const activated = this.activatedAccountsCache[publicAddress]
    if (activated !== undefined && activated === false) {
      mustCreateAccount = true
    } else if (activated === undefined) {
      try {
        await this.eosPlugin.getAccSystemStats(publicAddress)
        this.activatedAccountsCache[publicAddress] = true
      } catch (e) {
        if (e.code.includes('ErrorUnknownAccount')) {
          this.activatedAccountsCache[publicAddress] = false
          mustCreateAccount = true
        } else {
          this.log(e)
          throw e
        }
      }
    }
    if (mustCreateAccount) {
      throw new Error('ErrorAccountNotActivated')
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

    const nativeBalance = this.walletLocalData.totalBalances[currencyCode]
    if (!nativeBalance) {
      throw new error.InsufficientFundsError()
    }

    const denom = getDenomInfo(this.currencyInfo, currencyCode)
    if (!denom) {
      throw new Error('InternalErrorInvalidCurrencyCode')
    }
    const exchangeAmount = bns.div(nativeAmount, denom.multiplier, 4)
    const networkFee = '0'
    if (bns.gt(nativeAmount, nativeBalance)) {
      throw new error.InsufficientFundsError()
    }
    const DecimalPad = eosjs.modules.format.DecimalPad
    const quantity = DecimalPad(exchangeAmount, 4) + ` ${currencyCode}`
    const transactionJson = {
      actions: [
        {
          account: 'eosio.token',
          name: 'transfer',
          authorization: [
            {
              actor: this.walletLocalData.otherData.accountName,
              permission: 'active'
            }
          ],
          data: {
            from: this.walletLocalData.otherData.accountName,
            to: publicAddress,
            quantity,
            memo: ''
          }
        }
      ]
    }

    // Create an unsigned transaction to catch any errors
    await this.multicastServers('transaction', {
      sign: false,
      broadcast: false
    })

    nativeAmount = `-${nativeAmount}`

    // const idInternal = Buffer.from(this.io.random(32)).toString('hex')
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
        transactionJson
      }
    }
    // this.pendingTransactionsMap = {}
    // this.pendingTransactionsMap[idInternal] = transaction

    this.log('EOS transaction prepared')
    this.log(
      `${nativeAmount} ${this.walletLocalData.publicKey} -> ${publicAddress}`
    )
    return edgeTransaction
  }

  // // synchronous
  // async makeSpend (edgeSpendInfo: EdgeSpendInfo) {
  //   // // Validate the spendInfo
  //   const valid = validateObject(edgeSpendInfo, MakeSpendSchema)

  //   if (!valid) {
  //     throw (new Error('Error: invalid EdgeSpendInfo'))
  //   }

  //   // TODO: Validate the number of destination targets supported by this currency.
  //   // ie. Bitcoin can do multiple targets. Ethereum only one
  //   // edgeSpendInfo.spendTargets.length

  //   // TODO: Validate for valid currencyCode which will be in
  //   // edgeSpendInfo.currencyCode if specified by user. Otherwise use native currency

  //   // TODO: Get nativeAmount which is denoted is small currency unit. ie satoshi/wei
  //   // edgeSpendInfo.spendTargets[0].nativeAmount
  //   //
  //   // Throw if this currency cannot spend a 0 amount
  //   // if (bns.eq(nativeAmount, '0')) {
  //   //   throw (new error.NoAmountSpecifiedError())
  //   // }

  //   // TODO: Get current wallet balance and make sure there are sufficient funds including fees
  //   // const nativeBalance = this.walletLocalData.totalBalances[currencyCode]

  //   // TODO: Extract unique identifier for this transaction. This is known as a Payment ID for
  //   // Monero, Destination Tag for Ripple, and Memo ID for Stellar. Use if currency is capable
  //   // edgeSpendInfo.spendTargets[0].otherParams.uniqueIdentifier

  //   // TODO: Create an EdgeTransaction object with the following params filled out:
  //   // currencyCode
  //   // blockHeight = 0
  //   // nativeAmount (which includes fee)
  //   // networkFee (in smallest unit of currency)
  //   // ourReceiveAddresses = []
  //   // signedTx = ''
  //   // otherParams. Object declared in this currency's types.js file (ie. eosTypes.js)
  //   //  which are additional params useful for signing and broadcasting transaction
  //   const edgeTransaction: EdgeTransaction = {
  //     txid: '', // txid
  //     date: 0, // date
  //     currencyCode: '', // currencyCode
  //     blockHeight: 0, // blockHeight
  //     nativeAmount: '', // nativeAmount
  //     networkFee: '', // networkFee
  //     ourReceiveAddresses: [], // ourReceiveAddresses
  //     signedTx: '0', // signedTx
  //     otherParams: {}
  //   }

  //   this.log('Payment transaction prepared...')
  //   return edgeTransaction
  // }

  // asynchronous
  async signTx (edgeTransaction: EdgeTransaction): Promise<EdgeTransaction> {
    // Do signing
    // Take the private key from this.walletInfo.keys.eosKey and sign the transaction
    // const privateKey = this.walletInfo.keys.eosKey
    const keyProvider = []
    if (this.walletInfo.keys.eosKey) {
      keyProvider.push(this.walletInfo.keys.eosKey)
    }
    if (this.walletInfo.keys.eosOwnerKey) {
      keyProvider.push(this.walletInfo.keys.eosOwnerKey)
    }
    await this.multicastServers('transaction',
      edgeTransaction.otherParams.transactionJson,
      {
        keyProvider,
        sign: true,
        broadcast: false
      }
    )

    // Complete edgeTransaction.txid params if possible at this state
    return edgeTransaction
  }

  // asynchronous
  async broadcastTx (
    edgeTransaction: EdgeTransaction
  ): Promise<EdgeTransaction> {
    // Broadcast transaction and add date
    const keyProvider = []
    if (this.walletInfo.keys.eosKey) {
      keyProvider.push(this.walletInfo.keys.eosKey)
    }
    if (this.walletInfo.keys.eosOwnerKey) {
      keyProvider.push(this.walletInfo.keys.eosOwnerKey)
    }
    const signedTx = await this.multicastServers('transaction',
      edgeTransaction.otherParams.transactionJson,
      {
        keyProvider,
        sign: true,
        broadcast: true
      }
    )
    edgeTransaction.date = Date.now() / 1000
    edgeTransaction.txid = signedTx.transaction_id
    return edgeTransaction
  }

  getDisplayPrivateSeed () {
    if (this.walletInfo.keys && this.walletInfo.keys.rippleKey) {
      return this.walletInfo.keys.eosKey
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
