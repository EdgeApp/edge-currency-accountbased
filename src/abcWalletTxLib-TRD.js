// abcWalletTxLib-btc.js
import { base16 } from 'rfc4648'

// const random = require('random-js')
import { txLibInfo } from './txLibInfo.js'

const GAP_LIMIT = 10
const DATA_STORE_FOLDER = 'txEngineFolder'
const DATA_STORE_FILE = 'walletLocalData.json'
const ADDRESS_POLL_MILLISECONDS = 20000
const TRANSACTION_POLL_MILLISECONDS = 3000
const BLOCKHEIGHT_POLL_MILLISECONDS = 60000
const SAVE_DATASTORE_MILLISECONDS = 10000

const PRIMARY_CURRENCY = txLibInfo.getInfo.currencyCode
const TOKEN_CODES = [PRIMARY_CURRENCY].concat(txLibInfo.supportedTokens)

const baseUrl = 'http://shitcoin-az-braz.airbitz.co:8080/api/'
// const baseUrl = 'http://localhost:8080/api/'

export function makeShitcoinPlugin (opts = {}) {
  const { io } = opts

  return {
    getInfo: () => {
      const currencyDetails = txLibInfo.getInfo

      return currencyDetails
    },

    createMasterKeys: walletType => {
      if (walletType === 'shitcoin') {
        const masterPrivateKey = base16.stringify(io.random(8))
        const masterPublicKey = 'pub' + masterPrivateKey
        return { masterPrivateKey, masterPublicKey }
      } else {
        return null
      }
    },

    makeEngine: (keyInfo, opts = {}) => {
      const abcTxLib = new ABCTxLibTRD(io, keyInfo, opts)

      return abcTxLib
    }
  }
}

class WalletLocalData {
  constructor (jsonString) {
    this.blockHeight = 0
    this.totalBalances = { TRD: 0 }

    // Map of gap limit addresses
    this.gapLimitAddresses = []
    this.transactionsObj = {}

    // Array of ABCTransaction objects sorted by date from newest to oldest
    for (const n in TOKEN_CODES) {
      const currencyCode = TOKEN_CODES[n]
      this.transactionsObj[currencyCode] = []
    }

    // Array of txids to fetch
    this.transactionsToFetch = []

    // Array of address objects, unsorted
    this.addressArray = []

    this.unusedAddressIndex = 0
    this.masterPublicKey = ''
    this.enabledTokens = [PRIMARY_CURRENCY]
    if (jsonString != null) {
      const data = JSON.parse(jsonString)
      for (const k in data) {
        this[k] = data[k]
      }
    }
  }
}

class ABCTransaction {
  constructor (
    txid,
    date,
    currencyCode,
    blockHeight,
    amountSatoshi,
    networkFee,
    signedTx,
    otherParams
  ) {
    this.txid = txid
    this.date = date
    this.currencyCode = currencyCode
    this.blockHeight = blockHeight
    this.amountSatoshi = amountSatoshi
    this.networkFee = networkFee
    this.signedTx = signedTx
    this.otherParams = otherParams
  }
}

class ABCTxLibTRD {
  constructor (io, keyInfo, opts = {}) {
    // dataStore.init(abcTxLibAccess, options, callbacks)
    const { walletLocalFolder, callbacks } = opts

    this.io = io
    this.keyInfo = keyInfo
    this.abcTxLibCallbacks = callbacks
    this.walletLocalFolder = walletLocalFolder

    this.engineOn = false
    this.transactionsDirty = true
    this.addressesChecked = false
    this.numAddressesChecked = 0
    this.numAddressesToCheck = 0
    this.walletLocalData = {}
    this.walletLocalDataDirty = false
    this.transactionsChangedArray = []
  }

  // *************************************
  // Private methods
  // *************************************
  engineLoop () {
    this.engineOn = true
    this.blockHeightInnerLoop()
    this.checkAddressesInnerLoop()
    this.checkTransactionsInnerLoop()
    this.saveWalletDataStore()
  }

  isTokenEnabled (token) {
    return this.walletLocalData.enabledTokens.indexOf(token) !== -1
  }

  fetchGet (cmd, params) {
    return this.io.fetch(baseUrl + cmd + '/' + params, {
      method: 'GET'
    })
  }

