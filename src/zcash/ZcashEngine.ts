import { add, eq, gt, gte, max, mul, sub } from 'biggystring'
import {
  EdgeAddress,
  EdgeCurrencyEngine,
  EdgeCurrencyEngineOptions,
  EdgeEnginePrivateKeyOptions,
  EdgeMemo,
  EdgeMetadata,
  EdgeSpendInfo,
  EdgeTransaction,
  EdgeWalletInfo,
  InsufficientFundsError,
  JsonObject,
  NoAmountSpecifiedError
} from 'edge-core-js/types'
import type {
  CreateTransferOpts,
  MigrationSchedule,
  StatusEvent,
  Transaction
} from 'react-native-zcash'
import { base16, base64 } from 'rfc4648'

import { CurrencyEngine } from '../common/CurrencyEngine'
import { PluginEnvironment } from '../common/innerPlugin'
import { cleanTxLogs, getOtherParams } from '../common/utils'
import type { ZcashIo, ZcashSynchronizer } from './zcashIo'
import {
  computeAvailableZatoshi,
  decideMigrationAction,
  mapMigrationStatus
} from './zcashMigration'
import { makeZcashSyncTracker, ZcashSyncTracker } from './ZcashSyncTracker'
import { ZcashTools } from './ZcashTools'
import {
  asSafeZcashWalletInfo,
  asZcashMigrationPlan,
  asZcashPrivateKeys,
  asZcashWalletOtherData,
  SafeZcashWalletInfo,
  ZcashBalances,
  ZcashMigrationPlan,
  ZcashMigrationStatus,
  ZcashNetworkInfo,
  ZcashWalletOtherData
} from './zcashTypes'

export class ZcashEngine extends CurrencyEngine<
  ZcashTools,
  SafeZcashWalletInfo,
  ZcashSyncTracker
