/**
 * Created by paul on 7/7/17.
 */
// @flow

import BnbApiClient from '@binance-chain/javascript-sdk'
import { bns } from 'biggystring'
import {
  type EdgeSpendInfo,
  type EdgeTransaction,
  type EdgeWalletInfo,
  InsufficientFundsError
} from 'edge-core-js/types'

import { CurrencyEngine } from '../common/engine.js'
import {
  asyncWaterfall,
  getDenomInfo,
  promiseAny,
  shuffleArray,
  validateObject
} from '../common/utils.js'
import { currencyInfo } from './bnbInfo.js'
// import { calcMiningFee } from './ethMiningFees.js'
import { BinancePlugin } from './bnbPlugin.js'
import {
  BinanceApiAccountBalance,
  BinanceApiGetTransactions,
  BinanceApiNodeInfo
} from './bnbSchema.js'
import {
  type BinanceApiTransaction,
  type BinanceTxOtherParams
} from './bnbTypes.js'

const PRIMARY_CURRENCY = currencyInfo.currencyCode
const ACCOUNT_POLL_MILLISECONDS = 20000
const BLOCKCHAIN_POLL_MILLISECONDS = 20000
const TRANSACTION_POLL_MILLISECONDS = 3000
// const UNCONFIRMED_TRANSACTION_POLL_MILLISECONDS = 3000
// const NETWORKFEES_POLL_MILLISECONDS = 60 * 10 * 1000 // 10 minutes
const ADDRESS_QUERY_LOOKBACK_TIME = 1000 * 60 * 60 * 24 // ~ one day
const NUM_TRANSACTIONS_TO_QUERY = 50
const TIMESTAMP_BEFORE_BNB_LAUNCH = 1554076800000 // 2019-04-01, BNB launched on 2019-04-18
const NATIVE_UNIT_MULTIPLIER = '100000000'
const TRANSACTION_QUERY_TIME_WINDOW = 1000 * 60 * 60 * 24 * 2 * 28 // two months
const NETWORK_FEE_NATIVE_AMOUNT = '37500' // fixed amount for BNB

type BnbFunction =
  | 'bnb_broadcastTx'
  | 'bnb_blockNumber'
  | 'bnb_getBalance'
  | 'bnb_getTransactions'
// | 'eth_getTransactionCount'

// async function broadcastWrapper (promise: Promise<Object>, server: string) {
//   const out = {
//     result: await promise,
//     server
//   }
//   return out
// }

// const dummyTransaction: EdgeTransaction = {
//   txid: '', // txid
//   date: 0, // date
//   currencyCode: 'BNB', // currencyCode
//   blockHeight: 0, // blockHeight
//   nativeAmount: '0', // nativeAmount
//   networkFee: '0', // networkFee
//   ourReceiveAddresses: [], // ourReceiveAddresses
//   signedTx: '0', // signedTx
//   otherParams: {} // otherParams
// }

export class BinanceEngine extends CurrencyEngine {
  binancePlugin: BinancePlugin
  // otherData: BinanceWalletOtherData
  // initOptions: BinanceInitOptions

  constructor (
    currencyPlugin: BinancePlugin,
    walletInfo: EdgeWalletInfo,
    initOptions: any, // BinanceInitOptions,
    opts: any // EdgeCurrencyEngineOptions
  ) {
    super(currencyPlugin, walletInfo, opts)
    // if (typeof this.walletInfo.keys.ethereumKey !== 'string') {
    //   if (walletInfo.keys.keys && walletInfo.keys.keys.ethereumKey) {
    //     this.walletInfo.keys.ethereumKey = walletInfo.keys.keys.ethereumKey
    //   }
    // }
    // this.currencyPlugin = currencyPlugin
    // this.initOptions = initOptions
  }

  async fetchGet (url: string) {
    const response = await this.io.fetch(url, {
      method: 'GET'
    })
    if (!response.ok) {
      throw new Error(
        `The server returned error code ${response.status} for ${url}`
      )
    }
    return response.json()
  }

  // async fetchPostBlockcypher (cmd: string, body: any) {
  //   const { blockcypherApiKey } = this.initOptions
  //   let apiKey = ''
  //   if (blockcypherApiKey && blockcypherApiKey.length > 5) {
  //     apiKey = '&token=' + blockcypherApiKey
  //   }
  //   const url = `${
  //     this.currencyInfo.defaultSettings.otherSettings.blockcypherApiServers[0]
  //   }/${cmd}${apiKey}`
  //   const response = await this.io.fetch(url, {
  //     headers: {
  //       Accept: 'application/json',
  //       'Content-Type': 'application/json'
  //     },
  //     method: 'POST',
  //     body: JSON.stringify(body)
  //   })
  //   return response.json()
  // }