  fetchPost (cmd, body) {
    return this.io.fetch(baseUrl + cmd, {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      method: 'POST',
      body: JSON.stringify(body)
    })
  }

  // *************************************
  // Poll on the blockheight
  // *************************************
  blockHeightInnerLoop () {
    if (this.engineOn) {
      const p = new Promise((resolve, reject) => {
        this.fetchGet('height', '')
          .then(function (response) {
            return response.json()
          })
          .then(jsonObj => {
            if (this.walletLocalData.blockHeight !== jsonObj.height) {
              this.walletLocalData.blockHeight = jsonObj.height
              this.walletLocalDataDirty = true
              console.log(
                'Block height changed: ' + this.walletLocalData.blockHeight
              )
              this.abcTxLibCallbacks.onBlockHeightChanged(
                this.walletLocalData.blockHeight
              )
            }
            resolve()
          })
          .catch(function (err) {
            console.log('Error fetching height: ' + err)
            resolve()
          })
      })
      p.then(() => {
        setTimeout(() => {
          this.blockHeightInnerLoop()
        }, BLOCKHEIGHT_POLL_MILLISECONDS)
      })
    }
  }

  checkTransactionsInnerLoop () {
    if (this.engineOn) {
      var promiseArray = []
      const numTransactions = this.walletLocalData.transactionsToFetch.length

      for (var n = 0; n < numTransactions; n++) {
        const txid = this.walletLocalData.transactionsToFetch[n]
        const p = this.processTransactionFromServer(txid)
        promiseArray.push(p)
        console.log('checkTransactionsInnerLoop: check ' + txid)
      }

      if (promiseArray.length > 0) {
        Promise.all(promiseArray)
          .then(response => {
            setTimeout(() => {
              this.checkTransactionsInnerLoop()
            }, TRANSACTION_POLL_MILLISECONDS)
          })
          .catch(e => {
            console.log(
              new Error(
                'Error: checkTransactionsInnerLoop: should not get here'
              )
            )
            setTimeout(() => {
              this.checkTransactionsInnerLoop()
            }, TRANSACTION_POLL_MILLISECONDS)
          })
      } else {
        setTimeout(() => {
          this.checkTransactionsInnerLoop()
        }, TRANSACTION_POLL_MILLISECONDS)
      }
    }
  }

  processTransactionFromServer (txid) {
    return this.fetchGet('transaction', txid)
      .then(function (response) {
        return response.json()
      })
      .then(jsonObj => {
        console.log('processTransactionFromServer: response.json():')
        console.log(jsonObj)

        //
        // Calculate the amount sent from the wallet
        //

        // Iterate through all the inputs and see if any are in our wallet
        let spendAmounts = []
        let receiveAmounts = []
        let amountsSatoshi = []

        const inputs = jsonObj.inputs
        const outputs = jsonObj.outputs

        const otherParams = {
          inputs,
          outputs
        }

        for (const c in TOKEN_CODES) {
          const currencyCode = TOKEN_CODES[c]
          receiveAmounts[currencyCode] = spendAmounts[currencyCode] = 0

          for (var n in inputs) {
            const input = inputs[n]
            const addr = input.address
            const ccode = input.currencyCode
            const idx = this.findAddress(addr)
            if (idx !== -1 && ccode === currencyCode) {
              spendAmounts[ccode] += input.amount
            }
          }

          // Iterate through all the outputs and see if any are in our wallet
          for (let n in outputs) {
            const output = outputs[n]
            const addr = output.address
            const ccode = output.currencyCode
            const idx = this.findAddress(addr)
            if (idx !== -1 && ccode === currencyCode) {
              receiveAmounts[ccode] += output.amount
            }
          }
          amountsSatoshi[currencyCode] =
            receiveAmounts[currencyCode] - spendAmounts[currencyCode]

          // Create a txlib ABCTransaction object which must contain
          // txid, date, blockHeight, amountSatoshi, networkFee, signedTx, and optionally otherParams
          /*
          let networkFee = jsonObj.networkFee
          if (currencyCode != PRIMARY_CURRENCY) {
            networkFee = 0
          }
          */

          if (
            receiveAmounts[currencyCode] !== 0 ||
            spendAmounts[currencyCode] !== 0
          ) {
            var abcTransaction = new ABCTransaction(
              jsonObj.txid,
              jsonObj.txDate,
              currencyCode,
              jsonObj.blockHeight,
              amountsSatoshi[currencyCode],
              jsonObj.networkFee,
              'iwassignedyoucantrustme',
              otherParams
            )
            this.addTransaction(currencyCode, abcTransaction)
          }
        }

        // Remove txid from transactionsToFetch
        const idx = this.walletLocalData.transactionsToFetch.indexOf(
          jsonObj.txid
        )
        if (idx !== -1) {
          this.walletLocalData.transactionsToFetch.splice(idx, 1)
          this.walletLocalDataDirty = true
        }

        if (this.walletLocalData.transactionsToFetch.length === 0) {
          this.abcTxLibCallbacks.onTransactionsChanged(
            this.transactionsChangedArray
          )
          this.transactionsChangedArray = []
        }

        return 0
      })
      .catch(e => {
        console.log('Error fetching address')
        return 0
      })
  }

