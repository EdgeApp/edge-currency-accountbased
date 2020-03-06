// @flow
import { tx } from '@cityofzion/neon-core'
import { api, rpc,wallet } from '@cityofzion/neon-js'
import { bns } from 'biggystring'
import {
  type EdgeSpendInfo,
  type EdgeTransaction,
  InsufficientFundsError
} from 'edge-core-js/types'

import { CurrencyEngine } from '../common/engine.js'
import { getDenomInfo, getOtherParams, promiseAny, validateObject } from '../common/utils.js'
import { currencyInfo } from './neoInfo.js'
import { checkAddress } from './neoPlugin.js'
import {
  NeoTransactionOnline
} from './neoSchema.js'
import { type NeoTxOtherParams } from './neoTypes.js'
const { Account } = wallet
const { RPCClient } = rpc
const ApiProvider = api.neoscan.instance

const PRIMARY_CURRENCY = currencyInfo.currencyCode
// const ADDRESS_POLL_MILLISECONDS = 10000
const ACCOUNT_POLL_MILLISECONDS = 15000
const BLOCKCHAIN_POLL_MILLISECONDS = 20000
const TRANSACTION_POLL_MILLISECONDS = 20000
const ADDRESS_QUERY_LOOKBACK_BLOCKS = 1

type NeoFunction =
  | 'neo_getBalance'
  | 'neo_getTx'
  | 'neo_getBlockCount'
  | 'neo_broadcastTx'
  | 'neo_getTxHeight'
  | 'neo_getTxOut'
  | 'neo_getBlock'

export class NeoEngine extends CurrencyEngine {
  async multicastServers(func: NeoFunction, ...params: any): Promise<any> {
    this.log(`start to query ${func} on Neo Blockchain`)
    const out = { result: '', server: 'no server' }
    switch (func) {
      case 'neo_getBalance': {
        const address = params[0];
        if (!checkAddress(address)) {
          throw new Error(`${address} is not a neo address`);
        }
        const promises = []
        const rpcNodes = this.currencyInfo.defaultSettings.neoRpcNodes
        for (const node of rpcNodes) {
          const client = new RPCClient(node);
          promises.push(client.getAccountState(address))
        }
        const response = await promiseAny(promises)
        if (response) {
          return response
        } else {
          throw new Error('NEO get balance with error')
        }
      }
      case 'neo_broadcastTx': {
        const transaction = params[0];
        if (typeof transaction !== 'string' && !transaction.serialize) {
          throw new Error(`${transaction} is not a transaction.`);
        }
        const rpcNodes = this.currencyInfo.defaultSettings.neoRpcNodes
        const promises = []
        for (const node of rpcNodes) {
          const client = new RPCClient(node);
          promises.push(client.sendRawTransaction(transaction))
        }
        const response = (await promiseAny(promises)).json()
        if (response && response.result) {
          return response.result
        } else {
          throw new Error('NEO send fail with error: ' + response.error.message)
        }
      }
      case 'neo_getTx': {
        const txId = params[0];
        const rpcNodes = this.currencyInfo.defaultSettings.neoRpcNodes
        const promises = []
        for (const node of rpcNodes) {
          const client = new RPCClient(node);
          promises.push(client.getRawTransaction(txId, 1))
        }
        const response = (await promiseAny(promises))
        if (response && response.result) {
          return response.result
        } else {
          throw new Error('NEO get TX fail with error: ' + response.error.message)
        }
      }
      case 'neo_getBlockCount': {
        const rpcNodes = this.currencyInfo.defaultSettings.neoRpcNodes
        const promises = []
        for (const node of rpcNodes) {
          const client = new RPCClient(node);
          promises.push(client.getBlockCount())
        }
        const blockHeight = (await promiseAny(promises))
        if (blockHeight) {
          return blockHeight
        } else {
          throw new Error('NEO get block count fail with error')
        }
      }
      case 'neo_getTxHeight': {
        const rpcNodes = this.currencyInfo.defaultSettings.neoRpcNodes
        const promises = []
        for (const node of rpcNodes) {
          promises.push(rpc.queryRPC(node, {
            method: 'gettransactionheight',
            params
          }))
        }
        const response = (await promiseAny(promises)).json()
        if (response && response.result) {
          return response.result
        } else {
          throw new Error('NEO get transaction height fail with error: ' + response.error.message)
        }
      }
      case 'neo_getTxOut': {
        const rpcNodes = this.currencyInfo.defaultSettings.neoRpcNodes
        const promises = []
        for (const node of rpcNodes) {
          const client = new RPCClient(node);
          promises.push(client.getTxOut(...params))
        }
        const response = (await promiseAny(promises)).json()
        if (response && response.result) {
          return response.result
        } else {
          throw new Error('NEO get tx outputs with error: ' + response.error.message)
        }
      }
      case 'neo_getBlock': {
        const rpcNodes = this.currencyInfo.defaultSettings.neoRpcNodes
        const promises = []
        for (const node of rpcNodes) {
          const client = new RPCClient(node);
          promises.push(client.getBlock(...params))
        }
        const response = (await promiseAny(promises)).json()
        if (response && response.result) {
          return response.result
        } else {
          throw new Error('NEO get tx outputs with error: ' + response.error.message)
        }
      }
      default: {

      }
    }
    this.log(`NEO multicastServers ${func} ${out.server} won`)

    return out.result
  }

