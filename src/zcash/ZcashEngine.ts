import { abs, add, eq, gt, lte, mul, sub } from 'biggystring'
import {
  EdgeCurrencyEngine,
  EdgeCurrencyEngineOptions,
  EdgeEnginePrivateKeyOptions,
  EdgeFreshAddress,
  EdgeMemo,
  EdgeSpendInfo,
  EdgeTransaction,
  EdgeWalletInfo,
  InsufficientFundsError,
  NoAmountSpecifiedError
} from 'edge-core-js/types'

import { CurrencyEngine } from '../common/CurrencyEngine'
import { PluginEnvironment } from '../common/innerPlugin'
import { upgradeMemos } from '../common/upgradeMemos'
import { cleanTxLogs } from '../common/utils'
import { ZcashTools } from './ZcashTools'
import {
  asSafeZcashWalletInfo,
  asZcashPrivateKeys,
  asZcashWalletOtherData,
  SafeZcashWalletInfo,
  ZcashInitializerConfig,
  ZcashNetworkInfo,
  ZcashSpendInfo,
  ZcashSynchronizer,
  ZcashSynchronizerStatus,
  ZcashTransaction,
  ZcashWalletOtherData
} from './zcashTypes'

export class ZcashEngine extends CurrencyEngine<
  ZcashTools,
  SafeZcashWalletInfo
