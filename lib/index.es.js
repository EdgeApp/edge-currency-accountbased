import { base16 } from 'rfc4648';

/* global */

var txLibInfo = {
  supportedTokens: ['ANA', 'DOGESHIT', 'CRAP'],

  getInfo: {
    // Details of supported currency
    currencyCode: 'TRD', // The 3 character code for the currency
    denominations: [
      // An array of Objects of the possible denominations for this currency
      {
        name: 'shits', // The human readable string to describe the denomination
        multiplier: 100, // The value to multiply the smallest unit of currency to get to the denomination
        symbol: 'ƀ' // The human readable 1-3 character symbol of the currency, e.g “Ƀ”
      },
      {
        name: 'mTRD',
        multiplier: 100000,
        symbol: 'mɃ'
      },
      {
        name: 'TRD',
        multiplier: 100000000,
        symbol: 'Ƀ'
      }
    ],
    symbolImage: 'qq/2iuhfiu1/3iufhlq249r8yq34tiuhq4giuhaiwughiuaergih/rg', // Base64 encoded png or jpg image of the currency symbol (optional)
    metaTokens: [
      // Array of objects describing the supported metatokens
      {
        currencyCode: 'ANA',
        denominations: [
          {
            name: 'ANA',
            multiplier: 1
          }
        ],
        symbolImage: 'fe/3fthfiu1/3iufhlq249r8yq34tiuhqggiuhaiwughiuaergih/ef'
      },
      {
        currencyCode: 'DOGESHIT',
        denominations: [
          {
            name: 'DOGESHIT',
            multiplier: 1
          }
        ],
        symbolImage: 'fe/3fthfiu1/3iufhlq249r8yq34tiuhqggiuhaiwughiuaergih/ef'
      },
      {
        currencyCode: 'CRAP',
        denominations: [
          {
            name: 'CRAP',
            multiplier: 1
          }
        ],
        symbolImage: 'qe/3fthfi2fg1/3iufhlq249r8yq34tiuhqggiuhaiwughiuaergih/ef'
      }
    ]
  }
};

// abcWalletTxLib-btc.js
// const random = require('random-js')
var GAP_LIMIT = 10;
var DATA_STORE_FOLDER = 'txEngineFolder';
var ADDRESS_POLL_MILLISECONDS = 20000;
var TRANSACTION_POLL_MILLISECONDS = 3000;
var BLOCKHEIGHT_POLL_MILLISECONDS = 60000;
var SAVE_DATASTORE_MILLISECONDS = 10000;

var PRIMARY_CURRENCY = txLibInfo.getInfo.currencyCode;
var TOKEN_CODES = [PRIMARY_CURRENCY].concat(txLibInfo.supportedTokens);

var baseUrl = 'http://shitcoin-az-braz.airbitz.co:8080/api/';
// const baseUrl = 'http://localhost:8080/api/'

var TxLibBTC = {
  getInfo: function () {
    var currencyDetails = txLibInfo.getInfo;

    return currencyDetails
  },

  createMasterKeys: function (io, walletType) {
    if (walletType === 'shitcoin') {
      var masterPrivateKey = base16.stringify(io.random(8));
      var masterPublicKey = 'pub' + masterPrivateKey;
      return { masterPrivateKey: masterPrivateKey, masterPublicKey: masterPublicKey }
    } else {
      return null
    }
  },

  makeEngine: function (abcTxLibAccess, options, callbacks) {
    var abcTxLib = new ABCTxLibTRD(abcTxLibAccess, options, callbacks);

    return abcTxLib
  }
};

var WalletLocalData = function WalletLocalData (jsonString) {
  var this$1 = this;

  this.blockHeight = 0;
  this.totalBalances = { TRD: 0 };

  // Map of gap limit addresses
  this.gapLimitAddresses = [];
  this.transactionsObj = {};

  // Array of ABCTransaction objects sorted by date from newest to oldest
  for (var n in TOKEN_CODES) {
    var currencyCode = TOKEN_CODES[n];
    this$1.transactionsObj[currencyCode] = [];
  }

  // Array of txids to fetch
  this.transactionsToFetch = [];

  // Array of address objects, unsorted
  this.addressArray = [];

  this.unusedAddressIndex = 0;
  this.masterPublicKey = '';
  this.enabledTokens = [PRIMARY_CURRENCY];
  if (jsonString != null) {
    var data = JSON.parse(jsonString);
    for (var k in data) {
      this$1[k] = data[k];
    }
  }
};

