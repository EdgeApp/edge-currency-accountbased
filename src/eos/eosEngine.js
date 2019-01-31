/**
 * Created by paul on 7/7/17.
 */
// @flow

import type {
  EdgeCurrencyPlugin,
  EdgeIo,
  EdgeTransaction,
  EdgeSpendInfo,
  EdgeWalletInfo,
  EdgeCurrencyEngineOptions,
  EdgeFreshAddress
} from 'edge-core-js'
import { error } from 'edge-core-js'
import { bns } from 'biggystring'
import { CurrencyEngine } from '../common/engine.js'
import { validateObject, promiseAny, asyncWaterfall, getDenomInfo } from '../common/utils.js'
import { type EosTransaction, type EosWalletOtherData, type EosTransactionSuperNode } from './eosTypes.js'
import { EosTransactionSuperNodeSchema } from './eosSchema.js'
import { eosConfig, EosPlugin, checkAddress } from './eosPlugin.js'
import eosjs from 'eosjs'

const ADDRESS_POLL_MILLISECONDS = 10000
const BLOCKCHAIN_POLL_MILLISECONDS = 15000
const TRANSACTION_POLL_MILLISECONDS = 3000
// const ADDRESS_QUERY_LOOKBACK_BLOCKS = 0
const CHECK_TXS_CRYPTO_LIONS = true
const CHECK_TXS_FULL_NODES = true

type EosFunction = 'doCryptoLions' | 'getActions' | 'getCurrencyBalance' | 'transaction' | 'actionsPaymentServer'

export class EosEngine extends CurrencyEngine {
  // TODO: Add currency specific params
  // Store any per wallet specific data in the `currencyEngine` object. Add any params
  // to the EosEngine class definition in eosEngine.js and initialize them in the
  // constructor()
  eosPlugin: EosPlugin
  activatedAccountsCache: { [publicAddress: string]: boolean }
  otherData: EosWalletOtherData
  otherMethods: Object