  async checkBlockchainInnerLoop () {
    try {
      const jsonObj = await this.multicastServers(
        'bnb_blockNumber',
        `/api/v1/node-info`
      )
      const valid = validateObject(jsonObj, BinanceApiNodeInfo)
      if (valid) {
        const blockHeight: number = jsonObj.sync_info.latest_block_height
        this.log(`Got block height ${blockHeight}`)
        if (this.walletLocalData.blockHeight !== blockHeight) {
          this.checkDroppedTransactionsThrottled()
          this.walletLocalData.blockHeight = blockHeight // Convert to decimal
          this.walletLocalDataDirty = true
          this.currencyEngineCallbacks.onBlockHeightChanged(
            this.walletLocalData.blockHeight
          )
        }
      }
    } catch (err) {
      this.log('Error fetching height: ' + err)
    }
  }

  updateBalance (tk: string, balance: string) {
    if (typeof this.walletLocalData.totalBalances[tk] === 'undefined') {
      this.walletLocalData.totalBalances[tk] = '0'
    }
    if (!bns.eq(balance, this.walletLocalData.totalBalances[tk])) {
      this.walletLocalData.totalBalances[tk] = balance
      this.log(tk + ': token Address balance: ' + balance)
      this.currencyEngineCallbacks.onBalanceChanged(tk, balance)
    }
    this.tokenCheckBalanceStatus[tk] = 1
    this.updateOnAddressesChecked()
  }

  async checkAccountInnerLoop () {
    const address = this.walletLocalData.publicKey

    try {
      const jsonObj = await this.multicastServers(
        'bnb_getBalance',
        `/api/v1/account/${address}`
      )
      const valid = validateObject(jsonObj, BinanceApiAccountBalance)
      if (valid) {
        if (jsonObj.balances.length === 0) {
          this.updateBalance('BNB', '0')
        }
        for (const tk of this.walletLocalData.enabledTokens) {
          for (const balance of jsonObj.balances) {
            if (balance.symbol === tk) {
              const denom = getDenomInfo(this.currencyInfo, tk)
              if (!denom) {
                this.log(`Received unsupported currencyCode: ${tk}`)
                break
              }
              const nativeAmount = bns.mul(balance.free, denom.multiplier)
              this.updateBalance(tk, nativeAmount)
            }
          }
        }
      }
    } catch (e) {
      this.log(`Error checking BNB address balance`)
    }
  }

  // async checkAccountNonceFetch (address: string) {
  //   try {
  //     const jsonObj = await this.multicastServers(
  //       'eth_getTransactionCount',
  //       address
  //     )
  //     const valid = validateObject(jsonObj, EtherscanGetAccountNonce)
  //     const nonce = bns.add('0', jsonObj.result)
  //     if (valid && this.walletLocalData.otherData.nextNonce !== nonce) {
  //       this.walletLocalData.otherData.nextNonce = nonce
  //       this.walletLocalDataDirty = true
  //     }
  //   } catch (e) {
  //     this.log(`Error checking account nonce`, e)
  //   }
  // }

  processBinanceApiTransaction (
    tx: BinanceApiTransaction,
    currencyCode: string
  ) {
    let netNativeAmount: string // Amount received into wallet
    const ourReceiveAddresses: Array<string> = []
    const nativeNetworkFee: string = bns.mul(tx.txFee, NATIVE_UNIT_MULTIPLIER) // always denominated in BNB
    const nativeValue = bns.mul(tx.value, NATIVE_UNIT_MULTIPLIER)
    if (
      tx.fromAddr.toLowerCase() === this.walletLocalData.publicKey.toLowerCase()
    ) {
      // if it's a send to one's self
      if (tx.fromAddr.toLowerCase() === tx.toAddr.toLowerCase()) {
        // Spend to self. netNativeAmount is just the fee
        netNativeAmount = bns.mul(nativeNetworkFee, '-1')
      } else {
        netNativeAmount = bns.sub('0', nativeValue)

        // For spends, include the network fee in the transaction amount
        netNativeAmount = bns.sub(netNativeAmount, nativeNetworkFee)
      }
    } else {
      // Receive transaction
      netNativeAmount = bns.add('0', nativeValue)
      // ourReceiveAddresses.push(this.walletLocalData.publicKey.toLowerCase())
    }

    const otherParams: Object = {
      code: tx.code,
      orderId: tx.orderId
    }

    let blockHeight = tx.blockHeight
    if (blockHeight < 0) blockHeight = 0
    const unixTimestamp = new Date(tx.timeStamp)
    const edgeTransaction: EdgeTransaction = {
      txid: tx.txHash,
      date: unixTimestamp.getTime(),
      currencyCode,
      blockHeight,
      nativeAmount: netNativeAmount,
      networkFee: nativeNetworkFee,
      ourReceiveAddresses, // blank if you sent money otherwise array of addresses that are yours in this transaction
      signedTx: 'unsigned_right_now',
      otherParams
    }

    this.addTransaction(currencyCode, edgeTransaction)
  }