var ABCTransaction = function ABCTransaction (
  txid,
  date,
  currencyCode,
  blockHeight,
  amountSatoshi,
  networkFee,
  signedTx,
  otherParams
) {
  this.txid = txid;
  this.date = date;
  this.currencyCode = currencyCode;
  this.blockHeight = blockHeight;
  this.amountSatoshi = amountSatoshi;
  this.networkFee = networkFee;
  this.signedTx = signedTx;
  this.otherParams = otherParams;
};

var ABCTxLibTRD = function ABCTxLibTRD (abcTxLibAccess, options, callbacks) {
  // dataStore.init(abcTxLibAccess, options, callbacks)
  this.engineOn = false;
  this.transactionsDirty = true;
  this.addressesChecked = false;
  this.numAddressesChecked = 0;
  this.numAddressesToCheck = 0;
  this.abcTxLibCallbacks = callbacks;
  this.abcTxLibOptions = options;
  this.io = abcTxLibAccess.io;
  this.walletLocalDataStore = abcTxLibAccess.walletLocalDataStore;
  this.walletLocalData = {};
  this.walletLocalDataDirty = false;
  this.transactionsChangedArray = [];
};

// *************************************
// Private methods
// *************************************
ABCTxLibTRD.prototype.engineLoop = function engineLoop () {
  this.engineOn = true;
  this.blockHeightInnerLoop();
  this.checkAddressesInnerLoop();
  this.checkTransactionsInnerLoop();
  this.saveWalletDataStore();
};

ABCTxLibTRD.prototype.isTokenEnabled = function isTokenEnabled (token) {
  return this.walletLocalData.enabledTokens.indexOf(token) !== -1
};

ABCTxLibTRD.prototype.fetchGet = function fetchGet (cmd, params) {
  return this.io.fetch(baseUrl + cmd + '/' + params, {
    method: 'get'
  })
};

ABCTxLibTRD.prototype.fetchPost = function fetchPost (cmd, body) {
  return this.io.fetch(baseUrl + cmd, {
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    method: 'post',
    body: JSON.stringify(body)
  })
};

// *************************************
// Poll on the blockheight
// *************************************
ABCTxLibTRD.prototype.blockHeightInnerLoop = function blockHeightInnerLoop () {
    var this$1 = this;

  if (this.engineOn) {
    var p = new Promise(function (resolve, reject) {
      this$1.fetchGet('height', '')
        .then(function (response) {
          return response.json()
        })
        .then(function (jsonObj) {
          if (this$1.walletLocalData.blockHeight !== jsonObj.height) {
            this$1.walletLocalData.blockHeight = jsonObj.height;
            this$1.walletLocalDataDirty = true;
            console.log(
              'Block height changed: ' + this$1.walletLocalData.blockHeight
            );
            this$1.abcTxLibCallbacks.blockHeightChanged(
              this$1.walletLocalData.blockHeight
            );
          }
          resolve();
        })
        .catch(function (err) {
          console.log('Error fetching height: ' + err);
          resolve();
        });
    });
    p.then(function () {
      setTimeout(function () {
        this$1.blockHeightInnerLoop();
      }, BLOCKHEIGHT_POLL_MILLISECONDS);
    });
  }
};

ABCTxLibTRD.prototype.checkTransactionsInnerLoop = function checkTransactionsInnerLoop () {
    var this$1 = this;

  if (this.engineOn) {
    var promiseArray = [];
    var numTransactions = this.walletLocalData.transactionsToFetch.length;

    for (var n = 0; n < numTransactions; n++) {
      var txid = this$1.walletLocalData.transactionsToFetch[n];
      var p = this$1.processTransactionFromServer(txid);
      promiseArray.push(p);
      console.log('checkTransactionsInnerLoop: check ' + txid);
    }

    if (promiseArray.length > 0) {
      Promise.all(promiseArray)
        .then(function (response) {
          setTimeout(function () {
            this$1.checkTransactionsInnerLoop();
          }, TRANSACTION_POLL_MILLISECONDS);
        })
        .catch(function (e) {
          console.log(
            new Error(
              'Error: checkTransactionsInnerLoop: should not get here'
            )
          );
          setTimeout(function () {
            this$1.checkTransactionsInnerLoop();
          }, TRANSACTION_POLL_MILLISECONDS);
        });
    } else {
      setTimeout(function () {
        this$1.checkTransactionsInnerLoop();
      }, TRANSACTION_POLL_MILLISECONDS);
    }
  }
};

