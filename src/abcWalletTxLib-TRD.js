// abcWalletTxLib-btc.js
import random from 'random-js'

// const random = require('random-js')
import { txLibInfo } from './txLibInfo.js'

// const GAP_LIMIT = 10
const DATA_STORE_FOLDER = 'txEngineFolder'

export const TxLibBTC = {
  getInfo: () => {
    const currencyDetails = txLibInfo.getInfo

    return currencyDetails
  },

  createMasterKeys: (walletType) => {
    if (walletType === 'shitcoin') {
      const r = random()
      const masterPrivateKey = r.hex(16)
      const masterPublicKey = 'pub' + masterPrivateKey
      return { masterPrivateKey, masterPublicKey }
    } else {
      return null
    }
  },

  makeEngine: (abcTxLibAccess, options, callbacks) => {
    const abcTxLib = new ABCTxLibTRD(abcTxLibAccess, options, callbacks)

    return abcTxLib
  }
}

const baseUrl = 'http://localhost:8080/api/'

function fetchGet (cmd, params) {
  return window.fetch(baseUrl + cmd + '/' + params, {
    method: 'get'
  })
}
// function fetchPost (cmd, body) {
//   return window.fetch(baseUrl + cmd, {
//     method: 'post',
//     body: JSON.stringify(body)
//   })
// }

class WalletLocalData {
  constructor (jsonString) {
    this.blockHeight = 0
    this.totalBalance = 0

    // Map of gap limit addresses
    this.gapLimitAddresses = []

    // Map of ABCTransaction objects indexed by txid
    this.transactionsArray = []

    // Array of ABCTransactino objects in order by date
    this.transactionsByDate = []

    // Map of address objects indexed by public address
    this.addressArray = []

    this.addressIndex = 0
    this.masterPublicKey = ''
    if (jsonString != null) {
      const data = JSON.parse(jsonString)
      for (const k in data) this[k] = data[k]
    }
  }
}

class ABCTxLibTRD {
  constructor (abcTxLibAccess, options, callbacks) {
    // dataStore.init(abcTxLibAccess, options, callbacks)
    this.engineOn = false
    this.abcTxLibCallbacks = callbacks
    this.abcTxLibOptions = options
    this.walletLocalDataStore = abcTxLibAccess.walletLocalDataStore
  }

  // *************************************
  // Private methods
  // *************************************
  engineLoop () {
    this.engineOn = true
    this.blockHeightInnerLoop()
  }

  blockHeightInnerLoop () {
    // *************************************
    // Poll on the blockheight
    // *************************************

    if (this.engineOn) {
      const p = new Promise ((resolve, reject) => {
        fetchGet('height', '').then(function (response) {
          return response.json()
        }).then((jsonObj) => {
          if (this.blockHeight != jsonObj.height) {
            this.blockHeight = jsonObj.height
            console.log('Block height changed: ' + this.blockHeight)
            this.abcTxLibCallbacks.blockHeightChanged(this.blockHeight)
          }
          resolve()
        }).catch(function (err) {
          console.log('Error fetching height: ' + err)
          resolve()
        })
      })
      p.then(() => {
        setTimeout(() => {
          this.blockHeightInnerLoop()
        }, 1000)
      })
    }

  }

  transactionListInnerLoop () {
    // **********************************************
    // Poll on the transaction list of all addresses
    // **********************************************

    if (this.engineOn) {
      const p = new Promise ((resolve, reject) => {

        // fetchGet('height', '').then(function (response) {
        //   this.blockHeight = response.height
        //   resolve()
        // }).catch(function (err) {
        //   console.log('Error fetching height: ' + err)
        //   resolve()
        // })
        resolve()
      })
      p.then(() => {
        setTimeout(() => {
          this.transactionListInnerLoop()
        }, 1000)
      })
    }
  }

  addressFromIndex (index) {
    const addr = '' + index + '-pub' + this.walletLocalData.masterPublicKey
    return addr
  }

  // *************************************
  // Public methods
  // *************************************

  startEngine () {
    const prom = new Promise((resolve, reject) => {

      this.walletLocalDataStore.readData(DATA_STORE_FOLDER, 'walletLocalData').then((result) => {
        this.walletLocalData = new WalletLocalData(result)
        this.walletLocalData.masterPublicKey = this.abcTxLibOptions.masterPublicKey
        this.engineLoop()
        resolve()
      }).catch((err) => {
        console.log(err)
        console.log('No walletLocalData setup yet: Failure is ok')
        this.walletLocalData = new WalletLocalData(null)
        this.walletLocalDataStore.writeData(DATA_STORE_FOLDER, 'walletLocalData', JSON.stringify(this.walletLocalData)).then((result) => {
          this.engineLoop()
          resolve()
        }).catch((err) => {
          console.log('Error writing to localDataStore:' + err)
          resolve()
        })
      })
    })

    return prom
  }

  killEngine () {
    // disconnect network connections
    // clear caches

    this.engineOn = false

    return true
  }

  // synchronous
  getBlockHeight () {
    return this.walletLocalData.blockHeight
  }

  // asynchronous
  enableTokens (tokens = {}) {
    // return Promise.resolve(dataStore.enableTokens(tokens))
  }

  // synchronous
  getTokenStatus () {
    // return dataStore.getTokensStatus()
  }

  // synchronous
  getBalance (options = {}) {
    return this.walletLocalData.totalBalance
  }

  // synchronous
  getNumTransactions (options = {}) {
    return this.walletLocalData.transactionsArray.length
  }

  // asynchronous
  getTransactions (options = {}) {
    // return Promise.resolve(dataStore.getTransactions(options = {}))
  }

  // synchronous
  getFreshAddress (options = {}) {
    // Algorithm to derive master pub key from master private key
    //  master public key = "pub[masterPrivateKey]". ie. "pub294709fe7a0sb0c8f7398f"
    // Algorithm to drive an address from index is "[index]-[masterPublicKey]" ie. "102-pub294709fe7a0sb0c8f7398f"
    return this.addressFromIndex(this.walletLocalData.addressIndex)
  }

  // synchronous
  addGapLimitAddresses (addresses, options) {
    for (const i in addresses) {
      this.walletLocalData.gapLimitAddresses[addresses[i]] = true
    }
  }

  // synchronous
  isAddressUsed (address, options = {}) {
    const addrObj = this.walletLocalData.addressArray[address]
    if (addrObj != null) {
      if (addrObj.txids.length > 0) {
        return true
      }
    }
    return false
  }

  // synchronous
  makeSpend (abcSpendInfo) { // returns an ABCTransaction data structure, and checks for valid info
    // return Promise.resolve(dataStore.makeSpend(abcSpendInfo))
  }

  // asynchronous
  signTx (abcTransaction) {
    // return Promise.resolve(dataStore.signTx(abcTransaction))
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
