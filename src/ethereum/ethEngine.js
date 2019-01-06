/**
 * Created by paul on 7/7/17.
 */
// @flow

import type {
  EdgeTransaction,
  EdgeSpendInfo,
  EdgeCurrencyEngineOptions,
  EdgeWalletInfo
} from 'edge-core-js'
import { sprintf } from 'sprintf-js'
import { validateObject } from '../common/utils.js'
import { EtherscanGetBlockHeight } from './ethSchema.js'

import { EthereumPlugin } from './ethPlugin.js'
import { CurrencyEngine } from '../common/engine.js'

const ACCOUNT_POLL_MILLISECONDS = 10000
const BLOCKCHAIN_POLL_MILLISECONDS = 15000
const TRANSACTION_POLL_MILLISECONDS = 3000

// const PRIMARY_CURRENCY = currencyInfo.currencyCode

export class EthereumEngine extends CurrencyEngine {
  ethereumPlugin: EthereumPlugin

  constructor (
    currencyPlugin: EthereumPlugin,
    io_: any,
    walletInfo: EdgeWalletInfo,
    opts: EdgeCurrencyEngineOptions
  ) {
    super(currencyPlugin, io_, walletInfo, opts)
    if (typeof this.walletInfo.keys.ethereumKey !== 'string') {
      if (walletInfo.keys.keys && walletInfo.keys.keys.ethereumKey) {
        this.walletInfo.keys.ethereumKey = walletInfo.keys.keys.ethereumKey
      }
    }
    this.currencyPlugin = currencyPlugin
  }

  async fetchGetEtherscan (server: string, cmd: string) {
    let apiKey = ''
    if (global.etherscanApiKey && global.etherscanApiKey.length > 5) {
      apiKey = '&apikey=' + global.etherscanApiKey
    }
    const url = sprintf(
      '%s/api%s%s',
      server,
      cmd,
      apiKey
    )
    return this.fetchGet(url)
  }

  async fetchGet (url: string) {
    const response = await this.io.fetch(url, {
      method: 'GET'
    })
    if (!response.ok) {
      const cleanUrl = url.replace(global.etherscanApiKey, 'private')
      throw new Error(
        `The server returned error code ${response.status} for ${cleanUrl}`
      )
    }
    return response.json()
  }

  async fetchPostBlockcypher (cmd: string, body: any) {
    let apiKey = ''
    if (global.blockcypherApiKey && global.blockcypherApiKey.length > 5) {
      apiKey = '&token=' + global.blockcypherApiKey
    }
    const url = sprintf(
      '%s/%s%s',
      this.currentSettings.otherSettings.blockcypherApiServers[0],
      cmd,
      apiKey
    )
    const response = await this.io.fetch(url, {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      method: 'POST',
      body: JSON.stringify(body)
    })
    return response.json()
  }

  async checkBlockchainInnerLoop () {
    try {
      const jsonObj = await this.fetchGetEtherscan(
        this.currencyInfo.defaultSettings.otherSettings.etherscanApiServers[0],
        '?module=proxy&action=eth_blockNumber'
      )
      const valid = validateObject(jsonObj, EtherscanGetBlockHeight)
      if (valid) {
        const blockHeight: number = parseInt(jsonObj.result, 16)
        this.log(`Got block height ${blockHeight}`)
        if (this.walletLocalData.blockHeight !== blockHeight) {
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

  async checkAccountInnerLoop () {

  }

  async checkTransactionsInnerLoop () {

  }

  async clearBlockchainCache () {
    await super.clearBlockchainCache()
  }

  // ****************************************************************************
  // Public methods
  // ****************************************************************************

  async startEngine () {
    this.engineOn = true
    this.addToLoop('checkBlockchainInnerLoop', BLOCKCHAIN_POLL_MILLISECONDS)
    this.addToLoop('checkAccountInnerLoop', ACCOUNT_POLL_MILLISECONDS)
    this.addToLoop('checkTransactionsInnerLoop', TRANSACTION_POLL_MILLISECONDS)
    super.startEngine()
  }

  async killEngine () {
    // Set status flag to false
    this.engineOn = false
    // Clear Inner loops timers
    for (const timer in this.timers) {
      clearTimeout(this.timers[timer])
    }
    this.timers = {}
    this.log('killEngine')
    // this.leavePool()
  }

  async resyncBlockchain (): Promise<void> {
    await this.killEngine()
    await this.clearBlockchainCache()
    await this.startEngine()
  }

  // synchronous
  async makeSpend (edgeSpendInfo: EdgeSpendInfo) {
    const edgeTransaction: EdgeTransaction = {
      txid: '', // txid
      date: 0, // date
      currencyCode: '', // currencyCode
      blockHeight: 0, // blockHeight
      nativeAmount: '', // nativeAmount
      networkFee: '', // networkFee
      ourReceiveAddresses: [], // ourReceiveAddresses
      signedTx: '0', // signedTx
      otherParams: {}
    }

    this.log('Payment transaction prepared...')
    return edgeTransaction
  }

  // asynchronous
  async signTx (edgeTransaction: EdgeTransaction): Promise<EdgeTransaction> {
    return edgeTransaction
  }

  // asynchronous
  async broadcastTx (
    edgeTransaction: EdgeTransaction
  ): Promise<EdgeTransaction> {
    return edgeTransaction
  }

  getDisplayPrivateSeed () {
    if (this.walletInfo.keys && this.walletInfo.keys.rippleKey) {
      return this.walletInfo.keys.ethereumKey
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