ABCTxLibTRD.prototype.processTransactionFromServer = function processTransactionFromServer (txid) {
    var this$1 = this;

  return this.fetchGet('transaction', txid)
    .then(function (response) {
      return response.json()
    })
    .then(function (jsonObj) {
      console.log('processTransactionFromServer: response.json():');
      console.log(jsonObj);

      //
      // Calculate the amount sent from the wallet
      //

      // Iterate through all the inputs and see if any are in our wallet
      var spendAmounts = [];
      var receiveAmounts = [];
      var amountsSatoshi = [];

      var inputs = jsonObj.inputs;
      var outputs = jsonObj.outputs;

      var otherParams = {
        inputs: inputs,
        outputs: outputs
      };

      for (var c in TOKEN_CODES) {
        var currencyCode = TOKEN_CODES[c];
        receiveAmounts[currencyCode] = spendAmounts[currencyCode] = 0;

        for (var n in inputs) {
          var input = inputs[n];
          var addr = input.address;
          var ccode = input.currencyCode;
          var idx$1 = this$1.findAddress(addr);
          if (idx$1 !== -1 && ccode === currencyCode) {
            spendAmounts[ccode] += input.amount;
          }
        }

        // Iterate through all the outputs and see if any are in our wallet
        for (var n$1 in outputs) {
          var output = outputs[n$1];
          var addr$1 = output.address;
          var ccode$1 = output.currencyCode;
          var idx$2 = this$1.findAddress(addr$1);
          if (idx$2 !== -1 && ccode$1 === currencyCode) {
            receiveAmounts[ccode$1] += output.amount;
          }
        }
        amountsSatoshi[currencyCode] =
          receiveAmounts[currencyCode] - spendAmounts[currencyCode];

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
          );
          this$1.addTransaction(currencyCode, abcTransaction);
        }
      }

      // Remove txid from transactionsToFetch
      var idx = this$1.walletLocalData.transactionsToFetch.indexOf(
        jsonObj.txid
      );
      if (idx !== -1) {
        this$1.walletLocalData.transactionsToFetch.splice(idx, 1);
        this$1.walletLocalDataDirty = true;
      }

      if (this$1.walletLocalData.transactionsToFetch.length === 0) {
        this$1.abcTxLibCallbacks.transactionsChanged(
          this$1.transactionsChangedArray
        );
        this$1.transactionsChangedArray = [];
      }

      return 0
    })
    .catch(function (e) {
      console.log('Error fetching address');
      return 0
    })
};

// **********************************************
// Check all addresses for new transactions
// **********************************************
ABCTxLibTRD.prototype.checkAddressesInnerLoop = function checkAddressesInnerLoop () {
    var this$1 = this;

  if (this.engineOn) {
    var promiseArray = [];
    // var promiseArrayCount = 0
    for (
      var n = 0;
      n < this.walletLocalData.unusedAddressIndex + GAP_LIMIT;
      n++
    ) {
      var address = this$1.addressFromIndex(n);
      var p = this$1.processAddressFromServer(address);
      promiseArray.push(p);

      if (this$1.walletLocalData.addressArray[n] == null) {
        this$1.walletLocalData.addressArray[n] = { address: address };
        this$1.walletLocalDataDirty = true;
      } else {
        if (this$1.walletLocalData.addressArray[n].address !== address) {
          throw new Error('Derived address mismatch on index ' + n)
        }
      }

      console.log('checkAddressesInnerLoop: check ' + address);
    }

    if (promiseArray.length > 0) {
      this.numAddressesChecked = 0;
      this.numAddressesToCheck = promiseArray.length;
      Promise.all(promiseArray)
        .then(function (response) {
          // Iterate over all the address balances and get a final balance
          console.log(
            'checkAddressesInnerLoop: Completed responses: ' + response.length
          );

          var arrayAmounts = response;
          var totalBalances = { TRD: 0 };
          for (var n in arrayAmounts) {
            var amountsObj = arrayAmounts[n];
            for (var currencyCode in amountsObj) {
              if (totalBalances[currencyCode] == null) {
                totalBalances[currencyCode] = 0;
              }
              totalBalances[currencyCode] += amountsObj[currencyCode];
              console.log(
                'checkAddressesInnerLoop: arrayAmounts[' +
                  n +
                  '][' +
                  currencyCode +
                  ']: ' +
                  arrayAmounts[n][currencyCode] +
                  ' total:' +
                  totalBalances[currencyCode]
              );
            }
          }
          this$1.walletLocalData.totalBalances = totalBalances;
          this$1.walletLocalDataDirty = true;

          if (!this$1.addressesChecked) {
            this$1.addressesChecked = true;
            this$1.abcTxLibCallbacks.addressesChecked(1);
            this$1.numAddressesChecked = 0;
            this$1.numAddressesToCheck = 0;
          }
          setTimeout(function () {
            this$1.checkAddressesInnerLoop();
          }, ADDRESS_POLL_MILLISECONDS);
        })
        .catch(function (e) {
          console.log(
            new Error('Error: checkAddressesInnerLoop: should not get here')
          );
          setTimeout(function () {
            this$1.checkAddressesInnerLoop();
          }, ADDRESS_POLL_MILLISECONDS);
        });
    } else {
      setTimeout(function () {
        this$1.checkAddressesInnerLoop();
      }, ADDRESS_POLL_MILLISECONDS);
    }
  }
};

