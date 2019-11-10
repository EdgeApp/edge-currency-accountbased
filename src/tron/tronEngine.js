import { bns } from 'biggystring'
import { InsufficientFundsError } from 'edge-core-js/types'
import TronWeb from 'tronweb'

import { CurrencyEngine } from '../common/engine.js'
import {
  asyncWaterfall,
  getDenomInfo,
  shuffleArray,
  validateObject
} from '../common/utils.js'
import { currencyInfo } from './tronInfo.js'
import { TronPlugin } from './tronPlugin.js'
import {
  TronApiAccountBalance,
  TronApiGetTransactions,
  TronApiNodeInfo,
  TxInfoSchema
} from './tronSchema.js'

const tronWeb = new TronWeb({
  fullHost: 'https://api.trongrid.io'
})

const PRIMARY_CURRENCY = currencyInfo.currencyCode
const ACCOUNT_POLL_MILLISECONDS = 20000
const BLOCKCHAIN_POLL_MILLISECONDS = 20000
const TRANSACTION_POLL_MILLISECONDS = 10000 // was 3000
const ADDRESS_QUERY_LOOKBACK_BLOCKS = 15 * 60 * 24 // ~ one day. 3-5 sec block time
const NUM_TRANSACTIONS_TO_QUERY = 200
const TIMESTAMP_BEFORE_TRX_LAUNCH = 1529920269000 // 2019-04-01, TRX launched on 6/25/2018 09:51:09
const TRANSACTION_QUERY_TIME_WINDOW = 1000 * 60 * 60 * 24 * 3 * 28 // 3 months
// const NATIVE_UNIT_MULTIPLIER = '1000000'

export class TronEngine extends CurrencyEngine {
  constructor (
    currencyPlugin,
    walletInfo,
    initOptions,
    opts, // EdgeCurrencyEngineOptions
    fetchCors
  ) {
    super(currencyPlugin, walletInfo, opts, fetchCors)
    this.fetchCors = fetchCors
  }

  async fetchGet (url) {
    const options = { method: 'GET' }
    const response = await this.fetchCors(url, options)
    if (!response.ok) {
      throw new Error(
        `The server returned error code ${response.status} for ${url}`
      )
    }
    return response.json()
  }

  async fetchPost (url, params = {}) {
    const options = {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    }
    const response = await this.fetchCors(url, options)
    if (!response.ok) {
      this.log(`The server returned error code ${response.status} for ${url}`)
      throw new Error(
        `6 The server returned error code ${response.status} for ${url}`
      )
    }
    return response.json()
  }

