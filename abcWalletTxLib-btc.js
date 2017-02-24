// abcWalletTxLib-btc.js

const dataStore = require('./dataStore-btc.js')

// create a spinny think that "checks" the network for transactions
// ---- or ----
// create a function that will simulate a detected transaction

// each function call should validate that the lib is initialized, and the currency is supported

const TxLibBTC = {
  getInfo: () => {
    let currencyDetails = dataStore.getInfo

    return currencyDetails
  },

  makeEngine: (options = {}) => {
    let abcTxLib = new ABCTxLibBTC(options)

    return abcTxLib
  }
}

class ABCTxLibBTC {
  constructor (options) {
    this.options = options
  }

  test () {
    return dataStore
  }

  // asynchronous
  abcTxLibInit (options = {}, callbacks = {}) {
    return new Promise((resolve, reject) => {
      dataStore.init(options, callbacks)

      let {error} = options
      if (error) {
        return reject(error)
      }

      return resolve(true)
    })
  }

  // asynchronous
  enableTokens (options = {}) {
    return new Promise((resolve, reject) => {
      let enabledTokens = dataStore.enableTokens(options)

      let error = null
      if (error) {
        return reject(error)
      }

      return resolve(enabledTokens)
    })
  }

  // synchronous
  getTokenStatus () {
    return dataStore.getTokensStatus()
  }

  // synchronous
  getBalance (options = {}) {
    let balance = dataStore.getBalance(options)

    return balance // Balance in the smallest unit of the currency
  }

  // synchronous
  getNumTransactions (options = {}) {
    let numTransactions = dataStore.getNumTransactions(options = {})

    return numTransactions
  }

  // asynchronous
  getTransactions (options = {}) {
    return new Promise((resolve, reject) => {
      let transactions = dataStore.getTransactions(options = {})

      let error = null
      if (error) {
        return reject(error)
      }

      resolve(transactions)
    })
  }

  // synchronous
  getFreshAddress (options = {}) {
    let freshAddress = dataStore.getFreshAddress(options)

    return freshAddress
  }

  // synchronous
  addGapLimitAddresses (options) {
    dataStore.addGapLimitAddresses(options)

    return true
  }

  // synchronous
  isAddressUsed (options = {}) {
    let isUsed = dataStore.isAddressUsed(options)

    return isUsed
  }

  // synchronous
  makeSpend (options = {}) { // returns an ABCTransaction data structure, and checks for valid info
    let {
      abcSpendInfo
    } = options
    let otherParams = {
      isReplaceByFee: Bool, // True if this transaction is marked as RBF (BIP125)
      isDoubleSpend: Bool, // True if this transaction is found to be a double spend attempt
      inputOutputList: Array // Array of transaction inputs and outputs
    }
    let abcTransaction = {
      abcWalletTx: ABCWalletTx, // ABCWalletTx this transaction is from
      metadata: ABCMetadata, // ABCMetadata of this transaction
      txid: String, // Transaction ID as represented by the wallet’s crypto currency. For bitcoin this is base16. This parameter is NULL until signTx is called.
      date: Date, // Date that transaction was broadcast, detected, or confirmed on the blockchain. If the tx detection date is after the confirmation time, then this is the confirmation time. NULL if transaction has not been broadcast
      blockHeight: Int, // Block number that included this transaction
      amountSatoshi: Int, // Amount of fees in denomination of smallest unit of currency
      providerFee: Int, // Additional app provider fees in denomination of smallest unit of currency (ie. Satoshis)
      networkFee: Int, // Fee paid to network (mining fee) in denomination of smallest unit of currency (ie. Satoshis)
      runningBalance: Int, // Running balance of entire wallet as of this transaction
      otherParams: Object // Crypto currency specific data
    }

    otherParams = {
      isReplaceByFee: Bool, // True if this transaction is marked as RBF (BIP125)
      isDoubleSpend: Bool, // True if this transaction is found to be a double spend attempt
      inputOutputList: Array // Array of transaction inputs and outputs
    }

    let spend = 'qweqwe'

    return spend
  }

  // asynchronous
  signTx (options = {}) {
    return new Promise((resolve, reject) => {
      let {
        abcTransaction
      } = options

      let error = null
      if (error) {
        return reject(error)
      }

      resolve()
    })
  }

  // asynchronous
  broadcastTx (options = {}) {
    return new Promise((resolve, reject) => {
      let {
        abcTransaction
      } = options

      let error = null
      if (error) {
        return reject(error)
      }

      resolve()
    })
  }

  // asynchronous
  saveTx (options = {}) {
    return new Promise((resolve, reject) => {
      let {
        abcTransaction
      } = options

      let error = null
      if (error) {
        return reject(error)
      }

      resolve()
    })
  }
}

module.exports = TxLibBTC