  async checkTransactionsFetch (
    startTime: number,
    currencyCode: string
  ): Promise<boolean> {
    const address = this.walletLocalData.publicKey
    let checkAddressSuccess = true
    let start = startTime
    let end = 0
    const now = Date.now()
    try {
      // this.log('checkTransactionsFetch start of while loop')
      while (end !== now && checkAddressSuccess) {
        // loop from startTime to current time by 3-month increments
        end = start + TRANSACTION_QUERY_TIME_WINDOW
        if (end > now) end = now
        // this.log('checkTransactionsFetch outer loop: ', start, ' and end: ', end)
        for (let offset = 0; ; offset += NUM_TRANSACTIONS_TO_QUERY) {
          // this.log('checkTransactionsFetch inner loop, offset is: ', offset)
          // loop by 50-tx increments
          const baseUrl = `/api/v1/transactions?address=${address}&txType=TRANSFER&limit=${NUM_TRANSACTIONS_TO_QUERY}`
          const finalUrl =
            baseUrl +
            `&offset=${offset}&startTime=${start}&endTime=${end}&txAsset=${currencyCode}`
          const transactionsResults = await this.multicastServers(
            'bnb_getTransactions',
            finalUrl
          )
          const valid = validateObject(
            transactionsResults,
            BinanceApiGetTransactions
          )
          if (valid) {
            for (const transaction of transactionsResults.tx) {
              // shuold we process extra transaction for native BNB fees?
              this.processBinanceApiTransaction(transaction, currencyCode)
              // this.log(
              //   `checkTransactionsFetch inner loop start = ${start} (${new Date(
              //     start
              //   ).toLocaleDateString()}), end = ${new Date(
              //     end
              //   ).toLocaleDateString()}, offset = ${offset}`
              // )
              // this.log(
              //   `checkTransactionsFetch inner loop for ${currencyCode}, length = ${
              //     transactionsResults.tx.length
              //   }`
              // )
            }
            if (transactionsResults.tx.length < NUM_TRANSACTIONS_TO_QUERY) {
              break
            }
          } else {
            checkAddressSuccess = false
            this.log('checkTransactionsFetch inner loop invalid query results')
            break
          }
        }
        start = end
      }
    } catch (e) {
      this.log(
        `Error checkTransactionsFetch ${currencyCode}: ${
          this.walletLocalData.publicKey
        }`,
        e
      )
    }

    if (checkAddressSuccess) {
      this.tokenCheckTransactionsStatus[currencyCode] = 1
      // this.updateOnAddressesChecked()
      return true
    } else {
      return false
    }
  }

  async checkTransactionsInnerLoop () {
    const blockHeight = Date.now()
    let startTime: number = TIMESTAMP_BEFORE_BNB_LAUNCH
    const promiseArray = []

    if (
      this.walletLocalData.lastAddressQueryHeight > ADDRESS_QUERY_LOOKBACK_TIME
    ) {
      // Only query for transactions as far back as ADDRESS_QUERY_LOOKBACK_TIME from the last time we queried transactions
      startTime =
        this.walletLocalData.lastAddressQueryHeight -
        ADDRESS_QUERY_LOOKBACK_TIME
    }

    for (const currencyCode of this.walletLocalData.enabledTokens) {
      promiseArray.push(this.checkTransactionsFetch(startTime, currencyCode))
    }

    let resultArray = []
    try {
      resultArray = await Promise.all(promiseArray)
    } catch (e) {
      this.log('Failed to query transactions')
      this.log(e.name)
      this.log(e.message)
    }
    let successCount = 0
    for (const r of resultArray) {
      if (r) successCount++
    }
    if (successCount === promiseArray.length) {
      // should be time
      this.walletLocalData.lastAddressQueryHeight = blockHeight
    }
    if (this.transactionsChangedArray.length > 0) {
      this.currencyEngineCallbacks.onTransactionsChanged(
        this.transactionsChangedArray
      )
      this.transactionsChangedArray = []
    }
  }

