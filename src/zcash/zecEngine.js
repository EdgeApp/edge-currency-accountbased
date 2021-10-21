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
import {
  type UnifiedViewingKey,
  type ZcashSpendInfo,
  asZcashSpendInfo
} from './zecTypes'

const ACCOUNT_POLL_MILLISECONDS = 20000
const DEFAULT_BIRTHDAY = 1310000

export class ZcashEngine extends CurrencyEngine {
  zcashPlugin: ZcashPlugin
  synchronizer: ZcashSynchronizer
  makeSynchronizer: (arg: any) => Promise<ZcashSynchronizer>
  initializer: {
    fullViewingKey: UnifiedViewingKey,
    birthdayHeight: number,
    alias: string
  }

  constructor(
    currencyPlugin: ZcashPlugin,
    walletInfo: EdgeWalletInfo,
    opts: EdgeCurrencyEngineOptions,
    makeSynchronizer: any
  ) {
    super(currencyPlugin, walletInfo, opts)
    this.makeSynchronizer = makeSynchronizer
  }

  async startEngine() {
    this.synchronizer = await this.makeSynchronizer(this.initializer)
    await this.synchronizer.start()
    this.addToLoop('checkAccountInnerLoop', ACCOUNT_POLL_MILLISECONDS)
    super.startEngine()
  }

  updateBalance(tk: string, balance: string) {
    if (typeof this.walletLocalData.totalBalances[tk] === 'undefined') {
      this.walletLocalData.totalBalances[tk] = '0'
    }
    if (!bns.eq(balance, this.walletLocalData.totalBalances[tk])) {
      this.walletLocalData.totalBalances[tk] = balance
      this.log.warn(tk + ': token Address balance: ' + balance)
      this.currencyEngineCallbacks.onBalanceChanged(tk, balance)
    }
    this.tokenCheckBalanceStatus[tk] = 1
    this.updateOnAddressesChecked()
  }

  async checkAccountInnerLoop() {
    try {
      const balances = await this.synchronizer.getShieldedBalance()
      if (balances.totalZatoshi === -1) return
      this.updateBalance('ZEC', balances.totalZatoshi)
    } catch (e) {
      this.updateBalance('ZEC', '0')
      this.log.error(`Error checking ZEC address balance ${e.message}`)
    }
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

    const pubKeys = await plugin.derivePublicKey(this.walletInfo)
    this.walletInfo.keys.publicKey = pubKeys.publicKey
    this.walletInfo.keys.zcashViewKeys = pubKeys.unifiedViewingKeys
    const { rpcNode, defaultBirthday }: ZcashSettings =
      this.currencyInfo.defaultSettings.otherSettings
    this.initializer = {
      fullViewingKey: this.walletInfo.keys.zcashViewKeys,
      birthdayHeight:
        this.walletInfo.keys.zcashBirthdayHeight ?? defaultBirthday,
      alias: this.walletInfo.keys.publicKey,
      ...rpcNode
    }
  }
}

export { CurrencyEngine }
