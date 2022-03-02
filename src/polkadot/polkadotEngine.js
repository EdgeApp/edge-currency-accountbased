// @flow

import { add, div, mul } from 'biggystring'
import {
  type EdgeSpendInfo,
  type EdgeTransaction,
  type EdgeWalletInfo,
  type JsonObject
} from 'edge-core-js/types'

import { CurrencyEngine } from '../common/engine.js'
import { getDenomInfo } from '../common/utils.js'
import { PolkadotPlugin } from './polkadotPlugin.js'
import {
  type PolkadotOtherData,
  type PolkadotSettings,
  type SubscanTx,
  asBalance,
  asBlockheight,
  asSubscanResponse,
  asTransactions,
  asTransfer
} from './polkadotTypes.js'

const ACCOUNT_POLL_MILLISECONDS = 5000
const BLOCKCHAIN_POLL_MILLISECONDS = 20000
const TRANSACTION_POLL_MILLISECONDS = 3000

export class PolkadotEngine extends CurrencyEngine {
  settings: PolkadotSettings
  otherData: PolkadotOtherData

  constructor(
    currencyPlugin: PolkadotPlugin,
    walletInfo: EdgeWalletInfo,
    opts: any // EdgeCurrencyEngineOptions
  ) {
    super(currencyPlugin, walletInfo, opts)
    this.settings = currencyPlugin.currencyInfo.defaultSettings.otherSettings
  }

  async fetchSubscan(endpoint: string, body: JsonObject): Promise<JsonObject> {
    const options = {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    }
    const response = await this.io.fetch(
      this.settings.subscanBaseUrl + endpoint,
      options
    )
    if (!response.ok) {
      throw new Error(`Subscan ${endpoint} failed with ${response.status}`)
    }
    return asSubscanResponse(await response.json()).data
  }

  async queryBalance() {
    try {
      const payload = { key: this.walletInfo.keys.publicKey }
      const response = await this.fetchSubscan('/v2/scan/search', payload)
      const { balance } = asBalance(response).account
      const denom = getDenomInfo(
        this.currencyInfo,
        this.currencyInfo.currencyCode
      )
      if (denom == null) return
      const nativeBalance = div(balance, denom.multiplier)
      this.updateBalance(this.currencyInfo.currencyCode, nativeBalance)
    } catch (e) {
      this.warn('queryBalance failed with error: ', e)
    }
  }

  async queryBlockheight() {
    try {
      const payload = {
        row: 1,
        page: 0
      }
      const response = await this.fetchSubscan('/scan/blocks', payload)
      const { block_num: blockheight } = asBlockheight(response).blocks[0]
      if (blockheight > this.walletLocalData.blockHeight) {
        this.walletLocalData.blockHeight = blockheight
        this.walletLocalDataDirty = true
        this.currencyEngineCallbacks.onBlockHeightChanged(
          this.walletLocalData.blockHeight
        )
      }
    } catch (e) {
      this.warn('queryBlockheight failed with error: ', e)
    }
  }

  async queryFee() {}

  processPolkadotTransaction(tx: SubscanTx) {
    const {
      from,
      to,
      success,
      hash,
      block_num: blockHeight,
      block_timestamp: date,
      module,
      amount, // large denomination
      fee // small denomination
    } = tx

    // Skip unsuccessful and irrelevant transactions
    if (!success || module !== 'balances') return

    const denom = getDenomInfo(
      this.currencyInfo,
      this.currencyInfo.currencyCode
    )
    if (denom == null) return

    const ourReceiveAddresses = []

    let nativeAmount = mul(amount, denom.multiplier)
    if (from === this.walletInfo.keys.publicKey) {
      nativeAmount = `-${add(amount, fee)}`
    } else {
      ourReceiveAddresses.push(to)
    }

    const edgeTransaction: EdgeTransaction = {
      txid: hash,
      date,
      currencyCode: this.currencyInfo.currencyCode,
      blockHeight,
      nativeAmount: nativeAmount,
      networkFee: fee,
      ourReceiveAddresses,
      signedTx: ''
    }
    this.addTransaction(this.currencyInfo.currencyCode, edgeTransaction)
  }

  async queryTransactions() {
    let page = 0

    while (true) {
      const payload = {
        row: this.settings.subscanQueryLimit,
        page,
        address: '1REAJ1k691g5Eqqg9gL7vvZCBG7FCCZ8zgQkZWd4va5ESih'
      }
      const response = await this.fetchSubscan('scan/transfers', payload)
      const { count, transfers } = asTransactions(response)

      // If we've already seen all the transfers we don't need to bother processing or page through older ones
      if (count === this.otherData.processedTxCount) break

      // Instead of an empty array, a null is returned when there are zero transfers
      if (transfers == null) break

      // Process txs (newest first)
      transfers.forEach(tx => {
        this.otherData.processedTxCount++
        try {
          this.processPolkadotTransaction(asTransfer(tx))
        } catch (e) {
          const hash = tx != null && typeof tx.hash === 'string' ? tx.hash : ''
          this.warn(`Ignoring invalid transfer ${hash}`)
        }
      })

      // We've reached the end of the query
      if (transfers.length < this.settings.subscanQueryLimit) break

      page++
    }
  }

  initOtherData() {
    if (this.otherData.processedTxCount == null) {
      this.otherData.processedTxCount = 0
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

    // **********************************
    // Create the unsigned EdgeTransaction

    const edgeTransaction: EdgeTransaction = {
      txid: '',
      date: 0,
      currencyCode,
      blockHeight: 0,
      nativeAmount: '0',
      networkFee: '0',
      ourReceiveAddresses: [],
      signedTx: ''
    }

    return edgeTransaction
  }

  async signTx(edgeTransaction: EdgeTransaction): Promise<EdgeTransaction> {
    return edgeTransaction
  }

  async broadcastTx(
    edgeTransaction: EdgeTransaction
  ): Promise<EdgeTransaction> {
    if (edgeTransaction.signedTx == null) throw new Error('Missing signedTx')

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