  // async checkUpdateNetworkFees () {
  //   try {
  //     const infoServer = getEdgeInfoServer()
  //     const url = `${infoServer}/v1/networkFees/ETH`
  //     const jsonObj = await this.fetchGet(url)
  //     const valid = validateObject(jsonObj, NetworkFeesSchema)

  //     if (valid) {
  //       if (
  //         JSON.stringify(this.walletLocalData.otherData.networkFees) !==
  //         JSON.stringify(jsonObj)
  //       ) {
  //         this.walletLocalData.otherData.networkFees = jsonObj
  //         this.walletLocalDataDirty = true
  //       }
  //     } else {
  //       this.log('Error: Fetched invalid networkFees')
  //     }
  //   } catch (err) {
  //     this.log('Error fetching networkFees from Edge info server')
  //     this.log(err)
  //   }

  //   try {
  //     const url = 'https://www.ethgasstation.info/json/ethgasAPI.json'
  //     const jsonObj = await this.fetchGet(url)
  //     const valid = validateObject(jsonObj, EthGasStationSchema)

  //     if (valid) {
  //       const fees = this.walletLocalData.otherData.networkFees
  //       const ethereumFee: EthereumFee = fees['default']
  //       if (!ethereumFee.gasPrice) {
  //         return
  //       }
  //       const gasPrice: EthereumFeesGasPrice = ethereumFee.gasPrice

  //       const safeLow = jsonObj.safeLow
  //       let average = jsonObj.average
  //       let fast = jsonObj.fast
  //       let fastest = jsonObj.fastest

  //       // Sanity checks
  //       if (safeLow < 1 || safeLow > 3000) {
  //         console.log('Invalid safeLow value from EthGasStation')
  //         return
  //       }
  //       if (average < 1 || average > 3000) {
  //         console.log('Invalid average value from EthGasStation')
  //         return
  //       }
  //       if (fast < 1 || fast > 3000) {
  //         console.log('Invalid fastest value from EthGasStation')
  //         return
  //       }
  //       if (fastest < 1 || fastest > 3000) {
  //         console.log('Invalid fastest value from EthGasStation')
  //         return
  //       }

  //       // Correct inconsistencies
  //       if (average <= safeLow) average = safeLow + 1
  //       if (fast <= average) fast = average + 1
  //       if (fastest <= fast) fastest = fast + 1

  //       let lowFee = safeLow
  //       let standardFeeLow = fast
  //       let standardFeeHigh = (fast + fastest) * 0.75
  //       let highFee = fastest

  //       lowFee = (Math.round(lowFee) * WEI_MULTIPLIER).toString()
  //       standardFeeLow = (
  //         Math.round(standardFeeLow) * WEI_MULTIPLIER
  //       ).toString()
  //       standardFeeHigh = (
  //         Math.round(standardFeeHigh) * WEI_MULTIPLIER
  //       ).toString()
  //       highFee = (Math.round(highFee) * WEI_MULTIPLIER).toString()

  //       if (
  //         gasPrice.lowFee !== lowFee ||
  //         gasPrice.standardFeeLow !== standardFeeLow ||
  //         gasPrice.highFee !== highFee ||
  //         gasPrice.standardFeeHigh !== standardFeeHigh
  //       ) {
  //         gasPrice.lowFee = lowFee
  //         gasPrice.standardFeeLow = standardFeeLow
  //         gasPrice.highFee = highFee
  //         gasPrice.standardFeeHigh = standardFeeHigh
  //         this.walletLocalDataDirty = true
  //       }
  //     } else {
  //       this.log('Error: Fetched invalid networkFees from EthGasStation')
  //     }
  //   } catch (err) {
  //     this.log('Error fetching networkFees from EthGasStation')
  //     this.log(err)
  //   }
  // }