  async checkBlockchainInnerLoop() {
    try {
      const blockHeight = await this.multicastServers('neo_getBlockCount')
      this.log(`Got block height ${blockHeight}`)
      if (this.walletLocalData.blockHeight !== blockHeight) {
        this.checkDroppedTransactionsThrottled()
        this.walletLocalData.blockHeight = blockHeight
        this.walletLocalDataDirty = true
        this.currencyEngineCallbacks.onBlockHeightChanged(
          this.walletLocalData.blockHeight
        )
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
    const address = wallet.getAddressFromScriptHash(
      wallet.getScriptHashFromPublicKey(this.walletLocalData.publicKey)
    )

    try {
      const balances = (await this.multicastServers('neo_getBalance', address)).balances
      if (!balances  || balances.length === 0) {
        this.updateBalance('NEO', '0')
      }
      for (const tk of this.walletLocalData.enabledTokens) {
        for (const balance of balances) {
          if (balance.asset === this.currencyInfo.defaultSettings.assets[tk]) {
            const denom = getDenomInfo(this.currencyInfo, tk)
            if (!denom) {
              this.log(`Received unsupported currencyCode: ${tk}`)
              break
            }
            const nativeAmount = bns.mul(balance.value, denom.multiplier)
            this.updateBalance(tk, nativeAmount)
          }
        }
      }
    } catch (e) {
      this.updateBalance('NEO', '0')
      this.log(`Error checking NEO address balance`)
    }
  }

  async processTransaction(transaction: Object, currencyCode: string) {
    const valid = validateObject(transaction, NeoTransactionOnline)
    if (valid) {
      const { vin, vout, txid, net_fee: netFee, blocktime } = transaction
      const neoInputs = []
      for(let i = 0; i < vin.length; i++) {
        const { txid: prevHash, vout: prevIndex } = vin[i]
        const from = await this.multicastServers('neo_getTxOut', prevHash, prevIndex)
        if (from.asset === currencyInfo.defaultSettings.assets.NEO) {
          neoInputs.push(from)
        }
      }
  
      const neoOutputs = vout.filter(output => 
        output.asset === currencyInfo.defaultSettings.assets.NEO &&
        neoInputs.every(input => input.address !== output.address)
      )
  
      const nativeAmount = neoOutputs.reduce((sum, cur) => sum + cur.value, 0)
  
      const from = neoInputs[0].address
      const to = [neoOutputs[0].address]
  
      const otherParams = {
        from,
        to,
        networkFee: transaction.fees,
        isNative: true
      }
  
      const blockHeight = await this.multicastServers('neo_getTxHeight', txid)
      
      const edgeTransaction: EdgeTransaction = {
        txid,
        date: blocktime,
        currencyCode,
        blockHeight,
        nativeAmount,
        networkFee: netFee,
        parentNetworkFee: '0',
        ourReceiveAddresses: to,
        signedTx: '',
        otherParams
      }
  
      this.addTransaction(currencyCode, edgeTransaction)
    }
  }

  async checkTransactionsFetch(startBlockHeight: number, currencyCode: string, blockHeight: number): Promise<boolean> {
    let checkAddressSuccess: boolean = true
    try {
      for (let curHeight = startBlockHeight; curHeight++; curHeight <= blockHeight) {
        const { tx: transactions } = await this.multicastServers('neo_getBlock', curHeight, 1)
        for(let i = 0; i < transactions.length; i++) {
          await this.processTransaction(transactions[i], currencyCode)
        }
      }
      checkAddressSuccess = true
    } catch (e) {
      this.log(`Error checkTransactionsFetch ${currencyCode}`, e)
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
    const blockHeight = Number(await this.multicastServers('neo_getBlockCount'))
    let startBlockHeight = 0
    const promiseArray = []

    if (this.walletLocalData.lastAddressQueryHeight > ADDRESS_QUERY_LOOKBACK_BLOCKS) {
      startBlockHeight = this.walletLocalData.lastAddressQueryHeight - ADDRESS_QUERY_LOOKBACK_BLOCKS
    }

    for(const currencyCode of this.walletLocalData.enabledTokens) {
      promiseArray.push(this.checkTransactionsFetch(startBlockHeight, currencyCode, blockHeight))
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

  // // ****************************************************************************
  // // Public methods
  // // ****************************************************************************

  async startEngine() {
    this.engineOn = true
    this.addToLoop('checkBlockchainInnerLoop', BLOCKCHAIN_POLL_MILLISECONDS)
    this.addToLoop('checkAccountInnerLoop', ACCOUNT_POLL_MILLISECONDS)
    // this.addToLoop('checkUpdateNetworkFees', NETWORKFEES_POLL_MILLISECONDS)
    this.addToLoop('checkTransactionsInnerLoop', TRANSACTION_POLL_MILLISECONDS)
    super.startEngine()
  }

  async resyncBlockchain(): Promise<void> {
    await this.killEngine()
    await this.clearBlockchainCache()
    await this.startEngine()
  }

  async makeSpend(edgeSpendInfoIn: EdgeSpendInfo) {
    const { edgeSpendInfo, currencyCode, nativeBalance } = super.makeSpend(
      edgeSpendInfoIn
    )

    /* Just consider only one target */
    if (edgeSpendInfo.spendTargets.length !== 1) {
      throw new Error('Error: only one output supported now for neo')
    }

    const networkFee = 0 // neo has 10 gas free.
    const spendTarget = edgeSpendInfo.spendTargets[0]
    const publicAddress = spendTarget.publicAddress
    const nativeAmount = edgeSpendInfo.spendTargets[0].nativeAmount
    const data =
      spendTarget.otherParams != null ? spendTarget.otherParams.data : undefined

    if (bns.gt(nativeAmount, nativeBalance)) {
      throw new InsufficientFundsError()
    }

    let otherParams: Object = {}

    if (currencyCode === PRIMARY_CURRENCY) {
      const neoParams: NeoTxOtherParams = {
        from: this.walletLocalData.publicKey,
        to: [publicAddress],
        networkFee,
        isNative: true,
        data
      }
      otherParams = neoParams
    } else {
      const tokenInfo = this.getTokenInfo(currencyCode)
      if (!tokenInfo || typeof tokenInfo.contractAddress !== 'string') {
        throw new Error(
          'Error: Token not supported or invalid contract address'
        )
      }
      const contractAddress = tokenInfo.contractAddress

      const neoParams: NeoTxOtherParams = {
        from: this.walletLocalData.publicKey,
        to: [publicAddress],
        networkFee,
        isNative: false,
        data,
        asset: contractAddress
      }
      otherParams = neoParams
    }

    // **********************************
    // Create the unsigned EdgeTransaction

    const edgeTransaction: EdgeTransaction = {
      txid: '', // txid
      date: 0, // date
      currencyCode, // currencyCode
      blockHeight: 0, // blockHeight
      nativeAmount, // nativeAmount
      networkFee: '' + networkFee, // networkFee, supposedly fixed
      ourReceiveAddresses: [], // ourReceiveAddresses
      signedTx: '', // signedTx
      otherParams // otherParams
    }

    return edgeTransaction
  }

  async signTx(edgeTransaction: EdgeTransaction): Promise<EdgeTransaction> {
    const otherParams = getOtherParams(edgeTransaction)
    const neoApiProvider = new ApiProvider(
      this.currencyInfo.defaultSettings.neoScanUrl.MainNet
    )
    const privateKey = this.walletInfo.keys.neoKey
    const currencyCode = edgeTransaction.currencyCode
    const amount = edgeTransaction.nativeAmount
    const account = new Account(privateKey)

    const denom = getDenomInfo(this.currencyInfo, currencyCode)
    if (!denom) {
      this.log(`Received unsupported currencyCode: ${currencyCode}`)
      throw new Error(`Received unsupported currencyCode: ${currencyCode}`)
    }

    const nativeAmount = parseInt(amount) / parseInt(denom.multiplier)

    const balance = await neoApiProvider.getBalance(account.address)
    const signedTx = new tx.ContractTransaction()
    signedTx
      .addIntent('NEO', nativeAmount, otherParams.to[0])
      .calculate(balance)
      .sign(privateKey)

    this.log(`SUCCESS NEO broadcastTx\n${JSON.stringify(signedTx)}`)
    otherParams.serializedTx = signedTx.serialize(true)
    edgeTransaction.txid = signedTx.hash
    edgeTransaction.otherParams = otherParams
    return edgeTransaction
  }

  async broadcastTx(
    edgeTransaction: EdgeTransaction
  ): Promise<EdgeTransaction> {
    const otherParams = getOtherParams(edgeTransaction)
    const neoSignedTransaction = otherParams.serializedTx
    const response = await this.multicastServers(
      'neo_broadcastTx',
      neoSignedTransaction
    )
    if (response.result) {
      this.log(`SUCCESS broadcastTx\n${JSON.stringify(edgeTransaction.txid)}`)
    }
    this.log('edgeTransaction = ', edgeTransaction)
    return edgeTransaction
  }

  getDisplayPrivateSeed() {
    if (this.walletInfo.keys && this.walletInfo.keys.neoKey) {
      return this.walletInfo.keys.neoKey
    }
    return ''
  }

  getDisplayPublicSeed() {
    if (this.walletInfo.keys && this.walletInfo.keys.publicKey) {
      return this.walletInfo.keys.publicKey
    }
    return ''
  }
}
