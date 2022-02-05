// @flow

import * as solanaWeb3 from '@solana/web3.js'
import { bns } from 'biggystring'
import { asNumber } from 'cleaners'
import {
  type EdgeFetchFunction,
  type EdgeSpendInfo,
  type EdgeTransaction,
  type EdgeWalletInfo,
  type JsonObject,
  InsufficientFundsError
} from 'edge-core-js/types'

import { CurrencyEngine } from '../common/engine.js'
import { asyncWaterfall, cleanTxLogs, getOtherParams } from '../common/utils.js'
import { SolanaPlugin } from './solanaPlugin.js'
import {
  type RpcGetTransaction,
  type RpcSignatureForAddress,
  type SolanaOtherData,
  asRecentBlockHash,
  asRpcBalance,
  asRpcGetTransaction
} from './solanaTypes.js'

const { PublicKey, Keypair, SystemProgram, Transaction } = solanaWeb3

const ACCOUNT_POLL_MILLISECONDS = 20000
const BLOCKCHAIN_POLL_MILLISECONDS = 20000
const TRANSACTION_POLL_MILLISECONDS = 3000

export class SolanaEngine extends CurrencyEngine {
  keypair: Keypair
  feePerSignature: string
  recentBlockhash: string
  chainCode: string
  otherData: SolanaOtherData
  fetchCors: EdgeFetchFunction

  constructor(
    currencyPlugin: SolanaPlugin,
    walletInfo: EdgeWalletInfo,
    opts: any, // EdgeCurrencyEngineOptions
    fetchCors: EdgeFetchFunction
  ) {
    super(currencyPlugin, walletInfo, opts)
    this.keypair = currencyPlugin.createKeyPair(
      this.walletInfo.keys[`${this.currencyPlugin.pluginId}Mnemonic`]
    )
    this.chainCode = currencyPlugin.currencyInfo.currencyCode
    this.fetchCors = fetchCors
    this.feePerSignature = '5000'
    this.recentBlockhash = '' // must be < ~2min old
  }

  async fetchRpc(method: string, params: any = []) {
    const body = {
      jsonrpc: '2.0',
      id: 1,
      method,
      params
    }
    const options = {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    }

    const funcs =
      this.currencyPlugin.currencyInfo.defaultSettings.otherSettings.rpcNodes.map(
        serverUrl => async () => {
          const res = await this.fetchCors(
            this.currencyPlugin.currencyInfo.defaultSettings.otherSettings
              .rpcNodes[0],
            options
          )
          if (!res.ok) {
            throw new Error(
              `fetchRpc ${options.method} failed error: ${res.status}`
            )
          }
          return res.json()
        }
      )

    const response = await asyncWaterfall(funcs)
    return response.result
  }

  updateBalance(tk: string, balance: string) {
    if (typeof this.walletLocalData.totalBalances[tk] === 'undefined') {
      this.walletLocalData.totalBalances[tk] = '0'
    }
    if (!bns.eq(balance, this.walletLocalData.totalBalances[tk])) {
      this.walletLocalData.totalBalances[tk] = balance
      this.warn(`${tk}: token Address balance: ${balance}`)
      this.currencyEngineCallbacks.onBalanceChanged(tk, balance)
    }
    this.tokenCheckBalanceStatus[tk] = 1
    this.updateOnAddressesChecked()
  }

  async queryBalance() {
    try {
      const response = await this.fetchRpc('getBalance', [
        this.keypair.publicKey.toBase58()
      ])
      const balance = asRpcBalance(response)
      this.updateBalance(this.chainCode, balance.value.toString())
    } catch (e) {
      // fetching of account balances for uninitiated accounts throws error
      if (
        this.tokenCheckTransactionsStatus[this.chainCode] === 1 &&
        this.transactionList[this.chainCode].length === 0
      ) {
        this.updateBalance(this.chainCode, '0')
      }
      this.error(`Error checking ${this.chainCode} address balance`, e)
    }
  }

