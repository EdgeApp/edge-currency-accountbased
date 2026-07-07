import { add, eq, gt, lt, mul, sub } from 'biggystring'
import { asMaybe, asNumber } from 'cleaners'
import {
  EdgeCurrencyEngine,
  EdgeCurrencyEngineOptions,
  EdgeEnginePrivateKeyOptions,
  EdgeFetchFunction,
  EdgeMemo,
  EdgeSpendInfo,
  EdgeTransaction,
  EdgeWalletInfo,
  InsufficientFundsError,
  JsonObject,
  NoAmountSpecifiedError,
  PendingFundsError
} from 'edge-core-js/types'
import type { TransactionDirection, WalletBackend } from 'react-native-monero'
import { base64, base64url } from 'rfc4648'

import { CurrencyEngine } from '../common/CurrencyEngine'
import { PluginEnvironment } from '../common/innerPlugin'
import {
  LifecycleManager,
  makeLifecycleManager
} from '../common/lifecycleManager'
import {
  cleanTxLogs,
  makeEngineFetch,
  makeMutex,
  matchJson,
  normalizeAddress
} from '../common/utils'
import {
  makeWeightedSyncTracker,
  WeightedSyncTracker
} from '../common/WeightedSyncTracker'
import { MoneroTools } from './MoneroTools'
import {
  AddressInfoResponse,
  asAddressInfoResponse,
  asLoginResponse,
  asMoneroInitOptions,
  asMoneroPrivateKeys,
  asMoneroUserSettings,
  asMoneroWalletOtherData,
  asMoneroWalletSettings,
  asSafeMoneroWalletInfo,
  LoginResponse,
  MoneroInitOptions,
  MoneroNetworkInfo,
  MoneroPrivateKeys,
  MoneroUserSettings,
  MoneroWalletOtherData,
  MoneroWalletSettings,
  SafeMoneroWalletInfo,
  translateFee
} from './moneroTypes'

// Poll intervals (ms) returned by syncNetwork:
const SYNC_POLL_MS = 1000 // actively syncing / backfilling
const SYNCED_POLL_MS = 20000 // caught up to chain tip
const ERROR_POLL_MS = 5000 // back off after a sync error

// How long a formerly-pending tx must stay missing (from both the pending set
// and confirmed history) before it is considered evicted from the pool:
export const DROPPED_TX_GRACE_MS = 30 * 60 * 1000

// Accept a lower reported network height only when it regresses by more than
// this many blocks. Small dips (a load-balanced daemon a block behind, lwsf
// reporting the stored scan height until its first refresh) are smoothed so
// confirmation counts do not bounce, while a large regression is taken as a
// correction so one garbage reading cannot ratchet the stored height forever:
const HEIGHT_REGRESSION_BOUND = 1000

// How often to refresh the pool-watch stamp of a tx that is still in the pool.
// Millisecond freshness buys nothing against a 30-minute grace, and a fresh
// stamp every pass would rewrite walletLocalData on every save loop:
const PENDING_SEEN_REFRESH_MS = 5 * 60 * 1000

// How often to refresh a still-pending tx's otherParams.lastSeenTime (seconds).
// The base engine independently drops an unconfirmed tx once that stamp is
// older than 24 hours, and a pool residence can outlast that (monerod keeps
// transactions for around three days), so it must be refreshed periodically;
// hourly keeps the refresh-triggered change events negligible:
const LAST_SEEN_REFRESH_S = 60 * 60

/**
 * Converts an Edge walletId (standard base64) into the form the native monero
 * layer expects. The native code embeds the id in a filesystem path and rejects
 * any character outside [A-Za-z0-9_-], so we re-encode as base64url and strip
 * the '=' padding.
 */
const asNativeWalletId = (walletId: string): string =>
  base64url.stringify(base64.parse(walletId), { pad: false })

export class MoneroEngine extends CurrencyEngine<
  MoneroTools,
  SafeMoneroWalletInfo,
  WeightedSyncTracker