  async multicastServers (func: BnbFunction, ...params: any): Promise<any> {
    let out = { result: '', server: 'no server' }
    let funcs
    switch (func) {
      case 'bnb_broadcastTx':
        const promises = []
        const broadcastServers = this.currencyInfo.defaultSettings.otherSettings
          .binanceApiServers
        for (const bnbServer of broadcastServers) {
          const endpoint = `${bnbServer}/api/v1/broadcast?sync=true`
          promises.push(
            this.io.fetch(endpoint, {
              method: 'POST',
              body: params[0],
              headers: {
                'content-type': 'text/plain'
              }
            })
          )
        }
        const response = await promiseAny(promises)
        const result = await response.json()
        if (result[0] && result[0].ok && result[0].code === 0) {
          this.log(`BNB multicastServers ${func} ${JSON.stringify(out)} won`)
          return {
            result,
            server: 'irrelevant'
          }
        } else {
          throw new Error('BNB send fail with error: ' + result.message)
        }
      case 'bnb_blockNumber':
      case 'bnb_getBalance':
      case 'bnb_getTransactions':
        funcs = this.currencyInfo.defaultSettings.otherSettings.binanceApiServers.map(
          server => async () => {
            const result = await this.fetchGet(server + params[0])
            if (typeof result !== 'object') {
              const msg = `Invalid return value ${func} in ${server}`
              this.log(msg)
              throw new Error(msg)
            }
            return { server, result }
          }
        )
        // Randomize array
        funcs = shuffleArray(funcs)
        out = await asyncWaterfall(funcs)
        break

      //     case 'eth_getTransactionCount':
      //       url = `?module=proxy&action=eth_getTransactionCount&address=${
      //         params[0]
      //       }&tag=latest`
      //       funcs = this.currencyInfo.defaultSettings.otherSettings.etherscanApiServers.map(
      //         server => async () => {
      //           if (!server.includes('etherscan')) {
      //             throw new Error(
      //               `Unsupported command eth_getTransactionCount in ${server}`
      //             )
      //           }
      //           const result = await this.fetchGetEtherscan(server, url)
      //           if (typeof result.result !== 'string') {
      //             const msg = `Invalid return value eth_getTransactionCount in ${server}`
      //             this.log(msg)
      //             throw new Error(msg)
      //           }
      //           return { server, result }
      //         }
      //       )
      //       funcs2 = async () => {
      //         const result = await this.fetchPostInfura('eth_getTransactionCount', [
      //           params[0],
      //           'latest'
      //         ])
      //         return { server: 'infura', result }
      //       }
      //       funcs.push(funcs2)
      //       // Randomize array
      //       funcs = shuffleArray(funcs)
      //       out = await asyncWaterfall(funcs)
      //       break

      //     case 'getTokenBalance':
      //       url = `?module=account&action=tokenbalance&contractaddress=${
      //         params[1]
      //       }&address=${params[0]}&tag=latest`
      //       funcs = this.currencyInfo.defaultSettings.otherSettings.etherscanApiServers.map(
      //         server => async () => {
      //           const result = await this.fetchGetEtherscan(server, url)
      //           if (typeof result.result !== 'string') {
      //             const msg = `Invalid return value getTokenBalance in ${server}`
      //             this.log(msg)
      //             throw new Error(msg)
      //           }
      //           return { server, result }
      //         }
      //       )
      //       // Randomize array
      //       funcs = shuffleArray(funcs)
      //       out = await asyncWaterfall(funcs)
      //       break
      //     case 'getTransactions':
      //       const {
      //         currencyCode,
      //         address,
      //         startBlock,
      //         page,
      //         offset,
      //         contractAddress
      //       } = params[0]
      //       let startUrl
      //       if (currencyCode === 'ETH') {
      //         startUrl = `?action=txlist&module=account`
      //       } else {
      //         startUrl = `?action=tokentx&contractaddress=${contractAddress}&module=account`
      //       }
      //       url = `${startUrl}&address=${address}&startblock=${startBlock}&endblock=999999999&sort=asc&page=${page}&offset=${offset}`
      //       funcs = this.currencyInfo.defaultSettings.otherSettings.etherscanApiServers.map(
      //         server => async () => {
      //           const result = await this.fetchGetEtherscan(server, url)
      //           if (
      //             typeof result.result !== 'object' ||
      //             typeof result.result.length !== 'number'
      //           ) {
      //             const msg = `Invalid return value getTransactions in ${server}`
      //             this.log(msg)
      //             throw new Error(msg)
      //           }
      //           return { server, result }
      //         }
      //       )
      //       // Randomize array
      //       funcs = shuffleArray(funcs)
      //       out = await asyncWaterfall(funcs)
      //       break
    }
    this.log(`BNB multicastServers ${func} ${out.server} won`)

    return out.result
  }

