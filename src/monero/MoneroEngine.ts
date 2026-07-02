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

      this.updateBlockHeight(status.networkHeight)

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
    const PAGE_SIZE = 50

    try {
      if (this.txSortOrder === 'asc') {
        await this.queryTransactionsAsc(nativeWalletId, PAGE_SIZE)
      } else {
        await this.queryTransactionsDesc(nativeWalletId, PAGE_SIZE)
      }

      // Pending transactions live outside the cursor protocol above: they sort
      // behind all confirmed history, so neither scan reaches them. Process
      // them on every pass so they appear before their first confirmation.
      await this.queryPendingTransactions(nativeWalletId, PAGE_SIZE)

      this.sendTransactionEvents()
    } catch (error: unknown) {
      this.log.error(`queryTransactions error: ${String(error)}`)
    }
  }

  /** Look up the engine's stored copy of a transaction, if any. */
  private storedTransaction(txid: string): EdgeTransaction | undefined {
    const idx = this.findTransaction(null, normalizeAddress(txid))
    if (idx < 0) return undefined
    return this.transactionList['']?.[idx]
  }

  // Read the pending set directly and process every entry (addTransaction
  // ignores unchanged data).
  private async queryPendingTransactions(
    nativeWalletId: string,
    pageSize: number
  ): Promise<void> {
    let page = 0
    while (true) {
      const txPage = await this.tools.cppBridge.getPendingTransactions(
        nativeWalletId,
        page,
        pageSize
      )
      for (const tx of txPage.transactions) {
        this.processTransaction(tx)
      }
      if ((page + 1) * pageSize >= txPage.totalCount) break
      page++
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
        if (tx.hash === this.otherData.mostRecentTxid) {
          // Heal a stale stored copy before stopping: if the anchor tx is
          // confirmed on-chain but our copy never saw the confirmation (a
          // cursor recorded while the tx was still pending), process it once
          // more so it stops displaying as unconfirmed.
          if (!tx.isPending) {
            const stored = this.storedTransaction(tx.hash)
            if (stored == null || stored.blockHeight < 1) {
              this.processTransaction(tx)
            }
          }
          foundKnownTx = true
          break
        }
        // Pending rows are handled by queryPendingTransactions:
        if (tx.isPending) continue
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

    const edgeTransaction: EdgeTransaction = {
      blockHeight,
      currencyCode: this.currencyInfo.currencyCode,
      date: tx.timestamp,
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
      // and emits a spurious update event per poll — keep the first-seen time.
      const stored = this.storedTransaction(tx.hash)
      const lastSeenTime = asMaybe(asNumber)(stored?.otherParams?.lastSeenTime)
      this.addTransaction(null, edgeTransaction, lastSeenTime)
    } else {
      this.addTransaction(null, edgeTransaction)
    }
  }

  async killEngine(): Promise<void> {
    this.abortKeysWait?.()
    await this.nativeWalletId.stop()
    this.syncStartHeight = undefined
    this.unlockedBalance = '0'
    this.txSortOrder = 'asc'
    this.syncTracker.resetSync()
    await super.killEngine()
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