  // **********************************************
  // Check all addresses for new transactions
  // **********************************************
  checkAddressesInnerLoop () {
    if (this.engineOn) {
      var promiseArray = []
      // var promiseArrayCount = 0
      for (
        var n = 0;
        n < this.walletLocalData.unusedAddressIndex + GAP_LIMIT;
        n++
      ) {
        const address = this.addressFromIndex(n)
        const p = this.processAddressFromServer(address)
        promiseArray.push(p)

        if (this.walletLocalData.addressArray[n] == null) {
          this.walletLocalData.addressArray[n] = { address }
          this.walletLocalDataDirty = true
        } else {
          if (this.walletLocalData.addressArray[n].address !== address) {
            throw new Error('Derived address mismatch on index ' + n)
          }
        }

        console.log('checkAddressesInnerLoop: check ' + address)
      }

      if (promiseArray.length > 0) {
        this.numAddressesChecked = 0
        this.numAddressesToCheck = promiseArray.length
        Promise.all(promiseArray)
          .then(response => {
            // Iterate over all the address balances and get a final balance
            console.log(
              'checkAddressesInnerLoop: Completed responses: ' + response.length
            )

            const arrayAmounts = response
            var totalBalances = { TRD: 0 }
            for (const n in arrayAmounts) {
              const amountsObj = arrayAmounts[n]
              for (const currencyCode in amountsObj) {
                if (totalBalances[currencyCode] == null) {
                  totalBalances[currencyCode] = 0
                }
                totalBalances[currencyCode] += amountsObj[currencyCode]
                console.log(
                  'checkAddressesInnerLoop: arrayAmounts[' +
                    n +
                    '][' +
                    currencyCode +
                    ']: ' +
                    arrayAmounts[n][currencyCode] +
                    ' total:' +
                    totalBalances[currencyCode]
                )
              }
            }
            this.walletLocalData.totalBalances = totalBalances
            this.walletLocalDataDirty = true

            if (!this.addressesChecked) {
              this.addressesChecked = true
              this.abcTxLibCallbacks.onAddressesChecked(1)
              this.numAddressesChecked = 0
              this.numAddressesToCheck = 0
            }
            setTimeout(() => {
              this.checkAddressesInnerLoop()
            }, ADDRESS_POLL_MILLISECONDS)
          })
          .catch(e => {
            console.log(
              new Error('Error: checkAddressesInnerLoop: should not get here')
            )
            setTimeout(() => {
              this.checkAddressesInnerLoop()
            }, ADDRESS_POLL_MILLISECONDS)
          })
      } else {
        setTimeout(() => {
          this.checkAddressesInnerLoop()
        }, ADDRESS_POLL_MILLISECONDS)
      }
    }
  }

  addressFromIndex (index) {
    let addr = '' + index + '_' + this.walletLocalData.masterPublicKey

    if (index === 0) {
      addr = addr + '__600000' // Preload first addresss with some funds
    }
    return addr
  }

