/**
 * Created by paul on 7/7/17.
 */
// @flow

import {
  type EdgeCurrencyEngineOptions,
  type EdgeCurrencyTools,
  type EdgeSpendInfo,
  type EdgeTransaction,
  type EdgeWalletInfo
} from 'edge-core-js/types'

import { CurrencyEngine } from '../common/engine.js'
import { type ZcashSynchronizer } from './../react-native-io'
import { ZcashPlugin } from './zecPlugin.js'

export class ZcashEngine extends CurrencyEngine {
  zcashPlugin: ZcashPlugin
  synchronizer: ZcashSynchronizer
  makeSynchronizer: (arg: any) => Promise<ZcashSynchronizer>
  initializer: {
    fullViewingKey: string,
    birthdayHeight: number,
    alias: string
  }

  constructor(
    currencyPlugin: ZcashPlugin,
    walletInfo: EdgeWalletInfo,
    initOptions: any, // ZcashInitOptions,
    opts: any, // EdgeCurrencyEngineOptions
    makeSynchronizer: any
  ) {
    super(currencyPlugin, walletInfo, opts)
    this.makeSynchronizer = makeSynchronizer
    this.initializer = {
      fullViewingKey: this.walletInfo.keys.zcashViewKey,
      birthdayHeight: 968000, // TODO: Need to update default
      alias: 'user5_account01' // TODO: Need to update default
    }
  }

  async startEngine() {
    this.synchronizer = await this.makeSynchronizer(this.initializer)
    await this.synchronizer.start()
    super.startEngine()
  }

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

  async loadEngine(
    plugin: EdgeCurrencyTools,
    walletInfo: EdgeWalletInfo,
    opts: EdgeCurrencyEngineOptions
  ): Promise<void> {
    await super.loadEngine(plugin, walletInfo, opts)
    this.engineOn = true
    if (typeof this.walletInfo.keys.ownerPublicKey !== 'string') {
      if (walletInfo.keys.ownerPublicKey) {
        this.walletInfo.keys.ownerPublicKey = walletInfo.keys.ownerPublicKey
      } else {
        const pubKeys = await plugin.derivePublicKey(this.walletInfo)
        this.walletInfo.keys.ownerPublicKey = pubKeys.ownerPublicKey
        this.walletInfo.keys.zcashViewKey = pubKeys.zcashViewKey
      }
    }
  }
}

export { CurrencyEngine }