  // async clearBlockchainCache () {
  //   await super.clearBlockchainCache()
  //   this.otherData.nextNonce = '0'
  //   this.otherData.unconfirmedNextNonce = '0'
  // }

  // // ****************************************************************************
  // // Public methods
  // // ****************************************************************************

  async startEngine () {
    this.engineOn = true
    this.addToLoop('checkBlockchainInnerLoop', BLOCKCHAIN_POLL_MILLISECONDS)
    this.addToLoop('checkAccountInnerLoop', ACCOUNT_POLL_MILLISECONDS)
    // this.addToLoop('checkUpdateNetworkFees', NETWORKFEES_POLL_MILLISECONDS)
    this.addToLoop('checkTransactionsInnerLoop', TRANSACTION_POLL_MILLISECONDS)
    // this.addToLoop(
    //   'checkUnconfirmedTransactionsInnerLoop',
    //   UNCONFIRMED_TRANSACTION_POLL_MILLISECONDS
    // )
    super.startEngine()
  }

  async resyncBlockchain (): Promise<void> {
    // await this.killEngine()
    // await this.clearBlockchainCache()
    // await this.startEngine()
  }

  async makeSpend (edgeSpendInfoIn: EdgeSpendInfo) {
    const { edgeSpendInfo, currencyCode } = super.makeSpend(edgeSpendInfoIn)

    const spendTarget = edgeSpendInfo.spendTargets[0]
    const publicAddress = spendTarget.publicAddress
    const data =
      spendTarget.otherParams != null ? spendTarget.otherParams.data : void 0

    let otherParams: Object = {}

    if (currencyCode === PRIMARY_CURRENCY) {
      const bnbParams: BinanceTxOtherParams = {
        from: [this.walletLocalData.publicKey],
        to: [publicAddress],
        errorVal: 0,
        tokenRecipientAddress: null,
        data: data
      }
      otherParams = bnbParams
    } else {
      let contractAddress = ''
      if (data) {
        contractAddress = publicAddress
      } else {
        const tokenInfo = this.getTokenInfo(currencyCode)
        if (!tokenInfo || typeof tokenInfo.contractAddress !== 'string') {
          throw new Error(
            'Error: Token not supported or invalid contract address'
          )
        }

        contractAddress = tokenInfo.contractAddress
      }

      const bnbParams: BinanceTxOtherParams = {
        from: [this.walletLocalData.publicKey],
        to: [contractAddress],
        errorVal: 0,
        tokenRecipientAddress: publicAddress,
        data: data
      }
      otherParams = bnbParams
    }
    const nativeNetworkFee = NETWORK_FEE_NATIVE_AMOUNT
    const ErrorInsufficientFundsMoreBnb = new Error(
      'Insufficient BNB for transaction fee'
    )
    ErrorInsufficientFundsMoreBnb.name = 'ErrorInsufficientFundsMoreBnb'

    let nativeAmount = edgeSpendInfo.spendTargets[0].nativeAmount
    const balanceBnb = this.walletLocalData.totalBalances[
      this.currencyInfo.currencyCode
    ]

    let totalTxAmount = '0'
    totalTxAmount = bns.add(nativeAmount, nativeNetworkFee)
    if (bns.gt(totalTxAmount, balanceBnb)) {
      throw new InsufficientFundsError()
    }
    nativeAmount = bns.mul(totalTxAmount, '-1')

    // **********************************
    // Create the unsigned EdgeTransaction

    const edgeTransaction: EdgeTransaction = {
      txid: '', // txid
      date: 0, // date
      currencyCode, // currencyCode
      blockHeight: 0, // blockHeight
      nativeAmount, // nativeAmount
      networkFee: nativeNetworkFee, // networkFee, supposedly fixed
      ourReceiveAddresses: [], // ourReceiveAddresses
      signedTx: '0', // signedTx
      otherParams // otherParams
    }

    return edgeTransaction
  }