ABCTxLibTRD.prototype.addressFromIndex = function addressFromIndex (index) {
  var addr = '' + index + '_' + this.walletLocalData.masterPublicKey;

  if (index === 0) {
    addr = addr + '__600000'; // Preload first addresss with some funds
  }
  return addr
};

ABCTxLibTRD.prototype.processAddressFromServer = function processAddressFromServer (address) {
    var this$1 = this;

  return this.fetchGet('address', address)
    .then(function (response) {
      return response.json()
    })
    .then(function (jsonObj) {
      console.log('processAddressFromServer: response.json():');
      console.log(jsonObj);
      var txids = jsonObj.txids;
      var idx = this$1.findAddress(jsonObj.address);
      if (idx === -1) {
        throw new Error(
          'Queried address not found in addressArray:' + jsonObj.address
        )
      }
      this$1.walletLocalData.addressArray[idx] = jsonObj;
      this$1.walletLocalDataDirty = true;

      // Iterate over txids in address
      for (var n in txids) {
        // This address has transactions
        var txid = txids[n];
        console.log('processAddressFromServer: txid:' + txid);

        if (
          this$1.findTransaction(PRIMARY_CURRENCY, txid) === -1 &&
          this$1.walletLocalData.transactionsToFetch.indexOf(txid) === -1
        ) {
          console.log(
            'processAddressFromServer: txid not found. Adding:' + txid
          );
          this$1.walletLocalData.transactionsToFetch.push(txid);
          this$1.walletLocalDataDirty = true;

          this$1.transactionsDirty = true;
        }
      }

      if (
        (txids != null && txids.length) ||
        this$1.walletLocalData.gapLimitAddresses.indexOf(jsonObj.address) !== -1
      ) {
        // Since this address is "used", make sure the unusedAddressIndex is incremented if needed
        if (idx >= this$1.walletLocalData.unusedAddressIndex) {
          this$1.walletLocalData.unusedAddressIndex = idx + 1;
          this$1.walletLocalDataDirty = true;
          console.log(
            'processAddressFromServer: set unusedAddressIndex:' +
              this$1.walletLocalData.unusedAddressIndex
          );
        }
      }

      this$1.numAddressesChecked++;
      var progress = this$1.numAddressesChecked / this$1.numAddressesToCheck;

      if (progress !== 1) {
        this$1.abcTxLibCallbacks.addressesChecked(progress);
      }

      return jsonObj.amounts
    })
    .catch(function (e) {
      console.log('Error fetching address: ' + address);
      return 0
    })
};

ABCTxLibTRD.prototype.findTransaction = function findTransaction (currencyCode, txid) {
  if (this.walletLocalData.transactionsObj[currencyCode] == null) {
    return -1
  }

  var currency = this.walletLocalData.transactionsObj[currencyCode];
  return currency.findIndex(function (element) {
    return element.txid === txid
  })
};

ABCTxLibTRD.prototype.findAddress = function findAddress (address) {
  return this.walletLocalData.addressArray.findIndex(function (element) {
    return element.address === address
  })
};

