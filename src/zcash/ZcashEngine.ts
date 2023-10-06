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
import { base16, base64 } from 'rfc4648'

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
  initializer!: ZcashInitializerConfig
  progressRatio!: {
    percent: number
    lastUpdate: number
  }

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

    this.started = false
  }

  setOtherData(raw: any): void {
    this.otherData = asZcashWalletOtherData(raw)
  }

  initData(): void {
    // walletLocalData
    this.otherData.isSdkInitializedOnDisk = true
    this.walletLocalDataDirty = true

    // Engine variables
    this.synchronizerStatus = 'DISCONNECTED'
    this.availableZatoshi = '0'
    this.progressRatio = {
      percent: 0,
      lastUpdate: 0
    }
  }

  initSubscriptions(): void {
    if (this.synchronizer == null) return
    this.synchronizer.on('update', async payload => {
      const { scanProgress, networkBlockHeight } = payload
      this.onUpdateBlockHeight(networkBlockHeight)
      this.onUpdateProgress(scanProgress)
    })
    this.synchronizer.on('statusChanged', async payload => {
      this.synchronizerStatus = payload.name
    })
    this.synchronizer.on('balanceChanged', async payload => {
      if (payload.totalZatoshi === '-1') return
      this.availableZatoshi = payload.availableZatoshi
      this.updateBalance(this.currencyInfo.currencyCode, payload.totalZatoshi)
    })
    this.synchronizer.on('transactionsChanged', async payload => {
      const { transactions } = payload
      transactions.forEach(tx => {
        this.processTransaction(tx)
      })
      this.onUpdateTransactions()
    })
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

  onUpdateProgress(scanProgress: number): void {
    if (!this.addressesChecked && !this.isSynced()) {
      // Balance and transaction querying is handled during the sync therefore we can treat them the same.

      this.tokenCheckBalanceStatus[this.currencyInfo.currencyCode] =
        scanProgress / 100
      this.tokenCheckTransactionsStatus[this.currencyInfo.currencyCode] =
        scanProgress / 100

      if (
        scanProgress > this.progressRatio.percent &&
        Date.now() - this.progressRatio.lastUpdate > 1000 // throttle updates to one second
      ) {
        this.progressRatio.percent = scanProgress
        this.progressRatio.lastUpdate = Date.now()
        this.log.warn(
          `Scan and download progress: ${Math.floor(scanProgress)}%`
        )
        this.updateOnAddressesChecked()
      }
    }
  }

  // super.updateBalance calls updateOnAddressesChecked() but we want to limit that method to onUpdateProgress
  updateBalance(tk: string, balance: string): void {
    const currentBalance = this.walletLocalData.totalBalances[tk]
    if (this.walletLocalData.totalBalances[tk] == null) {
      this.walletLocalData.totalBalances[tk] = '0'
    }
    if (currentBalance == null || !eq(balance, currentBalance)) {
      this.walletLocalData.totalBalances[tk] = balance
      this.walletLocalDataDirty = true
      this.warn(`${tk}: token Address balance: ${balance}`)
      this.currencyEngineCallbacks.onBalanceChanged(tk, balance)
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

  processTransaction(tx: ZcashTransaction): void {
    let netNativeAmount = tx.value
    const networkFee = tx.fee ?? this.networkInfo.defaultNetworkFee
    if (tx.toAddress != null) {
      // check if tx is a spend
      netNativeAmount = `-${add(netNativeAmount, networkFee)}`
    }

    const edgeMemos: EdgeMemo[] = tx.memos
      .filter(text => text !== '')
      .map(text => ({
        memoName: 'memo',
        type: 'text',
        value: text
      }))

    const edgeTransaction: EdgeTransaction = {
      blockHeight: tx.minedHeight,
      currencyCode: this.currencyInfo.currencyCode,
      date: tx.blockTimeInSeconds,
      isSend: netNativeAmount.startsWith('-'),
      memos: edgeMemos,
      nativeAmount: netNativeAmount,
      networkFee,
      otherParams: {},
      ourReceiveAddresses: [], // Not accessible from SDK and unified addresses are deterministic
      signedTx: tx.raw ?? '',
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
      alias: base16.stringify(base64.parse(this.walletId)),
      newWallet: !this.otherData.isSdkInitializedOnDisk,
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
      publicAddress: unifiedAddress.saplingAddress
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