  async signTx (edgeTransaction: EdgeTransaction): Promise<EdgeTransaction> {
    const bnbClient = new BnbApiClient(
      currencyInfo.defaultSettings.otherSettings.binanceApiServers[0]
    )
    bnbClient.chooseNetwork('mainnet')
    const privKey = this.walletInfo.keys.binanceKey
    await bnbClient.setPrivateKey(privKey)
    await bnbClient.initChain()
    const currencyCode = edgeTransaction.currencyCode
    const spendAmount = bns.add(
      edgeTransaction.nativeAmount,
      NETWORK_FEE_NATIVE_AMOUNT
    )
    const amount = spendAmount.replace('-', '')
    const denom = getDenomInfo(this.currencyInfo, currencyCode)
    if (!denom) {
      this.log(`Received unsupported currencyCode: ${currencyCode}`)
      throw new Error(`Received unsupported currencyCode: ${currencyCode}`)
    }
    const nativeAmountString = parseInt(amount) / parseInt(denom.multiplier)
    const nativeAmount = parseFloat(nativeAmountString)
    // identity function, overriding library's version
    bnbClient._broadcastDelegate = x => {
      return x
    }
    // WILL NOT ACTUALLY TRANSFER! That will be done in this.broadcastTx
    const signedTx = await bnbClient.transfer(
      edgeTransaction.otherParams.from[0],
      edgeTransaction.otherParams.to[0],
      nativeAmount,
      currencyCode
    )
    this.log(`SUCCESS BNB broadcastTx\n${JSON.stringify(signedTx)}`)
    // signedTx is now a prepared transaction
    edgeTransaction.signedTx = signedTx
    edgeTransaction.otherParams.serializedTx = signedTx.serialize()
    return edgeTransaction
  }

  async broadcastTx (
    edgeTransaction: EdgeTransaction
  ): Promise<EdgeTransaction> {
    const bnbSignedTransaction = edgeTransaction.otherParams.serializedTx
    const response = await this.multicastServers(
      'bnb_broadcastTx',
      bnbSignedTransaction
    )
    if (response.result[0] && response.result[0].ok) {
      this.log(`SUCCESS broadcastTx\n${JSON.stringify(response.result[0])}`)
      edgeTransaction.txid = response.result[0].hash
    }
    this.log('edgeTransaction = ', edgeTransaction)
    return edgeTransaction
  }