ABCTxLibTRD.prototype.sortTxByDate = function sortTxByDate (a, b) {
  return b.date - a.date
};

ABCTxLibTRD.prototype.addTransaction = function addTransaction (currencyCode, abcTransaction) {
  // Add or update tx in transactionsObj
  var idx = this.findTransaction(currencyCode, abcTransaction.txid);

  if (idx === -1) {
    console.log('addTransaction: adding and sorting:' + abcTransaction.txid);
    this.walletLocalData.transactionsObj[currencyCode].push(abcTransaction);

    // Sort
    this.walletLocalData.transactionsObj[currencyCode].sort(this.sortTxByDate);
    this.walletLocalDataDirty = true;
  } else {
    // Update the transaction
    this.walletLocalData.transactionsObj[currencyCode][idx] = abcTransaction;
    this.walletLocalDataDirty = true;
    console.log('addTransaction: updating:' + abcTransaction.txid);
  }
  this.transactionsChangedArray.push(abcTransaction);
};

// *************************************
// Save the wallet data store
// *************************************
ABCTxLibTRD.prototype.saveWalletDataStore = function saveWalletDataStore () {
    var this$1 = this;

  if (this.engineOn) {
    if (this.walletLocalDataDirty) {
      var walletJson = JSON.stringify(this.walletLocalData);
      this.walletLocalDataStore
        .writeData(DATA_STORE_FOLDER, 'walletLocalData', walletJson)
        .then(function (result) {
          this$1.walletLocalDataDirty = false;
          setTimeout(function () {
            this$1.saveWalletDataStore();
          }, SAVE_DATASTORE_MILLISECONDS);
        })
        .catch(function (err) {
          console.log(err);
        });
    }
  }
};

// *************************************
// Public methods
// *************************************

ABCTxLibTRD.prototype.startEngine = function startEngine () {
    var this$1 = this;

  var prom = new Promise(function (resolve, reject) {
    this$1.walletLocalDataStore
      .readData(DATA_STORE_FOLDER, 'walletLocalData')
      .then(function (result) {
        this$1.walletLocalData = new WalletLocalData(result);
        this$1.walletLocalData.masterPublicKey = this$1.abcTxLibOptions.masterPublicKey;
        this$1.engineLoop();
        resolve();
      })
      .catch(function (err) {
        console.log(err);
        console.log('No walletLocalData setup yet: Failure is ok');
        this$1.walletLocalData = new WalletLocalData(null);
        this$1.walletLocalData.masterPublicKey = this$1.abcTxLibOptions.masterPublicKey;
        this$1.walletLocalDataStore
          .writeData(
            DATA_STORE_FOLDER,
            'walletLocalData',
            JSON.stringify(this$1.walletLocalData)
          )
          .then(function (result) {
            this$1.engineLoop();
            resolve();
          })
          .catch(function (err) {
            console.log('Error writing to localDataStore:' + err);
            resolve();
          });
      });
  });

  return prom
};

ABCTxLibTRD.prototype.killEngine = function killEngine () {
  // disconnect network connections
  // clear caches

  this.engineOn = false;

  return true
};

// synchronous
ABCTxLibTRD.prototype.getBlockHeight = function getBlockHeight () {
  return this.walletLocalData.blockHeight
};

// asynchronous
ABCTxLibTRD.prototype.enableTokens = function enableTokens (tokens) {
    var this$1 = this;
    if ( tokens === void 0 ) tokens = [];

  for (var n in tokens) {
    var token = tokens[n];
    if (this$1.walletLocalData.enabledTokens.indexOf(token) !== -1) {
      this$1.walletLocalData.enabledTokens.push(token);
    }
  }
  // return Promise.resolve(dataStore.enableTokens(tokens))
};

// synchronous
ABCTxLibTRD.prototype.getTokenStatus = function getTokenStatus () {
  // return dataStore.getTokensStatus()
};

// synchronous
ABCTxLibTRD.prototype.getBalance = function getBalance (options) {
    if ( options === void 0 ) options = {};

  var currencyCode = PRIMARY_CURRENCY;
  if (options.currencyCode != null) {
    currencyCode = options.currencyCode;
  }

  return this.walletLocalData.totalBalances[currencyCode]
};

