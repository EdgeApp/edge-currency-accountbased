import { add, eq, gt, lt, mul, sub } from 'biggystring'
import { asMaybe, asNumber } from 'cleaners'
import {
  EdgeCurrencyEngine,
  EdgeCurrencyEngineOptions,
  EdgeEnginePrivateKeyOptions,
  EdgeFetchFunction,
  EdgeGetTransactionsOptions,
  EdgeMemo,
  EdgeSpendInfo,
  EdgeTransaction,
  EdgeWalletInfo,
  InsufficientFundsError,
  JsonObject,
  NoAmountSpecifiedError,
  PendingFundsError
} from 'edge-core-js/types'
import type { TransactionDirection, WalletBackend } from 'monero-native'
import { base64, base64url } from 'rfc4648'

import { CurrencyEngine } from '../common/CurrencyEngine'
import { PluginEnvironment } from '../common/innerPlugin'
import {
  LifecycleManager,
  makeLifecycleManager
} from '../common/lifecycleManager'
import {
  cleanServerUrl,
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

// Everything the engine reports about starting up and syncing goes through
// log.warn, never plain log(): the core filters by EdgeLogSettings and a
// released build's default level drops 'info', so an info line is invisible
// exactly when a user sends in a log about a wallet stuck "initializing" or
// "syncing". Failures use warn too rather than log.error, so a sync problem and
// the steps leading to it land together in one greppable stream.

// syncNetwork polls once a second, so a progress line is only re-logged this
// often while the phase is unchanged. A phase CHANGE always logs immediately,
// which is what identifies where a stuck wallet stopped:
const SYNC_LOG_THROTTLE_MS = 30 * 1000

// The settled 'synced' line is throttled harder: it only says the wallet is
// still polling, and a wallet can sit synced for hours:
const SYNCED_LOG_THROTTLE_MS = 5 * 60 * 1000

// An init step that throws leaves the lifecycle manager 'stopped', so the next
// syncNetwork poll retries the whole sequence a second later. Trace the steps
// on the first attempt and then only once per this interval, so a wallet that
// cannot open keeps reporting why without burying it under its own retries:
const INIT_LOG_REPEAT_MS = 60 * 1000

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
  private txSecretsMirrored = false
  private unsubscribeWalletEvent?: () => void
  private unsubscribeNymFetch?: () => Promise<void>
  private abortKeysWait?: () => void
  private settingsChangeQueue: Promise<void> = Promise.resolve()
  private lastSyncLogPhase: string | undefined
  private lastSyncLogMs = 0
  private lastRegressionLogHeight: number | undefined
  private initAttempt = 0
  private initTraceOn = true
  private lastInitTraceMs = 0

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
        const attemptMs = Date.now()
        this.initAttempt += 1
        this.initTraceOn =
          this.initAttempt === 1 ||
          attemptMs - this.lastInitTraceMs >= INIT_LOG_REPEAT_MS
        if (this.initTraceOn) this.lastInitTraceMs = attemptMs

        this.logInit('waiting for private keys')
        let abortKeysWait: (() => void) | undefined
        const abortPromise = new Promise<never>((resolve, reject) => {
          abortKeysWait = () => reject(new Error('Engine stopped'))
        })
        this.abortKeysWait = abortKeysWait
        const keys = await Promise.race([keysPromise, abortPromise])
        this.abortKeysWait = undefined
        const base64UrlWalletId = asNativeWalletId(this.walletId)

        const { backend } = this.currentWalletSettings
        const defaults = asMoneroUserSettings({})
        const daemonAddress =
          backend === 'lws'
            ? this.currentSettings.enableCustomServers
              ? this.currentSettings.moneroLightwalletServer
              : defaults.moneroLightwalletServer
            : this.currentSettings.enableCustomMonerod
            ? this.currentSettings.monerodServer
            : defaults.monerodServer

        this.logInit(
          `backend=${backend} server=${cleanServerUrl(daemonAddress)} ` +
            `privacy=${this.currentSettings.networkPrivacy} ` +
            `keyBirthdayHeight=${String(keys.birthdayHeight)}`
        )

        try {
          // LWS-specific setup: API key and login
          let loginResult: LoginResponse | undefined
          if (backend === 'lws') {
            const isEdgeLws = daemonAddress === this.networkInfo.edgeLwsServer
            await this.tools.cppBridge.setLwsApiKey(
              isEdgeLws ? this.initOptions.edgeApiKey : ''
            )
            if (isEdgeLws) {
              this.logInit('logging in to Edge LWS')
              loginResult = await this.loginToLwsServer(
                daemonAddress,
                this.walletInfo.keys.moneroAddress,
                this.walletInfo.keys.moneroViewKeyPrivate,
                keys.birthdayHeight // pass it along in case we have it already
              )
              this.logInit(
                `LWS login ok newAddress=${String(
                  loginResult.new_address
                )} startHeight=${String(loginResult.start_height)}`
              )
            } else {
              this.logInit('custom LWS server, skipping Edge LWS login')
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
          const useNym = this.currentSettings.networkPrivacy === 'nym'
          this.logInit(`nym proxy ${useNym ? 'enabled' : 'disabled'}`)
          this.unsubscribeNymFetch = await this.tools.setupNymFetch(
            useNym,
            daemonAddress
          )

          this.logInit(
            `opening native wallet ${base64UrlWalletId} at height ${birthdayHeight}`
          )
          const openStartMs = Date.now()
          await this.tools.cppBridge.openWallet(
            base64UrlWalletId,
            backend,
            keys.moneroKey,
            base64url.stringify(base64.parse(keys.dataKey)),
            this.networkInfo.networkType,
            birthdayHeight,
            daemonAddress
          )
          this.logInit(`native wallet opened in ${Date.now() - openStartMs}ms`)

          // Subscribe to native wallet events for immediate tx detection
          const unsubscribeWalletEvent = this.tools.moneroIo.on(
            'walletEvent',
            event => {
              if (event.walletId !== base64UrlWalletId) return
              if (event.eventName !== 'pendingTransactionReceived') return

              this.warn('sync: native pendingTransactionReceived event')
              this.queryTransactions(base64UrlWalletId)
                .then(async () => {
                  // Refresh the balance immediately so a pending incoming tx
                  // shows up without waiting for the next synced poll.
                  await this.refreshBalance(base64UrlWalletId)
                })
                .catch(err =>
                  this.warn(
                    `sync: FAILURE event-triggered refresh: ${String(err)}`
                  )
                )
            }
          )
          this.unsubscribeWalletEvent = unsubscribeWalletEvent
          this.logInit('subscribed to native wallet events')

          // The wallet is open, so a later restart starts a fresh trace:
          this.initAttempt = 0

          return base64UrlWalletId
        } catch (error: unknown) {
          // Logged before the nym teardown below so the original failure is the
          // first thing in the log, and for any thrown value (the old code only
          // logged `Error` instances, so a native string throw vanished). The
          // attempt count carries the retry rate that the trace gate elides:
          this.logInit(
            `FAILURE opening wallet (attempt ${this.initAttempt}): ${String(
              error
            )}`
          )
          if (this.unsubscribeNymFetch != null) {
            try {
              await this.unsubscribeNymFetch()
            } catch (cleanupError: unknown) {
              this.logInit(`FAILURE disabling nym: ${String(cleanupError)}`)
            }
            this.unsubscribeNymFetch = undefined
          }
          throw error
        }
      },

      onStop: async (nativeWalletId: string) => {
        this.warn(`init: stopping native wallet ${nativeWalletId}`)
        if (this.unsubscribeWalletEvent != null) {
          this.unsubscribeWalletEvent()
          this.unsubscribeWalletEvent = undefined
        }
        if (this.unsubscribeNymFetch != null) {
          try {
            await this.unsubscribeNymFetch()
          } catch (error: unknown) {
            this.warn(`init: FAILURE disabling nym: ${String(error)}`)
          }
          this.unsubscribeNymFetch = undefined
        }
        try {
          await this.tools.cppBridge.closeWallet(nativeWalletId)
          this.warn(`init: wallet closed: ${nativeWalletId}`)
        } catch (error: unknown) {
          this.warn(`init: FAILURE closing wallet: ${String(error)}`)
        }
      },

      onError: error => {
        this.warn(`init: FAILURE lifecycle error: ${String(error)}`)
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

    // A wallet that has to recover its creation height makes extra network
    // calls before it can even open, so name the path it took:
    this.logInit(`no stored birthdayHeight; recovering (backend=${backend})`)

    // For Edge LWS, the login response may already have it (a zero here is
    // not a valid creation height, so fall through to recovery):
    if (loginResult?.start_height != null && loginResult.start_height > 0) {
      this.logInit(`birthdayHeight ${loginResult.start_height} from LWS login`)
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
    this.logInit(`asking ${cleanServerUrl(serverUrl)} for birthdayHeight`)
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
    this.logInit(
      `birthdayHeight ${addressInfo.start_height} from get_address_info`
    )
    return addressInfo.start_height
  }

  /**
   * Log one step of the init sequence. onStart reruns in full on every poll
   * while the wallet fails to open (an error leaves the lifecycle manager
   * 'stopped'), so without this gate a wallet that cannot open would repeat its
   * whole trace every second and bury the failure it is meant to explain. The
   * first attempt after a start always traces; a stuck wallet re-traces on
   * INIT_LOG_REPEAT_MS.
   */
  private logInit(message: string): void {
    if (!this.initTraceOn) return
    this.warn(`init: ${message}`)
  }

  /**
   * Clear the log throttles so the next line prints immediately. Called on both
   * sides of a restart: resetting only in killEngine is not enough, because a
   * syncNetwork pass already past its engineOn check can finish afterwards and
   * write stale throttle state back.
   */
  private resetLogState(): void {
    this.lastSyncLogPhase = undefined
    this.lastSyncLogMs = 0
    this.lastRegressionLogHeight = undefined
    this.initAttempt = 0
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

  /**
   * Log where the sync is, but only when that changes: syncNetwork polls once a
   * second, so an unconditional line per pass would bury every other log the
   * plugin writes. A new phase always prints, an unchanged one reprints on the
   * throttle, so a wallet that never leaves "waiting for first server refresh"
   * is obvious from the log alone.
   */
  private logSyncPhase(
    phase: string,
    detail: string,
    throttleMs: number = SYNC_LOG_THROTTLE_MS
  ): void {
    // A pass that got past syncNetwork's engineOn check before killEngine can
    // land here afterwards; letting it write would re-arm the throttle against
    // the restart that just cleared it:
    if (!this.engineOn) return

    const now = Date.now()
    const isSamePhase = phase === this.lastSyncLogPhase
    if (isSamePhase && now - this.lastSyncLogMs < throttleMs) return
    this.lastSyncLogPhase = phase
    this.lastSyncLogMs = now
    this.warn(`sync: ${phase}${detail === '' ? '' : ` ${detail}`}`)
  }

  async syncNetwork(opts: EdgeEnginePrivateKeyOptions): Promise<number> {
    if (!this.engineOn) return SYNC_POLL_MS

    if (this.sendKeysToNative != null) {
      this.sendKeysToNative(
        asMoneroPrivateKeys(this.currencyInfo.pluginId)(opts.privateKeys)
      )
      this.sendKeysToNative = undefined
      this.warn('sync: handed private keys to the native layer')
    }

    const nativeWalletId = await this.nativeWalletId.get()
    if (nativeWalletId == null) {
      // Either the open is still in flight or it failed and the lifecycle
      // manager reset to 'stopped', in which case the next poll retries it:
      this.logSyncPhase('waiting for the native wallet to open', '')
      return SYNC_POLL_MS
    }

    try {
      const status = await this.tools.cppBridge.getWalletStatus(nativeWalletId)
      if (status.networkHeight === 0) {
        this.logSyncPhase(
          'waiting for a network height',
          `synced=${status.syncedHeight}`
        )
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
        this.logSyncPhase(
          'waiting for the first server refresh',
          `synced=${status.syncedHeight} network=${status.networkHeight}`
        )
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
      if (networkHeight !== status.networkHeight) {
        // Keyed on the reported height so a dip that persists across polls only
        // logs once, but a second, different bad reading still gets a line:
        if (this.lastRegressionLogHeight !== status.networkHeight) {
          this.lastRegressionLogHeight = status.networkHeight
          this.warn(
            `sync: ignoring height regression: reported=${status.networkHeight} stored=${storedHeight}`
          )
        }
      } else {
        this.lastRegressionLogHeight = undefined
      }
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
        this.warn(
          `sync: baseline synced=${status.syncedHeight} network=${status.networkHeight} ` +
            `balance=${status.balance} unlocked=${status.unlockedBalance}`
        )
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
          this.logSyncPhase(
            'synced',
            `height=${status.syncedHeight} balance=${status.balance} ` +
              `unlocked=${status.unlockedBalance}`,
            SYNCED_LOG_THROTTLE_MS
          )
          return SYNCED_POLL_MS
        }
        this.logSyncPhase(
          'blocks synced, backfilling history',
          `processed=${this.otherData.processedTransactionCount}`
        )
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
        this.logSyncPhase(
          'scanning blocks',
          `synced=${status.syncedHeight}/${status.networkHeight} ` +
            `from=${this.syncStartHeight} ratio=${ratio.toFixed(4)}`
        )
        return SYNC_POLL_MS
      }
    } catch (error: unknown) {
      this.warn(`sync: FAILURE syncNetwork: ${String(error)}`)
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

        this.mirrorStoredTxSecrets()

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
        this.warn(`sync: FAILURE queryTransactions: ${String(error)}`)
      } finally {
        // Flush events even when a later stage failed, so confirmed txs the
        // scans already processed are not buffered until the next block:
        this.sendTransactionEvents()
      }
    })
  }

  /**
   * Copies each stored transaction's key into its otherParams, once per
   * engine session.
   *
   * The sync path has always kept the key on the stored transaction's
   * top-level txSecret, but the core drops that field for any transaction it
   * has already filed, so the GUI never saw it. otherParams rides through the
   * core untouched, and the stored list re-feeds the core every session, so
   * mirroring the key there is what lets the GUI show keys for sends made
   * while the send path reported none. The mirror persists with the stored
   * list, so after the first save this pass finds nothing left to do.
   */
  private mirrorStoredTxSecrets(): void {
    if (this.txSecretsMirrored) return

    // loadTransactions marks itself loaded at the START of its disk reads, so
    // a caller racing the first load can arrive here with a still-empty list
    // even though the store has transactions. Latching the session flag on
    // that walk would skip the real copy until the next launch, so leave the
    // flag unset and let the caller that ran after the load finish the job.
    // The load fills the list in one assignment, so empty-while-racing is the
    // only shape this needs to guard:
    const storedCount = this.walletLocalData.numTransactions[''] ?? 0
    const loadedCount = this.transactionList['']?.length ?? 0
    if (loadedCount === 0 && storedCount > 0) return

    this.txSecretsMirrored = true

    let count = 0
    for (const transaction of this.transactionList[''] ?? []) {
      if (transaction.txSecret == null) continue
      if (transaction.otherParams?.txSecret != null) continue
      transaction.otherParams = {
        ...transaction.otherParams,
        txSecret: transaction.txSecret
      }
      count++
    }
    if (count > 0) {
      this.transactionListDirty = true
      this.warn(`sync: mirrored the transaction key of ${count} tx(s)`)
    }
  }

  /**
   * The core pulls the full stored list through here once per session, and
   * that pull is what carries the mirrored otherParams to the GUI for
   * transactions the sync scans never revisit. A pull that lands before the
   * first sync tick would snapshot the list from before the mirror ran, and
   * nothing re-delivers until the next launch, so run the mirror before
   * serving the list. The session flag makes this a no-op when the sync loop
   * got there first.
   */
  async getTransactions(
    options: EdgeGetTransactionsOptions
  ): Promise<EdgeTransaction[]> {
    await this.loadTransactions()
    this.mirrorStoredTxSecrets()
    return await super.getTransactions(options)
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
        // pendingTxSeen still holds the previous pass's map (it is rebuilt at
        // the end of this function), so a txid missing from it is a first
        // sighting. Logging here instead of per-pass keeps it to one line per
        // pool entry:
        if (this.otherData.pendingTxSeen[tx.hash] == null) {
          this.warn(
            `sync: pending tx ${tx.hash} in pool direction=${tx.direction} amount=${tx.amount}`
          )
        }
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
      this.warn(
        `sync: pending tx ${txid} gone from the pool for ` +
          `${Math.round((now - lastSeenMs) / 60000)}m; marking dropped`
      )
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
      this.warn('sync: no transaction history; switching to newest-first scans')
      return
    }

    const priorCount = this.otherData.processedTransactionCount
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

    // Only when the count moved, so a stalled backfill (the same page returning
    // nothing new every second) does not fill the log:
    if (this.otherData.processedTransactionCount !== priorCount) {
      this.warn(
        `sync: backfilled history page ${startPage}: ` +
          `${this.otherData.processedTransactionCount}/${txPage.totalCount}`
      )
    }

    this.syncTracker.updateHistoryRatio(
      this.otherData.processedTransactionCount / txPage.totalCount
    )

    if (this.otherData.processedTransactionCount >= txPage.totalCount) {
      this.txSortOrder = 'desc'
      this.warn(
        `sync: history backfill complete (${txPage.totalCount} transactions); ` +
          'switching to newest-first scans'
      )
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
    let processedCount = 0

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
              this.warn(
                `sync: healing stale unconfirmed anchor tx ${tx.hash}; ` +
                  'sweeping the rest of the history'
              )
              this.processTransaction(tx)
              processedCount++
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
        processedCount++
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
          this.warn(`sync: cursor advanced to ${newestTxid}`)
        }
        break
      }

      page++
    }

    // Silent on the common no-op pass (anchor found on page 0, nothing new), so
    // this only prints when the scan actually did work:
    if (processedCount > 0 || page > 0) {
      this.warn(
        `sync: newest-first scan processed ${processedCount} transaction(s) ` +
          `across ${page + 1} page(s)`
      )
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

    // TransactionDirection from monero-native: 0 = incoming, 1 = outgoing
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
      // The key is mirrored into otherParams. The core drops a top-level
      // txSecret for any transaction it has already filed - the key is only
      // saved when the transaction's metadata file is first written - but
      // otherParams rides through to the GUI on every report. The mirror is
      // what lets the GUI show a key the file never got: sends made while
      // the send path reported no key, and sends whose key the broadcast
      // could not read.
      otherParams: tx.txKey == null ? {} : { txSecret: tx.txKey },
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

  async startEngine(): Promise<void> {
    this.resetLogState()
    // The native wallet is opened lazily by the first syncNetwork poll, so this
    // brackets the start of the whole init sequence and shows what the engine
    // resumed from:
    this.warn(
      `init: startEngine backend=${this.currentWalletSettings.backend} ` +
        `blockHeight=${this.walletLocalData.blockHeight} ` +
        `processedTxCount=${this.otherData.processedTransactionCount}`
    )
    await super.startEngine()
  }

  async killEngine(): Promise<void> {
    this.warn('init: killEngine')
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
    this.txSecretsMirrored = false
    this.resetLogState()
    this.syncTracker.resetSync()
    this.warn('init: killEngine complete')
  }

  async resyncBlockchain(): Promise<void> {
    this.warn('init: resyncBlockchain: deleting the native wallet')
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

    this.warn(
      `init: user settings changed (privacy=${newSettings.networkPrivacy} ` +
        `customLws=${String(newSettings.enableCustomServers)} ` +
        `customMonerod=${String(newSettings.enableCustomMonerod)}); restarting`
    )
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

    this.warn(
      `init: wallet settings changed (backend ` +
        `${this.currentWalletSettings.backend} -> ${newSettings.backend}); ` +
        'clearing the cache and restarting'
    )
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
      this.warn(`FAILURE getMaxSpendable: ${String(error)}`)
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
      const { txKey } = await this.tools.cppBridge.broadcastTransaction(
        nativeWalletId,
        edgeTransaction.signedTx
      )

      edgeTransaction.date = Date.now() / 1000

      // The transaction key is the sender's only proof of payment, and the
      // broadcast is the send path's only chance to report it: the core
      // writes the key into the transaction's metadata file on the saveTx
      // that follows this broadcast, and that file is the only place the key
      // survives a resync. The native layer reports no key rather than
      // failing an already-broadcast payment, so guard for absence:
      if (txKey != null && txKey !== '') {
        edgeTransaction.txSecret = txKey
      } else {
        this.warn(`broadcastTx: no transaction key reported`)
      }

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