  async queryBlockheight() {
    try {
      const blockheight = asNumber(await this.fetchRpc('getSlot'))
      if (blockheight > this.walletLocalData.blockHeight) {
        this.walletLocalData.blockHeight = blockheight
        this.walletLocalDataDirty = true
        this.currencyEngineCallbacks.onBlockHeightChanged(
          this.walletLocalData.blockHeight
        )
      }
    } catch (e) {
      this.error(`queryBlockheight Error `, e)
    }
  }

  async queryFee() {
    try {
      const response = await this.fetchRpc('getRecentBlockhash')
      const {
        blockhash,
        feeCalculator: { lamportsPerSignature }
      } = asRecentBlockHash(response).value
      this.feePerSignature = lamportsPerSignature.toString()
      this.recentBlockhash = blockhash
    } catch (e) {
      this.error(`queryFee Error `, e)
    }
  }

  processSolanaTransaction(tx: RpcGetTransaction, timestamp: number) {
    const ourReceiveAddresses = []
    const index = tx.transaction.message.accountKeys.findIndex(
      account => account === this.keypair.publicKey.toBase58()
    )
    if (index < 0 || tx.meta == null) return
    let amount = tx.meta.postBalances[index] - tx.meta.preBalances[index]
    const fee = tx.meta.fee
    if (amount < 0) {
      amount -= fee
    } else {
      ourReceiveAddresses.push(this.keypair.publicKey.toBase58())
    }
    const edgeTransaction: EdgeTransaction = {
      txid: tx.transaction.signatures[0],
      date: timestamp,
      currencyCode: this.chainCode,
      blockHeight: tx.slot,
      nativeAmount: amount.toString(),
      networkFee: fee.toString(),
      ourReceiveAddresses,
      signedTx: ''
    }
    this.addTransaction(this.chainCode, edgeTransaction)
  }

  async queryTransactions() {
    let before = null
    const until =
      this.otherData.newestTxid !== '' ? this.otherData.newestTxid : null
    let txids = []
    try {
      // Gather all transaction IDs since we last updated
      while (1) {
        const params = [this.keypair.publicKey.toBase58(), { until, before }]
        const response: RpcSignatureForAddress[] = await this.fetchRpc(
          'getSignaturesForAddress',
          params
        )

        // remove failed transactions from list
        txids = txids.concat(
          response.filter(data => data.err == null && data.signature != null)
        )

        if (response.length < 1000) break // RPC limit
        before = response[1000 - 1].signature
      }
    } catch (e) {
      this.error('getTransactionSignatures failed with error: ', e)
      return
    }

    if (txids.length === 0) {
      this.tokenCheckTransactionsStatus[this.chainCode] = 1
      this.updateOnAddressesChecked()
      return
    }

    let newestTxid = 0
    for (let i = 0; i < txids.length; i++) {
      try {
        const tx = asRpcGetTransaction(
          await this.fetchRpc('getTransaction', [txids[i].signature, 'json'])
        )

        // From testing, getSignaturesForAddress always returns a blocktime but it is optional in the RPC docs so we should be prepared to get it if it isn't present
        let timestamp = txids[i].blocktime
        if (timestamp == null || isNaN(timestamp))
          timestamp = asNumber(await this.fetchRpc('getBlockTime', [tx.slot]))

        this.processSolanaTransaction(tx, timestamp)
      } catch (e) {
        // Note the oldest failed tx query so we try again next loop
        newestTxid = i
      }
    }

    // Don't update the newestTxid if the txids array length is length 1 or the oldest failed query is the end of the array.
    // The previously saved value is the best to use in those cases
    if (txids.length > 1 && txids.length > newestTxid + 1)
      this.otherData.newestTxid = txids[newestTxid + 1].signature

    this.walletLocalDataDirty = true
    this.tokenCheckTransactionsStatus[this.chainCode] = 1
    this.updateOnAddressesChecked()

    if (this.transactionsChangedArray.length > 0) {
      this.currencyEngineCallbacks.onTransactionsChanged(
        this.transactionsChangedArray
      )
      this.transactionsChangedArray = []
    }
  }

  initOtherData() {
    if (this.otherData.newestTxid == null) {
      this.otherData.newestTxid = ''
    }
  }

  // // ****************************************************************************
  // // Public methods
  // // ****************************************************************************