// synchronous
ABCTxLibTRD.prototype.getNumTransactions = function getNumTransactions (options) {
    if ( options === void 0 ) options = {};

  var currencyCode = PRIMARY_CURRENCY;
  if (options != null && options.currencyCode != null) {
    currencyCode = options.currencyCode;
  }
  return this.walletLocalData.transactionsObj[currencyCode].length
};

// asynchronous
ABCTxLibTRD.prototype.getTransactions = function getTransactions (options) {
    var this$1 = this;
    if ( options === void 0 ) options = {};

  var currencyCode = PRIMARY_CURRENCY;
  if (options != null && options.currencyCode != null) {
    currencyCode = options.currencyCode;
  }
  var prom = new Promise(function (resolve, reject) {
    var startIndex = 0;
    var numEntries = 0;
    if (options == null) {
      resolve(this$1.walletLocalData.transactionsObj[currencyCode].slice(0));
      return
    }
    if (options.startIndex != null && options.startIndex > 0) {
      startIndex = options.startIndex;
      if (
        startIndex >=
        this$1.walletLocalData.transactionsObj[currencyCode].length
      ) {
        startIndex =
          this$1.walletLocalData.transactionsObj[currencyCode].length - 1;
      }
    }
    if (options.numEntries != null && options.numEntries > 0) {
      numEntries = options.numEntries;
      if (
        numEntries + startIndex >
        this$1.walletLocalData.transactionsObj[currencyCode].length
      ) {
        // Don't read past the end of the transactionsObj
        numEntries =
          this$1.walletLocalData.transactionsObj[currencyCode].length -
          startIndex;
      }
    }

    // Copy the appropriate entries from the arrayTransactions
    var returnArray = [];

    if (numEntries) {
      returnArray = this$1.walletLocalData.transactionsObj[currencyCode].slice(
        startIndex,
        numEntries + startIndex
      );
    } else {
      returnArray = this$1.walletLocalData.transactionsObj[currencyCode].slice(
        startIndex
      );
    }
    resolve(returnArray);
  });

  return prom
};

// synchronous
ABCTxLibTRD.prototype.getFreshAddress = function getFreshAddress (options) {
    if ( options === void 0 ) options = {};

  // Algorithm to derive master pub key from master private key
  //master public key = "pub[masterPrivateKey]". ie. "pub294709fe7a0sb0c8f7398f"
  // Algorithm to drive an address from index is "[index]-[masterPublicKey]" ie. "102-pub294709fe7a0sb0c8f7398f"
  return this.addressFromIndex(this.walletLocalData.unusedAddressIndex)
};

// synchronous
ABCTxLibTRD.prototype.addGapLimitAddresses = function addGapLimitAddresses (addresses, options) {
    var this$1 = this;

  for (var i in addresses) {
    if (this$1.walletLocalData.gapLimitAddresses.indexOf(addresses[i]) === -1) {
      this$1.walletLocalData.gapLimitAddresses.push(addresses[i]);
    }
  }
};

// synchronous
ABCTxLibTRD.prototype.isAddressUsed = function isAddressUsed (address, options) {
    if ( options === void 0 ) options = {};

  var idx = this.findAddress(address);
  if (idx !== -1) {
    var addrObj = this.walletLocalData.addressArray[idx];
    if (addrObj != null) {
      if (addrObj.txids.length > 0) {
        return true
      }
    }
  }
  idx = this.walletLocalData.gapLimitAddresses.indexOf(address);
  if (idx !== -1) {
    return true
  }
  return false
};

