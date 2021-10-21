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
import type {
  ZcashInitializerConfig,
  ZcashOtherData,
  ZcashSettings,
  ZcashSpendInfo,
  ZcashSynchronizer,
  ZcashSynchronizerStatus,
  ZcashTransaction,
  ZcashUpdateEvent
} from './zecTypes'

const NETWORK_FEE = '1000' // hardcoded default ZEC fee

export class ZcashEngine extends CurrencyEngine {
  otherData: ZcashOtherData
  synchronizer: ZcashSynchronizer
  synchronizerStatus: ZcashSynchronizerStatus
  availableZatoshi: string
  initialNumBlocksToDownload: number
  initializer: ZcashInitializerConfig
  alias: string
  makeSynchronizer: (
    config: ZcashInitializerConfig
  ) => Promise<ZcashSynchronizer>

  constructor(
    currencyPlugin: ZcashPlugin,
    walletInfo: EdgeWalletInfo,
    opts: EdgeCurrencyEngineOptions,
    makeSynchronizer: any
  ) {
    super(currencyPlugin, walletInfo, opts)
    this.makeSynchronizer = makeSynchronizer
  }

  initData() {
    const { birthdayHeight, alias } = this.initializer

    // walletLocalData
    if (this.otherData.blockRange == null) {
      this.otherData.blockRange = {
        first: birthdayHeight,
        last: birthdayHeight
      }
    }

    // Engine variables
    this.alias = alias
    this.initialNumBlocksToDownload = -1
    this.synchronizerStatus = 'DISCONNECTED'
    this.availableZatoshi = '0'
  }

  initSubscriptions() {
    this.synchronizer.on('update', payload => {
      this.onUpdate(payload)
    })
    this.synchronizer.on('statusChanged', payload => {
      this.synchronizerStatus = payload.name
    })
  }

  async startEngine() {
    this.initData()
    this.synchronizer = await this.makeSynchronizer(this.initializer)
    await this.synchronizer.start()
    this.initSubscriptions()
    super.startEngine()
  }

  isSynced() {
    // Synchroniser status is updated regularly and should be checked before accessing the db to avoid errors
    return this.synchronizerStatus === 'SYNCED'
  }

  async onUpdate(update: ZcashUpdateEvent) {
    try {
      const { lastDownloadedHeight, scanProgress, networkBlockHeight } = update

      if (this.walletLocalData.blockHeight !== networkBlockHeight) {
        this.walletLocalData.blockHeight = networkBlockHeight
        this.walletLocalDataDirty = true
        this.currencyEngineCallbacks.onBlockHeightChanged(
          this.walletLocalData.blockHeight
        )
      }

      if (!this.addressesChecked && !this.isSynced()) {
        // Sync status is split up between downloading blocks (40%), scanning blocks (49.5%),
        // getting balance (0.5%), and querying transactions (10%).
        this.tokenCheckBalanceStatus.ZEC = (scanProgress * 0.99) / 100

        let downloadProgress = 0
        if (lastDownloadedHeight > 0) {
          // Initial lastDownloadedHeight value is -1
          const currentNumBlocksToDownload =
            networkBlockHeight - lastDownloadedHeight
          if (this.initialNumBlocksToDownload < 0) {
            this.initialNumBlocksToDownload = currentNumBlocksToDownload
          }

          downloadProgress =
            currentNumBlocksToDownload === 0
              ? 1
              : 1 - currentNumBlocksToDownload / this.initialNumBlocksToDownload
        }
        this.tokenCheckTransactionsStatus.ZEC = downloadProgress * 0.8
      }

      await this.queryBalance()
      await this.queryTransactions()

      if (this.transactionsChangedArray.length > 0) {
        this.currencyEngineCallbacks.onTransactionsChanged(
          this.transactionsChangedArray
        )
        this.transactionsChangedArray = []
      }

      this.updateOnAddressesChecked()
    } catch (e) {
      this.log.error(`Error onUpdate ${e?.message ?? ''}`)
    }
  }

  async queryBalance() {
    if (!this.isSynced()) return
    try {
      const balances = await this.synchronizer.getShieldedBalance()
      if (balances.totalZatoshi === '-1') return
      this.availableZatoshi = balances.availableZatoshi
      this.updateBalance('ZEC', balances.totalZatoshi)
    } catch (e) {
      this.log.warn('Failed to update balances', e?.message ?? '')
      this.updateBalance('ZEC', '0')
    }
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
  }

  async queryTransactions() {
    try {
      let first = this.otherData.blockRange.first
      let last = this.otherData.blockRange.last
      while (this.isSynced() && last <= this.walletLocalData.blockHeight) {
        const transactions = await this.synchronizer.getTransactions({
          first,
          last
        })

        transactions.forEach(tx => this.processZcashTransaction(tx))

        if (last === this.walletLocalData.blockHeight) {
          first = this.walletLocalData.blockHeight
          this.walletLocalDataDirty = true
          this.tokenCheckTransactionsStatus.ZEC = 1
          break
        }

        first = last + 1
        last =
          last +
            this.currencyInfo.defaultSettings.otherSettings
              .transactionQueryLimit <
          this.walletLocalData.blockHeight
            ? last +
              this.currencyInfo.defaultSettings.otherSettings
                .transactionQueryLimit
            : this.walletLocalData.blockHeight

        this.otherData.blockRange = {
          first,
          last
        }
        this.walletLocalDataDirty = true
      }
    } catch (e) {
      this.log.error(`Error querying ZEC transactions ${e?.message ?? ''}`)
    }
  }

  processZcashTransaction(tx: ZcashTransaction) {
    let netNativeAmount = tx.value
    const ourReceiveAddresses = []
    if (tx.toAddress != null) {
      // check if tx is a spend
      netNativeAmount = `-${bns.add(netNativeAmount, NETWORK_FEE)}`
    } else {
      ourReceiveAddresses.push(this.walletInfo.keys.publicKey)
    }

    const edgeTransaction: EdgeTransaction = {
      txid: tx.rawTransactionId,
      date: tx.blockTimeInSeconds,
      currencyCode: 'ZEC',
      blockHeight: tx.minedHeight,
      nativeAmount: netNativeAmount,
      networkFee: NETWORK_FEE,
      ourReceiveAddresses, // blank if you sent money otherwise array of addresses that are yours in this transaction
      signedTx: '',
      otherParams: {}
    }
    this.addTransaction('ZEC', edgeTransaction)
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
