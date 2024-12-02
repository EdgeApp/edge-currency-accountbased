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
import type {
  ConfirmedTransaction,
  InitializerConfig,
  SpendInfo,
  StatusEvent
} from 'react-native-piratechain'
import { base16, base64 } from 'rfc4648'

import { CurrencyEngine } from '../common/CurrencyEngine'
import { PluginEnvironment } from '../common/innerPlugin'
import { cleanTxLogs } from '../common/utils'
import { PiratechainTools } from './PiratechainTools'
import {
  asPiratechainPrivateKeys,
  asPiratechainWalletOtherData,
  asSafePiratechainWalletInfo,
  PiratechainNetworkInfo,
  PiratechainSynchronizer,
  PiratechainWalletOtherData,
  SafePiratechainWalletInfo
} from './piratechainTypes'

export class PiratechainEngine extends CurrencyEngine<
  PiratechainTools,
  SafePiratechainWalletInfo
> {
  pluginId: string
  networkInfo: PiratechainNetworkInfo
  otherData!: PiratechainWalletOtherData
  synchronizerStatus!: StatusEvent['name']
  availableZatoshi!: string
  initialNumBlocksToDownload!: number
  birthdayHeight: number
  progressRatio!: number
  queryMutex: boolean
  makeSynchronizer: (
    config: InitializerConfig
  ) => Promise<PiratechainSynchronizer>

  // Synchronizer management
  started: boolean
  stopSyncing?: (value: number | PromiseLike<number>) => void
  synchronizer?: PiratechainSynchronizer
  synchronizerPromise: Promise<PiratechainSynchronizer>
  synchronizerResolver!: (synchronizer: PiratechainSynchronizer) => void
  lastUpdateFromSynchronizer?: number

  constructor(
    env: PluginEnvironment<PiratechainNetworkInfo>,
    tools: PiratechainTools,
    walletInfo: SafePiratechainWalletInfo,
    opts: EdgeCurrencyEngineOptions,
    makeSynchronizer: any
  ) {
    super(env, tools, walletInfo, opts)
    const { networkInfo } = env
    this.pluginId = this.currencyInfo.pluginId
    this.networkInfo = networkInfo
    this.birthdayHeight = 0
    this.makeSynchronizer = makeSynchronizer
    this.synchronizerPromise = new Promise<PiratechainSynchronizer>(resolve => {
      this.synchronizerResolver = resolve
    })
    this.queryMutex = false

    this.started = false
    this.progressRatio = 0
  }

  setOtherData(raw: any): void {
    this.otherData = asPiratechainWalletOtherData(raw)
  }

  initData(): void {
    // walletLocalData
    if (this.otherData.blockRange.first === 0) {
      this.otherData.blockRange = {
        first: this.birthdayHeight,
        last: this.birthdayHeight
      }
    }

    // Engine variables
    this.initialNumBlocksToDownload = -1
    this.synchronizerStatus = 'DISCONNECTED'
    this.availableZatoshi = '0'
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
    this.synchronizer.on('error', async payload => {
      this.log.warn(`Synchronizer error: ${payload.message}`)
      if (payload.level === 'critical') {
        await this.killEngine()
        this.lastUpdateFromSynchronizer = undefined
        await this.startEngine()
      }
    })
  }

  async queryAll(): Promise<void> {
    this.lastUpdateFromSynchronizer = Date.now()
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
      // Sync status is split up between downloading and scanning blocks (89.5%),
      // getting balance (0.5%), and querying transactions (10%).

      const balanceProgress = scanProgress * 0.99
      const txProgress = scanProgress * 0.8
      this.tokenCheckBalanceStatus[this.currencyInfo.currencyCode] =
        balanceProgress / 100
      this.tokenCheckTransactionsStatus[this.currencyInfo.currencyCode] =
        txProgress / 100

      const totalProgress = (balanceProgress + txProgress) / 2

      if (totalProgress > this.progressRatio) {
        this.progressRatio = totalProgress
        this.log.warn(
          `Scan and download progress: ${Math.floor(totalProgress)}%`
        )
        this.updateOnAddressesChecked()
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

  processTransaction(tx: ConfirmedTransaction): void {
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
      networkFee: this.networkInfo.defaultNetworkFee,
      networkFees: [],
      otherParams: {},
      ourReceiveAddresses, // blank if you sent money otherwise array of addresses that are yours in this transaction
      signedTx: '',
      tokenId: null,
      txid: tx.rawTransactionId,
      walletId: this.walletId
    }
    this.addTransaction(this.currencyInfo.currencyCode, edgeTransaction)
  }

  async syncNetwork(opts: EdgeEnginePrivateKeyOptions): Promise<number> {
    if (!this.started) return 1000

    const piratechainPrivateKeys = asPiratechainPrivateKeys(
      this.currencyInfo.pluginId
    )(opts?.privateKeys)

    const { rpcNode } = this.networkInfo
    this.birthdayHeight = piratechainPrivateKeys.birthdayHeight

    try {
      // Replace this.synchronizerPromise with a fresh promise. The old promise might have already been resolved
      this.synchronizerPromise = this.makeSynchronizer({
        mnemonicSeed: piratechainPrivateKeys.mnemonic,
        birthdayHeight: piratechainPrivateKeys.birthdayHeight,
        alias: base16.stringify(base64.parse(this.walletId)),
        ...rpcNode
      })
      this.synchronizer = await this.synchronizerPromise
      // People might be waiting on the old promise, so resolve that
      this.synchronizerResolver(this.synchronizer)
    } catch (e) {
      // The synchronizer cannot start if it isn't present.
      if (
        String(e) ===
        'Invariant Violation: `new NativeEventEmitter()` requires a non-null argument.'
      ) {
        this.log.warn('SDK not present')
      } else throw e
    }
    this.initData()
    this.initSubscriptions()

    return await new Promise(resolve => {
      this.stopSyncing = resolve
    })
  }

  async killEngine(): Promise<void> {
    this.synchronizerPromise = new Promise<PiratechainSynchronizer>(resolve => {
      this.synchronizerResolver = resolve
    })
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
    this.progressRatio = 0
    this.synchronizerStatus = 'SYNCING'
  }

  async getMaxSpendable(): Promise<string> {
    const spendableBalance = sub(
      this.availableZatoshi,
      this.networkInfo.defaultNetworkFee
    )
    if (lte(spendableBalance, '0'))
      throw new InsufficientFundsError({ tokenId: null })

    return spendableBalance
  }

  async makeSpend(edgeSpendInfoIn: EdgeSpendInfo): Promise<EdgeTransaction> {
    if (!this.isSynced()) throw new Error('Cannot spend until wallet is synced')
    const { edgeSpendInfo, currencyCode } = this.makeSpendCheck(edgeSpendInfoIn)
    const { memos = [], tokenId } = edgeSpendInfo
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
      throw new InsufficientFundsError({ tokenId })
    }

    if (gt(totalTxAmount, this.availableZatoshi)) {
      throw new InsufficientFundsError({ tokenId })
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
      networkFees: [],
      ourReceiveAddresses: [],
      signedTx: '',
      tokenId,
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
    const { memos } = edgeTransaction
    const piratechainPrivateKeys = asPiratechainPrivateKeys(this.pluginId)(
      opts?.privateKeys
    )
    if (
      edgeTransaction.spendTargets == null ||
      edgeTransaction.spendTargets.length !== 1
    )
      throw new Error('Invalid spend targets')

    const memo = memos[0]?.type === 'text' ? memos[0].value : ''
    const spendTarget = edgeTransaction.spendTargets[0]
    const txParams: SpendInfo = {
      zatoshi: sub(
        abs(edgeTransaction.nativeAmount),
        edgeTransaction.networkFee
      ),
      toAddress: spendTarget.publicAddress,
      memo,
      mnemonicSeed: piratechainPrivateKeys.mnemonic
    }

    try {
      const synchronizer = await this.synchronizerPromise
      const signedTx = await synchronizer.sendToAddress(txParams)
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
    const getSynchronizerAddresses = async (): Promise<EdgeFreshAddress> => {
      const synchronizer = await this.synchronizerPromise
      const { saplingAddress } = await synchronizer.deriveUnifiedAddress()
      this.otherData.cachedAddress = saplingAddress
      this.walletLocalDataDirty = true
      return {
        publicAddress: saplingAddress
      }
    }

    if (this.otherData.cachedAddress == null) {
      return await getSynchronizerAddresses()
    } else {
      getSynchronizerAddresses().catch(e => {
        throw e
      })
      return {
        publicAddress: this.otherData.cachedAddress
      }
    }
  }
}

export async function makeCurrencyEngine(
  env: PluginEnvironment<PiratechainNetworkInfo>,
  tools: PiratechainTools,
  walletInfo: EdgeWalletInfo,
  opts: EdgeCurrencyEngineOptions
): Promise<EdgeCurrencyEngine> {
  const safeWalletInfo = asSafePiratechainWalletInfo(walletInfo)
  const { makeSynchronizer } =
    env.nativeIo['edge-currency-accountbased'].piratechain

  const engine = new PiratechainEngine(
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
