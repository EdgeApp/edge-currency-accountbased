// @flow

import { gt, sub } from 'biggystring'
import {
  type EdgeSpendInfo,
  type EdgeTransaction,
  type EdgeWalletInfo,
  InsufficientFundsError
} from 'edge-core-js/types'

import { CurrencyEngine } from '../common/engine.js'
import { PolkadotPlugin } from './polkadotPlugin.js'
import { type PolkadotSettings } from './polkadotTypes.js'
import { ApiPromise } from './polkadotUtils'

const ACCOUNT_POLL_MILLISECONDS = 5000
const BLOCKCHAIN_POLL_MILLISECONDS = 20000
const TRANSACTION_POLL_MILLISECONDS = 3000

export class PolkadotEngine extends CurrencyEngine<PolkadotPlugin> {
  settings: PolkadotSettings
  api: ApiPromise

  constructor(
    currencyPlugin: PolkadotPlugin,
    walletInfo: EdgeWalletInfo,
    opts: any // EdgeCurrencyEngineOptions,
  ) {
    super(currencyPlugin, walletInfo, opts)
    this.settings = currencyPlugin.currencyInfo.defaultSettings.otherSettings
  }

  async queryBalance() {}

  async queryBlockheight() {}

  processPolkadotTransaction(tx: SubscanTx) {}

  async queryTransactions() {}

  initOtherData() {}

  // // ****************************************************************************
  // // Public methods
  // // ****************************************************************************

  async startEngine() {
    this.engineOn = true
    await this.currencyPlugin.connectApi(this.walletId)
    this.api = this.currencyPlugin.polkadotApi
    this.initOtherData()
    this.addToLoop('queryBlockheight', BLOCKCHAIN_POLL_MILLISECONDS)
    this.addToLoop('queryBalance', ACCOUNT_POLL_MILLISECONDS)
    this.addToLoop('queryTransactions', TRANSACTION_POLL_MILLISECONDS)
    super.startEngine()
  }

  async killEngine() {
    await super.killEngine()
    await this.currencyPlugin.disconnectApi(this.walletId)
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
    const nativeAmount: string = edgeSpendInfo.spendTargets[0].nativeAmount
    const balance = this.getBalance({
      currencyCode: this.currencyInfo.currencyCode
    })
    const spendableBalance = sub(balance, this.settings.existentialDeposit)

    if (gt(nativeAmount, spendableBalance)) {
      throw new InsufficientFundsError()
    }

    // **********************************
    // Create the unsigned EdgeTransaction
    const edgeTransaction: EdgeTransaction = {
      txid: '',
      date: 0,
      currencyCode,
      blockHeight: 0,
      nativeAmount,
      networkFee: '0',
      ourReceiveAddresses: [],
      signedTx: ''
    }

    return edgeTransaction
  }

  async signTx(edgeTransaction: EdgeTransaction): Promise<EdgeTransaction> {
    throw new Error('Need to implement signTx')
  }

  async broadcastTx(
    edgeTransaction: EdgeTransaction
  ): Promise<EdgeTransaction> {
    throw new Error('Need to implement broadcastTx')
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
