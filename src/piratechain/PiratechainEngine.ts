import { abs, add, eq, gt, gte, lte, mul, sub } from 'biggystring'
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
  NoAmountSpecifiedError,
  PendingFundsError
} from 'edge-core-js/types'
import type { PirateTransaction } from 'react-native-pirate-wallet'
import { base16, base64 } from 'rfc4648'

import { CurrencyEngine } from '../common/CurrencyEngine'
import { PluginEnvironment } from '../common/innerPlugin'
import { cleanTxLogs } from '../common/utils'
import type {
  PiratechainIo,
  PiratechainSpendability,
  PiratechainSynchronizer
} from './piratechainIo'
import {
  makePiratechainSyncTracker,
  PiratechainSyncTracker
} from './PiratechainSyncTracker'
import { PiratechainTools } from './PiratechainTools'
import {
  asPiratechainPrivateKeys,
  asPiratechainWalletOtherData,
  asSafePiratechainWalletInfo,
  PiratechainNetworkInfo,
  PiratechainWalletOtherData,
  SafePiratechainWalletInfo
} from './piratechainTypes'

export class PiratechainEngine extends CurrencyEngine<
  PiratechainTools,
  SafePiratechainWalletInfo,
  PiratechainSyncTracker
> {
  pluginId: string
  networkInfo: PiratechainNetworkInfo
  otherData!: PiratechainWalletOtherData
  synchronizerStatus!: 'STOPPED' | 'SYNCING' | 'SYNCED'
  availableZatoshi!: string
  birthdayHeight: number
  queryMutex: boolean
  /** Heights at which each txid was last processed, to skip stable
   * transactions when reprocessing the SDK's full history list: */
  processedTxHeights: Map<string, number>
  makeSynchronizer: PiratechainIo['makeSynchronizer']

  // Synchronizer management
  started: boolean
  stopSyncing?: (value: number | PromiseLike<number>) => void
  synchronizer?: PiratechainSynchronizer
  synchronizerPromise: Promise<PiratechainSynchronizer>
  synchronizerResolver!: (synchronizer: PiratechainSynchronizer) => void

  constructor(
    env: PluginEnvironment<PiratechainNetworkInfo>,
    tools: PiratechainTools,
    walletInfo: SafePiratechainWalletInfo,
    opts: EdgeCurrencyEngineOptions,
    makeSynchronizer: PiratechainIo['makeSynchronizer']
  ) {
    super(env, tools, walletInfo, opts, makePiratechainSyncTracker)
    const { networkInfo } = env
    this.pluginId = this.currencyInfo.pluginId
    this.networkInfo = networkInfo
    this.birthdayHeight = 0
    this.makeSynchronizer = makeSynchronizer
    this.synchronizerPromise = new Promise<PiratechainSynchronizer>(resolve => {
      this.synchronizerResolver = resolve
    })
    this.queryMutex = false
    this.processedTxHeights = new Map()

    this.started = false
  }

  setOtherData(raw: any): void {
    this.otherData = asPiratechainWalletOtherData(raw)
  }

  initData(): void {
    // Engine variables
    this.synchronizerStatus = 'STOPPED'
    this.availableZatoshi = '0'
    this.processedTxHeights.clear()
  }

  initSubscriptions(): void {
    if (this.synchronizer == null) return
    const { synchronizer } = this
    synchronizer.on('update', async payload => {
      const { lastDownloadedHeight, networkBlockHeight } = payload
      this.updateBlockHeight(networkBlockHeight)
      this.syncTracker.updateBlockProgress({
        birthdayHeight: this.birthdayHeight,
        lastDownloadedHeight,
        networkBlockHeight
      })
      await this.queryAll()
    })
    synchronizer.on('statusChanged', async payload => {
      this.synchronizerStatus = payload.name
      await this.queryAll()
    })
    synchronizer.on('error', payload => {
      // The polling synchronizer retries transient errors on its own:
      this.log.warn(`Synchronizer error: ${payload.message}`)
    })

    // A status change that fired before these subscriptions existed is lost,
    // which would strand the engine at STOPPED and block every spend. Read the
    // status once and adopt it if no event has arrived yet:
    synchronizer
      .getStatus()
      .then(async status => {
        if (this.synchronizerStatus !== 'STOPPED') return
        this.synchronizerStatus = status
        await this.queryAll()
      })
      .catch((error: unknown) => {
        this.log.warn(
          `Failed to read the initial synchronizer status: ${String(error)}`
        )
      })
  }

  async queryAll(): Promise<void> {
    if (this.queryMutex) return
    this.queryMutex = true
    try {
      await this.queryBalance()
      await this.queryTransactions()
      this.sendTransactionEvents()
    } catch (e: any) {}
    this.queryMutex = false
  }

  async startEngine(): Promise<void> {
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
      const balance = await this.synchronizer.getBalance()
      // `total` includes pending; `spendable` is the confirmed balance:
      this.availableZatoshi = String(balance.spendable)
      this.updateBalance(null, String(balance.total))
      this.syncTracker.updateBalanceRatio(1)
    } catch (e: any) {
      this.warn('Failed to update balances', e)
      this.updateBalance(null, '0')
    }
  }

  async queryTransactions(): Promise<void> {
    if (this.synchronizer == null) return
    try {
      const transactions = await this.synchronizer.getTransactions()
      for (const tx of transactions) {
        // The SDK returns the full history each time, so only process
        // transactions that are new or whose height moved:
        const height = tx.height ?? 0
        const seenHeight = this.processedTxHeights.get(tx.txid)
        if (seenHeight === height) continue
        this.processedTxHeights.set(tx.txid, height)

        if (seenHeight != null && height < seenHeight) {
          // A height that moved BACKWARDS means a reorg unmined the
          // transaction or re-mined it lower. `addTransaction` only writes a
          // height that moved forward, so this update cannot land; say so
          // rather than letting it vanish downstream. The stale height is
          // wrong by the reorg depth until the transaction confirms above it.
          this.warn(
            `Reorged height for ${tx.txid} not applied: ${seenHeight} -> ${height}`
          )
          continue
        }
        this.processTransaction(tx)
      }
      if (this.isSynced()) {
        this.syncTracker.updateTransactionRatio(1)
      }
    } catch (e: any) {
      this.error(
        `Error querying ${this.currencyInfo.currencyCode} transactions `,
        e
      )
    }
  }

  processTransaction(tx: PirateTransaction): void {
    // A negative amount is a send and already includes the network fee:
    const netNativeAmount = String(tx.amount)
    const ourReceiveAddresses = []
    if (gte(netNativeAmount, '0')) {
      ourReceiveAddresses.push(this.walletInfo.keys.publicKey)
    }

    const edgeMemos: EdgeMemo[] =
      tx.memo != null && tx.memo !== ''
        ? [
            {
              memoName: 'memo',
              type: 'text',
              value: tx.memo
            }
          ]
        : []

    const edgeTransaction: EdgeTransaction = {
      blockHeight: tx.height ?? 0,
      currencyCode: this.currencyInfo.currencyCode,
      date: tx.timestamp,
      isSend: netNativeAmount.startsWith('-'),
      memos: edgeMemos,
      nativeAmount: netNativeAmount,
      networkFee: String(tx.fee),
      networkFees: [],
      otherParams: {},
      ourReceiveAddresses, // blank if you sent money otherwise array of addresses that are yours in this transaction
      signedTx: '',
      tokenId: null,
      txid: tx.txid,
      walletId: this.walletId
    }
    this.addTransaction(null, edgeTransaction)
  }

  async syncNetwork(opts: EdgeEnginePrivateKeyOptions): Promise<number> {
    if (!this.started) return 1000

    const piratechainPrivateKeys = asPiratechainPrivateKeys(
      this.currencyInfo.pluginId
    )(opts?.privateKeys)

    this.birthdayHeight = piratechainPrivateKeys.birthdayHeight

    try {
      // Replace this.synchronizerPromise with a fresh promise. The old promise might have already been resolved
      this.synchronizerPromise = this.makeSynchronizer({
        name: base16.stringify(base64.parse(this.walletId)),
        mnemonic: piratechainPrivateKeys.mnemonic,
        birthdayHeight: piratechainPrivateKeys.birthdayHeight,
        lightwalletdUrl: this.networkInfo.lightwalletdUrl,
        lightwalletdFailoverUrls: this.networkInfo.lightwalletdFailoverUrls
      })
      this.synchronizer = await this.synchronizerPromise
      // People might be waiting on the old promise, so resolve that
      this.synchronizerResolver(this.synchronizer)
    } catch (e) {
      // The synchronizer cannot start if the native module isn't present:
      if (String(e).includes('native module is not linked')) {
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
    this.synchronizerPromise
      .then(async synchronizer => {
        await synchronizer.rescan(this.birthdayHeight)
      })
      .catch((e: any) => this.warn('resyncBlockchain failed: ', e))
    this.initData()
    this.syncTracker.resetSync()
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

  /**
   * The SDK reports `SYNCED` before its spend anchor is usable, and a send in
   * that window fails inside the SDK with `ERR_SYNC_FINALIZING` only once the
   * user has already confirmed it. `get_spendability_status` reports the
   * window directly, so refuse the spend here instead: a `makeSpend` that
   * throws leaves the send scene with no transaction, which is what keeps its
   * confirm slider disabled until the wallet can actually spend.
   */
  async checkSpendable(): Promise<void> {
    if (!this.isSynced()) throw new Error('Cannot spend until wallet is synced')

    let spendability: PiratechainSpendability
    try {
      const synchronizer = await this.synchronizerPromise
      spendability = await synchronizer.getSpendability()
    } catch (error: unknown) {
      // Reaching `SYNCED` was the entire gate before this RPC existed, so a
      // status the plugin cannot read must not be what stops a spend. Bridge
      // errors arrive serialized rather than as `Error` instances:
      this.warn(
        'Failed to read the spendability status',
        error instanceof Error ? error : new Error(String(error))
      )
      return
    }
    if (spendability.spendable) return

    this.warn(`Spend refused: ${JSON.stringify(spendability)}`)
    throw new PendingFundsError(spendabilityMessage(spendability))
  }

  async makeSpend(edgeSpendInfoIn: EdgeSpendInfo): Promise<EdgeTransaction> {
    await this.checkSpendable()
    const { edgeSpendInfo, currencyCode } = this.makeSpendCheck(edgeSpendInfoIn)
    const { memos = [], tokenId } = edgeSpendInfo
    const spendTarget = edgeSpendInfo.spendTargets[0]
    const { publicAddress, nativeAmount } = spendTarget

    if (publicAddress == null)
      throw new Error('makeSpend Missing publicAddress')
    if (nativeAmount == null) throw new NoAmountSpecifiedError()

    if (eq(nativeAmount, '0')) throw new NoAmountSpecifiedError()

    const totalTxAmount = add(nativeAmount, this.networkInfo.defaultNetworkFee)

    if (gt(totalTxAmount, this.getBalance({ tokenId: null }))) {
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
    edgeTransaction: EdgeTransaction
  ): Promise<EdgeTransaction> {
    const { memos } = edgeTransaction
    if (
      edgeTransaction.spendTargets == null ||
      edgeTransaction.spendTargets.length !== 1
    )
      throw new Error('Invalid spend targets')

    const spendTarget = edgeTransaction.spendTargets[0]
    if (spendTarget.publicAddress == null)
      throw new Error('Missing publicAddress')

    // The registry wallet holds the spending keys, so the send call
    // only needs the outputs. Edge's nativeAmount includes the fee:
    const memo = memos[0]?.type === 'text' ? memos[0].value : undefined
    const spendAmount = sub(
      abs(edgeTransaction.nativeAmount),
      edgeTransaction.networkFee
    )

    try {
      const synchronizer = await this.synchronizerPromise
      const txid = await synchronizer.send(
        [
          {
            addr: spendTarget.publicAddress,
            amount: spendAmount,
            memo
          }
        ],
        edgeTransaction.networkFee
      )
      edgeTransaction.txid = txid
      edgeTransaction.date = Date.now() / 1000
      this.warn(`SUCCESS broadcastTx\n${cleanTxLogs(edgeTransaction)}`)
    } catch (e: any) {
      this.warn('FAILURE broadcastTx failed: ', e)
      throw asRetryableSpendError(e) ?? e
    }
    return edgeTransaction
  }

  async getFreshAddress(): Promise<EdgeFreshAddress> {
    const getSynchronizerAddresses = async (): Promise<EdgeFreshAddress> => {
      const synchronizer = await this.synchronizerPromise
      const publicAddress = await synchronizer.getCurrentAddress()
      this.otherData.cachedAddress = publicAddress
      this.walletLocalDataDirty = true
      return {
        publicAddress
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

/**
 * SDK error codes that mean "this spend is not ready yet, retry shortly"
 * rather than "this spend is wrong". `get_spendability_status` is checked
 * before the transaction is built and, since SDK 0.3.4, keeps reporting a
 * queued repair until the node will accept the wallet's anchor, so a build
 * that passed the gate should not fail with either of these. The backstop
 * stays because the status read `spendable: true, reasonCode: OK` through
 * four such rejections on 0.3.2, and a wrong status costs the user a
 * misleading network error where a mapped one costs nothing.
 */
const RETRYABLE_SPEND_ERROR_CODES = [
  'ERR_SYNC_FINALIZING',
  'ERR_WITNESS_REPAIR_QUEUED'
]

/**
 * Restates a retryable spend failure as `PendingFundsError`, so the app can
 * tell the user to wait instead of blaming their network connection. Anything
 * else is left alone: an error the plugin cannot classify must keep its own
 * text rather than be softened into a wait.
 */
function asRetryableSpendError(error: unknown): PendingFundsError | undefined {
  const message = error instanceof Error ? error.message : String(error)
  const code = RETRYABLE_SPEND_ERROR_CODES.find(code => message.includes(code))
  if (code == null) return

  return new PendingFundsError(
    code === 'ERR_WITNESS_REPAIR_QUEUED'
      ? 'Cannot spend until the wallet finishes repairing its transaction history'
      : 'Cannot spend until the wallet finishes syncing'
  )
}

/**
 * Why the wallet cannot spend yet. Every case resolves itself by waiting, so
 * the wording says which wait it is rather than asking the user to act. The
 * `reasonCode` is authoritative; the booleans cover a status that arrives
 * without one.
 */
function spendabilityMessage(spendability: PiratechainSpendability): string {
  const { reasonCode, rescanRequired, repairQueued } = spendability
  if (reasonCode === 'ERR_RESCAN_REQUIRED' || rescanRequired) {
    return 'Cannot spend until the wallet finishes rescanning'
  }
  if (reasonCode === 'ERR_WITNESS_REPAIR_QUEUED' || repairQueued) {
    return 'Cannot spend until the wallet finishes repairing its transaction history'
  }
  return 'Cannot spend until the wallet finishes syncing'
}

export async function makeCurrencyEngine(
  env: PluginEnvironment<PiratechainNetworkInfo>,
  tools: PiratechainTools,
  walletInfo: EdgeWalletInfo,
  opts: EdgeCurrencyEngineOptions
): Promise<EdgeCurrencyEngine> {
  const safeWalletInfo = asSafePiratechainWalletInfo(walletInfo)
  const piratechainIo =
    (env.nativeIo.piratechain as PiratechainIo) ??
    env.nativeIo['edge-currency-accountbased']?.piratechain
  if (piratechainIo == null) {
    throw new Error('Need piratechain native IO')
  }

  const engine = new PiratechainEngine(
    env,
    tools,
    safeWalletInfo,
    opts,
    piratechainIo.makeSynchronizer
  )

  // Do any async initialization necessary for the engine
  await engine.loadEngine()

  return engine
}
