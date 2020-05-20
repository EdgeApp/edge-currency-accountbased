// @flow

import { bns } from 'biggystring'
import {
  type EdgeSpendInfo,
  type EdgeTransaction,
  type EdgeWalletInfo,
  InsufficientFundsError
} from 'edge-core-js/types'
import TronWeb from 'tronweb'

import { CurrencyEngine } from '../common/engine.js'
import {
  asyncWaterfall,
  shuffleArray,
  validateObject
} from '../common/utils.js'
import { currencyInfo } from './tronInfo.js'
import { TronPlugin } from './tronPlugin.js'
import {
  NetworkFeesSchema,
  TronAccountResources,
  TronApiAccountBalance,
  TronApiGetTransactions,
  TronApiNodeInfo,
  TxInfoSchema
} from './tronSchema.js'
import type {
  TronApiTransaction,
  TronNetworkFees,
  TronTxOtherParams
} from './tronTypes.js'

const tronWeb = new TronWeb({
  fullHost: 'https://api.trongrid.io'
})

const PRIMARY_CURRENCY = currencyInfo.currencyCode
const ACCOUNT_POLL_MILLISECONDS = 20000
const BLOCKCHAIN_POLL_MILLISECONDS = 20000
const TRANSACTION_POLL_MILLISECONDS = 3000 // was 3000
const ADDRESS_QUERY_LOOKBACK_BLOCKS = 15 * 60 * 24 // ~ one day. 3-5 sec block time
const NETWORKFEES_POLL_MILLISECONDS = 60 * 10 * 1000
const NUM_TRANSACTIONS_TO_QUERY = 200
const TIMESTAMP_BEFORE_TRX_LAUNCH = 1529920269000 // 2019-04-01, TRX launched on 6/25/2018 09:51:09
const TRANSACTION_QUERY_TIME_WINDOW = 1000 * 60 * 60 * 24 * 3 * 28 // 3 months
const TX_SIZE = '268' // in bytes, raw_data_hex.length of any Tron transaction
const TOKEN_TX_SIZE = '286' // in bytes, raw_data_hex.length of any TRC10 token transaction
const NATIVE_UNIT_MULTIPLIER = '1000000'

type TronFunction =
  | 'trx_txBlockNumber'
  | 'trx_blockNumber'
  | 'trx_getBalance'
  | 'trx_getTransactions'
  | 'trx_getAccountResource'

export class TronEngine extends CurrencyEngine {
  constructor(
    currencyPlugin: TronPlugin,
    walletInfo: EdgeWalletInfo,
    opts: any, // EdgeCurrencyEngineOptions
    fetchCors: Function
  ) {
    // $FlowFixMe we need fetchCors here
    super(currencyPlugin, walletInfo, opts)
    // $FlowFixMe fetchCors is not missing in TronEngine
    this.fetchCors = fetchCors
  }

  async fetchGet(url: string) {
    const options = { method: 'GET' }
    // $FlowFixMe fetchCors is not missing in TronEngine
    const response = await this.fetchCors(url, options)
    if (!response.ok) {
      throw new Error(
        `The server returned error code ${response.status} for ${url}`
      )
    }
    return response.json()
  }

  async fetchPost(url: string, params: Object = {}) {
    const options = {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    }
    // $FlowFixMe fetchCors is not missing in TronEngine
    const response = await this.fetchCors(url, options)
    if (!response.ok) {
      this.log(`The server returned error code ${response.status} for ${url}`)
      throw new Error(
        `The server returned error code ${response.status} for ${url}`
      )
    }
    return response.json()
  }