  constructor (
    currencyPlugin: EosPlugin,
    io_: any,
    walletInfo: EdgeWalletInfo,
    opts: EdgeCurrencyEngineOptions
  ) {
    super(currencyPlugin, io_, walletInfo, opts)

    this.eosPlugin = currencyPlugin
    this.activatedAccountsCache = {}
    this.otherMethods = {
      getAccountActivationQuote: async (params: Object): Promise<Object> => {
        const { requestedAccountName, currencyCode, ownerPublicKey, activePublicKey } = params
        if (!currencyCode || !requestedAccountName) {
          throw new Error('ErrorInvalidParams')
        }
        if (!ownerPublicKey && !activePublicKey) {
          throw new Error('ErrorInvalidParams')
        }
        if (!checkAddress(requestedAccountName)) {
          const e = new Error('ErrorInvalidAccountName')
          e.name = 'ErrorInvalidAccountName'
          throw e
        }

        const options = {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ requestedAccountName, currencyCode, ownerPublicKey, activePublicKey })
        }
        try {
          const eosPaymentServer = this.currencyInfo.defaultSettings.otherSettings.eosActivationServers[0]
          const url = `${eosPaymentServer}/api/v1/activateAccount`
          const result = await this.io.fetch(url, options)
          const out = await result.json()
          return out
        } catch (e) {
          throw e
        }
      }
    }
  }

  async loadEngine (
    plugin: EdgeCurrencyPlugin,
    io: EdgeIo,
    walletInfo: EdgeWalletInfo,
    opts: EdgeCurrencyEngineOptions
  ): Promise<void> {
    await super.loadEngine(plugin, io, walletInfo, opts)
    if (typeof this.walletInfo.keys.ownerPublicKey !== 'string') {
      if (walletInfo.keys.ownerPublicKey) {
        this.walletInfo.keys.ownerPublicKey = walletInfo.keys.ownerPublicKey
      } else {
        const pubKeys = await plugin.derivePublicKey(this.walletInfo)
        this.walletInfo.keys.ownerPublicKey = pubKeys.ownerPublicKey
      }
    }
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
      this.log(`e.code: ${JSON.stringify(e.code)}`)
      this.log(`e.message: ${JSON.stringify(e.message)}`)
    }
  }

  processTransactionCryptoLions (action: EosTransactionSuperNode): number {
    const result = validateObject(action, EosTransactionSuperNodeSchema)
    if (!result) {
      this.log('Invalid supernode tx')
      return 0
    }

    const {
      act,
      trx_id,
      block_num,
      block_time
    } = action

    const { from, to, quantity, memo, hex_data } = act.data
    const [ exchangeAmount, currencyCode ] = quantity.split(' ')
    const ourReceiveAddresses = []
    const denom = getDenomInfo(this.currencyInfo, currencyCode)
    if (!denom) {
      this.log(`Received unsupported currencyCode: ${currencyCode}`)
      return 0
    }
    let nativeAmount = bns.mul(exchangeAmount, denom.multiplier)
    let name = ''
    if (to === this.walletLocalData.otherData.accountName) {
      name = from
      ourReceiveAddresses.push(to)
      if (from === this.walletLocalData.otherData.accountName) {
        // This is a spend to self. Make amount 0
        nativeAmount = '0'
      }
    } else {
      name = to
      nativeAmount = `-${nativeAmount}`
    }

    const edgeTransaction: EdgeTransaction = {
      txid: trx_id,
      date: Date.parse(block_time) / 1000,
      currencyCode,
      blockHeight: block_num,
      nativeAmount,
      networkFee: '0',
      parentNetworkFee: '0',
      ourReceiveAddresses,
      signedTx: hex_data,
      otherParams: {},
      metadata: {
        name,
        notes: memo
      }
    }

    this.addTransaction(currencyCode, edgeTransaction)
    return edgeTransaction.blockHeight
  }

  processTransactionFullNode (action: EosTransaction): number {
    const ourReceiveAddresses = []
    const date = Date.parse(action.block_time) / 1000
    const blockHeight = action.block_num
    if (!action.action_trace || !action.account_action_seq) {
      this.log('Invalid EOS transaction data. No action_trace or account_action_seq')
      return 0
    }
    const actionSeq = action.account_action_seq
    const txid = action.action_trace.trx_id

    if (!action.action_trace.act) {
      this.log('Invalid EOS transaction data. No action_trace.act')
      return 0
    }
    const name = action.action_trace.act.name
    // this.log('------------------------------------------------')
    // this.log(`Txid: ${txid}`)
    // this.log(`Action type: ${name}`)
    if (name === 'transfer') {
      if (!action.action_trace.act.data) {
        this.log('Invalid EOS transaction data. No action_trace.act.data')
        return 0
      }
      const { from, to, memo, quantity } = action.action_trace.act.data
      const split = quantity.split(' ')
      const [exchangeAmount, currencyCode] = split

      const denom = getDenomInfo(this.currencyInfo, currencyCode)
      if (!denom) {
        this.log(`Received unsupported currencyCode: ${currencyCode}`)
        return 0
      }
      let nativeAmount = bns.mul(exchangeAmount, denom.multiplier)
      if (to === this.walletLocalData.otherData.accountName) {
        ourReceiveAddresses.push(to)
        if (from === this.walletLocalData.otherData.accountName) {
          // This is a spend to self. Make amount 0
          nativeAmount = '0'
        }
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
    return actionSeq
  }

  async checkTransactionsFullNode (acct: string): Promise<boolean> {
    if (!CHECK_TXS_FULL_NODES) throw new Error('Dont use full node API')
    const actionSeqNumber = this.walletLocalData.otherData.lastQueryActionSeq
    let newActionSeqNumber = actionSeqNumber
    while (1) {
      const actionsObject = await this.multicastServers('getActions', acct, newActionSeqNumber + 1, 9)
      let actions = []
      if (actionsObject.actions && actionsObject.actions.length > 0) {
        actions = actionsObject.actions
      } else {
        break
      }
      for (const action of actions) {
        const s = this.processTransactionFullNode(action)
        if (s > newActionSeqNumber) {
          newActionSeqNumber = s
        }
      }
    }
    if (newActionSeqNumber > this.walletLocalData.otherData.lastQueryActionSeq) {
      this.walletLocalData.otherData.lastQueryActionSeq = newActionSeqNumber
      this.walletLocalDataDirty = true
    }
    return true
  }

  async checkTransactionsCryptoLions (acct: string): Promise<boolean> {
    if (!CHECK_TXS_CRYPTO_LIONS) throw new Error('Dont use cryptolions API')

    const highestTxHeight = this.walletLocalData.otherData.highestTxHeight
    let newHighestTxHeight = highestTxHeight

    // Try super nodes first
    const limit = 10
    let skip = 0
    let finish = false
    while (!finish) {
      const url = `/v1/history/get_actions/${acct}/transfer?skip=${skip}&limit=${limit}`
      const result = await this.multicastServers('doCryptoLions', url)
      const actionsObject = await result.json()
      const actions = actionsObject.actions
      if (actions.length) {
        for (let i = 0; i < actions.length; i++) {
          const action = actions[i]
          const blockNum = this.processTransactionCryptoLions(action)
          if (blockNum > newHighestTxHeight) {
            newHighestTxHeight = blockNum
          } else if (
            blockNum === newHighestTxHeight &&
            i === 0 &&
            skip === 0) {
            // If on the first query, we get blockHeights equal to the previously cached heights
            // then stop query as we assume we're just getting back previously queried data
            finish = true
            break
          }
        }
      }
      if (!actions.length || actions.length < limit) {
        break
      }
      skip += 10
    }
    if (newHighestTxHeight > this.walletLocalData.otherData.highestTxHeight) {
      this.walletLocalData.otherData.highestTxHeight = newHighestTxHeight
      this.walletLocalDataDirty = true
    }
    return true
  }

  async checkTransactionsInnerLoop () {
    if (
      !this.walletLocalData.otherData ||
      !this.walletLocalData.otherData.accountName) {
      return
    }
    const acct = this.walletLocalData.otherData.accountName
    const resultP = this.checkTransactionsCryptoLions(acct)
      .catch(e => {
        this.log(e)
        // Crypto lions API failed. Fall back to full node.
        // Note: Full nodes do not return incoming transactions although
        // they do return correct account balances
        return this.checkTransactionsFullNode(acct)
      })
      .catch(e => {
        this.log(e)
        return false
      })
    const result = await resultP
    if (result) {
      this.tokenCheckTransactionsStatus.EOS = 1
      this.updateOnAddressesChecked()
    }
    if (this.transactionsChangedArray.length > 0) {
      this.currencyEngineCallbacks.onTransactionsChanged(
        this.transactionsChangedArray
      )
      this.transactionsChangedArray = []
    }
  }

  async multicastServers (func: EosFunction, ...params: any): Promise<any> {
    let out = { result: '', server: 'no server' }
    switch (func) {
      case 'doCryptoLions':
        const funcs = this.currencyInfo.defaultSettings.otherSettings.eosCryptoLionsNodes.map(server => async () => {
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
      this.tokenCheckBalanceStatus.EOS = 1
      this.updateOnAddressesChecked()
    } catch (e) {
      this.log(`Error fetching account: ${JSON.stringify(e)}`)
      this.log(`e.code: ${JSON.stringify(e.code)}`)
      this.log(`e.message: ${JSON.stringify(e.message)}`)
    }
  }

  async clearBlockchainCache (): Promise<void> {
    this.activatedAccountsCache = {}
    await super.clearBlockchainCache()
    this.walletLocalData.otherData.lastQueryActionSeq = 0
    this.walletLocalData.otherData.highestTxHeight = 0
    this.walletLocalData.otherData.accountName = ''
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
  async makeSpend (edgeSpendInfoIn: EdgeSpendInfo) {
    const { edgeSpendInfo, currencyCode, nativeBalance, denom } = super.makeSpend(edgeSpendInfoIn)

    if (edgeSpendInfo.spendTargets.length !== 1) {
      throw new Error('Error: only one output allowed')
    }
    const publicAddress = edgeSpendInfo.spendTargets[0].publicAddress

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

    const exchangeAmount = bns.div(nativeAmount, denom.multiplier, 4)
    const networkFee = '0'
    if (bns.gt(nativeAmount, nativeBalance)) {
      throw new error.InsufficientFundsError()
    }
    const DecimalPad = eosjs.modules.format.DecimalPad
    const quantity = DecimalPad(exchangeAmount, 4) + ` ${currencyCode}`
    let memo = ''
    if (
      edgeSpendInfo.spendTargets[0].otherParams &&
      typeof edgeSpendInfo.spendTargets[0].otherParams.uniqueIdentifier === 'string') {
      memo = edgeSpendInfo.spendTargets[0].otherParams.uniqueIdentifier
    }
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
            memo
          }
        }
      ]
    }

    // Create an unsigned transaction to catch any errors
    await this.multicastServers('transaction', transactionJson, {
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
    try {
      const signedTx = await this.multicastServers('transaction',
        edgeTransaction.otherParams.transactionJson, {
          keyProvider,
          sign: true,
          broadcast: true
        })
      edgeTransaction.date = Date.now() / 1000
      edgeTransaction.txid = signedTx.transaction_id
      return edgeTransaction
    } catch (e) {
      let err = e
      try {
        err = JSON.parse(e)
      } catch (e2) {
        throw e
      }
      if (err.error && err.error.name === 'tx_net_usage_exceeded') {
        err = new Error('Insufficient NET available to send EOS transaction')
        err.name = 'ErrorEosInsufficientNet'
      } else if (err.error && err.error.name === 'tx_cpu_usage_exceeded') {
        err = new Error('Insufficient CPU available to send EOS transaction')
        err.name = 'ErrorEosInsufficientCpu'
      } else if (err.error && err.error.name === 'ram_usage_exceeded') {
        err = new Error('Insufficient RAM available to send EOS transaction')
        err.name = 'ErrorEosInsufficientRam'
      }
      throw err
    }
  }

  getDisplayPrivateSeed () {
    let out = ''
    if (this.walletInfo.keys && this.walletInfo.keys.eosOwnerKey) {
      out += 'owner key\n' + this.walletInfo.keys.eosOwnerKey + '\n\n'
    }
    if (this.walletInfo.keys && this.walletInfo.keys.eosKey) {
      out += 'active key\n' + this.walletInfo.keys.eosKey + '\n\n'
    }
    return out
  }

  getDisplayPublicSeed () {
    let out = ''
    if (this.walletInfo.keys && this.walletInfo.keys.ownerPublicKey) {
      out += 'owner publicKey\n' + this.walletInfo.keys.ownerPublicKey + '\n\n'
    }
    if (this.walletInfo.keys && this.walletInfo.keys.publicKey) {
      out += 'active publicKey\n' + this.walletInfo.keys.publicKey + '\n\n'
    }
    return out
  }
}

export { CurrencyEngine }