> {
  networkInfo: MoneroNetworkInfo
  currentSettings: MoneroUserSettings
  currentWalletSettings: MoneroWalletSettings
  otherData!: MoneroWalletOtherData
  initOptions: MoneroInitOptions
  unlockedBalance: string
  private readonly engineFetch: EdgeFetchFunction
  private readonly nativeWalletId: LifecycleManager<string>
  private sendKeysToNative?: (keys: MoneroPrivateKeys) => void
  private syncStartHeight: number | undefined
  private txSortOrder: 'asc' | 'desc' = 'asc'
  private readonly queryTxMutex = makeMutex()
  private pendingSeenReset = false
  private unsubscribeWalletEvent?: () => void
  private unsubscribeNymFetch?: () => Promise<void>
  private abortKeysWait?: () => void
  private settingsChangeQueue: Promise<void> = Promise.resolve()

  constructor(
    env: PluginEnvironment<MoneroNetworkInfo>,
    tools: MoneroTools,
    walletInfo: SafeMoneroWalletInfo,
    initOptions: JsonObject,
    opts: EdgeCurrencyEngineOptions
  ) {
    super(env, tools, walletInfo, opts, makeWeightedSyncTracker)
    this.networkInfo = env.networkInfo
    this.initOptions = asMoneroInitOptions(initOptions)

    this.unlockedBalance = '0'

    // Shared across all wallets using this engine:
    this.currentSettings = asMoneroUserSettings(opts.userSettings)
    // Unique to this particular wallet instance:
    this.currentWalletSettings = asMoneroWalletSettings(
      opts.walletSettings ?? {}
    )

    // Fetch wrapper that re-evaluates the user's networkPrivacy choice
    // on every request, so changes via Currency Settings take effect
    // without restarting the engine.
    this.engineFetch = makeEngineFetch(env.io, () => {
      return this.currentSettings.networkPrivacy === 'nym'
        ? { privacy: 'nym' }
        : {}
    })

    // Singleton promise resolved once by the first syncNetwork call. The
    // lifecycle closure captures this already-resolved promise, so onStart gets
    // keys immediately across engine restarts. If killEngine runs before
    // syncNetwork ever resolves it, the abortKeysWait race in onStart rejects
    // the wait so stop() does not hang.
    const keysPromise = new Promise<MoneroPrivateKeys>(resolve => {
      this.sendKeysToNative = resolve
    })

    this.nativeWalletId = makeLifecycleManager({
      onStart: async () => {
        let abortKeysWait: (() => void) | undefined
        const abortPromise = new Promise<never>((resolve, reject) => {
          abortKeysWait = () => reject(new Error('Engine stopped'))
        })
        this.abortKeysWait = abortKeysWait
        const keys = await Promise.race([keysPromise, abortPromise])
        this.abortKeysWait = undefined
        const base64UrlWalletId = asNativeWalletId(this.walletId)

        const { backend } = this.currentWalletSettings
        this.log('Using backend:', backend)
        const defaults = asMoneroUserSettings({})
        const daemonAddress =
          backend === 'lws'
            ? this.currentSettings.enableCustomServers
              ? this.currentSettings.moneroLightwalletServer
              : defaults.moneroLightwalletServer
            : this.currentSettings.enableCustomMonerod
            ? this.currentSettings.monerodServer
            : defaults.monerodServer

        try {
          // LWS-specific setup: API key and login
          let loginResult: LoginResponse | undefined
          if (backend === 'lws') {
            const isEdgeLws = daemonAddress === this.networkInfo.edgeLwsServer
            await this.tools.cppBridge.setLwsApiKey(
              isEdgeLws ? this.initOptions.edgeApiKey : ''
            )
            if (isEdgeLws) {
              loginResult = await this.loginToLwsServer(
                daemonAddress,
                this.walletInfo.keys.moneroAddress,
                this.walletInfo.keys.moneroViewKeyPrivate,
                keys.birthdayHeight // pass it along in case we have it already
              )
            }
          }

          // Resolve birthday height (never open a wallet with height 0)
          const birthdayHeight = await this.resolveBirthdayHeight(
            keys.birthdayHeight,
            backend,
            daemonAddress,
            defaults.moneroLightwalletServer,
            loginResult
          )

          // Hook up the Nym mixnet proxy (before openWallet so the
          // very first LWSF request is already routed through it).
          this.unsubscribeNymFetch = await this.tools.setupNymFetch(
            this.currentSettings.networkPrivacy === 'nym',
            daemonAddress
          )

          await this.tools.cppBridge.openWallet(
            base64UrlWalletId,
            backend,
            keys.moneroKey,
            base64url.stringify(base64.parse(keys.dataKey)),
            this.networkInfo.networkType,
            birthdayHeight,
            daemonAddress
          )

          // Subscribe to native wallet events for immediate tx detection
          const unsubscribeWalletEvent = this.tools.moneroIo.on(
            'walletEvent',
            event => {
              if (event.walletId !== base64UrlWalletId) return
              if (event.eventName !== 'pendingTransactionReceived') return

              this.queryTransactions(base64UrlWalletId)
                .then(async () => {
                  // Refresh the balance immediately so a pending incoming tx
                  // shows up without waiting for the next synced poll.
                  await this.refreshBalance(base64UrlWalletId)
                })
                .catch(err =>
                  this.log.error(
                    `Event-triggered refresh error: ${String(err)}`
                  )
                )
            }
          )
          this.unsubscribeWalletEvent = unsubscribeWalletEvent

          return base64UrlWalletId
        } catch (error: unknown) {
          if (this.unsubscribeNymFetch != null) {
            try {
              await this.unsubscribeNymFetch()
            } catch (cleanupError: unknown) {
              this.log.error(`Error disabling nym: ${String(cleanupError)}`)
            }
            this.unsubscribeNymFetch = undefined
          }
          if (!(error instanceof Error)) throw error
          this.log.error(`Failed to open wallet: ${error.message}`)
          throw error
        }
      },

      onStop: async (nativeWalletId: string) => {
        if (this.unsubscribeWalletEvent != null) {
          this.unsubscribeWalletEvent()
          this.unsubscribeWalletEvent = undefined
        }
        if (this.unsubscribeNymFetch != null) {
          try {
            await this.unsubscribeNymFetch()
          } catch (error: unknown) {
            this.log.error(`Error disabling nym: ${String(error)}`)
          }
          this.unsubscribeNymFetch = undefined
        }
        try {
          await this.tools.cppBridge.closeWallet(nativeWalletId)
          this.log(`Wallet closed: ${nativeWalletId}`)
        } catch (error: unknown) {
          this.log.error(`Error closing wallet: ${String(error)}`)
        }
      },

      onError: error => {
        this.log.error('Monero lifecycle error:', String(error))
      }
    })
  }

  setOtherData(raw: unknown): void {
    this.otherData = asMoneroWalletOtherData(raw)
  }

  /**
   * Determine the wallet's creation height. For LWS wallets the login
   * response or getAddressInfo endpoint is used as a fallback.
   */
  private async resolveBirthdayHeight(
    height: number | undefined,
    backend: WalletBackend,
    daemonAddress: string,
    edgeLwsServer: string,
    loginResult?: LoginResponse
  ): Promise<number> {
    if (height != null && height > 0) return height

    // For Edge LWS, the login response may already have it (a zero here is
    // not a valid creation height, so fall through to recovery):
    if (loginResult?.start_height != null && loginResult.start_height > 0) {
      return loginResult.start_height
    }

    // monerod cannot report a wallet's creation height, so recover it from
    // whichever LWS the user has enabled (their custom LWS if configured,
    // otherwise the Edge LWS) rather than always crossing to the Edge server:
    const serverUrl =
      backend === 'lws'
        ? daemonAddress
        : this.currentSettings.enableCustomServers
        ? this.currentSettings.moneroLightwalletServer
        : edgeLwsServer
    const addressInfo = await this.getAddressInfo(
      serverUrl,
      this.walletInfo.keys.moneroAddress,
      this.walletInfo.keys.moneroViewKeyPrivate
    )

    if (addressInfo.start_height === 0) {
      throw new Error(
        'Cannot open wallet: birthdayHeight is 0. ' +
          'The wallet creation height could not be determined.'
      )
    }
    return addressInfo.start_height
  }

  // The Edge API key must only be sent to the Edge LWS (never a custom or
  // third-party server) and never as an empty string:
  private edgeApiKeyBody(serverUrl: string): { api_key?: string } {
    const { edgeApiKey } = this.initOptions
    return serverUrl === this.networkInfo.edgeLwsServer && edgeApiKey !== ''
      ? { api_key: edgeApiKey }
      : {}
  }

  private async loginToLwsServer(
    serverUrl: string,
    address: string,
    viewKey: string,
    birthdayHeight?: number
  ): Promise<LoginResponse> {
    const url = `${serverUrl}/login`
    const response = await this.engineFetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({
        address,
        ...this.edgeApiKeyBody(serverUrl),
        create_account: true,
        generated_locally: true,
        view_key: viewKey,
        birthday_height: birthdayHeight
      })
    })
    if (!response.ok) {
      const text = await response.text()
      throw new Error(`LWS login failed with ${response.status}: ${text}`)
    }
    const json = await response.json()
    return asLoginResponse(json)
  }

  private async getAddressInfo(
    serverUrl: string,
    address: string,
    viewKey: string
  ): Promise<AddressInfoResponse> {
    const url = `${serverUrl}/get_address_info`
    const response = await this.engineFetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({
        address,
        ...this.edgeApiKeyBody(serverUrl),
        view_key: viewKey
      })
    })
    if (!response.ok) {
      const text = await response.text()
      throw new Error(
        `LWS get_address_info failed with ${response.status}: ${text}`
      )
    }
    const json = await response.json()
    return asAddressInfoResponse(json)
  }

  async syncNetwork(opts: EdgeEnginePrivateKeyOptions): Promise<number> {
    if (!this.engineOn) return SYNC_POLL_MS

    if (this.sendKeysToNative != null) {
      this.sendKeysToNative(
        asMoneroPrivateKeys(this.currencyInfo.pluginId)(opts.privateKeys)
      )
      this.sendKeysToNative = undefined
    }

    const nativeWalletId = await this.nativeWalletId.get()
    if (nativeWalletId == null) {
      return SYNC_POLL_MS
    }

    try {
      const status = await this.tools.cppBridge.getWalletStatus(nativeWalletId)
      if (status.networkHeight === 0) {
        return SYNC_POLL_MS
      }

      // Do not treat the wallet as synced until the native layer has completed
      // at least one real server refresh. An LWS wallet seeds
      // networkHeight === syncedHeight from its stored scan height on open, so
      // the heights alone would report "synced" before it has contacted the
      // server, exposing a stale balance and no incoming transactions. Hold the
      // syncing state (the tracker keeps its current progress) until the first
      // refresh confirms the wallet is caught up and spendable. Full-node
      // wallets set refreshed on their first refresh too, and their
      // networkHeight is already a live daemon value, so this does not delay
      // them.
      if (!status.refreshed) {
        return SYNC_POLL_MS
      }

      // Smooth small height regressions: lwsf reports the stored account scan
      // height until its first refresh completes, a load-balanced daemon can
      // answer a block behind the previous poll, and the base engine re-stamps
      // every tx's confirmation count on ANY height change, so honoring those
      // dips makes displayed confirmations bounce. A large regression is
      // accepted as a correction, so one garbage or wrong-chain reading cannot
      // ratchet the stored height forever.
      const storedHeight = this.walletLocalData.blockHeight
      const networkHeight =
        status.networkHeight >= storedHeight ||
        storedHeight - status.networkHeight > HEIGHT_REGRESSION_BOUND
          ? status.networkHeight
          : storedHeight
      this.updateBlockHeight(networkHeight)

      // Refresh the balance on every poll, not only once fully synced, so a
      // pending incoming tx or the pending change after a send is reflected
      // promptly instead of lagging until a new block advances syncedHeight.
      // updateBalance no-ops when the value is unchanged.
      this.unlockedBalance = status.unlockedBalance
      this.updateBalance(null, status.balance)

      // Capture the first reported synced height as our baseline for
      // progress tracking. This is reset when the wallet restarts
      // (settings change, resync, daemon change).
      if (this.syncStartHeight == null) {
        this.syncStartHeight = status.syncedHeight
      }

      const isSynced = status.syncedHeight >= status.networkHeight - 1

      if (isSynced) {
        this.syncTracker.updateBlockRatio(
          1,
          status.syncedHeight,
          status.networkHeight
        )

        this.syncTracker.updateBalanceRatio(1)

        await this.queryTransactions(nativeWalletId)

        // Only report history as complete once the ascending backfill has
        // ingested every page (it flips txSortOrder to 'desc' when done).
        // While still backfilling, poll quickly to pull the next page.
        if (this.txSortOrder === 'desc') {
          this.syncTracker.updateHistoryRatio(1)
          return SYNCED_POLL_MS
        }
        return SYNC_POLL_MS
      } else {
        const range = status.networkHeight - this.syncStartHeight
        // Clamp to 0 so a reorg (syncedHeight < syncStartHeight) can't feed a
        // negative ratio into the weighted sync tracker:
        const ratio =
          range > 0
            ? Math.max(0, (status.syncedHeight - this.syncStartHeight) / range)
            : 0

        this.syncTracker.updateBlockRatio(
          ratio,
          status.syncedHeight,
          status.networkHeight
        )
        return SYNC_POLL_MS
      }
    } catch (error: unknown) {
      this.log.error(`syncNetwork error: ${String(error)}`)
      return ERROR_POLL_MS
    }
  }

  // Pull the latest balances from the native wallet and publish them. Used by
  // the pending-tx event handler so a received/sent amount is reflected without
  // waiting for the next syncNetwork poll. updateBalance no-ops when unchanged.
  private async refreshBalance(nativeWalletId: string): Promise<void> {
    const status = await this.tools.cppBridge.getWalletStatus(nativeWalletId)
    this.unlockedBalance = status.unlockedBalance
    this.updateBalance(null, status.balance)
  }

  private async queryTransactions(nativeWalletId: string): Promise<void> {
    // Serialize passes with the fleet-standard mutex (Tron, Polkadot, and
    // Algorand guard queryTransactions the same way): the sync poll and the
    // pendingTransactionReceived event can both call this, and interleaved
    // passes would race the scan cursor and the pending diff. A caller queued
    // behind an in-flight pass runs its own full pass afterwards, so every
    // caller's promise covers a pass that started at or after its call, even
    // when an earlier pass throws.
    return await this.queryTxMutex(async () => {
      const PAGE_SIZE = 50

      // A queued caller can land here after killEngine (a settings change or
      // resync wipes the state next); do not write into the fresh state.
      if (!this.engineOn) return

      try {
        // The pending diff, cursor healing, and lastSeenTime preservation all
        // consult the in-memory transaction list, which loadEngine only loads
        // eagerly on a first-ever sync. Load it on warm launches too
        // (idempotent after the first call):
        await this.loadTransactions()

        if (this.txSortOrder === 'asc') {
          await this.queryTransactionsAsc(nativeWalletId, PAGE_SIZE)
        } else {
          await this.queryTransactionsDesc(nativeWalletId, PAGE_SIZE)
        }

        // Bail between stages when the engine stopped mid-pass, to shorten
        // the tail of writes killEngine's drain has to wait out:
        if (!this.engineOn) return

        // Pending transactions live outside the cursor protocol above: they
        // sort behind all confirmed history, so neither scan reaches them.
        // Process them on every pass so they appear before their first
        // confirmation.
        await this.queryPendingTransactions(nativeWalletId, PAGE_SIZE)
      } catch (error: unknown) {
        this.log.error(`queryTransactions error: ${String(error)}`)
      } finally {
        // Flush events even when a later stage failed, so confirmed txs the
        // scans already processed are not buffered until the next block:
        this.sendTransactionEvents()
      }
    })
  }

  /** Look up the engine's stored copy of a transaction, if any. */
  private storedTransaction(txid: string): EdgeTransaction | undefined {
    const idx = this.findTransaction(null, normalizeAddress(txid))
    if (idx < 0) return undefined
    return this.transactionList['']?.[idx]
  }

  // Read the pending set directly and process every entry (addTransaction
  // ignores unchanged data). Anything that stays gone from the pool without
  // ever gaining a block height was evicted (never mined): mark it dropped.
  // The confirmed scan runs first, so a confirmation has already updated the
  // stored copy by the time the drop check runs. Absence alone is NOT enough
  // to declare a drop: a just-mined tx leaves the pool immediately but only
  // shows up as confirmed once the LWS server has indexed its block, so a tx
  // must stay missing for DROPPED_TX_GRACE_MS first. Real pool evictions take
  // hours to days, so the grace does not meaningfully delay them.
  private async queryPendingTransactions(
    nativeWalletId: string,
    pageSize: number
  ): Promise<void> {
    const now = Date.now()

    // Time while the engine was not running must not count toward the
    // eviction grace: a tx can confirm or leave the pool while the app is
    // closed, and the relaunch backfill has not caught up yet. Restart each
    // surviving watch entry's clock once per engine session.
    if (!this.pendingSeenReset) {
      this.pendingSeenReset = true
      const txids = Object.keys(this.otherData.pendingTxSeen)
      if (txids.length > 0) {
        const reset: { [txid: string]: number } = {}
        for (const txid of txids) reset[txid] = now
        this.otherData.pendingTxSeen = reset
        this.walletLocalDataDirty = true
      }
    }

    const seen = new Set<string>()
    let page = 0
    while (true) {
      const txPage = await this.tools.cppBridge.getPendingTransactions(
        nativeWalletId,
        page,
        pageSize
      )
      for (const tx of txPage.transactions) {
        seen.add(tx.hash)
        this.processTransaction(tx)
      }
      // The short/empty-page check is insurance against a native totalCount
      // that disagrees with the page contents:
      if (
        txPage.transactions.length < pageSize ||
        (page + 1) * pageSize >= txPage.totalCount
      ) {
        break
      }
      page++
    }

    // Rebuild the watch map: entries seen right now, plus absent-but-graced
    // entries. Resolved (confirmed/dropped) entries are simply not carried.
    const pendingTxSeen: { [txid: string]: number } = {}
    for (const txid of seen) {
      // Refresh a still-pending entry's stamp only periodically, so
      // steady-state passes leave otherData byte-identical instead of
      // rewriting walletLocalData on every save loop:
      const prev = this.otherData.pendingTxSeen[txid]
      pendingTxSeen[txid] =
        prev != null && now - prev < PENDING_SEEN_REFRESH_MS ? prev : now
    }

    for (const [txid, lastSeenMs] of Object.entries(
      this.otherData.pendingTxSeen
    )) {
      if (seen.has(txid)) continue
      const stored = this.storedTransaction(txid)
      // Stop watching entries that resolved (confirmed or already dropped):
      if (stored == null || stored.blockHeight !== 0) continue
      // 'failed' is already a terminal state (a spend the backend reported as
      // failed); leaving the pool is expected, so don't relabel it as dropped:
      if (stored.confirmations === 'failed') continue
      if (
        now - lastSeenMs < DROPPED_TX_GRACE_MS ||
        // Only declare drops once the backfill has completed a full confirmed
        // scan; during 'asc' the confirmed copy may simply not be ingested
        // yet:
        this.txSortOrder !== 'desc'
      ) {
        // Still within the grace window (or unable to judge): keep watching.
        pendingTxSeen[txid] = lastSeenMs
        continue
      }
      // Set 'dropped' explicitly: the base engine clamps negative block
      // heights to 0 unless confirmations is already a terminal state. Spread
      // otherParams too: addTransaction stamps lastSeenTime through it, and a
      // shared reference would silently rewrite the stored entry's stamp.
      this.addTransaction(null, {
        ...stored,
        otherParams: { ...stored.otherParams },
        blockHeight: -1,
        confirmations: 'dropped'
      })
    }

    if (!matchJson(this.otherData.pendingTxSeen, pendingTxSeen)) {
      this.otherData.pendingTxSeen = pendingTxSeen
      this.walletLocalDataDirty = true
    }
  }

  private async queryTransactionsAsc(
    nativeWalletId: string,
    pageSize: number
  ): Promise<void> {
    const startPage = Math.floor(
      this.otherData.processedTransactionCount / pageSize
    )

    const txPage = await this.tools.cppBridge.getAllTransactions(
      nativeWalletId,
      startPage,
      pageSize,
      'asc'
    )

    if (txPage.totalCount === 0) {
      // No history to backfill, so treat the ascending pass as complete:
      this.txSortOrder = 'desc'
      return
    }

    const onPageBoundary =
      this.otherData.processedTransactionCount % pageSize === 0
    let foundKnown = this.otherData.mostRecentTxid == null || onPageBoundary
    for (const tx of txPage.transactions) {
      if (!foundKnown) {
        if (tx.hash === this.otherData.mostRecentTxid) {
          foundKnown = true
        }
        continue
      }
      // Pending rows are handled by queryPendingTransactions and must never
      // become the cursor anchor: only a confirmed transaction is immutable,
      // so only a confirmed hash can safely mark where the scan left off.
      if (tx.isPending) continue
      this.processTransaction(tx)
      this.otherData.mostRecentTxid = tx.hash
    }

    this.otherData.processedTransactionCount =
      startPage * pageSize + txPage.transactions.length
    this.walletLocalDataDirty = true

    this.syncTracker.updateHistoryRatio(
      this.otherData.processedTransactionCount / txPage.totalCount
    )

    if (this.otherData.processedTransactionCount >= txPage.totalCount) {
      this.txSortOrder = 'desc'
    }
  }

  private async queryTransactionsDesc(
    nativeWalletId: string,
    pageSize: number
  ): Promise<void> {
    let page = 0
    let foundKnownTx = false
    let healSweep = false
    let newestTxid: string | undefined

    while (!foundKnownTx) {
      const txPage = await this.tools.cppBridge.getAllTransactions(
        nativeWalletId,
        page,
        pageSize,
        'desc'
      )

      if (page === 0) {
        // Anchor only on a confirmed transaction: a pending hash recorded here
        // would match this same tx after it confirms and stop the scan from
        // ever re-processing it with its block height.
        newestTxid = txPage.transactions.find(tx => !tx.isPending)?.hash
      }

      for (const tx of txPage.transactions) {
        if (!healSweep && tx.hash === this.otherData.mostRecentTxid) {
          // Heal a stale stored copy before stopping: if the anchor tx is
          // confirmed on-chain but our copy never saw the confirmation (a
          // cursor recorded while the tx was still pending), process it once
          // more so it stops displaying as unconfirmed. The same old-code
          // migration can have left more stuck-pending txs behind the anchor,
          // so when the anchor itself needed healing, walk the rest of the
          // history once, re-processing only rows whose stored copy is still
          // missing its height.
          if (!tx.isPending) {
            const stored = this.storedTransaction(tx.hash)
            if (stored == null || stored.blockHeight < 1) {
              this.processTransaction(tx)
              healSweep = true
              continue
            }
          }
          foundKnownTx = true
          break
        }
        // Pending rows are handled by queryPendingTransactions:
        if (tx.isPending) continue
        if (healSweep) {
          const stored = this.storedTransaction(tx.hash)
          if (stored != null && stored.blockHeight >= 1) continue
        }
        this.processTransaction(tx)
      }

      if (
        foundKnownTx ||
        txPage.transactions.length < pageSize ||
        (page + 1) * pageSize >= txPage.totalCount
      ) {
        if (
          newestTxid != null &&
          newestTxid !== this.otherData.mostRecentTxid
        ) {
          this.otherData.mostRecentTxid = newestTxid
          this.otherData.processedTransactionCount = txPage.totalCount
          this.walletLocalDataDirty = true
        }
        break
      }

      page++
    }
  }

  private processTransaction(tx: {
    hash: string
    direction: TransactionDirection
    isPending: boolean
    isFailed: boolean
    amount: string
    fee: string
    blockHeight: number
    timestamp: number
    paymentId: string
    txKey?: string
  }): void {
    const memos: EdgeMemo[] = []

    if (
      tx.paymentId != null &&
      tx.paymentId !== '' &&
      tx.paymentId !== '0000000000000000' // returned when there is no payment id
    ) {
      memos.push({
        memoName: 'payment id',
        type: 'hex',
        value: tx.paymentId
      })
    }

    // TransactionDirection from react-native-monero: 0 = incoming, 1 = outgoing
    const isReceive = tx.direction === 0
    const ourReceiveAddresses: string[] = isReceive
      ? [this.walletInfo.keys.moneroAddress]
      : []

    let nativeAmount: string
    const networkFee = tx.fee

    if (isReceive) {
      nativeAmount = tx.amount
    } else {
      nativeAmount = `-${add(tx.amount, tx.fee)}`
    }

    const blockHeight = tx.isPending ? 0 : tx.blockHeight

    // lwsf reports no timestamp for some transactions (e.g. an incoming tx the
    // server has not yet attached a block time to), and the native layer emits
    // 0 for that. A 0 date sorts the tx to the bottom of the list as if it were
    // from 1970. Substitute a stable date: keep the date we already assigned
    // this tx if any (so it does not jitter across polls), otherwise stamp it
    // as first-seen now, so a just-received tx sorts to the top where it
    // belongs. A real timestamp always wins once the backend provides one.
    let date = tx.timestamp
    if (date <= 0) {
      const priorDate = this.storedTransaction(tx.hash)?.date
      date =
        priorDate != null && priorDate > 0
          ? priorDate
          : Math.round(Date.now() / 1000)
    }

    const edgeTransaction: EdgeTransaction = {
      blockHeight,
      currencyCode: this.currencyInfo.currencyCode,
      date,
      isSend: !isReceive,
      memos,
      nativeAmount,
      networkFee,
      networkFees: [{ tokenId: null, nativeAmount: networkFee }],
      otherParams: {},
      ourReceiveAddresses,
      signedTx: '',
      tokenId: null,
      txid: tx.hash,
      txSecret: tx.txKey,
      walletId: this.walletId
    }

    if (tx.isFailed) {
      edgeTransaction.confirmations = 'failed'
    }

    if (tx.isPending) {
      // Pending txs are re-processed on every pass. Without a lastSeenTime the
      // base engine stamps a fresh one on each add, which reads as a change
      // and emits a spurious update event per poll, so keep the prior stamp
      // while it is fresh. Refresh it hourly though (undefined lets the base
      // stamp now): the base engine independently drops an unconfirmed tx once
      // the stamp is older than 24 hours, and a pool residence can outlast
      // that.
      const stored = this.storedTransaction(tx.hash)
      const prior = asMaybe(asNumber)(stored?.otherParams?.lastSeenTime)
      const nowSeconds = Math.round(Date.now() / 1000)
      const lastSeenTime =
        prior != null && nowSeconds - prior < LAST_SEEN_REFRESH_S
          ? prior
          : undefined
      this.addTransaction(null, edgeTransaction, lastSeenTime)
    } else {
      this.addTransaction(null, edgeTransaction)
    }
  }

  // Receives enter the store while still pending (blockHeight 0), so the base
  // checkpoint math treats the first sighting as already seen ('0' never
  // advances past a synced checkpoint) and the later confirmation takes the
  // update path, which never notifies. Mirror ZcashEngine's partial fix: an
  // incoming unconfirmed tx seen after the first-ever sync is new. The same
  // multi-device caveat as Zcash applies.
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

  async killEngine(): Promise<void> {
    this.abortKeysWait?.()
    await this.nativeWalletId.stop()
    await super.killEngine()
    // Drain any in-flight transaction pass BEFORE resetting the session state
    // below: the pass started while the engine was on and may still write
    // (txSortOrder, otherData) until it finishes, so resetting first would let
    // those late writes clobber the resets and stick across a settings-change
    // restart. engineOn is false now, so queued callers exit immediately.
    await this.queryTxMutex(async () => {})
    this.syncStartHeight = undefined
    this.unlockedBalance = '0'
    this.txSortOrder = 'asc'
    this.pendingSeenReset = false
    this.syncTracker.resetSync()
  }

  async resyncBlockchain(): Promise<void> {
    await this.killEngine()
    await this.clearBlockchainCache()
    await this.tools.cppBridge.deleteWallet(
      asNativeWalletId(this.walletId),
      this.currentWalletSettings.backend
    )
    await this.startEngine()
  }

  async changeUserSettings(userSettings: JsonObject): Promise<void> {
    const newSettings = asMaybe(asMoneroUserSettings)(userSettings)
    if (newSettings == null || matchJson(this.currentSettings, newSettings)) {
      return
    }

    const run = this.settingsChangeQueue.then(async () => {
      this.currentSettings = newSettings
      await this.killEngine()
      await this.startEngine()
    })
    // Keep the queue usable for later changes even if this one throws, while
    // still surfacing the error to this caller:
    this.settingsChangeQueue = run.catch(() => {})
    await run
  }

  async changeWalletSettings(walletSettings: JsonObject): Promise<void> {
    const newSettings = asMaybe(asMoneroWalletSettings)(walletSettings)
    if (
      newSettings == null ||
      matchJson(this.currentWalletSettings, newSettings)
    ) {
      return
    }

    const run = this.settingsChangeQueue.then(async () => {
      this.currentWalletSettings = newSettings
      await this.killEngine()
      await this.clearBlockchainCache()
      await this.startEngine()
    })
    this.settingsChangeQueue = run.catch(() => {})
    await run
  }

  async getMaxSpendable(edgeSpendInfo: EdgeSpendInfo): Promise<string> {
    const { tokenId } = edgeSpendInfo

    if (tokenId != null) {
      throw new Error('Monero does not support tokens')
    }

    const nativeWalletId = await this.nativeWalletId.get()
    if (nativeWalletId == null) {
      throw new Error('Wallet not ready')
    }

    const [spendTarget] = edgeSpendInfo.spendTargets
    if (spendTarget?.publicAddress == null) {
      throw new Error('Missing destination address')
    }

    try {
      // Read the live unlocked balance instead of this.unlockedBalance, which
      // starts at '0' and is reset to '0' on every engine restart (settings or
      // daemon change, resync) and only repopulated on a fully-synced poll.
      // That staleness made Max intermittently return 0 (sub('0', fee) < 0) or
      // an amount that then failed to actually send.
      const status = await this.tools.cppBridge.getWalletStatus(nativeWalletId)
      // We fetched a fresh status, so keep the cached balances in sync with it.
      this.unlockedBalance = status.unlockedBalance
      this.updateBalance(null, status.balance)

      const result = await this.tools.cppBridge.createTransaction(
        nativeWalletId,
        [{ address: spendTarget.publicAddress, amount: '0' }],
        translateFee(edgeSpendInfo.networkFeeOption)
      )

      const maxSpendable = sub(status.unlockedBalance, result.fee)
      if (lt(maxSpendable, '0')) {
        return '0'
      }
      return maxSpendable
    } catch (error: unknown) {
      this.log.error(`getMaxSpendable error: ${String(error)}`)
      throw error
    }
  }

  async makeSpend(edgeSpendInfoIn: EdgeSpendInfo): Promise<EdgeTransaction> {
    const { edgeSpendInfo, currencyCode } = this.makeSpendCheck(edgeSpendInfoIn)
    const { memos = [], tokenId, networkFeeOption } = edgeSpendInfo

    if (tokenId != null) {
      throw new Error('Monero does not support tokens')
    }

    const nativeWalletId = await this.nativeWalletId.get()
    if (nativeWalletId == null) {
      throw new Error('Wallet not ready')
    }

    const recipients: Array<{ address: string; amount: string }> = []
    let totalAmount = '0'

    for (const spendTarget of edgeSpendInfo.spendTargets) {
      const { publicAddress, nativeAmount } = spendTarget

      if (publicAddress == null) {
        throw new Error('Missing destination address')
      }
      if (nativeAmount == null || eq(nativeAmount, '0')) {
        throw new NoAmountSpecifiedError()
      }

      recipients.push({
        address: publicAddress,
        amount: nativeAmount
      })
      totalAmount = add(totalAmount, nativeAmount)
    }

    const balance = this.getBalance({ tokenId: null })
    if (gt(totalAmount, balance)) {
      throw new InsufficientFundsError({ tokenId: null })
    }
    if (gt(totalAmount, this.unlockedBalance)) {
      throw new PendingFundsError()
    }

    const priority = translateFee(networkFeeOption)

    let txid: string
    let signedTxHex: string
    let networkFee: string

    try {
      const result = await this.tools.cppBridge.createTransaction(
        nativeWalletId,
        recipients,
        priority
      )
      txid = result.txid
      signedTxHex = result.signedTxHex
      networkFee = result.fee
    } catch (error: unknown) {
      this.warn(`FAILURE makeSpend createTransaction: ${String(error)}`)
      if (error instanceof Error) {
        if (error.message.includes('not enough money')) {
          throw new InsufficientFundsError({ tokenId: null })
        }
        if (error.message.includes('pending')) {
          throw new PendingFundsError()
        }
      }
      throw error
    }

    const totalWithFee = add(totalAmount, networkFee)
    const txNativeAmount = mul(totalWithFee, '-1')

    const edgeTransaction: EdgeTransaction = {
      blockHeight: 0,
      currencyCode,
      date: 0,
      isSend: true,
      memos,
      nativeAmount: txNativeAmount,
      networkFee,
      networkFees: [{ tokenId: null, nativeAmount: networkFee }],
      otherParams: {
        recipients,
        priority
      },
      ourReceiveAddresses: [],
      signedTx: signedTxHex,
      tokenId: null,
      txid,
      walletId: this.walletId
    }

    return edgeTransaction
  }

  async signTx(
    edgeTransaction: EdgeTransaction,
    _privateKeys: JsonObject
  ): Promise<EdgeTransaction> {
    if (edgeTransaction.txid.length !== 64) {
      throw new Error('Invalid transaction: missing or malformed txid')
    }
    if (edgeTransaction.signedTx.length === 0) {
      throw new Error('Invalid transaction: missing signed transaction data')
    }
    return edgeTransaction
  }

  async broadcastTx(
    edgeTransaction: EdgeTransaction
  ): Promise<EdgeTransaction> {
    const nativeWalletId = await this.nativeWalletId.get()
    if (nativeWalletId == null) {
      throw new Error('Wallet not ready')
    }

    try {
      await this.tools.cppBridge.broadcastTransaction(
        nativeWalletId,
        edgeTransaction.signedTx
      )

      edgeTransaction.date = Date.now() / 1000

      this.warn(`SUCCESS broadcastTx\n${cleanTxLogs(edgeTransaction)}`)
      return edgeTransaction
    } catch (error: unknown) {
      this.warn(`FAILURE broadcastTx: ${String(error)}`)
      throw error
    }
  }
}

export async function makeCurrencyEngine(
  env: PluginEnvironment<MoneroNetworkInfo>,
  tools: MoneroTools,
  walletInfo: EdgeWalletInfo,
  opts: EdgeCurrencyEngineOptions
): Promise<EdgeCurrencyEngine> {
  const { initOptions } = env

  const safeWalletInfo = asSafeMoneroWalletInfo(walletInfo)
  const engine = new MoneroEngine(env, tools, safeWalletInfo, initOptions, opts)

  await engine.loadEngine()

  return engine
}
