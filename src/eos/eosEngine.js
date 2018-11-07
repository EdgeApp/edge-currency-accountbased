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
import { CurrencyPlugin } from '../common/plugin.js'
import { validateObject, getDenomInfo } from '../common/utils.js'
import { type EosGetTransaction, type EosWalletOtherData } from './eosTypes.js'
import eosjs from 'eosjs'

const ADDRESS_POLL_MILLISECONDS = 10000
const BLOCKCHAIN_POLL_MILLISECONDS = 15000
const TRANSACTION_POLL_MILLISECONDS = 3000

// ----MAIN NET----
const config = {
  chainId: 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906', // main net
  keyProvider: [],
  httpEndpoint: '', // main net
  expireInSeconds: 60,
  sign: false, // sign the transaction with a private key. Leaving a transaction unsigned avoids the need to provide a private key
  broadcast: false, // post the transaction to the blockchain. Use false to obtain a fully signed transaction
  verbose: false // verbose logging such as API activity
}
export class EosEngine extends CurrencyEngine {
  // TODO: Add currency specific params
  // Store any per wallet specific data in the `currencyEngine` object. Add any params
  // to the EosEngine class definition in eosEngine.js and initialize them in the
  // constructor()
  eosServer: Object
  balancesChecked: number
  transactionsChecked: number
  activatedAccountsCache: { [publicAddress: string]: boolean }
  otherData: EosWalletOtherData

  constructor (
    currencyPlugin: CurrencyPlugin,
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

    this.balancesChecked = 0
    this.transactionsChecked = 0
    this.activatedAccountsCache = {}
    this.eosServer = {}
  }

  async getAccSystemStats (account: string) {
    return new Promise((resolve, reject) => {
      this.eosServer.getAccount(account, (error, result) => {
        if (error) reject(error)
        resolve(result)
      })
    })
  }