  getDisplayPrivateSeed () {
    if (this.walletInfo.keys && this.walletInfo.keys.binanceMnemonic) {
      return this.walletInfo.keys.binanceMnemonic
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

// async broadcastEtherscan (
//   edgeTransaction: EdgeTransaction
// ): Promise<BroadcastResults> {
//   const transactionParsed = JSON.stringify(edgeTransaction, null, 2)

//   this.log(`Etherscan: sent transaction to network:\n${transactionParsed}\n`)
//   const url = `?module=proxy&action=eth_sendRawTransaction&hex=${
//     edgeTransaction.signedTx
//   }`
//   const jsonObj = await this.fetchGetEtherscan(
//     this.currencyInfo.defaultSettings.otherSettings.etherscanApiServers[0],
//     url
//   )

//   this.log('broadcastEtherscan jsonObj:', jsonObj)

//   if (typeof jsonObj.error !== 'undefined') {
//     this.log('EtherScan: Error sending transaction')
//     throw jsonObj.error
//   } else if (typeof jsonObj.result === 'string') {
//     // Success!!
//     return jsonObj
//   } else {
//     throw new Error('Invalid return value on transaction send')
//   }
// }

// async fetchPostInfura (method: string, params: Object) {
//   const { infuraProjectId } = this.initOptions
//   if (!infuraProjectId || infuraProjectId.length < 6) {
//     throw new Error('Need Infura Project ID')
//   }
//   const url = `https://mainnet.infura.io/v3/${infuraProjectId}`
//   const body = {
//     id: 1,
//     jsonrpc: '2.0',
//     method,
//     params
//   }
//   const response = await this.io.fetch(url, {
//     headers: {
//       Accept: 'application/json',
//       'Content-Type': 'application/json'
//     },
//     method: 'POST',
//     body: JSON.stringify(body)
//   })
//   const jsonObj = await response.json()
//   return jsonObj
// }

// async broadcastInfura (
//   edgeTransaction: EdgeTransaction
// ): Promise<BroadcastResults> {
//   const transactionParsed = JSON.stringify(edgeTransaction, null, 2)

//   const method = 'eth_sendRawTransaction'
//   const params = [edgeTransaction.signedTx]

//   const jsonObj = await this.fetchPostInfura(method, params)

//   if (typeof jsonObj.error !== 'undefined') {
//     this.log('EtherScan: Error sending transaction')
//     throw jsonObj.error
//   } else if (typeof jsonObj.result === 'string') {
//     // Success!!
//     this.log(`Infura: sent transaction to network:\n${transactionParsed}\n`)
//     return jsonObj
//   } else {
//     throw new Error('Invalid return value on transaction send')
//   }
// }

// async broadcastBlockCypher (
//   edgeTransaction: EdgeTransaction
// ): Promise<BroadcastResults> {
//   const transactionParsed = JSON.stringify(edgeTransaction, null, 2)
//   this.log(
//     `Blockcypher: sending transaction to network:\n${transactionParsed}\n`
//   )

//   const url = 'v1/eth/main/txs/push'
//   const hexTx = edgeTransaction.signedTx.replace('0x', '')
//   const jsonObj = await this.fetchPostBlockcypher(url, { tx: hexTx })

//   this.log('broadcastBlockCypher jsonObj:', jsonObj)
//   if (typeof jsonObj.error !== 'undefined') {
//     this.log('BlockCypher: Error sending transaction')
//     throw jsonObj.error
//   } else if (jsonObj.tx && typeof jsonObj.tx.hash === 'string') {
//     this.log(`Blockcypher success sending txid ${jsonObj.tx.hash}`)
//     // Success!!
//     return jsonObj
//   } else {
//     throw new Error('Invalid return value on transaction send')
//   }
// }

// async broadcastTx (
//   edgeTransaction: EdgeTransaction
// ): Promise<EdgeTransaction> {
//   const result = await this.multicastServers('broadcastTx', edgeTransaction)

//   // Success
//   this.log(`SUCCESS broadcastTx\n${JSON.stringify(result)}`)
//   this.log('edgeTransaction = ', edgeTransaction)

//   return edgeTransaction
// }

// processUnconfirmedTransaction (tx: Object) {
//   const fromAddress = '0x' + tx.inputs[0].addresses[0]
//   const toAddress = '0x' + tx.outputs[0].addresses[0]
//   const epochTime = Date.parse(tx.received) / 1000
//   const ourReceiveAddresses: Array<string> = []

//   let nativeAmount: string
//   if (
//     normalizeAddress(fromAddress) ===
//     normalizeAddress(this.walletLocalData.publicKey)
//   ) {
//     if (fromAddress === toAddress) {
//       // Spend to self
//       nativeAmount = bns.sub('0', tx.fees.toString(10))
//     } else {
//       nativeAmount = (0 - tx.total).toString(10)
//       nativeAmount = bns.sub(nativeAmount, tx.fees.toString(10))
//     }
//   } else {
//     nativeAmount = tx.total.toString(10)
//     ourReceiveAddresses.push(this.walletLocalData.publicKey)
//   }

//   const otherParams: EthereumTxOtherParams = {
//     from: [fromAddress],
//     to: [toAddress],
//     gas: '',
//     gasPrice: '',
//     gasUsed: tx.fees.toString(10),
//     cumulativeGasUsed: '',
//     errorVal: 0,
//     tokenRecipientAddress: null
//   }

//   const edgeTransaction: EdgeTransaction = {
//     txid: addHexPrefix(tx.hash),
//     date: epochTime,
//     currencyCode: 'ETH',
//     blockHeight: 0,
//     nativeAmount,
//     networkFee: tx.fees.toString(10),
//     ourReceiveAddresses,
//     signedTx: 'iwassignedyoucantrustme',
//     otherParams
//   }
//   this.addTransaction('ETH', edgeTransaction)
// }

// async checkUnconfirmedTransactionsInnerLoop () {
//   const address = normalizeAddress(this.walletLocalData.publicKey)
//   const url = `${
//     this.currencyInfo.defaultSettings.otherSettings.superethServers[0]
//   }/v1/eth/main/txs/${address}`
//   let jsonObj = null
//   try {
//     jsonObj = await this.fetchGet(url)
//   } catch (e) {
//     this.log(e)
//     this.log('Failed to fetch unconfirmed transactions')
//     return
//   }

//   const valid = validateObject(jsonObj, SuperEthGetUnconfirmedTransactions)
//   if (valid) {
//     const transactions = jsonObj
//     for (const tx of transactions) {
//       if (
//         normalizeAddress(tx.inputs[0].addresses[0]) === address ||
//         normalizeAddress(tx.outputs[0].addresses[0]) === address
//       ) {
//         this.processUnconfirmedTransaction(tx)
//       }
//     }
//   } else {
//     this.log('Invalid data for unconfirmed transactions')
//   }
//   if (this.transactionsChangedArray.length > 0) {
//     this.currencyEngineCallbacks.onTransactionsChanged(
//       this.transactionsChangedArray
//     )
//     this.transactionsChangedArray = []
//   }
// }
