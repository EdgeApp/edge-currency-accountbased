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

/**
 * A public wrapper around the BtcTxEngine, which implements the real logic.
 */
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
    return Promise.resolve(dataStore.enableTokens(options))
  }

  // synchronous
  getTokenStatus () {
    return dataStore.getTokensStatus()
  }

  // synchronous
  getBalance (options = {}) {
    return dataStore.getBalance(options)
  }

  // synchronous
  getNumTransactions (options = {}) {
    return dataStore.getNumTransactions(options = {})
  }

  // asynchronous
  getTransactions (options = {}) {
    return Promise.resolve(dataStore.getTransactions(options = {}))
  }

  // synchronous
  getFreshAddress (options = {}) {
    return dataStore.getFreshAddress(options)
  }

  // synchronous
  addGapLimitAddresses (options) {
    dataStore.addGapLimitAddresses(options)
    return true
  }

  // synchronous
  isAddressUsed (options = {}) {
    return dataStore.isAddressUsed(options)
  }

  // synchronous
  makeSpend (options = {}) { // returns an ABCTransaction data structure, and checks for valid info
    return dataStore.makeSpend(options)
  }

  // asynchronous
  signTx (options = {}) {
    return Promise.resolve(dataStore.signTx(options))
  }

  // asynchronous
  broadcastTx (options = {}) {
    return Promise.resolve(true)
  }

  // asynchronous
  saveTx (options = {}) {
    return Promise.resolve(true)
  }
}

module.exports = TxLibBTC