  async startEngine() {
    this.engineOn = true
    this.initOtherData()
    this.addToLoop('queryBlockheight', BLOCKCHAIN_POLL_MILLISECONDS)
    this.addToLoop('queryFee', BLOCKCHAIN_POLL_MILLISECONDS)
    this.addToLoop('queryBalance', ACCOUNT_POLL_MILLISECONDS)
    this.addToLoop('queryTransactions', TRANSACTION_POLL_MILLISECONDS)
    super.startEngine()
  }

  async resyncBlockchain(): Promise<void> {
    await this.killEngine()
    await this.clearBlockchainCache()
    await this.startEngine()
  }

  async makeSpend(edgeSpendInfoIn: EdgeSpendInfo): Promise<EdgeTransaction> {
    const { edgeSpendInfo, currencyCode } = super.makeSpend(edgeSpendInfoIn)

    if (edgeSpendInfo.spendTargets.length !== 1) {
      throw new Error('Error: only one output allowed')
    }
    const publicAddress = edgeSpendInfo.spendTargets[0].publicAddress

    const nativeNetworkFee = this.feePerSignature
    const nativeAmount: string = edgeSpendInfo.spendTargets[0].nativeAmount
    const balanceSol = this.walletLocalData.totalBalances[this.chainCode]
    let totalTxAmount = '0'
    totalTxAmount = bns.add(nativeAmount, nativeNetworkFee)
    if (bns.gt(totalTxAmount, balanceSol)) {
      throw new InsufficientFundsError()
    }
    // Create Solana transaction
    const txOpts = {
      recentBlockhash: this.recentBlockhash,
      feePayer: this.keypair.publicKey
    }
    const solTx = new Transaction(txOpts).add(
      SystemProgram.transfer({
        fromPubkey: this.keypair.publicKey,
        toPubkey: new PublicKey(publicAddress),
        lamports: parseInt(nativeAmount)
      })
    )

    const otherParams: JsonObject = {
      unsignedSerializedSolTx: solTx.serialize({
        requireAllSignatures: false
      })
    }

    // **********************************
    // Create the unsigned EdgeTransaction

    const edgeTransaction: EdgeTransaction = {
      txid: '',
      date: 0,
      currencyCode,
      blockHeight: 0,
      nativeAmount: bns.mul(totalTxAmount, '-1'),
      networkFee: nativeNetworkFee,
      ourReceiveAddresses: [],
      signedTx: '',
      otherParams
    }

    return edgeTransaction
  }

  async signTx(edgeTransaction: EdgeTransaction): Promise<EdgeTransaction> {
    const { unsignedSerializedSolTx } = getOtherParams(edgeTransaction)
    if (unsignedSerializedSolTx == null)
      throw new Error('Missing unsignedSerializedSolTx')

    const solTx = Transaction.from(unsignedSerializedSolTx)
    solTx.recentBlockhash = this.recentBlockhash
    solTx.sign({
      publicKey: this.keypair.publicKey,
      secretKey: this.keypair.secretKey
    })
    edgeTransaction.signedTx = solTx.serialize().toString('base64')
    this.warn(`signTx\n${cleanTxLogs(edgeTransaction)}`)
    return edgeTransaction
  }

  async broadcastTx(
    edgeTransaction: EdgeTransaction
  ): Promise<EdgeTransaction> {
    if (edgeTransaction.signedTx == null) throw new Error('Missing signedTx')

    try {
      const params = [edgeTransaction.signedTx, { encoding: 'base64' }]
      const txid = await this.fetchRpc('sendTransaction', params)
      edgeTransaction.txid = txid
      edgeTransaction.date = Date.now() / 1000
      this.warn(`SUCCESS broadcastTx\n${cleanTxLogs(edgeTransaction)}`)
    } catch (e) {
      this.warn('FAILURE broadcastTx failed: ', e)
      throw e
    }

    return edgeTransaction
  }

  getDisplayPrivateSeed() {
    if (
      this.walletInfo.keys &&
      this.walletInfo.keys[`${this.currencyPlugin.pluginId}Mnemonic`]
    ) {
      return this.walletInfo.keys[`${this.currencyPlugin.pluginId}Mnemonic`]
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

export { CurrencyEngine }