> {
  pluginId: string
  networkInfo: ZcashNetworkInfo
  otherData!: ZcashWalletOtherData
  synchronizerStatus!: StatusEvent['name']
  availableZatoshi!: string
  balances: ZcashBalances

  makeSynchronizer: ZcashIo['makeSynchronizer']

  // Synchronizer management
  stopSyncing?: (value: number | PromiseLike<number>) => void
  synchronizer?: ZcashSynchronizer
  synchronizerPromise: Promise<ZcashSynchronizer>
  synchronizerResolver!: (synchronizer: ZcashSynchronizer) => void
  autoshielding: {
    createAutoshieldTx: boolean
    threshold: string
    txid?: string
  }

  // Orchard -> Ironwood migration. The SDK owns all durable migration state
  // (schedule + pre-signed transactions, in its own database); these are the
  // engine's ephemeral orchestration flags, rebuilt from SDK pulls.
  migration: {
    /** The sync loop should broadcast the next height-due transfer. */
    executeTransferRequested: boolean
    /** The sync loop should re-anchor/re-sign stale transfers (needs seed). */
    refreshStaleRequested: boolean
    /** An in-flight migration tx we are waiting to see confirmed. */
    pendingTxid?: string
    /** Throttles checkMigration to once per new block. */
    lastCheckedHeight: number
    /** Served to GUI polls when the synchronizer is not ready. */
    statusCache?: ZcashMigrationStatus
  }

  otherMethods: Object
  otherMethodsWithKeys: Object

  constructor(
    env: PluginEnvironment<ZcashNetworkInfo>,
    tools: ZcashTools,
    walletInfo: SafeZcashWalletInfo,
    opts: EdgeCurrencyEngineOptions,
    makeSynchronizer: ZcashIo['makeSynchronizer']
  ) {
    super(env, tools, walletInfo, opts, makeZcashSyncTracker)
    const { networkInfo } = env
    this.pluginId = this.currencyInfo.pluginId
    this.networkInfo = networkInfo
    this.makeSynchronizer = makeSynchronizer
    this.synchronizerPromise = new Promise<ZcashSynchronizer>(resolve => {
      this.synchronizerResolver = resolve
    })
    this.balances = {
      transparentAvailableZatoshi: '0',
      transparentTotalZatoshi: '0',
      saplingAvailableZatoshi: '0',
      saplingTotalZatoshi: '0',
      orchardAvailableZatoshi: '0',
      orchardTotalZatoshi: '0',
      ironwoodAvailableZatoshi: '0',
      ironwoodTotalZatoshi: '0'
    }
    this.autoshielding = {
      createAutoshieldTx: false,
      threshold: mul(this.networkInfo.defaultNetworkFee, '2') // Only autoshield if received shielded balance is greater than the default fee
    }
    this.migration = {
      executeTransferRequested: false,
      refreshStaleRequested: false,
      lastCheckedHeight: 0
    }

    this.otherMethods = {
      /**
       * Pull-based migration status for the GUI (poll on scene focus).
       * Safe to call any time; reports notNeeded until the wallet syncs.
       */
      getMigrationStatus: async (): Promise<ZcashMigrationStatus> => {
        const synchronizer = this.synchronizer
        if (synchronizer == null || !this.isSynced()) {
          return (
            this.migration.statusCache ?? {
              state: 'notNeeded',
              completedTransfers: 0,
              totalTransfers: 0,
              remainingOrchardZatoshi: '0',
              hasOverdueTransfers: false,
              isSynced: false,
              nextTransferReadyAtHeight: undefined
            }
          )
        }
        const [state, hasOverdueTransfers] = await Promise.all([
          synchronizer.getMigrationState(),
          synchronizer.hasOverdueTransfers()
        ])
        const status = mapMigrationStatus({
          state,
          hasOverdueTransfers,
          isSynced: true,
          orchardTotalZatoshi: this.balances.orchardTotalZatoshi
        })
        this.migration.statusCache = status
        return status
      },

      /**
       * Proposes a migration plan for the user to review. No signing happens
       * here (and no keys are needed) — the returned plan round-trips to
       * confirmMigrationPlan, which signs exactly what was proposed.
       */
      prepareMigrationPlan: async (opts: {
        strategy: 'privacy' | 'immediate'
      }): Promise<ZcashMigrationPlan> => {
        const strategy =
          opts?.strategy === 'immediate' ? 'immediate' : 'privacy'
        const synchronizer = await this.synchronizerPromise
        const state = await synchronizer.getMigrationState()

        let noteSplitRequired = false
        let noteSplitProposalBase64: string | undefined
        let noteSplitFeeZatoshi = '0'
        let schedule: MigrationSchedule
        if (
          state.state === 'inProgress' ||
          state.state === 'requiresAttention'
        ) {
          // A migration is already in flight but needs a new plan (e.g. after
          // invalid transfers): re-propose the remaining schedule instead.
          schedule = await synchronizer.restartCurrentMigrationStep()
        } else {
          if (strategy === 'privacy') {
            noteSplitRequired = await synchronizer.isNoteSplitNeeded()
            if (noteSplitRequired) {
              const proposal = await synchronizer.prepareNoteSplit()
              noteSplitProposalBase64 = proposal.proposalBase64
              noteSplitFeeZatoshi = proposal.feeZatoshi
            }
          }
          schedule =
            strategy === 'immediate'
              ? await synchronizer.proposeImmediateMigration()
              : await synchronizer.proposeMigrationTransfers()
        }

        const totalAmountZatoshi = schedule.transfers.reduce(
          (sum, transfer) => add(sum, transfer.amountZatoshi),
          '0'
        )
        return asZcashMigrationPlan({
          strategy,
          transfers: schedule.transfers.map(transfer => ({
            id: transfer.id,
            amountZatoshi: transfer.amountZatoshi,
            nextExecutableAfterHeight: transfer.nextExecutableAfterHeight,
            expiryHeight: transfer.expiryHeight
          })),
          estimatedDurationHours: schedule.estimatedDurationHours,
          totalAmountZatoshi,
          noteSplitFeeZatoshi,
          noteSplitRequired,
          noteSplitProposalBase64,
          scheduleBase64: schedule.scheduleBase64
        })
      }
    }

    this.otherMethodsWithKeys = {
      /**
       * Submits the note split (when required), pre-signs and stores the
       * confirmed schedule, and for the immediate strategy broadcasts the
       * single transfer right away. The core injects the wallet keys.
       */
      confirmMigrationPlan: async (
        rawKeys: JsonObject,
        planRaw: unknown
      ): Promise<{ txid?: string }> => {
        const plan = asZcashMigrationPlan(planRaw)
        const zcashPrivateKeys = asZcashPrivateKeys(this.pluginId)(rawKeys)
        const synchronizer = await this.synchronizerPromise

        if (plan.noteSplitRequired && plan.noteSplitProposalBase64 != null) {
          const result = await synchronizer.submitNoteSplit({
            mnemonicSeed: zcashPrivateKeys.mnemonic,
            proposalBase64: plan.noteSplitProposalBase64
          })
          if (result.type !== 'success') {
            throw new Error(`Ironwood note split failed: ${result.type}`)
          }
          this.recordMigrationTxid(result.txid)
          this.migration.pendingTxid = result.txid
        }

        await synchronizer.signAndStoreMigrationSchedule({
          mnemonicSeed: zcashPrivateKeys.mnemonic,
          scheduleBase64: plan.scheduleBase64
        })

        let txid: string | undefined
        if (plan.strategy === 'immediate') {
          const result = await synchronizer.executeNextPendingTransfer()
          if (result != null && result.type === 'success') {
            txid = result.txid
            this.recordMigrationTxid(txid)
            this.migration.pendingTxid = txid
          }
        }

        this.migration.statusCache = undefined
        this.migration.lastCheckedHeight = 0
        return { txid }
      },

      /**
       * Re-anchors, re-proves and re-signs stale scheduled transfers (the
       * lighter recovery). Returns the number of transfers refreshed.
       */
      retryMigration: async (rawKeys: JsonObject): Promise<number> => {
        const zcashPrivateKeys = asZcashPrivateKeys(this.pluginId)(rawKeys)
        const synchronizer = await this.synchronizerPromise
        const refreshed = await synchronizer.refreshStaleTransfers({
          mnemonicSeed: zcashPrivateKeys.mnemonic
        })
        this.migration.statusCache = undefined
        this.migration.lastCheckedHeight = 0
        return refreshed
      }
    }
  }

  recordMigrationTxid(txid: string): void {
    if (!this.otherData.migrationTxids.includes(txid)) {
      this.otherData.migrationTxids.push(txid)
      this.walletLocalDataDirty = true
    }
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
  }

  initSubscriptions(): void {
    if (this.synchronizer == null) return
    this.synchronizer.on('update', async payload => {
      const { scanProgress, networkBlockHeight } = payload
      this.updateBlockHeight(networkBlockHeight)
      this.syncTracker.updateProgress(scanProgress)
      await this.checkAutoshielding()
      await this.checkMigration(networkBlockHeight)
    })
    this.synchronizer.on('statusChanged', async payload => {
      this.synchronizerStatus = payload.name
    })
    this.synchronizer.on('balanceChanged', async payload => {
      const {
        transparentAvailableZatoshi,
        transparentTotalZatoshi,
        saplingAvailableZatoshi,
        saplingTotalZatoshi,
        orchardAvailableZatoshi,
        orchardTotalZatoshi,
        ironwoodAvailableZatoshi,
        ironwoodTotalZatoshi
      } = payload

      this.balances = {
        transparentAvailableZatoshi,
        transparentTotalZatoshi,
        saplingAvailableZatoshi,
        saplingTotalZatoshi,
        orchardAvailableZatoshi,
        orchardTotalZatoshi,
        ironwoodAvailableZatoshi,
        ironwoodTotalZatoshi
      }
      // Transparent funds will be autoshielded so the available balance should only reflect the shielded balances
      this.availableZatoshi = computeAvailableZatoshi(this.balances)

      const total = add(
        add(
          add(transparentTotalZatoshi, saplingTotalZatoshi),
          orchardTotalZatoshi
        ),
        ironwoodTotalZatoshi
      )

      this.updateBalance(null, total)
      await this.checkAutoshielding()
    })
    this.synchronizer.on('transactionsChanged', async payload => {
      const { transactions } = payload
      transactions.forEach(tx => {
        // Check if the autoshielding transaction has confirmed
        if (
          tx.rawTransactionId === this.autoshielding.txid &&
          tx.minedHeight > 0
        ) {
          this.autoshielding.txid = undefined
          this.autoshielding.createAutoshieldTx = false
        }

        // Check if the in-flight migration transaction has confirmed (the
        // next transfer waits for its own executable height via checkMigration)
        if (
          tx.rawTransactionId === this.migration.pendingTxid &&
          tx.minedHeight > 0
        ) {
          this.migration.pendingTxid = undefined
        }

        this.processTransaction(tx)
      })
      this.sendTransactionEvents()
    })
    this.synchronizer.on('error', async payload => {
      this.log.warn(`Synchronizer error: ${payload.message}`)
      if (payload.level === 'critical') {
        await this.killEngine()
        await this.startEngine()
      }
    })
  }

  // This is a partial fix for handling unconfirmed txs in the seenTxCheckpoint API. It solves the problem for a single device, but multi-devices syncing the same account may still see incorrect notifications.
  isTransactionNew(edgeTransaction: EdgeTransaction): boolean {
    if (
      edgeTransaction.blockHeight === 0 &&
      edgeTransaction.confirmations === 'unconfirmed' &&
      this.seenTxCheckpoint != null &&
      !edgeTransaction.isSend
    ) {
      return true
    }
    return super.isTransactionNew(edgeTransaction)
  }

  isSynced(): boolean {
    // Synchronizer status is updated regularly and should be checked before accessing the db to avoid errors
    return this.synchronizerStatus === 'SYNCED'
  }

  processTransaction(tx: Transaction): void {
    const {
      rawTransactionId,
      raw,
      blockTimeInSeconds,
      minedHeight,
      value,
      fee,
      toAddress,
      isShielding,
      isExpired,
      memos
    } = tx
    let netNativeAmount = value
    const networkFee = fee ?? this.networkInfo.defaultNetworkFee
    if (toAddress != null) {
      // check if tx is a spend
      netNativeAmount = `-${add(netNativeAmount, networkFee)}`
    }

    const edgeMemos: EdgeMemo[] = memos
      .filter(text => text !== '')
      .map(text => ({
        memoName: 'memo',
        type: 'text',
        value: text
      }))

    // Special case for shielding txs
    let metadata: EdgeMetadata | undefined
    if (isShielding) {
      metadata = { notes: 'Shielding' }
      netNativeAmount = `-${networkFee}`
    }

    // Special case for Orchard -> Ironwood migration txs (self-transfers the
    // engine created; the SDK's Transaction carries no migration flag, so the
    // engine matches against its own recorded txids):
    if (this.otherData.migrationTxids.includes(rawTransactionId)) {
      metadata = { notes: 'Ironwood Migration' }
      netNativeAmount = `-${networkFee}`
    }

    let confirmations: EdgeTransaction['confirmations'] | undefined
    if (isExpired) {
      confirmations = 'failed'
    }

    // The only pending transactions emitted from the sdk are the ones we create and it's possible
    // to see them through the 'transactionsChanged' listener before the synchronizer's sendToAddress
    // or shieldFunds resolves. In this case, we'll add the current time as the transaction date.
    const date =
      minedHeight === 0
        ? Math.max(blockTimeInSeconds, Date.now() / 1000)
        : blockTimeInSeconds

    // For outgoing transactions, carry the recipient address onto
    // `spendTargets` so the GUI can drive reverse address lookups (e.g. ZNS).
    // Shielded receives leave `toAddress` null, so no spendTargets there.
    const spendTargets =
      toAddress != null
        ? [
            {
              currencyCode: this.currencyInfo.currencyCode,
              nativeAmount: value,
              publicAddress: toAddress,
              memo: undefined,
              uniqueIdentifier: undefined
            }
          ]
        : undefined

    const edgeTransaction: EdgeTransaction = {
      blockHeight: minedHeight,
      confirmations,
      currencyCode: this.currencyInfo.currencyCode,
      date,
      isSend: netNativeAmount.startsWith('-'),
      memos: edgeMemos,
      metadata,
      nativeAmount: netNativeAmount,
      networkFee,
      networkFees: [],
      otherParams: {},
      ourReceiveAddresses: [], // Not accessible from SDK and unified addresses are deterministic
      signedTx: raw ?? '',
      spendTargets,
      tokenId: null,
      txid: rawTransactionId,
      walletId: this.walletId
    }
    this.addTransaction(null, edgeTransaction)
  }

  async checkAutoshielding(): Promise<void> {
    if (
      this.isSynced() &&
      !this.autoshielding.createAutoshieldTx &&
      gt(
        this.balances.transparentAvailableZatoshi,
        this.autoshielding.threshold
      )
    ) {
      this.autoshielding.createAutoshieldTx = true
      await this.restartSyncNetwork()
    }
  }

  /**
   * Drives the Orchard -> Ironwood migration during sync: once per new block,
   * pull the SDK's migration state and decide whether the sync loop should
   * broadcast the next height-due pre-signed transfer or refresh stale ones
   * (see decideMigrationAction). The actual work happens in syncNetwork,
   * which has the seed.
   */
  async checkMigration(networkBlockHeight: number): Promise<void> {
    if (this.synchronizer == null || !this.isSynced()) return
    if (networkBlockHeight <= this.migration.lastCheckedHeight) return
    this.migration.lastCheckedHeight = networkBlockHeight

    const isBusy =
      this.migration.executeTransferRequested ||
      this.migration.refreshStaleRequested ||
      this.migration.pendingTxid != null

    try {
      const state = await this.synchronizer.getMigrationState()
      const [hasInvalidTransfers, isSyncRequiredBeforeNextTransfer] =
        state.state === 'inProgress' && !isBusy
          ? await Promise.all([
              this.synchronizer.hasInvalidTransfers(),
              this.synchronizer.isSyncRequiredBeforeNextTransfer()
            ])
          : [false, false]

      const action = decideMigrationAction({
        state,
        hasInvalidTransfers,
        isSyncRequiredBeforeNextTransfer,
        networkBlockHeight,
        isBusy
      })
      if (action === 'execute') {
        this.migration.executeTransferRequested = true
        await this.restartSyncNetwork()
      } else if (action === 'refreshStale') {
        this.migration.refreshStaleRequested = true
        await this.restartSyncNetwork()
      }
    } catch (e) {
      this.log.warn('checkMigration failed: ', String(e))
    }
  }

  async syncNetwork(opts: EdgeEnginePrivateKeyOptions): Promise<number> {
    if (!this.engineOn) return 1000

    const zcashPrivateKeys = asZcashPrivateKeys(this.currencyInfo.pluginId)(
      opts?.privateKeys
    )

    if (this.synchronizer == null) {
      const { rpcNode } = this.networkInfo

      // Replace this.synchronizerPromise with a fresh promise. The old promise might have already been resolved
      this.synchronizerPromise = this.makeSynchronizer({
        mnemonicSeed: zcashPrivateKeys.mnemonic,
        birthdayHeight: zcashPrivateKeys.birthdayHeight,
        alias: base16.stringify(base64.parse(this.walletId)),
        newWallet: !this.otherData.isSdkInitializedOnDisk,
        ...rpcNode
      })
      this.synchronizer = await this.synchronizerPromise
      // People might be waiting on the old promise, so resolve that
      this.synchronizerResolver(this.synchronizer)
      this.initData()
      this.initSubscriptions()

      // One-time Ironwood post-upgrade initialization (idempotency of the SDK
      // call is unconfirmed, so the engine guards it with a persisted flag):
      if (!this.otherData.isPostUpgradeInitialized) {
        try {
          await this.synchronizer.initializeIronwoodPostUpgrade()
          this.otherData.isPostUpgradeInitialized = true
          this.walletLocalDataDirty = true
        } catch (e) {
          this.log.warn(
            'initializeIronwoodPostUpgrade failed (will retry next engine start): ',
            String(e)
          )
        }
      }
    }

    if (this.synchronizer != null && this.autoshielding.createAutoshieldTx) {
      return await new Promise(resolve => {
        this.log.warn('Autoshield transaction broadcasting...')
        this.synchronizer
          ?.shieldFunds({
            seed: zcashPrivateKeys.mnemonic,
            memo: '',
            threshold: this.autoshielding.threshold
          })
          .then(txid => {
            this.log.warn('Autoshield success', txid)
            this.autoshielding.txid = txid
          })
          .catch(e => {
            this.autoshielding.createAutoshieldTx = false
            this.log.error('Autoshield failed: ', e)
          })
          .finally(() => {
            this.stopSyncing = resolve
          })
      })
    }

    if (this.synchronizer != null && this.migration.refreshStaleRequested) {
      return await new Promise(resolve => {
        this.log.warn('Ironwood migration: refreshing stale transfers...')
        this.synchronizer
          ?.refreshStaleTransfers({ mnemonicSeed: zcashPrivateKeys.mnemonic })
          .then(refreshed => {
            this.log.warn(
              `Ironwood migration: refreshed ${refreshed} transfers`
            )
            this.migration.statusCache = undefined
          })
          .catch(e => {
            this.log.error('Ironwood migration: refresh failed: ', e)
          })
          .finally(() => {
            this.migration.refreshStaleRequested = false
            this.stopSyncing = resolve
          })
      })
    }

    if (this.synchronizer != null && this.migration.executeTransferRequested) {
      return await new Promise(resolve => {
        this.log.warn(
          'Ironwood migration: broadcasting next pending transfer...'
        )
        this.synchronizer
          ?.executeNextPendingTransfer()
          .then(result => {
            if (result == null) {
              this.log.warn('Ironwood migration: no transfer due')
            } else if (result.type === 'success') {
              this.log.warn(
                'Ironwood migration: transfer broadcast',
                result.txid
              )
              this.recordMigrationTxid(result.txid)
              this.migration.pendingTxid = result.txid
              this.migration.statusCache = undefined
            } else {
              // Recorded outcome; checkMigration re-evaluates on the next block
              // (stale/invalid outcomes route to refreshStaleTransfers there).
              this.log.warn(
                `Ironwood migration: transfer outcome ${result.type}`
              )
            }
          })
          .catch(e => {
            this.log.error('Ironwood migration: execute failed: ', e)
          })
          .finally(() => {
            this.migration.executeTransferRequested = false
            this.stopSyncing = resolve
          })
      })
    }

    return await new Promise(resolve => {
      this.stopSyncing = resolve
    })
  }

  async killEngine(): Promise<void> {
    this.synchronizerPromise = new Promise<ZcashSynchronizer>(resolve => {
      this.synchronizerResolver = resolve
    })
    await super.killEngine()
    await this.restartSyncNetwork()
    await this.synchronizer?.stop()
    this.synchronizer = undefined
  }

  async restartSyncNetwork(): Promise<void> {
    if (this.stopSyncing != null) {
      await this.stopSyncing(1000)
      this.stopSyncing = undefined
    }
  }

  async clearBlockchainCache(): Promise<void> {
    await super.clearBlockchainCache()
  }

  async resyncBlockchain(): Promise<void> {
    // Don't bother stopping and restarting the synchronizer for a resync
    await super.killEngine()
    await this.clearBlockchainCache()
    await this.startEngine()
    await this.synchronizer
      ?.rescan()
      .catch((e: any) => this.warn('resyncBlockchain failed: ', e))
    this.initData()
    this.synchronizerStatus = 'SYNCING'
    // Migration orchestration state is rebuilt from SDK pulls after the
    // rescan (whether the SDK preserves its stored schedule or reverts the
    // wallet to a needs-migration state, checkMigration handles both):
    this.migration.executeTransferRequested = false
    this.migration.refreshStaleRequested = false
    this.migration.pendingTxid = undefined
    this.migration.lastCheckedHeight = 0
    this.migration.statusCache = undefined
  }

  async getMaxSpendable(edgeSpendInfo: EdgeSpendInfo): Promise<string> {
    const { memos = [], spendTargets } = edgeSpendInfo
    const { publicAddress } = spendTargets[0]

    if (publicAddress == null) {
      throw new Error('makeSpend Missing publicAddress')
    }
    const synchronizer = await this.synchronizerPromise
    try {
      // We anticipate this to fail and return an error message we cna parse the spendable amount from
      await synchronizer.proposeTransfer({
        toAddress: publicAddress,
        zatoshi: this.availableZatoshi,
        memo: memos[0]?.value ?? ''
      })
    } catch (e) {
      const networkFee = extractFeeFromProposeTransferErrorString(String(e))
      return max(sub(this.availableZatoshi, networkFee), '0')
    }
    return this.availableZatoshi
  }

  async makeSpend(edgeSpendInfoIn: EdgeSpendInfo): Promise<EdgeTransaction> {
    const { edgeSpendInfo, currencyCode } = this.makeSpendCheck(edgeSpendInfoIn)
    const { memos = [], tokenId } = edgeSpendInfo
    const spendTarget = edgeSpendInfo.spendTargets[0]
    const { publicAddress, nativeAmount } = spendTarget

    if (publicAddress == null)
      throw new Error('makeSpend Missing publicAddress')
    if (nativeAmount == null) throw new NoAmountSpecifiedError()

    if (gte(nativeAmount, this.availableZatoshi)) {
      throw new InsufficientFundsError({ tokenId })
    }

    if (eq(nativeAmount, '0')) throw new NoAmountSpecifiedError()

    const synchronizer = await this.synchronizerPromise
    // If a ZIP-321 Payment URI is provided, use that flow instead:
    const zip321Uri: string | undefined = (edgeSpendInfo.otherParams as any)
      ?.zip321Uri
    if (zip321Uri != null) {
      this.log(`[ZEC propose] zip321Uri ${zip321Uri}`)
    }

    const proposal =
      zip321Uri != null
        ? await synchronizer.proposeFulfillingPaymentURI(zip321Uri)
        : await synchronizer.proposeTransfer({
            toAddress: publicAddress,
            zatoshi: nativeAmount,
            memo: memos[0]?.value ?? ''
          })

    const networkFee = proposal.totalFee
    this.log(
      '[ZEC propose] proposal result ' + JSON.stringify(proposal, null, 2)
    )

    const totalTxAmount = add(nativeAmount, networkFee)

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
      networkFee,
      networkFees: [],
      otherParams: {
        proposalBase64: proposal.proposalBase64
      },
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
    const { proposalBase64 } = getOtherParams(edgeTransaction)
    if (proposalBase64 == null) {
      throw new Error('Missing proposalBase64 from makeSpend')
    }
    const zcashPrivateKeys = asZcashPrivateKeys(this.pluginId)(
      opts?.privateKeys
    )

    const txParams: CreateTransferOpts = {
      proposalBase64,
      mnemonicSeed: zcashPrivateKeys.mnemonic
    }

    try {
      const synchronizer = await this.synchronizerPromise
      const txid = await synchronizer.createTransfer(txParams)
      if (typeof txid !== 'string') {
        throw new Error(txid.errorMessage)
      }
      edgeTransaction.txid = txid
      edgeTransaction.date = Date.now() / 1000
      this.warn(`SUCCESS broadcastTx\n${cleanTxLogs(edgeTransaction)}`)
    } catch (e: any) {
      this.warn('FAILURE broadcastTx failed: ', e)
      throw e
    }
    return edgeTransaction
  }

  async getAddresses(): Promise<EdgeAddress[]> {
    const getSynchronizerAddresses = async (): Promise<EdgeAddress[]> => {
      const synchronizer = await this.synchronizerPromise
      const { saplingAddress, transparentAddress, unifiedAddress } =
        await synchronizer.deriveUnifiedAddress()
      const addresses: EdgeAddress[] = [
        {
          addressType: 'unifiedAddress',
          publicAddress: unifiedAddress
        },
        {
          addressType: 'saplingAddress',
          publicAddress: saplingAddress
        },
        {
          addressType: 'transparentAddress',
          publicAddress: transparentAddress
        }
      ]

      this.otherData.cachedAddresses = addresses
      this.walletLocalDataDirty = true

      return addresses
    }

    if (this.otherData.cachedAddresses == null) {
      return await getSynchronizerAddresses()
    } else {
      getSynchronizerAddresses().catch(e => {
        throw e
      })
      return this.otherData.cachedAddresses
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
  const zcashIo =
    (env.nativeIo.zcash as ZcashIo) ??
    env.nativeIo['edge-currency-accountbased']?.zcash
  if (zcashIo == null) {
    throw new Error('Need zcash native IO')
  }

  const engine = new ZcashEngine(
    env,
    tools,
    safeWalletInfo,
    opts,
    zcashIo.makeSynchronizer
  )

  // Do any async initialization necessary for the engine
  await engine.loadEngine()

  return engine
}

/**
 * Parses error thrown from proposeTransfer and extracts spendable amount and fee
 * Example:	"Error while sending funds: Insufficient balance (have 780000, need 790000 including fee)"
 */
const extractFeeFromProposeTransferErrorString = (str: string): string => {
  const regex = /(\d+)/g
  const matches = str.match(regex)

  if (matches == null || matches.length !== 2) {
    throw new Error('Error parsing proposeTransfer error string')
  }
  const balance = parseInt(matches[0]).toString()
  const fee = sub(parseInt(matches[1]).toString(), balance)
  return fee
}
