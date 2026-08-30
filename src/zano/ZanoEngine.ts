import { abs, add, eq, gt, lt, mul, sub } from 'biggystring'
import { asJSON, asMaybe, asObject } from 'cleaners'
import {
  EdgeCurrencyEngine,
  EdgeCurrencyEngineOptions,
  EdgeEnginePrivateKeyOptions,
  EdgeMemo,
  EdgeSpendInfo,
  EdgeSpendTarget,
  EdgeTokenId,
  EdgeTransaction,
  EdgeTxAmount,
  EdgeWalletInfo,
  InsufficientFundsError,
  JsonObject,
  NoAmountSpecifiedError
} from 'edge-core-js/types'
import type {
  CppBridge,
  RecentTransaction,
  TransferParams,
  WalletDetails
} from 'zano-native'

import { CurrencyEngine } from '../common/CurrencyEngine'
import { PluginEnvironment } from '../common/innerPlugin'
import {
  LifecycleManager,
  makeLifecycleManager
} from '../common/lifecycleManager'
import { MakeTxParams } from '../common/types'
import { cleanTxLogs, safeParseInt } from '../common/utils'
import {
  makeWeightedSyncTracker,
  WeightedSyncTracker
} from '../common/WeightedSyncTracker'
import { resolvePaymentIdDestination } from './zanoPaymentId'
import { ZanoTools } from './ZanoTools'
import {
  asGetAliasDetailsResponse,
  asSafeZanoWalletInfo,
  asZanoBurnAssetParams,
  asZanoPrivateKeys,
  asZanoTransferParams,
  asZanoWalletOtherData,
  MakeMaxSpendParams,
  SafeZanoWalletInfo,
  ZanoNetworkInfo,
  ZanoOtherMethods,
  ZanoPrivateKeys,
  ZanoWalletOtherData
} from './zanoTypes'

/**
 * How often a synced wallet writes its file to disk. The native library only
 * stores on close, and a mobile app is killed rather than closed, so without
 * periodic stores every launch re-scans from wherever the file was last
 * written - a window that only grows.
 */
const WALLET_STORE_INTERVAL_MS = 10 * 60 * 1000

/**
 * How often a catching-up wallet checkpoints its progress to disk by cycling
 * through close and reopen. Balances the loss window on a kill against the
 * cost of a checkpoint: one interrupted block chunk, one file write, one
 * reopen.
 */
const CATCHUP_CHECKPOINT_INTERVAL_MS = 5 * 60 * 1000

/**
 * How far the wallet height may fall and still belong to the same catch-up
 * episode. The SDK re-scans a reorg in place up to a week of blocks deep
 * (`WALLET_CONCISE_MODE_MAX_REORG_BLOCKS`, at Zano's one-minute target);
 * past that it abandons its chain and rebuilds the wallet, which is a new
 * episode measured from wherever the rebuild lands. A checkpoint reopen
 * re-fetches at most one block chunk, so it stays far inside this.
 */
const CATCHUP_EPISODE_MAX_DIP = 7 * 24 * 60

/** The wallet RPC answers a successful store with a result object. */
const asStoreResponse = asObject({ result: asObject({}) })

/**
 * Converts the wallet status' `current_daemon_height` into a block height.
 *
 * The two height fields the Zano SDK reports are not in the same units.
 * `current_wallet_height` is the wallet's `get_top_block_height()`, a block
 * height, but `current_daemon_height` is the daemon's `getinfo` height, which
 * counts blocks and therefore sits one above the chain tip. Reporting the raw
 * count as our block height puts every transaction one confirmation ahead of
 * the chain, since both confirmation formulas are
 * `walletBlockHeight - txBlockHeight + 1`.
 *
 * Floors at zero so a disconnected daemon, which reports a height of zero,
 * cannot produce a negative block height.
 */
export const daemonHeightToBlockHeight = (daemonHeight: number): number =>
  Math.max(0, daemonHeight - 1)

export class ZanoEngine extends CurrencyEngine<
  ZanoTools,
  SafeZanoWalletInfo,
  WeightedSyncTracker