  // Poll on the blockheight
  async checkBlockchainInnerLoop () {
    try {
      const result = await new Promise((resolve, reject) => {
        this.eosServer.getInfo((error, info) => {
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

  processTransaction (action: EosGetTransaction) {
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

    // const ourReceiveAddresses:Array<string> = []

    // const balanceChanges = tx.outcome.balanceChanges[this.walletLocalData.publicKey]
    // if (balanceChanges) {
    //   for (const bc of balanceChanges) {
    //     const currencyCode: string = bc.currency
    //     const date: number = Date.parse(tx.outcome.timestamp) / 1000
    //     const blockHeight: number = tx.outcome.ledgerVersion

    //     let exchangeAmount: string = bc.value
    //     if (exchangeAmount.slice(0, 1) === '-') {
    //       exchangeAmount = bns.add(tx.outcome.fee, exchangeAmount)
    //     } else {
    //       ourReceiveAddresses.push(this.walletLocalData.publicKey)
    //     }
    //     const nativeAmount: string = bns.mul(exchangeAmount, '1000000')
    //     let networkFee: string
    //     let parentNetworkFee: string
    //     if (currencyCode === PRIMARY_CURRENCY) {
    //       networkFee = bns.mul(tx.outcome.fee, '1000000')
    //     } else {
    //       networkFee = '0'
    //       parentNetworkFee = bns.mul(tx.outcome.fee, '1000000')
    //     }

    //     const edgeTransaction: EdgeTransaction = {
    //       txid: tx.id.toLowerCase(),
    //       date,
    //       currencyCode,
    //       blockHeight,
    //       nativeAmount,
    //       networkFee,
    //       parentNetworkFee,
    //       ourReceiveAddresses,
    //       signedTx: 'has_been_signed',
    //       otherParams: {}
    //     }

    //     const idx = this.findTransaction(currencyCode, edgeTransaction.txid)
    //     if (idx === -1) {
    //       this.log(sprintf('New transaction: %s', edgeTransaction.txid))

    //       // New transaction not in database
    //       this.addTransaction(currencyCode, edgeTransaction)
    //     } else {
    //       // Already have this tx in the database. See if anything changed
    //       const transactionsArray = this.transactionList[ currencyCode ]
    //       const edgeTx = transactionsArray[ idx ]

    //       if (
    //         edgeTx.blockHeight !== edgeTransaction.blockHeight ||
    //         edgeTx.networkFee !== edgeTransaction.networkFee ||
    //         edgeTx.nativeAmount !== edgeTransaction.nativeAmount
    //       ) {
    //         this.log(sprintf('Update transaction: %s height:%s',
    //           edgeTransaction.txid,
    //           edgeTransaction.blockHeight))
    //         this.updateTransaction(currencyCode, edgeTransaction, idx)
    //       } else {
    //         // this.log(sprintf('Old transaction. No Update: %s', tx.hash))
    //       }
    //     }
    //   }

    //   if (this.transactionsChangedArray.length > 0) {
    //     this.currencyEngineCallbacks.onTransactionsChanged(
    //       this.transactionsChangedArray
    //     )
    //     this.transactionsChangedArray = []
    //   }
    // }
  }

  async checkTransactionsInnerLoop () {
    try {
      const actions = await this.eosServer.getActions(
        this.walletLocalData.otherData.accountName
      )
      if (actions.actions && actions.actions.length > 0) {
        for (const action of actions.actions) {
          this.processTransaction(action)
        }
      }
      this.transactionsChecked = 1
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
    // const address = this.walletLocalData.publicKey
    // let startBlock:number = 0
    // if (this.walletLocalData.lastAddressQueryHeight > ADDRESS_QUERY_LOOKBACK_BLOCKS) {
    //   // Only query for transactions as far back as ADDRESS_QUERY_LOOKBACK_BLOCKS from the last time we queried transactions
    //   startBlock = this.walletLocalData.lastAddressQueryHeight - ADDRESS_QUERY_LOOKBACK_BLOCKS
    // }

    // try {
    //   let options
    //   if (startBlock > ADDRESS_QUERY_LOOKBACK_BLOCKS) {
    //     options = { minLedgerVersion: startBlock }
    //   }
    //   const transactions: XrpGetTransactions = await this.eosApi.getTransactions(address, options)
    //   const valid = validateObject(transactions, GetTransactionsSchema)
    //   if (valid) {
    //     this.log('Fetched transactions count: ' + transactions.length)

    //     // Get transactions
    //     // Iterate over transactions in address
    //     for (let i = 0; i < transactions.length; i++) {
    //       const tx = transactions[i]
    //       this.processTransaction(tx)
    //     }
    //     this.updateOnAddressesChecked()
    //   }
    // } catch (e) {
    //   this.log(e.code)
    //   this.log(e.message)
    //   this.log(e)
    //   this.log(`Error fetching transactions: ${JSON.stringify(e)}`)
    //   this.log(`Error fetching transactions: ${JSON.stringify(e)}`)
    // }
  }

  updateOnAddressesChecked () {
    if (this.addressesChecked === 1) {
      return
    }
    this.addressesChecked =
      (this.balancesChecked + this.transactionsChecked) / 2
    this.currencyEngineCallbacks.onAddressesChecked(this.addressesChecked)
  }

  // Check all account balance and other relevant info
  async checkAccountInnerLoop () {
    const publicKey = this.walletLocalData.publicKey
    try {
      // Check if the publicKey has an account accountName
      if (!this.walletLocalData.otherData.accountName) {
        const accounts = await new Promise((resolve, reject) => {
          this.eosServer.getKeyAccounts(publicKey, (error, result) => {
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
        const results = await this.eosServer.getCurrencyBalance(
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

    config.httpEndpoint = this.currencyInfo.defaultSettings.otherSettings.eosNodes[0]
    this.eosServer = eosjs(config)

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
        await this.getAccSystemStats(publicAddress)
        this.activatedAccountsCache[publicAddress] = true
      } catch (e) {
        if (e.message.includes('unknown key')) {
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
    await this.eosServer.transaction(transactionJson, {
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
    await this.eosServer.transaction(
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
    const signedTx = await this.eosServer.transaction(
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
