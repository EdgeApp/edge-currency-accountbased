// @flow

import { bns } from 'biggystring'
import {
  type EdgeCurrencyEngineOptions,
  type EdgeCurrencyTools,
  type EdgeSpendInfo,
  type EdgeTransaction,
  type EdgeWalletInfo,
  InsufficientFundsError,
  NoAmountSpecifiedError
} from 'edge-core-js/types'

import { CurrencyEngine } from '../common/engine.js'
import { cleanTxLogs } from './../common/utils.js'
import { ZcashPlugin } from './zecPlugin.js'
import type {
  ZcashInitializerConfig,
  ZcashOtherData,
  ZcashSettings,
  ZcashSpendInfo,
  ZcashSynchronizer,
  ZcashSynchronizerStatus,
  ZcashTransaction
} from './zecTypes'

export class ZcashEngine extends CurrencyEngine {
  pluginId: string
  otherData: ZcashOtherData
  synchronizer: ZcashSynchronizer
  synchronizerStatus: ZcashSynchronizerStatus
  availableZatoshi: string
  initialNumBlocksToDownload: number
  initializer: ZcashInitializerConfig
  alias: string
  progressRatio: number
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
    this.pluginId = currencyPlugin.pluginId
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
    this.progressRatio = 0
  }

  initSubscriptions() {
    this.synchronizer.on('update', async payload => {
      const { lastDownloadedHeight, scanProgress, networkBlockHeight } = payload
      this.onUpdateBlockHeight(networkBlockHeight)
      this.onUpdateProgress(
        lastDownloadedHeight,
        scanProgress,
        networkBlockHeight
      )
      await this.queryAll()
    })
    this.synchronizer.on('statusChanged', async payload => {
      this.synchronizerStatus = payload.name
      await this.queryAll()
    })
  }

  async queryAll() {
    await this.queryBalance()
    await this.queryTransactions()
    this.onUpdateTransactions()
  }

  onUpdateBlockHeight(networkBlockHeight: number) {
    if (this.walletLocalData.blockHeight !== networkBlockHeight) {
      this.walletLocalData.blockHeight = networkBlockHeight
      this.walletLocalDataDirty = true
      this.currencyEngineCallbacks.onBlockHeightChanged(
        this.walletLocalData.blockHeight
      )
    }
  }

  onUpdateTransactions() {
    if (this.transactionsChangedArray.length > 0) {
      this.currencyEngineCallbacks.onTransactionsChanged(
        this.transactionsChangedArray
      )
      this.transactionsChangedArray = []
    }
  }

  onUpdateProgress(
    lastDownloadedHeight: number,
    scanProgress: number,
    networkBlockHeight: number
  ) {
    if (!this.addressesChecked && !this.isSynced()) {
      // Sync status is split up between downloading blocks (40%), scanning blocks (49.5%),
      // getting balance (0.5%), and querying transactions (10%).
      this.tokenCheckBalanceStatus[this.currencyInfo.currencyCode] =
        (scanProgress * 0.99) / 100

      let downloadProgress = 0
      if (lastDownloadedHeight > 0) {
        // Initial lastDownloadedHeight value is -1
        const currentNumBlocksToDownload =
          networkBlockHeight - lastDownloadedHeight
        if (this.initialNumBlocksToDownload < 0) {
          this.initialNumBlocksToDownload = currentNumBlocksToDownload
        }

        downloadProgress =
          currentNumBlocksToDownload === 0 ||
          this.initialNumBlocksToDownload === 0
            ? 1
            : 1 - currentNumBlocksToDownload / this.initialNumBlocksToDownload
      }
      this.tokenCheckTransactionsStatus[this.currencyInfo.currencyCode] =
        downloadProgress * 0.8

      const percent =
        this.tokenCheckTransactionsStatus[this.currencyInfo.currencyCode] +
        this.tokenCheckBalanceStatus[this.currencyInfo.currencyCode]
      if (percent !== this.progressRatio) {
        if (Math.abs(percent - this.progressRatio) > 0.25 || percent === 1) {
          this.progressRatio = percent
          this.updateOnAddressesChecked()
        }
      }
    }
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

  async queryBalance() {
    if (!this.isSynced()) return
    try {
      const balances = await this.synchronizer.getShieldedBalance()
      if (balances.totalZatoshi === '-1') return
      this.availableZatoshi = balances.availableZatoshi
      this.updateBalance(
        `${this.currencyInfo.currencyCode}`,
        balances.totalZatoshi
      )
    } catch (e) {
      this.log.warn('Failed to update balances', e)
      this.updateBalance(`${this.currencyInfo.currencyCode}`, '0')
    }
  }

  updateBalance(tk: string, balance: string) {
    if (this.walletLocalData.totalBalances[tk] == null) {
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

  async queryTransactions() {
    try {
      let first = this.otherData.blockRange.first
      let last = this.otherData.blockRange.last
      while (this.isSynced() && last <= this.walletLocalData.blockHeight) {
        const transactions = await this.synchronizer.getTransactions({
          first,
          last
        })

        transactions.forEach(tx => this.processTransaction(tx))

        if (last === this.walletLocalData.blockHeight) {
          first = this.walletLocalData.blockHeight
          this.walletLocalDataDirty = true
          this.tokenCheckTransactionsStatus[this.currencyInfo.currencyCode] = 1
          this.updateOnAddressesChecked()
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
      this.log.error(
        `Error querying ${this.currencyInfo.currencyCode} transactions `,
        e
      )
    }
  }

  processTransaction(tx: ZcashTransaction) {
    let netNativeAmount = tx.value
    const ourReceiveAddresses = []
    if (tx.toAddress != null) {
      // check if tx is a spend
      netNativeAmount = `-${bns.add(
        netNativeAmount,
        this.currencyInfo.defaultSettings.otherSettings.defaultNetworkFee
      )}`
    } else {
      ourReceiveAddresses.push(this.walletInfo.keys.publicKey)
    }

    const edgeTransaction: EdgeTransaction = {
      txid: tx.rawTransactionId,
      date: tx.blockTimeInSeconds,
      currencyCode: `${this.currencyInfo.currencyCode}`,
      blockHeight: tx.minedHeight,
      nativeAmount: netNativeAmount,
      networkFee:
        this.currencyInfo.defaultSettings.otherSettings.defaultNetworkFee,
      ourReceiveAddresses, // blank if you sent money otherwise array of addresses that are yours in this transaction
      signedTx: '',
      otherParams: {}
    }
    this.addTransaction(`${this.currencyInfo.currencyCode}`, edgeTransaction)
  }

  async killEngine() {
    await this.synchronizer.stop()
    await super.killEngine()
  }

  async clearBlockchainCache(): Promise<void> {
    await super.clearBlockchainCache()
  }

  async resyncBlockchain(): Promise<void> {
    // Don't bother stopping and restarting the synchronizer for a resync
    await super.killEngine()
    await this.clearBlockchainCache()
    await this.startEngine()
    this.synchronizer.rescan(
      this.walletInfo.keys[`${this.pluginId}BirthdayHeight`] ??
        this.currencyInfo.defaultSettings.otherSettings.defaultBirthday
    )
  }

  async makeSpend(edgeSpendInfoIn: EdgeSpendInfo) {
    const { edgeSpendInfo, currencyCode } = super.makeSpend(edgeSpendInfoIn)

    let nativeAmount = '0'
    if (typeof edgeSpendInfo.spendTargets[0].nativeAmount === 'string') {
      nativeAmount = edgeSpendInfo.spendTargets[0].nativeAmount
    } else {
      throw new NoAmountSpecifiedError()
    }

    if (bns.eq(nativeAmount, '0')) throw new NoAmountSpecifiedError()

    const totalTxAmount = bns.add(
      nativeAmount,
      this.currencyInfo.defaultSettings.otherSettings.defaultNetworkFee
    )

    if (
      bns.gt(
        totalTxAmount,
        this.walletLocalData.totalBalances[this.currencyInfo.currencyCode]
      )
    ) {
      throw new InsufficientFundsError()
    }

    if (bns.gt(totalTxAmount, this.availableZatoshi)) {
      throw new InsufficientFundsError('Amount exceeds available balance')
    }

    // **********************************
    // Create the unsigned EdgeTransaction

    const edgeTransaction: EdgeTransaction = {
      txid: '', // txid
      date: 0, // date
      currencyCode, // currencyCode
      blockHeight: 0, // blockHeight
      nativeAmount: `-${totalTxAmount}`, // nativeAmount
      networkFee:
        this.currencyInfo.defaultSettings.otherSettings.defaultNetworkFee, // networkFee
      ourReceiveAddresses: [], // ourReceiveAddresses
      signedTx: '', // signedTx
      spendTargets: edgeSpendInfo.spendTargets
    }

    return edgeTransaction
  }

  async signTx(edgeTransaction: EdgeTransaction): Promise<EdgeTransaction> {
    // Transaction is signed and broadcast at the same time
    return edgeTransaction
  }

  async broadcastTx(
    edgeTransaction: EdgeTransaction
  ): Promise<EdgeTransaction> {
    if (
      edgeTransaction.spendTargets == null ||
      edgeTransaction.spendTargets.length !== 1
    )
      throw new Error('Invalid spend targets')

    const spendTarget = edgeTransaction.spendTargets[0]
    const txParams: ZcashSpendInfo = {
      zatoshi: bns.abs(edgeTransaction.nativeAmount),
      toAddress: spendTarget.publicAddress,
      memo: spendTarget.uniqueIdentifier ?? '',
      fromAccountIndex: 0,
      spendingKey: this.walletInfo.keys[`${this.pluginId}SpendKey`]
    }

    try {
      const signedTx = await this.synchronizer.sendToAddress(txParams)
      edgeTransaction.txid = signedTx.txId
      edgeTransaction.signedTx = signedTx.raw
      edgeTransaction.date = Date.now() / 1000
      this.log.warn(`SUCCESS broadcastTx\n${cleanTxLogs(edgeTransaction)}`)
    } catch (e) {
      this.log.warn('FAILURE broadcastTx failed: ', e)
      throw e
    }
    return edgeTransaction
  }

  getDisplayPrivateSeed() {
    if (
      this.walletInfo.keys &&
      this.walletInfo.keys[`${this.pluginId}Mnemonic`]
    ) {
      return this.walletInfo.keys[`${this.pluginId}Mnemonic`]
    }
    return ''
  }

  getDisplayPublicSeed() {
    if (this.walletInfo.keys && this.walletInfo.keys.publicKey) {
      return this.walletInfo.keys.unifiedViewingKeys.extfvk
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

    if (
      this.walletInfo.keys.publicKey != null ||
      this.walletInfo.keys.unifiedViewingKeys != null
    ) {
      const pubKeys = await plugin.derivePublicKey(this.walletInfo)
      this.walletInfo.keys.publicKey = pubKeys.publicKey
      this.walletInfo.keys[`${this.pluginId}ViewKeys`] =
        pubKeys.unifiedViewingKeys
    }
    const { rpcNode, defaultBirthday }: ZcashSettings =
      this.currencyInfo.defaultSettings.otherSettings
    this.initializer = {
      fullViewingKey: this.walletInfo.keys[`${this.pluginId}ViewKeys`],
      birthdayHeight:
        this.walletInfo.keys[`${this.pluginId}BirthdayHeight`] ??
        defaultBirthday,
      alias: this.walletInfo.keys.publicKey,
      ...rpcNode
    }
  }
}

export { CurrencyEngine }
