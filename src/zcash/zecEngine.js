/**
 * Created by paul on 7/7/17.
 */
// @flow

import {
  type EdgeSpendInfo,
  type EdgeTransaction,
  type EdgeWalletInfo
} from 'edge-core-js/types'

import { CurrencyEngine } from '../common/engine.js'
import { ZcashPlugin } from './zecPlugin.js'

export class ZcashEngine extends CurrencyEngine {
  zcashPlugin: ZcashPlugin
  // otherData: ZcashWalletOtherData
  // initOptions: ZcashInitOptions

  constructor(
    currencyPlugin: ZcashPlugin,
    walletInfo: EdgeWalletInfo,
    initOptions: any, // ZcashInitOptions,
    opts: any // EdgeCurrencyEngineOptions
  ) {
    super(currencyPlugin, walletInfo, opts)
  }

  async startEngine() {}

  async resyncBlockchain(): Promise<void> {}

  async makeSpend(edgeSpendInfoIn: EdgeSpendInfo) {
    const edgeTransaction: EdgeTransaction = {
      txid: '', // txid
      date: 0, // date
      currencyCode: 'ZEC', // currencyCode
      blockHeight: 0, // blockHeight
      nativeAmount: '0', // nativeAmount
      networkFee: '0', // networkFee, supposedly fixed
      ourReceiveAddresses: [], // ourReceiveAddresses
      signedTx: '', // signedTx
      otherParams: {} // otherParams
    }

    return edgeTransaction
  }

  async signTx(edgeTransaction: EdgeTransaction): Promise<EdgeTransaction> {
    return edgeTransaction
  }

  async broadcastTx(
    edgeTransaction: EdgeTransaction
  ): Promise<EdgeTransaction> {
    return edgeTransaction
  }

  getDisplayPrivateSeed() {
    if (this.walletInfo.keys && this.walletInfo.keys.zcashMnemonic) {
      return this.walletInfo.keys.zcashMnemonic
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