// synchronous
ABCTxLibTRD.prototype.makeSpend = function makeSpend (abcSpendInfo) {
    var this$1 = this;

  // returns an ABCTransaction data structure, and checks for valid info
  var prom = new Promise(function (resolve, reject) {
    // ******************************
    // Get the fee amount
    var networkFee = 50000;
    if (abcSpendInfo.networkFeeOption === 'high') {
      networkFee += 10000;
    } else if (abcSpendInfo.networkFeeOption === 'low') {
      networkFee -= 10000;
    } else if (abcSpendInfo.networkFeeOption === 'custom') {
      if (
        abcSpendInfo.customNetworkFee == null ||
        abcSpendInfo.customNetworkFee <= 0
      ) {
        reject(new Error('Invalid custom fee'));
        return
      } else {
        networkFee = abcSpendInfo.customNetworkFee;
      }
    }

    // ******************************
    // Calculate the total to send
    var totalSpends = {};
    totalSpends[PRIMARY_CURRENCY] = 0;
    var outputs = [];
    var spendTargets = abcSpendInfo.spendTargets;

    for (var n in spendTargets) {
      var spendTarget = spendTargets[n];
      if (spendTarget.amountSatoshi <= 0) {
        reject(new Error('Error: invalid spendTarget amount'));
        return
      }
      var currencyCode = PRIMARY_CURRENCY;
      if (spendTarget.currencyCode != null) {
        currencyCode = spendTarget.currencyCode;
      }
      if (totalSpends[currencyCode] == null) {
        totalSpends[currencyCode] = 0;
      }
      totalSpends[currencyCode] += spendTarget.amountSatoshi;
      outputs.push({
        currencyCode: currencyCode,
        address: spendTarget.publicAddress,
        amount: spendTarget.amountSatoshi
      });
    }
    totalSpends[PRIMARY_CURRENCY] += networkFee;

    for (var n$1 in totalSpends) {
      var totalSpend = totalSpends[n$1];
      // XXX check if spends exceed totals
      if (totalSpend > this$1.walletLocalData.totalBalances[n$1]) {
        reject(new Error('Error: insufficient balance for token:' + n$1));
        return
      }
    }

    // ****************************************************
    // Pick inputs. Picker will use all funds in an address
    var totalInputAmounts = {};
    var inputs = [];
    var addressArray = this$1.walletLocalData.addressArray;
    // Get a new address for change if needed
    var changeAddress = this$1.addressFromIndex(
      this$1.walletLocalData.unusedAddressIndex
    );

    for (var currencyCode$1 in totalSpends) {
      for (var n$2 in addressArray) {
        var addressObj = addressArray[n$2];
        if (addressObj.amounts[currencyCode$1] > 0) {
          if (totalInputAmounts[currencyCode$1] == null) {
            totalInputAmounts[currencyCode$1] = 0;
          }

          totalInputAmounts[currencyCode$1] += addressObj.amounts[currencyCode$1];
          inputs.push({
            currencyCode: currencyCode$1,
            address: addressObj.address,
            amount: addressObj.amounts[currencyCode$1]
          });
        }
        if (totalInputAmounts[currencyCode$1] >= totalSpends[currencyCode$1]) {
          break
        }
      }

      if (totalInputAmounts[currencyCode$1] < totalSpends[currencyCode$1]) {
        reject(
          new Error('Error: insufficient funds for token:' + currencyCode$1)
        );
        return
      }
      if (totalInputAmounts[currencyCode$1] > totalSpends[currencyCode$1]) {
        outputs.push({
          currencyCode: currencyCode$1,
          address: changeAddress,
          amount: totalInputAmounts[currencyCode$1] - totalSpends[currencyCode$1]
        });
      }
    }

    // **********************************
    // Create the unsigned ABCTransaction
    var abcTransaction = new ABCTransaction(
      null,
      null,
      null,
      null,
      totalSpends[PRIMARY_CURRENCY],
      networkFee,
      null,
      { inputs: inputs, outputs: outputs }
    );

    resolve(abcTransaction);
  });
  return prom
};

// asynchronous
ABCTxLibTRD.prototype.signTx = function signTx (abcTransaction) {
  var prom = new Promise(function (resolve, reject) {
    abcTransaction.signedTx = 'iwassignedjusttrustme';
    resolve(abcTransaction);
  });

  return prom
};

// asynchronous
ABCTxLibTRD.prototype.broadcastTx = function broadcastTx (abcTransaction) {
    var this$1 = this;

  var prom = new Promise(function (resolve, reject) {
    this$1.fetchPost('spend', abcTransaction.otherParams)
      .then(function (response) {
        return response.json()
      })
      .then(function (jsonObj) {
        // Copy params from returned transaction object to our abcTransaction object
        abcTransaction.blockHeight = jsonObj.blockHeight;
        abcTransaction.txid = jsonObj.txid;
        abcTransaction.date = jsonObj.txDate;
        resolve(abcTransaction);
      })
      .catch(function (e) {
        reject(new Error('Error: broadcastTx failed'));
      });
  });
  return prom
};

// asynchronous
ABCTxLibTRD.prototype.saveTx = function saveTx (abcTransaction) {
  var prom = new Promise(function (resolve, reject) {
    resolve(abcTransaction);
  });

  return prom
};

export { TxLibBTC };
//# sourceMappingURL=index.es.js.map