  processAddressFromServer (address) {
    return this.fetchGet('address', address)
      .then(function (response) {
        return response.json()
      })
      .then(jsonObj => {
        console.log('processAddressFromServer: response.json():')
        console.log(jsonObj)
        const txids = jsonObj.txids
        const idx = this.findAddress(jsonObj.address)
        if (idx === -1) {
          throw new Error(
            'Queried address not found in addressArray:' + jsonObj.address
          )
        }
        this.walletLocalData.addressArray[idx] = jsonObj
        this.walletLocalDataDirty = true

        // Iterate over txids in address
        for (var n in txids) {
          // This address has transactions
          const txid = txids[n]
          console.log('processAddressFromServer: txid:' + txid)

          if (
            this.findTransaction(PRIMARY_CURRENCY, txid) === -1 &&
            this.walletLocalData.transactionsToFetch.indexOf(txid) === -1
          ) {
            console.log(
              'processAddressFromServer: txid not found. Adding:' + txid
            )
            this.walletLocalData.transactionsToFetch.push(txid)
            this.walletLocalDataDirty = true

            this.transactionsDirty = true
          }
        }

        if (
          (txids != null && txids.length) ||
          this.walletLocalData.gapLimitAddresses.indexOf(jsonObj.address) !== -1
        ) {
          // Since this address is "used", make sure the unusedAddressIndex is incremented if needed
          if (idx >= this.walletLocalData.unusedAddressIndex) {
            this.walletLocalData.unusedAddressIndex = idx + 1
            this.walletLocalDataDirty = true
            console.log(
              'processAddressFromServer: set unusedAddressIndex:' +
                this.walletLocalData.unusedAddressIndex
            )
          }
        }

        this.numAddressesChecked++
        const progress = this.numAddressesChecked / this.numAddressesToCheck

        if (progress !== 1) {
          this.abcTxLibCallbacks.onAddressesChecked(progress)
        }

        return jsonObj.amounts
      })
      .catch(e => {
        console.log('Error fetching address: ' + address)
        return 0
      })
  }

  findTransaction (currencyCode, txid) {
    if (this.walletLocalData.transactionsObj[currencyCode] == null) {
      return -1
    }

    const currency = this.walletLocalData.transactionsObj[currencyCode]
    return currency.findIndex(element => {
      return element.txid === txid
    })
  }

  findAddress (address) {
    return this.walletLocalData.addressArray.findIndex(element => {
      return element.address === address
    })
  }

  sortTxByDate (a, b) {
    return b.date - a.date
  }

  addTransaction (currencyCode, abcTransaction) {
    // Add or update tx in transactionsObj
    const idx = this.findTransaction(currencyCode, abcTransaction.txid)

    if (idx === -1) {
      console.log('addTransaction: adding and sorting:' + abcTransaction.txid)
      this.walletLocalData.transactionsObj[currencyCode].push(abcTransaction)

      // Sort
      this.walletLocalData.transactionsObj[currencyCode].sort(this.sortTxByDate)
      this.walletLocalDataDirty = true
    } else {
      // Update the transaction
      this.walletLocalData.transactionsObj[currencyCode][idx] = abcTransaction
      this.walletLocalDataDirty = true
      console.log('addTransaction: updating:' + abcTransaction.txid)
    }
    this.transactionsChangedArray.push(abcTransaction)
  }

  // *************************************
  // Save the wallet data store
  // *************************************
  saveWalletDataStore () {
    if (this.engineOn) {
      if (this.walletLocalDataDirty) {
        const walletJson = JSON.stringify(this.walletLocalData)
        this.walletLocalFolder
          .folder(DATA_STORE_FOLDER)
          .file(DATA_STORE_FILE)
          .setText(walletJson)
          .then(result => {
            this.walletLocalDataDirty = false
            setTimeout(() => {
              this.saveWalletDataStore()
            }, SAVE_DATASTORE_MILLISECONDS)
          })
          .catch(err => {
            console.log(err)
          })
      }
    }
  }

  // *************************************
  // Public methods
  // *************************************