> {
  pluginId: string
  networkInfo: ZcashNetworkInfo
  otherData!: ZcashWalletOtherData
  synchronizerStatus!: ZcashSynchronizerStatus
  availableZatoshi!: string
  initialNumBlocksToDownload!: number
  initializer!: ZcashInitializerConfig
  progressRatio!: number
  queryMutex: boolean
  makeSynchronizer: (
    config: ZcashInitializerConfig
  ) => Promise<ZcashSynchronizer>

  // Synchronizer management
  started: boolean
  stopSyncing?: (value: number | PromiseLike<number>) => void
  synchronizer?: ZcashSynchronizer

  constructor(
    env: PluginEnvironment<ZcashNetworkInfo>,
    tools: ZcashTools,
    walletInfo: SafeZcashWalletInfo,
    opts: EdgeCurrencyEngineOptions,
    makeSynchronizer: any
  ) {
    super(env, tools, walletInfo, opts)
    const { networkInfo } = env
    this.pluginId = this.currencyInfo.pluginId
    this.networkInfo = networkInfo
    this.makeSynchronizer = makeSynchronizer
    this.queryMutex = false

    this.started = false
  }

  setOtherData(raw: any): void {
    this.otherData = asZcashWalletOtherData(raw)
  }

  initData(): void {
    const { birthdayHeight } = this.initializer

    // walletLocalData
    if (this.otherData.blockRange.first === 0) {
      this.otherData.blockRange = {
        first: birthdayHeight,
        last: birthdayHeight
      }
    }

    // Engine variables
    this.initialNumBlocksToDownload = -1
    this.synchronizerStatus = 'DISCONNECTED'
    this.availableZatoshi = '0'
    this.progressRatio = 0
  }

  initSubscriptions(): void {
    if (this.synchronizer == null) return
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

  async queryAll(): Promise<void> {
    if (this.queryMutex) return
    this.queryMutex = true
    try {
      await this.queryBalance()
      await this.queryTransactions()
      this.onUpdateTransactions()
    } catch (e: any) {}
    this.queryMutex = false
  }

  onUpdateBlockHeight(networkBlockHeight: number): void {
    if (this.walletLocalData.blockHeight !== networkBlockHeight) {
      this.walletLocalData.blockHeight = networkBlockHeight
      this.walletLocalDataDirty = true
      this.currencyEngineCallbacks.onBlockHeightChanged(
        this.walletLocalData.blockHeight
      )
    }
  }

  onUpdateTransactions(): void {
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
  ): void {
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
        (this.tokenCheckTransactionsStatus[this.currencyInfo.currencyCode] +
          this.tokenCheckBalanceStatus[this.currencyInfo.currencyCode]) /
        2
      if (percent !== this.progressRatio) {
        if (Math.abs(percent - this.progressRatio) > 0.1 || percent === 1) {
          this.progressRatio = percent
          this.updateOnAddressesChecked()
        }
      }
    }
  }

  async startEngine(): Promise<void> {
    this.engineOn = true
    this.started = true
    await super.startEngine()
  }

  isSynced(): boolean {
    // Synchronizer status is updated regularly and should be checked before accessing the db to avoid errors
    return this.synchronizerStatus === 'SYNCED'
  }

  async queryBalance(): Promise<void> {
    if (!this.isSynced() || this.synchronizer == null) return
    try {
      const balances = await this.synchronizer.getBalance()
      if (balances.totalZatoshi === '-1') return
      this.availableZatoshi = balances.availableZatoshi
      this.updateBalance(this.currencyInfo.currencyCode, balances.totalZatoshi)
    } catch (e: any) {
      this.warn('Failed to update balances', e)
      this.updateBalance(this.currencyInfo.currencyCode, '0')
    }
  }

  async queryTransactions(): Promise<void> {
    if (this.synchronizer == null) return
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
          last + this.networkInfo.transactionQueryLimit <
          this.walletLocalData.blockHeight
            ? last + this.networkInfo.transactionQueryLimit
            : this.walletLocalData.blockHeight

        this.otherData.blockRange = {
          first,
          last
        }
        this.walletLocalDataDirty = true
      }
    } catch (e: any) {
      this.error(
        `Error querying ${this.currencyInfo.currencyCode} transactions `,
        e
      )
    }
  }

  processTransaction(tx: ZcashTransaction): void {
    let netNativeAmount = tx.value
    const ourReceiveAddresses = []
    if (tx.toAddress != null) {
      // check if tx is a spend
      netNativeAmount = `-${add(
        netNativeAmount,
        this.networkInfo.defaultNetworkFee
      )}`
    } else {
      ourReceiveAddresses.push(this.walletInfo.keys.publicKey)
    }

    const memos: EdgeMemo[] = []
    if (tx.memo != null) {
      memos.push({
        type: 'text',
        value: tx.memo
      })
    }

    const edgeTransaction: EdgeTransaction = {
      blockHeight: tx.minedHeight,
      currencyCode: this.currencyInfo.currencyCode,
      date: tx.blockTimeInSeconds,
      isSend: netNativeAmount.startsWith('-'),
      memos,
      nativeAmount: netNativeAmount,
      networkFee: this.networkInfo.defaultNetworkFee,
      otherParams: {},
      ourReceiveAddresses, // blank if you sent money otherwise array of addresses that are yours in this transaction
      signedTx: '',
      txid: tx.rawTransactionId,
      walletId: this.walletId
    }
    this.addTransaction(this.currencyInfo.currencyCode, edgeTransaction)
  }

  async syncNetwork(opts: EdgeEnginePrivateKeyOptions): Promise<number> {
    if (!this.started) return 1000

    const zcashPrivateKeys = asZcashPrivateKeys(this.currencyInfo.pluginId)(
      opts?.privateKeys
    )

    const { rpcNode } = this.networkInfo
    this.initializer = {
      mnemonicSeed: zcashPrivateKeys.mnemonic,
      birthdayHeight: zcashPrivateKeys.birthdayHeight,
      alias: this.walletInfo.keys.publicKey.slice(0, 99),
      ...rpcNode
    }

    this.synchronizer = await this.makeSynchronizer(this.initializer)
    this.initData()
    this.initSubscriptions()

    return await new Promise(resolve => {
      this.stopSyncing = resolve
    })
  }

  async killEngine(): Promise<void> {
    this.started = false
    if (this.stopSyncing != null) {
      await this.stopSyncing(1000)
      this.stopSyncing = undefined
    }
    await this.synchronizer?.stop()
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
    this.synchronizer
      ?.rescan()
      .catch((e: any) => this.warn('resyncBlockchain failed: ', e))
    this.initData()
    this.synchronizerStatus = 'SYNCING'
  }

  async getMaxSpendable(): Promise<string> {
    const spendableBalance = sub(
      this.availableZatoshi,
      this.networkInfo.defaultNetworkFee
    )
    if (lte(spendableBalance, '0')) throw new InsufficientFundsError()

    return spendableBalance
  }

  async makeSpend(edgeSpendInfoIn: EdgeSpendInfo): Promise<EdgeTransaction> {
    edgeSpendInfoIn = upgradeMemos(edgeSpendInfoIn, this.currencyInfo)
    if (!this.isSynced()) throw new Error('Cannot spend until wallet is synced')
    const { edgeSpendInfo, currencyCode } = this.makeSpendCheck(edgeSpendInfoIn)
    const { memos = [] } = edgeSpendInfo
    const spendTarget = edgeSpendInfo.spendTargets[0]
    const { publicAddress, nativeAmount } = spendTarget

    if (publicAddress == null)
      throw new Error('makeSpend Missing publicAddress')
    if (nativeAmount == null) throw new NoAmountSpecifiedError()

    if (eq(nativeAmount, '0')) throw new NoAmountSpecifiedError()

    const totalTxAmount = add(nativeAmount, this.networkInfo.defaultNetworkFee)

    if (
      gt(
        totalTxAmount,
        this.walletLocalData.totalBalances[this.currencyInfo.currencyCode] ??
          '0'
      )
    ) {
      throw new InsufficientFundsError()
    }

    if (gt(totalTxAmount, this.availableZatoshi)) {
      throw new InsufficientFundsError('Amount exceeds available balance')
    }

    // **********************************
    // Create the unsigned EdgeTransaction

    const txNativeAmount = mul(totalTxAmount, '-1')

    const edgeTransaction: EdgeTransaction = {
      blockHeight: 0,
      currencyCode,
      date: 0,
      isSend: true,
      memos,
      nativeAmount: txNativeAmount,
      networkFee: this.networkInfo.defaultNetworkFee,
      ourReceiveAddresses: [],
      signedTx: '',
      txid: '',
      walletId: this.walletId
    }

    return edgeTransaction
  }

  async signTx(edgeTransaction: EdgeTransaction): Promise<EdgeTransaction> {
    // Transaction is signed and broadcast at the same time
    return edgeTransaction
  }

  async broadcastTx(
    edgeTransaction: EdgeTransaction,
    opts?: EdgeEnginePrivateKeyOptions
  ): Promise<EdgeTransaction> {
    if (this.synchronizer == null) throw new Error('Synchronizer undefined')
    const { memos } = edgeTransaction
    const zcashPrivateKeys = asZcashPrivateKeys(this.pluginId)(
      opts?.privateKeys
    )
    if (
      edgeTransaction.spendTargets == null ||
      edgeTransaction.spendTargets.length !== 1
    )
      throw new Error('Invalid spend targets')

    const memo = memos[0]?.type === 'text' ? memos[0].value : ''
    const spendTarget = edgeTransaction.spendTargets[0]
    const txParams: ZcashSpendInfo = {
      zatoshi: sub(
        abs(edgeTransaction.nativeAmount),
        edgeTransaction.networkFee
      ),
      toAddress: spendTarget.publicAddress,
      memo,
      fromAccountIndex: 0,
      mnemonicSeed: zcashPrivateKeys.mnemonic
    }

    try {
      const signedTx = await this.synchronizer.sendToAddress(txParams)
      edgeTransaction.txid = signedTx.txId
      edgeTransaction.signedTx = signedTx.raw
      edgeTransaction.date = Date.now() / 1000
      this.warn(`SUCCESS broadcastTx\n${cleanTxLogs(edgeTransaction)}`)
    } catch (e: any) {
      this.warn('FAILURE broadcastTx failed: ', e)
      throw e
    }
    return edgeTransaction
  }

  async getFreshAddress(): Promise<EdgeFreshAddress> {
    if (this.synchronizer == null) throw new Error('Synchronizer undefined')
    const unifiedAddress = await this.synchronizer.deriveUnifiedAddress()
    return {
      publicAddress: unifiedAddress
    }
  }
}

export async function makeCurrencyEngine(
  env: PluginEnvironment<ZcashNetworkInfo>,
  tools: ZcashTools,
  walletInfo: EdgeWalletInfo,
  opts: EdgeCurrencyEngineOptions
): Promise<EdgeCurrencyEngine> {
  const safeWalletInfo = asSafeZcashWalletInfo(walletInfo)
  const { makeSynchronizer } = env.nativeIo['edge-currency-accountbased'].zcash

  const engine = new ZcashEngine(
    env,
    tools,
    safeWalletInfo,
    opts,
    makeSynchronizer
  )

  // Do any async initialization necessary for the engine
  await engine.loadEngine()

  return engine
}
