// abcWalletTxLib-btc.js
import { dataStore } from './dataStore-btc.js'

export const TxLibBTC = {
  getInfo: () => {
    const currencyDetails = dataStore.getInfo

    return currencyDetails
  },

  makeEngine: (abcTxLibAccess, options, callbacks) => {
    const abcTxLib = new ABCTxLibBTC(abcTxLibAccess, options, callbacks)

    return abcTxLib
  }
}

/**
 * A public wrapper around the BtcTxEngine, which implements the real logic.
 */
class ABCTxLibBTC {
  constructor (abcTxLibAccess, options, callbacks) {
    dataStore.init(abcTxLibAccess, options, callbacks)
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
  enableTokens (tokens = {}) {
    return Promise.resolve(dataStore.enableTokens(tokens))
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
  makeSpend (abcSpendInfo) { // returns an ABCTransaction data structure, and checks for valid info
    return Promise.resolve(dataStore.makeSpend(abcSpendInfo))
  }

  // asynchronous
  signTx (abcTransaction) {
    return Promise.resolve(dataStore.signTx(abcTransaction))
  }

  // asynchronous
  broadcastTx (abcTransaction) {
    return Promise.resolve(true)
  }

  // asynchronous
  saveTx (abcTransaction) {
    return Promise.resolve(true)
  }
}