  startEngine () {
    const prom = new Promise((resolve, reject) => {
      this.walletLocalFolder
        .folder(DATA_STORE_FOLDER)
        .file(DATA_STORE_FILE)
        .getText(DATA_STORE_FOLDER, 'walletLocalData')
        .then(result => {
          this.walletLocalData = new WalletLocalData(result)
          this.walletLocalData.masterPublicKey = this.keyInfo.keys.masterPublicKey
          this.engineLoop()
          resolve()
        })
        .catch(err => {
          console.log(err)
          console.log('No walletLocalData setup yet: Failure is ok')
          this.walletLocalData = new WalletLocalData(null)
          this.walletLocalData.masterPublicKey = this.keyInfo.keys.masterPublicKey
          this.walletLocalFolder
            .folder(DATA_STORE_FOLDER)
            .file(DATA_STORE_FILE)
            .setText(JSON.stringify(this.walletLocalData))
            .then(result => {
              this.engineLoop()
              resolve()
            })
            .catch(err => {
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
  enableTokens (tokens = []) {
    for (const n in tokens) {
      const token = tokens[n]
      if (this.walletLocalData.enabledTokens.indexOf(token) !== -1) {
        this.walletLocalData.enabledTokens.push(token)
      }
    }
    // return Promise.resolve(dataStore.enableTokens(tokens))
  }

  // synchronous
  getTokenStatus () {
    // return dataStore.getTokensStatus()
  }

  // synchronous
  getBalance (options = {}) {
    let currencyCode = PRIMARY_CURRENCY
    if (options.currencyCode != null) {
      currencyCode = options.currencyCode
    }

    return this.walletLocalData.totalBalances[currencyCode]
  }

  // synchronous
  getNumTransactions (options = {}) {
    let currencyCode = PRIMARY_CURRENCY
    if (options != null && options.currencyCode != null) {
      currencyCode = options.currencyCode
    }
    return this.walletLocalData.transactionsObj[currencyCode].length
  }

  // asynchronous
  getTransactions (options = {}) {
    let currencyCode = PRIMARY_CURRENCY
    if (options != null && options.currencyCode != null) {
      currencyCode = options.currencyCode
    }
    const prom = new Promise((resolve, reject) => {
      let startIndex = 0
      let numEntries = 0
      if (options == null) {
        resolve(this.walletLocalData.transactionsObj[currencyCode].slice(0))
        return
      }
      if (options.startIndex != null && options.startIndex > 0) {
        startIndex = options.startIndex
        if (
          startIndex >=
          this.walletLocalData.transactionsObj[currencyCode].length
        ) {
          startIndex =
            this.walletLocalData.transactionsObj[currencyCode].length - 1
        }
      }
      if (options.numEntries != null && options.numEntries > 0) {
        numEntries = options.numEntries
        if (
          numEntries + startIndex >
          this.walletLocalData.transactionsObj[currencyCode].length
        ) {
          // Don't read past the end of the transactionsObj
          numEntries =
            this.walletLocalData.transactionsObj[currencyCode].length -
            startIndex
        }
      }

      // Copy the appropriate entries from the arrayTransactions
      let returnArray = []

      if (numEntries) {
        returnArray = this.walletLocalData.transactionsObj[currencyCode].slice(
          startIndex,
          numEntries + startIndex
        )
      } else {
        returnArray = this.walletLocalData.transactionsObj[currencyCode].slice(
          startIndex
        )
      }
      resolve(returnArray)
    })

    return prom
  }

  // synchronous
  getFreshAddress (options = {}) {
    // Algorithm to derive master pub key from master private key
    //  master public key = "pub[masterPrivateKey]". ie. "pub294709fe7a0sb0c8f7398f"
    // Algorithm to drive an address from index is "[index]-[masterPublicKey]" ie. "102-pub294709fe7a0sb0c8f7398f"
    return this.addressFromIndex(this.walletLocalData.unusedAddressIndex)
  }

  // synchronous
  addGapLimitAddresses (addresses, options) {
    for (var i in addresses) {
      if (this.walletLocalData.gapLimitAddresses.indexOf(addresses[i]) === -1) {
        this.walletLocalData.gapLimitAddresses.push(addresses[i])
      }
    }
  }

  // synchronous
  isAddressUsed (address, options = {}) {
    let idx = this.findAddress(address)
    if (idx !== -1) {
      const addrObj = this.walletLocalData.addressArray[idx]
      if (addrObj != null) {
        if (addrObj.txids.length > 0) {
          return true
        }
      }
    }
    idx = this.walletLocalData.gapLimitAddresses.indexOf(address)
    if (idx !== -1) {
      return true
    }
    return false
  }

  // synchronous
  makeSpend (abcSpendInfo) {
    // returns an ABCTransaction data structure, and checks for valid info
    const prom = new Promise((resolve, reject) => {
      // ******************************
      // Get the fee amount
      let networkFee = 50000
      if (abcSpendInfo.networkFeeOption === 'high') {
        networkFee += 10000
      } else if (abcSpendInfo.networkFeeOption === 'low') {
        networkFee -= 10000
      } else if (abcSpendInfo.networkFeeOption === 'custom') {
        if (
          abcSpendInfo.customNetworkFee == null ||
          abcSpendInfo.customNetworkFee <= 0
        ) {
          reject(new Error('Invalid custom fee'))
          return
        } else {
          networkFee = abcSpendInfo.customNetworkFee
        }
      }

      // ******************************
      // Calculate the total to send
      let totalSpends = {}
      totalSpends[PRIMARY_CURRENCY] = 0
      let outputs = []
      const spendTargets = abcSpendInfo.spendTargets

      for (let n in spendTargets) {
        const spendTarget = spendTargets[n]
        if (spendTarget.amountSatoshi <= 0) {
          reject(new Error('Error: invalid spendTarget amount'))
          return
        }
        let currencyCode = PRIMARY_CURRENCY
        if (spendTarget.currencyCode != null) {
          currencyCode = spendTarget.currencyCode
        }
        if (totalSpends[currencyCode] == null) {
          totalSpends[currencyCode] = 0
        }
        totalSpends[currencyCode] += spendTarget.amountSatoshi
        outputs.push({
          currencyCode,
          address: spendTarget.publicAddress,
          amount: spendTarget.amountSatoshi
        })
      }
      totalSpends[PRIMARY_CURRENCY] += networkFee

      for (const n in totalSpends) {
        const totalSpend = totalSpends[n]
        // XXX check if spends exceed totals
        if (totalSpend > this.walletLocalData.totalBalances[n]) {
          reject(new Error('Error: insufficient balance for token:' + n))
          return
        }
      }

      // ****************************************************
      // Pick inputs. Picker will use all funds in an address
      let totalInputAmounts = {}
      let inputs = []
      const addressArray = this.walletLocalData.addressArray
      // Get a new address for change if needed
      const changeAddress = this.addressFromIndex(
        this.walletLocalData.unusedAddressIndex
      )

      for (let currencyCode in totalSpends) {
        for (let n in addressArray) {
          let addressObj = addressArray[n]
          if (addressObj.amounts[currencyCode] > 0) {
            if (totalInputAmounts[currencyCode] == null) {
              totalInputAmounts[currencyCode] = 0
            }

            totalInputAmounts[currencyCode] += addressObj.amounts[currencyCode]
            inputs.push({
              currencyCode,
              address: addressObj.address,
              amount: addressObj.amounts[currencyCode]
            })
          }
          if (totalInputAmounts[currencyCode] >= totalSpends[currencyCode]) {
            break
          }
        }

        if (totalInputAmounts[currencyCode] < totalSpends[currencyCode]) {
          reject(
            new Error('Error: insufficient funds for token:' + currencyCode)
          )
          return
        }
        if (totalInputAmounts[currencyCode] > totalSpends[currencyCode]) {
          outputs.push({
            currencyCode,
            address: changeAddress,
            amount: totalInputAmounts[currencyCode] - totalSpends[currencyCode]
          })
        }
      }

      // **********************************
      // Create the unsigned ABCTransaction
      const abcTransaction = new ABCTransaction(
        null,
        null,
        null,
        null,
        totalSpends[PRIMARY_CURRENCY],
        networkFee,
        null,
        { inputs, outputs }
      )

      resolve(abcTransaction)
    })
    return prom
  }

  // asynchronous
  signTx (abcTransaction) {
    const prom = new Promise((resolve, reject) => {
      abcTransaction.signedTx = 'iwassignedjusttrustme'
      resolve(abcTransaction)
    })

    return prom
  }

  // asynchronous
  broadcastTx (abcTransaction) {
    const prom = new Promise((resolve, reject) => {
      this.fetchPost('spend', abcTransaction.otherParams)
        .then(function (response) {
          return response.json()
        })
        .then(jsonObj => {
          // Copy params from returned transaction object to our abcTransaction object
          abcTransaction.blockHeight = jsonObj.blockHeight
          abcTransaction.txid = jsonObj.txid
          abcTransaction.date = jsonObj.txDate
          resolve(abcTransaction)
        })
        .catch(e => {
          reject(new Error('Error: broadcastTx failed'))
        })
    })
    return prom
  }

  // asynchronous
  saveTx (abcTransaction) {
    const prom = new Promise((resolve, reject) => {
      resolve(abcTransaction)
    })

    return prom
  }
}