> {
  networkInfo: ZanoNetworkInfo
  otherData!: ZanoWalletOtherData

  unlockedBalanceMap: Map<EdgeTokenId, string>
  private readonly nativeId: LifecycleManager<number>
  private sendKeysToNative?: (keys: ZanoPrivateKeys) => void
  private needsNativeStorageClear: boolean = false
  private lastStoreTime: number = 0
  private lastCheckpointTime: number = 0
  private lastCheckpointHeight: number = 0
  private lastStoreHeight: number = 0
  /**
   * Bumped whenever the persistence gates are reset by a resync. A store or
   * checkpoint that was already in flight across the reset carries the old
   * value and must not write its pre-reset height back into the gates.
   */
  private storeGeneration: number = 0
  /**
   * True while `broadcastTx` holds a native id across its transfer call.
   * A checkpoint restart in that window would close the handle out from
   * under the broadcast and fail the user's send, so `checkpointCatchup`
   * defers while this is set.
   */
  private spendPending: boolean = false

  /**
   * The wallet height at which the current catch-up episode began, or -1
   * when the wallet is synced. The block ratio is measured against this,
   * so it stays monotonic across the checkpoint restarts and daemon
   * reconnects that reset the SDK's own per-session progress to zero.
   *
   * Until `catchupBaselineFrozen` is set, this chases the wallet height
   * instead of measuring from it: a freshly restored wallet reports height
   * ~0 until its first pull skips straight to the account birthday, and a
   * baseline caught before that skip would count the skip itself as most
   * of the work. See the catch-up branch of `syncNetwork`.
   */
  private catchupStartHeight: number = -1

  /**
   * Whether `catchupStartHeight` has stopped chasing the wallet height for
   * this episode. Set on the first tick where the SDK reports nonzero
   * session progress - real scanning, as opposed to the birthday skip,
   * which happens entirely inside "progress 0" territory because the
   * SDK's own meter starts at the birthday too.
   */
  private catchupBaselineFrozen: boolean = false

  constructor(
    env: PluginEnvironment<ZanoNetworkInfo>,
    tools: ZanoTools,
    walletInfo: SafeZanoWalletInfo,
    opts: EdgeCurrencyEngineOptions
  ) {
    super(env, tools, walletInfo, opts, makeWeightedSyncTracker)
    this.networkInfo = env.networkInfo

    this.unlockedBalanceMap = new Map()

    // This will receive the private keys on the first network sync:
    const keysPromise = new Promise<ZanoPrivateKeys>(resolve => {
      this.sendKeysToNative = resolve
    })

    // Initialize wallet lifecycle manager
    this.nativeId = makeLifecycleManager({
      onStart: async () => {
        // Block startup until the keys are ready:
        const keys = await keysPromise

        // Delete native wallet storage here in onStart rather than in
        // resyncBlockchain because:
        // 1. We need `keys.storagePath` which is only available after
        //    awaiting `keysPromise` above.
        // 2. The lifecycle manager serializes stop→start transitions,
        //    so this runs only after the previous wallet has fully closed,
        //    avoiding deletion of files while the native wallet is open.
        // 3. Placing the delete at the top of onStart guarantees the
        //    files are removed before the next startWallet call.
        if (this.needsNativeStorageClear) {
          this.needsNativeStorageClear = false
          try {
            await this.tools.zano.deleteWallet(keys.storagePath)
            this.log('Deleted native wallet storage for resync')
          } catch (error: unknown) {
            this.log.warn(
              'Failed to delete native wallet storage: ' + String(error)
            )
          }
        }

        try {
          await this.tools.zano.init(this.networkInfo.walletRpcAddress, -1)
          const response = await this.tools.zano.startWallet(
            keys.mnemonic,
            keys.passphrase ?? '',
            keys.storagePath,
            { log: message => this.log.warn(message) }
          )

          // The public key is derived from the seed phrase, in pure JS for
          // wallets without a passphrase. Fail loudly rather than sync a
          // wallet whose native address is not the one we show the user.
          if (response.wi.address !== this.walletInfo.keys.publicKey) {
            // `startWallet` left the wallet open, and the lifecycle manager
            // does not run `onStop` for an `onStart` that threw. Left open,
            // the next start gets ALREADY_EXISTS and adopts it below, and
            // every restart leaks another handle.
            try {
              await this.tools.zano.closeWallet(response.wallet_id)
            } catch (closeError: unknown) {
              this.log.warn(
                `initializeWallet: could not close the mismatched wallet: ${String(
                  closeError
                )}`
              )
            }
            throw new Error(
              'initializeWallet: native wallet address does not match the wallet public key'
            )
          }

          return response.wallet_id
        } catch (error: unknown) {
          if (!(error instanceof Error)) throw error
          if (!error.message.includes('ALREADY_EXISTS')) throw error

          this.log(
            `initializeWallet: wallet already exists, finding existing wallet`
          )

          // Find the wallet that matches our storage path
          const existingWallet = (await this.listOpenedWallets()).find(
            info => info.name === keys.storagePath
          )
          if (existingWallet?.wallet_id == null) {
            throw new Error(
              'initializeWallet: Wallet already exists but could not be found'
            )
          }

          // Adopting a wallet has to clear the same bar as opening one, or
          // the address check above is bypassed by anything that retries.
          if (existingWallet.wi?.address !== this.walletInfo.keys.publicKey) {
            throw new Error(
              'initializeWallet: existing native wallet address does not match the wallet public key'
            )
          }

          this.log(
            `initializeWallet: found existing wallet with ID ${existingWallet.wallet_id}`
          )

          // `startWallet` opens wallets with the refresh worker postponed,
          // so a wallet left open by an interrupted start may not be
          // syncing; the adopt path must start the worker itself.
          // `runWallet` is idempotent, and a failure here must throw:
          // returning the id would mark the lifecycle started and hand back
          // a wallet that never syncs, while throwing lets the next `get()`
          // retry the whole start.
          await this.tools.zano.runWallet(existingWallet.wallet_id)

          return existingWallet.wallet_id
        }
      },

      onStop: async (nativeId: number) => {
        await this.tools.zano.stopWallet(nativeId)
      },

      onError: error => {
        this.log.error('Wallet lifecycle error:', String(error))
      }
    })
  }

  /**
   * Lists the wallets the native library currently has open.
   *
   * `get_opened_wallets` reads its snapshot under a shared lock on the wallet
   * map and reports each wallet through `get_wallet_info_unlocked`, so unlike
   * the per-wallet calls it never waits on a wallet that is mid-refresh.
   */
  private async listOpenedWallets(): Promise<WalletDetails[]> {
    const response = await this.tools.zano.getOpenedWallets()
    if (!('result' in response) || response.result == null) {
      throw new Error('Could not list the opened Zano wallets')
    }
    return response.result
  }

  setOtherData(raw: any): void {
    this.otherData = asZanoWalletOtherData(raw)
  }

  async queryBalance(): Promise<void> {
    const nativeId = await this.nativeId.get()
    if (nativeId == null) return

    const balancesResponse = await this.tools.zano.getBalances(nativeId)

    const balances: {
      [key: string]: Awaited<
        ReturnType<CppBridge['getBalances']>
      >['balances'][0]
    } = {}
    for (const balanceObj of balancesResponse.balances) {
      balances[balanceObj.asset_info.asset_id] = balanceObj
    }

    const mainnetBalObj = balances[this.networkInfo.nativeAssetId]
    this.updateBalance(null, mainnetBalObj?.total.toString() ?? '0')
    this.unlockedBalanceMap.set(null, mainnetBalObj?.unlocked.toString() ?? '0')

    const detectedTokenIds: string[] = []
    for (const tokenId of Object.keys(this.allTokensMap)) {
      const tokenBalObj = balances[tokenId]
      if (tokenBalObj == null) continue

      this.updateBalance(tokenId, tokenBalObj.total.toString())
      this.unlockedBalanceMap.set(
        tokenId,
        tokenBalObj?.unlocked.toString() ?? '0'
      )

      if (gt(tokenBalObj.total.toString(), '0')) {
        detectedTokenIds.push(tokenId)
      }
    }

    if (detectedTokenIds.length > 0) {
      this.currencyEngineCallbacks.onNewTokens(detectedTokenIds)
    }

    this.syncTracker.updateBalanceRatio(1)
  }

  // The mempool sweep in `queryTransactions` surfaces an incoming transfer
  // while it is still unconfirmed, so it enters the store at blockHeight 0.
  // The base checkpoint math then treats that first sighting as already seen
  // ('0' never advances past a synced checkpoint) and the later confirmation
  // takes the update path, which never notifies, so the receive dropdown never
  // fires for a transfer this engine reports. Mirror the MoneroEngine and
  // ZcashEngine fix: an incoming unconfirmed transaction seen after the
  // first-ever sync is new. The same multi-device caveat applies, since a
  // second device syncing the same account tracks its own checkpoint.
  protected isTransactionNew(edgeTransaction: EdgeTransaction): boolean {
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

  async queryTransactions(): Promise<void> {
    const nativeId = await this.nativeId.get()
    if (nativeId == null) return

    // A resync that lands while a fetch below is in flight has already
    // emptied the transaction cache and zeroed the cursor. Processing the
    // stale page -- or worse, writing the old cursor back -- would leave the
    // cleared history permanently unfetched, so bail out and let the next
    // sync pass start from the reset state:
    const generation = this.storeGeneration

    let offset = this.otherData.transactionQueryOffset
    while (true) {
      const page = await this.tools.zano.getTransactions(nativeId, offset)
      if (generation !== this.storeGeneration) return
      const transfers = page.transfers ?? []
      transfers.forEach(this.processTransaction)

      const lastItemIndex = page.last_item_index
      const totalTransfers = page.total_transfers
      if (offset !== lastItemIndex) {
        this.otherData.transactionQueryOffset = lastItemIndex
        this.walletLocalDataDirty = true
      }

      // Stop when the page did not move us forward. `last_item_index` counts
      // only the transfers the wallet actually returned, so a page whose
      // newest entries were all filtered out -- mining and defragmentation
      // transactions are excluded by request -- leaves it permanently short of
      // `total_transfers - 1`. Testing that identity alone spun this loop
      // forever on such a wallet, re-requesting one page and starving every
      // later balance and transaction update for it.
      if (
        totalTransfers === 0 ||
        lastItemIndex <= offset ||
        lastItemIndex + 1 >= totalTransfers
      ) {
        break
      }

      this.syncTracker.updateHistoryRatio(lastItemIndex / totalTransfers)
      offset = lastItemIndex
    }

    // Sweep the mempool last. `get_recent_txs_and_info3` prepends the
    // wallet's unconfirmed transfers only when the offset is zero, so once a
    // wallet has any confirmed history the paged catch-up above can never
    // see a transaction before it is mined: an incoming transfer stays
    // invisible to the receiver, and the sender has nothing to confirm its
    // own. Sweeping after the paging rather than before means the pool
    // snapshot is as fresh as possible -- the loop can run long on a large
    // catch-up, and a transfer that arrives mid-pass is caught this cycle
    // instead of next. When the loop's final page WAS offset zero -- a new
    // wallet, or one whose cursor never advances past it -- that fetch
    // already carried the unconfirmed transfers, so repeating it here would
    // just re-run the same RPC and the same processing every sync tick:
    if (offset !== 0) {
      const pendingPage = await this.tools.zano.getTransactions(nativeId, 0)
      if (generation !== this.storeGeneration) return
      const pendingTransfers = pendingPage.transfers ?? []
      pendingTransfers.forEach(this.processTransaction)
    }

    this.sendTransactionEvents()
    this.syncTracker.updateHistoryRatio(1)
  }

  processTransaction = (tx: RecentTransaction): void => {
    const { comment, fee } = tx

    const memos: EdgeMemo[] = []
    if (comment != null && comment !== '') {
      memos.push({
        memoName: 'comment',
        type: 'text',
        value: comment
      })
    }

    // Amounts come grouped by intrinsic payment id and then by asset --
    // the API documents the groups as the essential part of the entry --
    // while employed_entries can be empty, especially for emit/mint
    // operations like BTCx bridging. The empty-string id groups a
    // transaction's id-less amounts, which includes a sender's own spent
    // inputs and change, so the ids seen here are those delivered TO this
    // wallet - a sent transfer's recipient ids never appear. Sends keep
    // theirs through the carry-forward below instead.
    const nativeAmountMap = new Map<string, string>()
    const paymentIds = new Set<string>()
    const groups = tx.subtransfers_by_pid ?? []
    for (const group of groups) {
      if (group.payment_id !== '') paymentIds.add(group.payment_id)
      for (const transfer of group.subtransfers) {
        const { asset_id: assetId, amount } = transfer
        const currentAmount = nativeAmountMap.get(assetId) ?? '0'
        if (transfer.is_income) {
          nativeAmountMap.set(assetId, add(currentAmount, amount.toFixed()))
        } else {
          nativeAmountMap.set(assetId, sub(currentAmount, amount.toFixed()))
        }
      }
    }
    for (const paymentId of paymentIds) {
      memos.push({
        memoName: 'paymentId',
        type: 'hex',
        value: paymentId
      })
    }
    if (nativeAmountMap.size === 0) {
      // Fallback to employed_entries for backward compatibility
      for (const entry of tx.employed_entries.receive ?? []) {
        const { asset_id: assetId, amount } = entry
        const currentAmount = nativeAmountMap.get(assetId) ?? '0'
        nativeAmountMap.set(assetId, add(currentAmount, amount.toFixed()))
      }
      for (const entry of tx.employed_entries.spent ?? []) {
        const { asset_id: assetId, amount } = entry
        const currentAmount = nativeAmountMap.get(assetId) ?? '0'
        nativeAmountMap.set(assetId, sub(currentAmount, amount.toFixed()))
      }
    }

    for (const [assetId, nativeAmount] of nativeAmountMap.entries()) {
      const ourReceiveAddresses: string[] = []

      // Zano asset_id is analogous to Edge tokenId
      const tokenId: EdgeTokenId =
        assetId === this.networkInfo.nativeAssetId ? null : assetId
      const currencyCode = this.getCurrencyCode(tokenId)
      if (currencyCode == null) continue

      const isSend = lt(nativeAmount, '0')
      const isMainnet = tokenId == null
      let networkFee = '0'
      let parentNetworkFee: string | undefined
      const networkFees: EdgeTxAmount[] = []

      if (isSend) {
        if (isMainnet) {
          networkFee = fee.toFixed()
          networkFees.push({ tokenId: null, nativeAmount: networkFee })
        } else {
          parentNetworkFee = fee.toFixed()
          networkFees.push({ tokenId: null, nativeAmount: parentNetworkFee })
        }
      } else {
        ourReceiveAddresses.push(this.walletInfo.keys.publicKey)
      }

      // A sent transfer's payment id exists only in the record saved at
      // broadcast: the history entry cannot carry it, since the wallet's
      // own balance changes all land in the empty-id group. addTransaction
      // replaces the stored record wholesale on update, so carry the saved
      // memos forward rather than letting the rebuild erase them:
      let txMemos = memos
      if (isSend && paymentIds.size === 0) {
        const saved = this.findSavedMemos(tokenId, tx.tx_hash)
        if (saved != null) txMemos = saved
      }

      const edgeTransaction: EdgeTransaction = {
        blockHeight: tx.height,
        currencyCode,
        date: tx.timestamp,
        isSend,
        memos: txMemos,
        nativeAmount,
        networkFee,
        networkFees,
        ourReceiveAddresses,
        parentNetworkFee,
        signedTx: '',
        tokenId,
        txid: tx.tx_hash,
        walletId: this.walletId
      }

      this.addTransaction(tokenId, edgeTransaction)
    }
  }

  /**
   * The memos of the already-stored copy of a transaction, or undefined
   * when it is unknown or memo-less. Lets a history rebuild keep what only
   * the broadcast-time save knew.
   */
  private findSavedMemos(
    tokenId: EdgeTokenId,
    txid: string
  ): EdgeMemo[] | undefined {
    const index = this.findTransaction(tokenId, txid.toLowerCase())
    if (index < 0) return undefined
    const memos = this.transactionList[tokenId ?? ''][index]?.memos
    if (memos == null || memos.length === 0) return undefined
    return memos
  }

  async syncNetwork(opts: EdgeEnginePrivateKeyOptions): Promise<number> {
    if (!this.engineOn) return 1000

    if (this.sendKeysToNative != null) {
      this.sendKeysToNative(
        asZanoPrivateKeys(this.currencyInfo.pluginId)(opts.privateKeys)
      )
    }
    const nativeId = await this.nativeId.get()
    if (nativeId == null) return 1000

    const status = await this.tools.zano.getWalletStatus(nativeId)
    const daemonBlockHeight = daemonHeightToBlockHeight(
      status.current_daemon_height
    )
    const blockheight = Math.max(
      status.current_wallet_height,
      daemonBlockHeight
    )
    this.updateBlockHeight(blockheight)

    // Judge sync by heights, not by the SDK's state or progress. The
    // wallet reports `wallet_state` "ready" from open until the refresh
    // worker's first pass, and again between passes, so one 1-second poll
    // landing in that window read a freshly restored wallet - weeks of
    // blocks behind - as fully synced: the ratio latched at 1 and went
    // silent for the whole scan, and this branch's store and checkpoint
    // reset ran mid-scan. Heights cannot flicker. A daemon height of zero
    // means the daemon is not connected yet, which is not "synced" either:
    const synced =
      daemonBlockHeight > 0 && status.current_wallet_height >= daemonBlockHeight

    if (synced) {
      this.resetCatchupState()
      this.syncTracker.updateBlockRatio(
        1,
        status.current_wallet_height,
        daemonBlockHeight
      )
      await this.tools.zano.whitelistAssets(
        nativeId,
        Object.keys(this.allTokensMap)
      )
      await this.queryBalance()
      await this.queryTransactions()
      await this.storeWalletFile(nativeId, status.current_wallet_height)
      return 20000
    } else {
      // Measure the episode, not the SDK's session. `status.progress`
      // restarts at zero on every refresh pass - after each checkpoint
      // reopen, and on reconnects - and only measures the remaining gap,
      // so it saw-toothed the GUI's circle backward every few minutes. The
      // height where this episode began is stable across all of that. Only
      // a wallet that restarted from scratch begins a new episode; a
      // shallower dip is a reorg the SDK re-scans in place, and rebasing on
      // it would restart the measurement - and, by clearing the freeze
      // below, report zero until the chase caught up again:
      if (
        this.catchupStartHeight < 0 ||
        status.current_wallet_height <
          this.catchupStartHeight - CATCHUP_EPISODE_MAX_DIP
      ) {
        this.catchupStartHeight = status.current_wallet_height
        this.catchupBaselineFrozen = false
      }
      // The ratio must measure only the work behind the wallet's birthday:
      // a new wallet with a birthday at 75000 against a tip of 100000 is
      // 0% done, not 75%, and reaching 80000 is 20%. The wallet reports
      // height ~0 until its first pull jumps to the birthday, so chase the
      // height upward while the SDK's session progress reads zero - the
      // skip happens entirely in that window, since the SDK's own meter
      // starts at the birthday too - and freeze the baseline at the first
      // sign of real scanning. Session progress is an integer percent, so
      // at most 1% of the gap is absorbed before the freeze. Checkpoint
      // reopens reset session progress to zero, but the frozen flag holds
      // across them, since their re-fetched chunk cannot dip the height far
      // enough to start a new episode above:
      if (!this.catchupBaselineFrozen) {
        if (status.progress > 0) {
          this.catchupBaselineFrozen = true
        } else if (status.current_wallet_height > this.catchupStartHeight) {
          this.catchupStartHeight = status.current_wallet_height
        }
      }
      const scanned = status.current_wallet_height - this.catchupStartHeight
      const target = daemonBlockHeight - this.catchupStartHeight
      // Clamp so a reorg that dips below the baseline cannot feed a
      // negative ratio into the tracker, rather than resting on the rebase
      // check above running first, as `MoneroEngine` does for the same
      // reason:
      this.syncTracker.updateBlockRatio(
        target > 0 ? Math.max(0, scanned / target) : 0,
        status.current_wallet_height,
        daemonBlockHeight
      )
      await this.checkpointCatchup(status.current_wallet_height)
      return 1000
    }
  }

  /**
   * Persists catch-up progress by cycling the wallet through the lifecycle
   * manager: the close interrupts the refresh worker at its next block
   * chunk, stores the partially-synced state, and the reopen resumes the
   * scan from that stored height. Without this, a scan that does not finish
   * before the app is killed persists nothing, and the next launch re-pays
   * the entire catch-up from wherever the file was last written.
   *
   * A plain `store` cannot do this: the refresh worker holds the per-wallet
   * lock for the whole scan, so a store only lands once the scan finishes --
   * exactly when it is no longer needed. Closing is the one path that
   * interrupts the scan (`wallet2::refresh` checks its stop flag before
   * every block chunk) and stores what it has.
   *
   * Gated on the wallet height having advanced, so a wallet stalled on a
   * dead daemon does not churn through restarts, and on an interval, so the
   * cost -- one re-fetched block chunk, one file write, one reopen -- stays
   * a rounding error next to the scan itself.
   */
  private async checkpointCatchup(walletHeight: number): Promise<void> {
    const now = Date.now()
    if (this.lastCheckpointTime === 0) {
      // First sight of a catching-up wallet: it just loaded from disk, so
      // there is nothing new to persist yet. Start the clock.
      this.lastCheckpointTime = now
      this.lastCheckpointHeight = walletHeight
      return
    }
    if (now - this.lastCheckpointTime < CATCHUP_CHECKPOINT_INTERVAL_MS) return
    if (walletHeight <= this.lastCheckpointHeight) return
    // A broadcast in flight holds the native id it already resolved, and
    // the restart below would close that handle out from under it. Defer
    // without touching the gates, so the checkpoint fires on the first tick
    // after the spend clears rather than waiting out another interval:
    if (this.spendPending) return

    this.log(
      `checkpointCatchup: persisting catch-up progress at height ${walletHeight}`
    )
    const generation = this.storeGeneration
    this.nativeId.stop()
    const nativeId = await this.nativeId.get()
    // A resync between the stop and the reopen reset the gates for a wallet
    // that no longer holds this height. Writing them back would gate the
    // rebuilt wallet at a tip it has not re-reached, disabling checkpoints
    // for the entire rescan -- the costliest scan there is:
    if (generation !== this.storeGeneration) return
    // Reset the clock even on a failed restart, so a wallet that cannot
    // reopen retries on the interval rather than every second:
    this.lastCheckpointTime = Date.now()
    this.lastCheckpointHeight = walletHeight
    if (nativeId == null) {
      this.log.warn('checkpointCatchup: wallet did not reopen; will retry')
    }
  }

  /**
   * Forgets everything scoped to one catch-up episode: the checkpoint
   * gates, so the next episode - after a long background gap, or a burst
   * of blocks - does not fire a restart on its first tick because the
   * gates still hold a stale time and height, and the ratio baseline, so
   * it measures the next episode's own work. Called when the wallet
   * reaches synced and when a resync throws its history away; keeping both
   * halves here means a new field cannot be added to one caller and
   * forgotten in the other.
   */
  private resetCatchupState(): void {
    this.lastCheckpointTime = 0
    this.lastCheckpointHeight = 0
    this.catchupStartHeight = -1
    this.catchupBaselineFrozen = false
  }

  /**
   * Persists the native wallet file, so the next launch resumes from this
   * height instead of re-scanning everything since the file was last
   * written. Called only from the synced branch of `syncNetwork`, where the
   * refresh worker is idle and the per-wallet lock is free; a store during
   * the catch-up scan would block behind that lock. Throttled, and skipped
   * entirely when the wallet height has not advanced past the last store. A
   * failure only costs the next launch a longer catch-up, so it logs and
   * moves on.
   */
  private async storeWalletFile(
    nativeId: number,
    walletHeight: number
  ): Promise<void> {
    if (walletHeight <= this.lastStoreHeight) return
    const now = Date.now()
    if (
      this.lastStoreTime !== 0 &&
      now - this.lastStoreTime < WALLET_STORE_INTERVAL_MS
    ) {
      return
    }
    const generation = this.storeGeneration
    try {
      const response = await this.tools.zano.invoke(
        nativeId,
        JSON.stringify({ method: 'store', params: {} })
      )
      if (asMaybe(asJSON(asStoreResponse))(response) == null) {
        throw new Error(response)
      }
      // A resync between the call and its answer reset the gates for a
      // wallet that no longer holds this height. Recording it would gate the
      // rebuilt wallet at a tip it has not re-reached, so a kill before the
      // chain advances would re-pay the whole rescan.
      if (generation !== this.storeGeneration) return
      this.lastStoreTime = now
      this.lastStoreHeight = walletHeight
    } catch (error: unknown) {
      this.log.warn(`storeWalletFile failed: ${String(error)}`)
    }
  }

  // // ****************************************************************************
  // // Public methods
  // // ****************************************************************************

  async resyncBlockchain(): Promise<void> {
    this.needsNativeStorageClear = true
    // The rebuilt wallet re-earns every height, so the store gates must not
    // carry over: left in place they would skip the first store at the
    // re-reached tip, and a kill in that window re-pays the full rescan.
    this.lastStoreTime = 0
    this.lastStoreHeight = 0
    this.resetCatchupState()
    this.storeGeneration += 1
    this.nativeId.stop()
    this.unlockedBalanceMap.clear()
    await this.killEngine()
    this.syncTracker.resetSync()
    await this.clearBlockchainCache()
    await this.startEngine()
  }

  async killEngine(): Promise<void> {
    this.nativeId.stop()
    await super.killEngine()
  }

  getDisplayPublicSeed(): string {
    /** Return the private view key */
    const realGetDisplayPublicSeed = async (): Promise<string> => {
      try {
        const nativeId = await this.nativeId.get()
        if (nativeId == null) {
          throw new Error('Wallet is not running, cannot get view key')
        }

        // `getOpenedWallets` reads the view key without taking the per-wallet
        // lock, while `getWalletInfo` blocks on it with no timeout. The app
        // asks for this key for every wallet shortly after login, so the
        // locking call can stall the whole native queue behind a wallet that
        // is mid-refresh.
        const entry = (await this.listOpenedWallets()).find(
          wallet => wallet.wallet_id === nativeId
        )
        const viewKey = entry?.wi?.view_sec_key
        if (viewKey == null || viewKey === '') {
          // Not a bug so much as a race: the wallet closed, or was still
          // opening, between our id being handed out and this snapshot.
          throw new Error(
            `Zano wallet ${nativeId} was not in the opened-wallet list`
          )
        }
        return viewKey
      } catch (error: unknown) {
        // `JSON.stringify` on an Error yields `{}`, so every failure here
        // used to report the same empty cause.
        throw new Error('Failed to get the wallet view key: ' + String(error))
      }
    }

    // HACK: We implemented `getDisplayPublicSeed` as an async fn.
    // This is OK because the core currently calls that method with an await.
    // @ts-expect-error
    return realGetDisplayPublicSeed()
  }

  async getMaxSpendable(edgeSpendInfo: EdgeSpendInfo): Promise<string> {
    const { tokenId } = edgeSpendInfo

    const feeNumber = await this.tools.zano.getCurrentTxFee(2)
    const networkFee = feeNumber.toFixed()
    const zanoAvailableBalance = this.unlockedBalanceMap.get(null) ?? '0'

    if (lt(zanoAvailableBalance, networkFee)) {
      throw new InsufficientFundsError({ tokenId: null })
    }

    if (tokenId == null) {
      return sub(zanoAvailableBalance, networkFee)
    } else {
      const assetAvailableBalance = this.unlockedBalanceMap.get(tokenId) ?? '0'
      if (eq(assetAvailableBalance, '0')) {
        throw new InsufficientFundsError({ tokenId })
      }

      return assetAvailableBalance
    }
  }

  async makeSpend(edgeSpendInfoIn: EdgeSpendInfo): Promise<EdgeTransaction> {
    const { edgeSpendInfo, currencyCode } = this.makeSpendCheck(edgeSpendInfoIn)
    const { memos = [], tokenId } = edgeSpendInfo

    let nativeAmountTotal = '0'
    const cleanTargets: Array<
      Required<Pick<EdgeSpendTarget, 'publicAddress' | 'nativeAmount'>>
    > = []
    for (const spendTarget of edgeSpendInfo.spendTargets) {
      const { publicAddress, nativeAmount } = spendTarget

      if (publicAddress == null)
        throw new Error('makeSpend Missing publicAddress')
      if (nativeAmount == null) throw new NoAmountSpecifiedError()
      if (eq(nativeAmount, '0')) throw new NoAmountSpecifiedError()

      cleanTargets.push({
        publicAddress,
        nativeAmount
      })
      nativeAmountTotal = add(nativeAmountTotal, nativeAmount)
    }

    const feeNumber = await this.tools.zano.getCurrentTxFee(2)

    const availableBalance = this.unlockedBalanceMap.get(tokenId) ?? '0'
    const availableZanoBalance = this.unlockedBalanceMap.get(null) ?? '0'

    let networkFee = feeNumber.toFixed()
    let parentNetworkFee: string | undefined
    let totalTxAmount = nativeAmountTotal
    if (tokenId == null) {
      totalTxAmount = add(nativeAmountTotal, networkFee)
      if (gt(totalTxAmount, availableBalance)) {
        throw new InsufficientFundsError({ tokenId })
      }
    } else {
      parentNetworkFee = networkFee
      networkFee = '0'
      totalTxAmount = nativeAmountTotal

      if (gt(nativeAmountTotal, availableBalance)) {
        throw new InsufficientFundsError({ tokenId })
      }
      if (gt(parentNetworkFee, availableZanoBalance)) {
        throw new InsufficientFundsError({ tokenId: null })
      }
    }

    const comment = memos.find(memo => memo.memoName === 'comment')?.value
    const paymentId = memos.find(memo => memo.memoName === 'paymentId')?.value

    // Since HF6 the node rejects the request-level payment id, so a payment
    // id memo is delivered by folding it into the destination address
    // instead -- exchanges still hand out a plain address and an id
    // separately. With several destinations there is no way to know which
    // one the id belongs to, so that combination is refused.
    if (paymentId != null && cleanTargets.length > 1) {
      throw new Error(
        'A Zano spend with a payment id supports a single destination'
      )
    }

    const assetId = tokenId != null ? tokenId : this.networkInfo.nativeAssetId

    const otherParams: TransferParams = {
      transfers: cleanTargets.map(st => ({
        assetId,
        nativeAmount: safeParseInt(abs(st.nativeAmount)),
        recipient:
          paymentId == null
            ? st.publicAddress
            : resolvePaymentIdDestination(st.publicAddress, paymentId)
      })),

      comment,
      fee: feeNumber
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
      networkFees: [
        { tokenId: null, nativeAmount: parentNetworkFee ?? networkFee }
      ],
      parentNetworkFee,
      otherParams,
      ourReceiveAddresses: [],
      signedTx: '',
      tokenId,
      txid: '',
      walletId: this.walletId
    }

    return edgeTransaction
  }

  async signTx(
    edgeTransaction: EdgeTransaction,
    privateKeys: JsonObject
  ): Promise<EdgeTransaction> {
    // Transaction is signed and broadcast at the same time
    return edgeTransaction
  }

  async broadcastTx(
    edgeTransaction: EdgeTransaction
  ): Promise<EdgeTransaction> {
    // Hold checkpoints off for the whole broadcast: a checkpoint restart
    // between the `get` below and the transfer would close the native id
    // this method already resolved, failing the send. Set before the `get`
    // so no checkpoint can slip in between it and the transfer.
    this.spendPending = true
    try {
      const nativeId = await this.nativeId.get()
      if (nativeId == null) throw new Error('Wallet is not running')

      let txid: string | undefined
      try {
        const burnAssetParams = asMaybe(asZanoBurnAssetParams)(
          edgeTransaction.otherParams
        )
        if (burnAssetParams != null) {
          txid = await this.tools.zano.burnAsset(nativeId, burnAssetParams)
        } else {
          const transferParams = asZanoTransferParams(
            edgeTransaction.otherParams
          )
          txid = await this.tools.zano.transfer(nativeId, transferParams)
        }

        edgeTransaction.txid = txid
        edgeTransaction.date = Date.now() / 1000
        this.warn(`SUCCESS broadcastTx\n${cleanTxLogs(edgeTransaction)}`)
        return edgeTransaction
      } catch (e: any) {
        this.warn('FAILURE broadcastTx failed: ', e)
        throw e
      }
    } finally {
      this.spendPending = false
    }
  }

  /**
   * Resolve Zano aliases, for example: "@bob"
   */
  private async resolveName(alias: string): Promise<string> {
    const { walletRpcAddress } = this.networkInfo

    if (!alias.startsWith('@')) {
      throw new Error('Invalid Zano alias: ' + alias)
    }

    // Remove the @ prefix
    const aliasParam = alias.replace('@', '')

    const response = await this.tools.io.fetch(`${walletRpcAddress}/json_rpc`, {
      method: 'POST',
      body: JSON.stringify({
        method: 'get_alias_details',
        params: { alias: aliasParam }
      })
    })

    if (!response.ok) {
      const message = await response.text()
      throw new Error(message)
    }

    const json: unknown = await response.json()
    const data = asGetAliasDetailsResponse(json)

    return data.result.alias_details.address
  }

  otherMethods: ZanoOtherMethods = {
    resolveName: this.resolveName.bind(this),
    makeMaxSpend: async (
      params: MakeMaxSpendParams
    ): Promise<EdgeTransaction> => {
      const { metadata } = params
      const publicAddress = params.spendTargets[0]?.publicAddress
      if (publicAddress == null) throw new Error('Missing publicAddress')

      const tokenIdsSet = new Set<EdgeTokenId>(
        params.tokenIds.map(tokenId =>
          tokenId === this.networkInfo.nativeAssetId ? null : tokenId
        )
      )
      const tokenIds = Array.from(tokenIdsSet)
      if (tokenIds.length === 0) {
        throw new Error('No tokenIds provided')
      }

      const feeNumber = await this.tools.zano.getCurrentTxFee(2)
      const networkFee = feeNumber.toFixed()
      const zanoBalance = this.unlockedBalanceMap.get(null) ?? '0'
      if (lt(zanoBalance, networkFee)) {
        throw new InsufficientFundsError({ tokenId: null })
      }

      const transfers: TransferParams['transfers'] = []
      const includesNative = tokenIds.includes(null)
      if (includesNative) {
        const zanoSendAmount = sub(zanoBalance, networkFee)
        if (!gt(zanoSendAmount, '0')) {
          throw new InsufficientFundsError({ tokenId: null })
        }
        transfers.push({
          assetId: this.networkInfo.nativeAssetId,
          nativeAmount: safeParseInt(zanoSendAmount),
          recipient: publicAddress
        })
      }

      for (const tokenId of tokenIds) {
        if (tokenId == null) continue
        const tokenBalance = this.unlockedBalanceMap.get(tokenId) ?? '0'
        if (eq(tokenBalance, '0')) {
          throw new InsufficientFundsError({ tokenId })
        }
        transfers.push({
          assetId: tokenId,
          nativeAmount: safeParseInt(tokenBalance),
          recipient: publicAddress
        })
      }

      if (transfers.length === 0) {
        throw new InsufficientFundsError({ tokenId: null })
      }

      const out: EdgeTransaction = {
        blockHeight: 0,
        currencyCode: this.currencyInfo.currencyCode,
        date: Date.now() / 1000,
        isSend: true,
        memos: [],
        metadata,
        nativeAmount: includesNative
          ? mul(zanoBalance, '-1')
          : mul(networkFee, '-1'),
        networkFee,
        networkFees: [{ tokenId: null, nativeAmount: networkFee }],
        otherParams: {
          transfers,
          fee: feeNumber
        },
        ourReceiveAddresses: [],
        signedTx: '',
        tokenId: null,
        txid: '',
        walletId: this.walletId
      }
      return out
    },
    makeTx: async (makeTxParams: MakeTxParams): Promise<EdgeTransaction> => {
      if (makeTxParams.type === 'MakeTx') {
        const { unsignedTx, metadata } = makeTxParams

        const decoder = new TextDecoder()
        const transaction = JSON.parse(decoder.decode(unsignedTx))

        const burnAssetParams = asMaybe(asZanoBurnAssetParams)(transaction)
        if (burnAssetParams == null) {
          throw new Error('Invalid transaction')
        }

        const tokenId = burnAssetParams.assetId
        const currencyCode = this.getCurrencyCode(tokenId)
        if (currencyCode == null) throw new Error('Unknown tokenId')

        const nativeAmount = burnAssetParams.burnAmount.toString()

        const networkFee = '0'
        const feeNumber = await this.tools.zano.getCurrentTxFee(2)
        const parentNetworkFee = feeNumber.toFixed()

        const availableBalance = this.unlockedBalanceMap.get(tokenId) ?? '0'
        const availableZanoBalance = this.unlockedBalanceMap.get(null) ?? '0'

        if (gt(nativeAmount, availableBalance)) {
          throw new InsufficientFundsError({ tokenId })
        }
        if (gt(parentNetworkFee, availableZanoBalance)) {
          throw new InsufficientFundsError({ tokenId: null })
        }

        const out: EdgeTransaction = {
          assetAction: metadata?.assetAction,
          savedAction: metadata?.savedAction,
          blockHeight: 0,
          currencyCode,
          date: Date.now() / 1000,
          isSend: true,
          memos: [],
          nativeAmount: `-${nativeAmount}`,
          networkFee,
          networkFees: [{ tokenId: null, nativeAmount: parentNetworkFee }],
          otherParams: burnAssetParams,
          ourReceiveAddresses: [],
          signedTx: '',
          tokenId,
          txid: '',
          walletId: this.walletId
        }
        return out
      } else {
        throw new Error('Unrecognized makeTx type')
      }
    }
  }
}

export async function makeCurrencyEngine(
  env: PluginEnvironment<ZanoNetworkInfo>,
  tools: ZanoTools,
  walletInfo: EdgeWalletInfo,
  opts: EdgeCurrencyEngineOptions
): Promise<EdgeCurrencyEngine> {
  const safeWalletInfo = asSafeZanoWalletInfo(walletInfo)
  const engine = new ZanoEngine(env, tools, safeWalletInfo, opts)

  await engine.loadEngine()

  return engine
}