  async checkBlockchainInnerLoop() {
    try {
      const jsonObj = await this.multicastServers(
        'trx_blockNumber',
        '/wallet/getnowblock'
      )
      const valid = validateObject(jsonObj, TronApiNodeInfo)
      if (valid) {
        const blockHeight: number = jsonObj.block_header.raw_data.number
        if (this.walletLocalData.blockHeight !== blockHeight) {
          this.checkDroppedTransactionsThrottled()
          this.walletLocalData.blockHeight = blockHeight
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

  updateBalance(tk: string, balance: string) {
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

  async checkAccountInnerLoop() {
    const address = this.walletLocalData.publicKey
    const url = '/v1/accounts/'
    const finalUrl = `${url}${tronWeb.address.toHex(address)}`
    try {
      const jsonObj = await this.multicastServers('trx_getBalance', finalUrl)
      const valid = validateObject(jsonObj, TronApiAccountBalance)

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

  processTronApiTransaction(tx: TronApiTransaction, currencyCode: string) {
    const publicKey: string = this.walletLocalData.publicKey.toLowerCase()
    let netNativeAmount: string // Amount received into wallet
    const ourReceiveAddresses: Array<string> = []
    const nativeNetworkFee: string = bns.mul(
      tx.networkFee,
      NATIVE_UNIT_MULTIPLIER
    )
    const nativeValue: string = tx.amount.toString()
    const fromAddr: string = tronWeb.address
      // eslint-disable-next-line camelcase
      .fromHex(tx.owner_address)
      .toLowerCase()
    // eslint-disable-next-line camelcase
    const toAddr: string = tronWeb.address.fromHex(tx.to_address).toLowerCase()

    // isSpend Tx
    if (fromAddr === publicKey) {
      // if it's a send to one's self
      if (fromAddr === toAddr) {
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

    const otherParams: TronTxOtherParams = {
      visible: false,
      txID: tx.txID,
      raw_data: tx.raw_data,
      raw_data_hex: tx.raw_data_hex
    }

    let blockHeight = tx.blockNumber
    if (blockHeight < 0) blockHeight = 0
    const edgeTransaction: EdgeTransaction = {
      txid: tx.txID,
      date: tx.block_timestamp,
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

  async checkTransactionsFetch(
    startTime: number,
    currencyCode: string
  ): Promise<boolean> {
    const publicKey: string = this.walletLocalData.publicKey
    let checkAddressSuccess: boolean = true
    let start: number = startTime
    let end: number = 0
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
              const {
                amount,
                owner_address, // eslint-disable-line camelcase
                to_address // eslint-disable-line camelcase
              } = transaction.raw_data.contract[0].parameter.value
              const networkFee = tronWeb.fromSun(transaction.net_fee)

              const tronTx: TronApiTransaction = {
                amount,
                owner_address,
                to_address,
                networkFee,
                raw_data: transaction.raw_data,
                raw_data_hex: transaction.raw_data_hex,
                blockNumber: 0,
                txID: transaction.txID,
                block_timestamp: 0
              }

              // getting blocknumber and blockTimeStamp
              const jsonObj = await this.multicastServers(
                'trx_txBlockNumber',
                '/wallet/gettransactioninfobyid',
                { value: transaction.txID }
              )
              const valid = validateObject(jsonObj, TxInfoSchema)
              if (valid) {
                tronTx.blockNumber = jsonObj.blockNumber
                tronTx.block_timestamp = jsonObj.blockTimeStamp
              }

              this.processTronApiTransaction(tronTx, currencyCode)
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
        `Error checkTransactionsFetch ${currencyCode}: ${this.walletLocalData.publicKey}`,
        e
      )
      checkAddressSuccess = false
    }

    if (checkAddressSuccess) {
      this.tokenCheckTransactionsStatus[currencyCode] = 1
      this.updateOnAddressesChecked()
      return true
    } else {
      return false
    }
  }

  async checkTransactionsInnerLoop() {
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

  async checkUpdateNetworkFees() {
    try {
      const jsonObj = await tronWeb.trx.getChainParameters()
      const valid = validateObject(jsonObj, NetworkFeesSchema)

      if (valid) {
        // 1 SUN = 0.000001 TRX utilizing fromSun()
        const networkFees: TronNetworkFees = {
          createAccountFee: tronWeb.fromSun(
            jsonObj.find(e => e.key === 'getCreateAccountFee').value
          ),
          transactionFee: tronWeb.fromSun(
            jsonObj.find(e => e.key === 'getTransactionFee').value
          )
        }
        // only update network fee if it's not the same
        if (this.otherData.networkFees !== networkFees) {
          this.otherData.networkFees = networkFees
          this.walletLocalDataDirty = true
        }
      } else {
        this.log('Error: Fetched invalid networkFees')
      }
    } catch (err) {
      this.log('Error fetching networkFees from tron server', err)
    }
  }

  async calcTxFee(receiverAddress: string): Promise<string> {
    let totalFees = '0'
    try {
      const jsonObjSender = await this.multicastServers(
        'trx_getAccountResource',
        '/wallet/getaccountresource',
        { address: tronWeb.address.toHex(this.walletLocalData.publicKey) }
      )
      const senderValid = validateObject(jsonObjSender, TronAccountResources)
      // Response failed if it returned null.
      // An empty object is also a valid response for new accounts.
      // If object is null, or 'not empty and invalid', throw an error.
      if (
        jsonObjSender === null ||
        (Object.keys(jsonObjSender).length > 0 && !senderValid)
      ) {
        throw new Error(
          'Failed loading resources for sender at /wallet/getaccountresource'
        )
      }
      const jsonObjReceiver = await this.multicastServers(
        'trx_getAccountResource',
        '/wallet/getaccountresource',
        { address: tronWeb.address.toHex(receiverAddress) }
      )
      const receiverValid = validateObject(
        jsonObjReceiver,
        TronAccountResources
      )
      if (
        jsonObjReceiver === null ||
        (Object.keys(jsonObjReceiver).length > 0 && !receiverValid)
      ) {
        throw new Error(
          'Failed loading resources for receiver at /wallet/getaccountresource'
        )
      }

      // if user has used all of his free net
      if (jsonObjSender.freeNetLimit < 268) {
        totalFees = bns.add(
          totalFees,
          this.otherData.networkFees.transactionFee
        )
      }
      // if the receiver's account hasn't been activated yet
      // pay the activiation fee
      if (typeof jsonObjReceiver.freeNetLimit === 'undefined') {
        totalFees = bns.add(
          totalFees,
          this.otherData.networkFees.createAccountFee
        )
      }
    } catch (e) {
      this.log('calcTxFee error: ', e)
    }
    return totalFees
  }

  async multicastServers(func: TronFunction, ...params: any): Promise<any> {
    let out = { result: '', server: 'no server' }
    let funcs

    switch (func) {
      case 'trx_getAccountResource':
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
        break
    }
    this.log(`TRX multicastServers ${func} ${out.server} won`)

    return out.result
  }

  // // ****************************************************************************
  // // Public methods
  // // ****************************************************************************

  async startEngine() {
    this.engineOn = true
    this.addToLoop('checkBlockchainInnerLoop', BLOCKCHAIN_POLL_MILLISECONDS)
    this.addToLoop('checkAccountInnerLoop', ACCOUNT_POLL_MILLISECONDS)
    this.addToLoop('checkUpdateNetworkFees', NETWORKFEES_POLL_MILLISECONDS)
    this.addToLoop('checkTransactionsInnerLoop', TRANSACTION_POLL_MILLISECONDS)
    super.startEngine()
  }

  async resyncBlockchain() {
    await this.killEngine()
    await this.clearBlockchainCache()
    await this.startEngine()
  }

  async makeSpend(edgeSpendInfoIn: EdgeSpendInfo) {
    try {
      const { edgeSpendInfo, currencyCode } = super.makeSpend(edgeSpendInfoIn)
      const spendTarget = edgeSpendInfo.spendTargets[0]
      const publicAddress = spendTarget.publicAddress
      const nativeAmount = edgeSpendInfo.spendTargets[0].nativeAmount
      let networkFee = await this.calcTxFee(publicAddress)
      networkFee = bns.mul(networkFee, NATIVE_UNIT_MULTIPLIER)

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

      const data =
        spendTarget.otherParams != null ? spendTarget.otherParams.data : void 0 // eslint-disable-line no-void

      let otherParams: TronTxOtherParams = {
        visible: false,
        txID: '',
        raw_data: {},
        raw_data_hex: ''
      }
      // if TRON
      if (currencyCode === PRIMARY_CURRENCY) {
        // builds tx, but does NOT send it
        const trxParams: TronTxOtherParams = await tronWeb.transactionBuilder.sendTrx(
          publicAddress,
          nativeAmount,
          this.walletLocalData.publicKey
        )
        otherParams = trxParams
        networkFee = bns.mul(networkFee, TX_SIZE)
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
        const trxParams: TronTxOtherParams = await tronWeb.transactionBuilder.sendToken(
          publicAddress,
          nativeAmount,
          contractAddress,
          this.walletLocalData.publicKey
        )
        otherParams = trxParams
        networkFee = bns.mul(networkFee, TOKEN_TX_SIZE)
      }
      let edgeNativeAmount = bns.add(nativeAmount, networkFee)
      edgeNativeAmount = bns.mul(nativeAmount, '-1')

      // **********************************
      // Create the unsigned EdgeTransaction
      const edgeTransaction: EdgeTransaction = {
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

  async signTx(edgeTransaction: EdgeTransaction): Promise<EdgeTransaction> {
    const privKey = this.walletInfo.keys.tronKey

    const signedTx = await tronWeb.trx.sign(
      edgeTransaction.otherParams,
      privKey
    )
    edgeTransaction.signedTx = JSON.stringify(signedTx)
    return edgeTransaction
  }

  async broadcastTx(
    edgeTransaction: EdgeTransaction
  ): Promise<EdgeTransaction> {
    const trxSignedTransaction = JSON.parse(edgeTransaction.signedTx)
    const response = await tronWeb.trx.sendRawTransaction(trxSignedTransaction)

    if (typeof response.result === 'boolean' && response.result === true) {
      edgeTransaction.txid = response.transaction.txID
    }
    return edgeTransaction
  }

  getDisplayPrivateSeed() {
    if (this.walletInfo.keys && this.walletInfo.keys.tronMnemonic) {
      return this.walletInfo.keys.tronMnemonic
    }
    return this.walletInfo.keys.tronKey
  }

  getDisplayPublicSeed() {
    if (this.walletInfo.keys && this.walletInfo.keys.publicKey) {
      return this.walletInfo.keys.publicKey
    }
    return ''
  }
}

export { CurrencyEngine }
