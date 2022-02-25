// @flow

import {
  type EdgeSpendInfo,
  type EdgeTransaction,
  type EdgeWalletInfo
} from 'edge-core-js/types'

import { CurrencyEngine } from '../common/engine.js'
import { PolkadotPlugin } from './polkadotPlugin.js'
import { type PolkadotSettings } from './polkadotTypes.js'

const ACCOUNT_POLL_MILLISECONDS = 5000
const BLOCKCHAIN_POLL_MILLISECONDS = 20000
const TRANSACTION_POLL_MILLISECONDS = 3000

export class PolkadotEngine extends CurrencyEngine {
  settings: PolkadotSettings

  constructor(
    currencyPlugin: PolkadotPlugin,
    walletInfo: EdgeWalletInfo,
    opts: any // EdgeCurrencyEngineOptions
  ) {
    super(currencyPlugin, walletInfo, opts)
    this.settings = currencyPlugin.currencyInfo.defaultSettings.otherSettings
  }

  async queryBalance() {}

  async queryBlockheight() {}

  async queryFee() {}

  processPolkadotTransaction() {}

  async queryTransactions() {}

  initOtherData() {}

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