  async checkBlockchainInnerLoop () {
    try {
      const jsonObj = await this.multicastServers(
        'trx_blockNumber',
        '/wallet/getnowblock'
      )
      const valid = validateObject(jsonObj, TronApiNodeInfo, this.log)
      if (valid) {
        const blockHeight = jsonObj.block_header.raw_data.number // timestamp
        // this.log(`Got block height ${blockHeight}`)
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

  updateBalance (tk, balance) {
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
    const url = '/v1/accounts/'
    const finalUrl = `${url}${tronWeb.address.toHex(address)}`
    try {
      const jsonObj = await this.multicastServers('trx_getBalance', finalUrl)
      const valid = validateObject(jsonObj, TronApiAccountBalance, this.log)
      // if (valid) {
      //   this.updateBalance('TRX', jsonObj.data[0].balance.toString())
      //   for (const tk of this.walletLocalData.enabledTokens) {
      //     for (const balance of jsonObj.data[0].asset) {
      //       if (balance.key === tk) {
      //         const denom = getDenomInfo(this.currencyInfo, tk)
      //         if (!denom) {
      //           this.log(`Received unsupported currencyCode: ${tk}`)
      //           break
      //         }
      //         const nativeAmount = bns.mul(balance.value, denom.multiplier)
      //         this.updateBalance(tk, nativeAmount)
      //       }
      //     }
      //   }
      // }
      if (valid) {
        this.updateBalance('TRX', jsonObj.data[0].balance.toString())
      } else {
        this.log(
          'checkAccountInnerLoop: Error getting balance. Received: ',
          jsonObj.data
        )
      }
    } catch (e) {
      this.log('Error checking TRX address balance: ', e)
    }
  }

  processTronApiTransaction (tx, currencyCode) {
    const publicKey = this.walletLocalData.publicKey.toLowerCase()
    let netNativeAmount // Amount received into wallet
    const ourReceiveAddresses = []
    const nativeNetworkFee = '0'
    const {
      amount,
      owner_address,
      to_address
    } = tx.raw_data.contract[0].parameter.value
    const nativeValue = amount.toString()
    const fromAddr = tronWeb.address.fromHex(owner_address).toLowerCase()
    const toAddr = tronWeb.address.fromHex(to_address).toLowerCase()

    // isSpend Tx
    if (fromAddr === publicKey) {
      // if it's a send to one's self
      if (tx.fromAddr === toAddr) {
        // Spend to self. netNativeAmount is just the fee
        netNativeAmount = bns.mul(nativeNetworkFee, '-1')
      } else {
        // set amount to spending amount
        netNativeAmount = bns.mul(nativeValue, '-1')
      }
    } else {
      // Receive transaction
      netNativeAmount = bns.add('0', nativeValue)
      // ourReceiveAddresses.push(this.walletLocalData.publicKey.toLowerCase())
    }

    const otherParams = {}

    let blockHeight = tx.blockNumber
    if (blockHeight < 0) blockHeight = 0
    const unixTimestamp = new Date(tx.block_timestamp)
    const edgeTransaction = {
      txid: tx.txID,
      date: unixTimestamp.getTime(),
      currencyCode,
      blockHeight,
      nativeAmount: netNativeAmount,
      networkFee: nativeNetworkFee,
      ourReceiveAddresses, // blank if you sent money otherwise array of addresses that are yours in this transaction
      signedTx: '',
      otherParams
    }

    this.addTransaction(currencyCode, edgeTransaction)
  }

  async checkTransactionsFetch (startTime, currencyCode) {
    const publicKey = this.walletLocalData.publicKey
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
        // this.log(
        //   'checkTransactionsFetch outer loop: ',
        //   start,
        //   ' and end: ',
        //   end
        // )
        for (let offset = 0; ; offset += NUM_TRANSACTIONS_TO_QUERY) {
          // this.log('checkTransactionsFetch inner loop, offset is: ', offset)
          const url1 = '/v1/accounts/' + tronWeb.address.toHex(publicKey)
          const url2 = `${url1}/transactions?only_confirmed=true&limit=${NUM_TRANSACTIONS_TO_QUERY}`
          const finalUrl = `${url2}&min_timestamp=${start}&max_timestamp=${end}&search_internal=false`
          const transactionsResults = await this.multicastServers(
            'trx_getTransactions',
            finalUrl
          )
          const valid = validateObject(
            transactionsResults,
            TronApiGetTransactions
          )
          if (valid) {
            for (const transaction of transactionsResults.data) {
              if (
                transaction.raw_data.contract[0].type !== 'TransferContract'
              ) {
                this.log('is NOT TransferContract')
                break
              }

              // getting blocknumber
              const jsonObj = await this.multicastServers(
                'trx_txBlockNumber',
                '/wallet/gettransactioninfobyid',
                { value: transaction.txID }
              )

              const valid = validateObject(jsonObj, TxInfoSchema)
              if (valid) {
                transaction.blockNumber = jsonObj.blockNumber
              }

              this.processTronApiTransaction(transaction, currencyCode)
            }
            if (transactionsResults.data.length < NUM_TRANSACTIONS_TO_QUERY) {
              break
            }
          } else {
            checkAddressSuccess = false
            this.log('checkTransactionsFetch inner loop invalid query results.')
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
    let startTime: number = TIMESTAMP_BEFORE_TRX_LAUNCH
    const promiseArray = []

    if (
      this.walletLocalData.lastAddressQueryHeight >
      ADDRESS_QUERY_LOOKBACK_BLOCKS
    ) {
      // Only query for transactions as far back as ADDRESS_QUERY_LOOKBACK_BLOCKS from the last time we queried transactions
      startTime =
        this.walletLocalData.lastAddressQueryHeight -
        ADDRESS_QUERY_LOOKBACK_BLOCKS
    }

    for (const currencyCode of this.walletLocalData.enabledTokens) {
      this.log('enabled Token: ', currencyCode)
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
      this.walletLocalData.lastAddressQueryHeight = blockHeight
    }
    if (this.transactionsChangedArray.length > 0) {
      this.currencyEngineCallbacks.onTransactionsChanged(
        this.transactionsChangedArray
      )
      this.transactionsChangedArray = []
    }
  }

  async multicastServers (func, ...params) {
    let out = { result: '', server: 'no server' }
    let funcs

    switch (func) {
      case 'trx_txBlockNumber':
      case 'trx_blockNumber':
        funcs = this.currencyInfo.defaultSettings.otherSettings.tronApiServers.map(
          server => async () => {
            const result = await this.fetchPost(server + params[0], params[1])
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

      case 'trx_getBalance':
      case 'trx_getTransactions':
        funcs = this.currencyInfo.defaultSettings.otherSettings.tronApiServers.map(
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
        this.log(func, ': return value:', out.result)
        break
    }
    this.log(`TRX multicastServers ${func} ${out.server} won`)

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
    super.startEngine()
  }

  async resyncBlockchain () {
    await this.killEngine()
    await this.clearBlockchainCache()
    await this.startEngine()
  }

  async makeSpend (edgeSpendInfoIn) {
    try {
      this.log('makeSpend edgeSpendInfoIn: ', edgeSpendInfoIn)
      const { edgeSpendInfo, currencyCode } = super.makeSpend(edgeSpendInfoIn)
      this.log('edgeSpendInfo, currencyCode', edgeSpendInfo, currencyCode)
      const networkFee = '0'
      const nativeAmount = edgeSpendInfo.spendTargets[0].nativeAmount
      const balanceTrx = this.walletLocalData.totalBalances[
        this.currencyInfo.currencyCode
      ]

      if (bns.gt(nativeAmount, balanceTrx)) {
        throw new InsufficientFundsError()
      }

      // Tron can only have one output
      if (edgeSpendInfo.spendTargets.length !== 1) {
        throw new Error('Error: only one output allowed')
      }

      const spendTarget = edgeSpendInfo.spendTargets[0]
      const publicAddress = spendTarget.publicAddress
      // TODO: for tokens. otherParams is used for contract addresses etc
      const data =
        spendTarget.otherParams != null ? spendTarget.otherParams.data : void 0

      let otherParams = {}

      // if TRON
      if (currencyCode === PRIMARY_CURRENCY) {
        // builds tx, but does NOT send it
        const trxParams = await tronWeb.transactionBuilder.sendTrx(
          publicAddress,
          nativeAmount,
          this.walletLocalData.publicKey
        )

        otherParams = trxParams
        // if Token
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

        // for Tokens:
        // builds tx, but does NOT send it
        const trxParams = await tronWeb.transactionBuilder.sendToken(
          publicAddress,
          nativeAmount,
          contractAddress,
          this.walletLocalData.publicKey
        )
        otherParams = trxParams
      }
      const edgeNativeAmount = bns.mul(nativeAmount, '-1')

      // **********************************
      // Create the unsigned EdgeTransaction

      const edgeTransaction = {
        txid: '', // txid
        date: 0, // date
        currencyCode, // currencyCode
        blockHeight: 0, // blockHeight
        nativeAmount: edgeNativeAmount, // nativeAmount
        networkFee, // networkFee, supposedly fixed
        ourReceiveAddresses: [], // ourReceiveAddresses
        signedTx: '', // signedTx
        otherParams // otherParams
      }

      return edgeTransaction
    } catch (e) {
      this.log('makeSpend error: ', e)
    }
  }

  async signTx (edgeTransaction) {
    const privKey = this.walletInfo.keys.tronKey

    const signedTx = await tronWeb.trx.sign(
      edgeTransaction.otherParams,
      privKey
    )
    // this.log(`SUCCESS TRX broadcastTx\n${JSON.stringify(signedTx, null, 2)}`)
    edgeTransaction.signedTx = signedTx
    return edgeTransaction
  }

  async broadcastTx (edgeTransaction) {
    const trxSignedTransaction = edgeTransaction.signedTx
    const response = await tronWeb.trx.sendRawTransaction(trxSignedTransaction)

    if (typeof response.result === 'boolean' && response.result === true) {
      // this.log(`SUCCESS broadcastTx\n${JSON.stringify(response)}`)
      edgeTransaction.txid = response.transaction.txID
    }
    return edgeTransaction
  }

  getDisplayPrivateSeed () {
    if (this.walletInfo.keys && this.walletInfo.keys.tronMnemonic) {
      return this.walletInfo.keys.tronMnemonic
    }
    return this.walletInfo.keys.tronKey
  }

  getDisplayPublicSeed () {
    if (this.walletInfo.keys && this.walletInfo.keys.publicKey) {
      return this.walletInfo.keys.publicKey
    }
    return ''
  }
}

export { CurrencyEngine }
