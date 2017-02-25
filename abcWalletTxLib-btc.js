// abcWalletTxLib-btc.js
const dataStore = require('./dataStore-btc.js')
const TxLibBTC = {
  getInfo: () => {
    let currencyDetails = dataStore.getInfo

    return currencyDetails
  },

  makeEngine: (options) => {
    let abcTxLib = new ABCTxLibBTC(options)

    return abcTxLib
  }
}

class ABCTxLibBTC {
  constructor (options) {
    dataStore.init(options)
  }

  killEngine () {
    // disconnect network connections
    // clear caches

    return true
  }

  test () {
    return dataStore
  }

  // synchronous
  getBlockHeight () {
    return dataStore.getBlockHeight()
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
    let newABCTransaction = dataStore.makeSpend(options)

    return newABCTransaction
  }

  // asynchronous
  signTx (options = {}) {
    return new Promise((resolve, reject) => {
      let { abcTransaction } = options

      let signedTx = dataStore.signTx(abcTransaction)

      let error = null
      if (error) {
        return reject(error)
      }

      resolve(signedTx)
    })
  }

  // asynchronous
  broadcastTx (options = {}) {
    return new Promise((resolve, reject) => {
      let { abcTransaction } = options

      let error = null
      if (error) {
        return reject(error)
      }

      resolve(abcTransaction)
    })
  }

  // asynchronous
  saveTx (options = {}) {
    return new Promise((resolve, reject) => {
      let { abcTransaction } = options

      let error = null
      if (error) {
        return reject(error)
      }

      resolve(abcTransaction)
    })
  }
}

module.exports = TxLibBTC
