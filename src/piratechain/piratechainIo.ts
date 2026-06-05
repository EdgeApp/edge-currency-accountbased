import {
  asArray,
  asBoolean,
  asEither,
  asJSON,
  asMaybe,
  asNull,
  asNumber,
  asObject,
  asOptional,
  asString,
  asUnknown
} from 'cleaners'
import type { JsonObject } from 'edge-core-js/types'
import type {
  Balance,
  PirateWalletSdk,
  SynchronizerStatus,
  TransactionInfo
} from 'react-native-pirate-wallet'
import { createPirateWalletSdk } from 'react-native-pirate-wallet'
import { bridgifyObject, emit, onMethod, Subscriber } from 'yaob'

export interface PiratechainStatusEvent {
  name: SynchronizerStatus
}

export interface PiratechainUpdateEvent {
  lastDownloadedHeight: number
  networkBlockHeight: number
  progressPercent: number
}

export interface PiratechainErrorEvent {
  message: string
}

export interface PiratechainEvents {
  error: PiratechainErrorEvent
  statusChanged: PiratechainStatusEvent
  update: PiratechainUpdateEvent
}

export interface PiratechainSpendOutput {
  addr: string
  /** Arrrtoshis as a decimal string to preserve precision above 2^53-1. */
  amount: string
  memo?: string
}

export interface PiratechainWalletConfig {
  birthdayHeight: number
  /**
   * Alternate lightwalletd URLs for the SDK's multi-server pool. Empty or
   * absent leaves the wallet on `lightwalletdUrl` alone.
   */
  lightwalletdFailoverUrls?: string[]
  /**
   * The lightwalletd node this wallet scans against, as a plain gRPC URL. The
   * SDK ships its own default node and never consults the plugin's config, so
   * without this the wallet silently scans against whatever the SDK picked.
   */
  lightwalletdUrl?: string
  mnemonic: string
  name: string
}

export interface PiratechainSynchronizer {
  on: Subscriber<PiratechainEvents>
  getBalance: () => Promise<Balance>
  getCurrentAddress: () => Promise<string>
  getTransactions: () => Promise<TransactionInfo[]>
  rescan: (fromHeight?: number) => Promise<void>
  send: (outputs: PiratechainSpendOutput[], fee?: string) => Promise<string>
  /**
   * Starts the native poller. Separate from `makeSynchronizer` so the engine
   * can subscribe first: the SDK emits its first status change synchronously
   * inside `start`, and a listener attached afterwards would never see it.
   */
  start: () => Promise<void>
  stop: () => Promise<void>
}

export interface PiratechainIo {
  deriveViewingKey: (config: PiratechainWalletConfig) => Promise<string>
  /**
   * @param lightwalletdUrl The node to read the chain tip from. Without it the
   * only sources are a wallet that is already syncing and the SDK's own
   * default node.
   */
  getLatestNetworkHeight: (lightwalletdUrl?: string) => Promise<number>
  isValidAddress: (address: string) => Promise<boolean>
  makeSynchronizer: (
    config: PiratechainWalletConfig
  ) => Promise<PiratechainSynchronizer>
}

/**
 * The SDK's registry namespace is selected globally: only one is active at a
 * time, and switching cancels any running sync and clears the registry and
 * block caches. So Edge configures exactly one device-scoped namespace, holds
 * every ARRR wallet inside it keyed by alias, and runs a wallet-scoped
 * synchronizer per wallet concurrently. Wallet-free reads (address
 * validation, chain-tip probe) use the same namespace.
 *
 * The native module mints the namespace passphrase and keeps it in the iOS
 * Keychain or Android Keystore, so no JS side ever holds it. The registry
 * directory is derived from this id alone, and the id is distinct from the
 * one the plugin used with a JS-supplied passphrase, so a device that carries
 * that older registry gets a fresh one rather than a credential mismatch;
 * wallets re-restore from their seeds.
 */
const DEVICE_ACCOUNT_ID = 'edge-pirate-keychain'

const asInvokeEnvelope = asObject({
  ok: asBoolean,
  result: asOptional(asUnknown),
  error: asOptional(asString)
})

/**
 * The poller's cached snapshot fields are untyped in the SDK, so re-check
 * the shapes the engine depends on before trusting them.
 */
const asBalance = asObject({
  total: asString,
  spendable: asString,
  pending: asString
})
const asSyncStatus = asObject({
  localHeight: asNumber,
  targetHeight: asNumber
})
const asTransactions = asArray(
  asObject<TransactionInfo>({
    txid: asString,
    height: asEither(asNumber, asNull),
    timestamp: asNumber,
    amount: asString,
    fee: asString,
    memo: asEither(asString, asNull),
    confirmed: asBoolean
  })
)

export function makePiratechainIo(): PiratechainIo {
  // The SDK constructor throws when the native module isn't linked, so
  // create it lazily to keep `makePiratechainIo` safe on every platform:
  let sdk: PirateWalletSdk | undefined
  const getSdk = (): PirateWalletSdk => {
    if (sdk == null) sdk = createPirateWalletSdk()
    return sdk
  }

  /**
   * Calls a service method the typed JS wrapper doesn't expose. Only
   * `set_tunnel` needs this; everything else goes through the wrappers, which
   * validate arguments and camelize results.
   */
  const invokeCall = async (
    method: string,
    params: JsonObject = {}
  ): Promise<unknown> => {
    const response = await getSdk().invoke(
      JSON.stringify({ method, ...params })
    )
    const envelope = asJSON(asInvokeEnvelope)(response)
    if (!envelope.ok) {
      throw new Error(envelope.error ?? `Native request failed for ${method}`)
    }
    return envelope.result
  }

  /**
   * Configures the one device namespace, at most once. Every call that touches
   * storage awaits this first.
   */
  let deviceStoragePromise: Promise<void> | undefined
  const ensureDeviceStorage = async (): Promise<void> => {
    if (deviceStoragePromise == null) {
      deviceStoragePromise = configureDeviceStorage().catch(
        (error: unknown) => {
          // Don't cache a failure — the next call retries the whole setup
          // rather than proceeding on an unconfigured namespace:
          deviceStoragePromise = undefined
          throw error
        }
      )
    }
    await deviceStoragePromise
  }

  const configureDeviceStorage = async (): Promise<void> => {
    await getSdk().configureSecureAccountStorage({
      accountId: DEVICE_ACCOUNT_ID
    })
    // The default transport tunnels through Tor, which doesn't reliably
    // bootstrap inside Edge, and configuring storage clears transport state.
    // Reconnect directly, like every other plugin:
    await invokeCall('set_tunnel', { mode: 'Direct' })
  }

  /**
   * Finds the registry wallet matching the Edge wallet's alias name, restoring
   * it from the mnemonic if this device hasn't seen it yet. Registry mutations
   * are serialized so two wallets starting at once cannot interleave. Syncing
   * itself is wallet-scoped and stays concurrent.
   */
  let registryLock: Promise<unknown> = Promise.resolve()
  const ensureWallet = async (
    config: PiratechainWalletConfig
  ): Promise<string> => {
    const task = registryLock.then(async () => {
      const { birthdayHeight, mnemonic, name } = config
      const walletSdk = getSdk()
      await ensureDeviceStorage()
      const registryExists = await walletSdk.walletRegistryExists()
      if (registryExists) {
        const wallets = await walletSdk.listWallets()
        const existingWallet = wallets.find(wallet => wallet.name === name)
        if (existingWallet != null) return existingWallet.id
      }
      return await walletSdk.restoreWallet({ name, mnemonic, birthdayHeight })
    })
    registryLock = task.catch(() => undefined)
    return await task
  }

  return bridgifyObject<PiratechainIo>({
    async deriveViewingKey(config) {
      const walletId = await ensureWallet(config)
      return await getSdk().exportSaplingViewingKey(walletId)
    },

    async getLatestNetworkHeight(lightwalletdUrl) {
      // Three sources, cheapest and safest first. The last one mutates the
      // registry, and the native service panics (aborting the app) when the
      // registry changes underneath a running synchronizer, so it is gated on
      // the registry being genuinely empty.
      const task = registryLock.then(async () => {
        const walletSdk = getSdk()
        await ensureDeviceStorage()

        // 1. A wallet that is already syncing carries the tip for free.
        const wallets = (await walletSdk.walletRegistryExists())
          ? await walletSdk.listWallets()
          : []
        for (const wallet of wallets) {
          const syncStatus = await walletSdk
            .getSyncStatus(wallet.id)
            .catch(() => undefined)
          if (syncStatus != null && syncStatus.targetHeight > 0) {
            return syncStatus.targetHeight
          }
        }

        // 2. Ask Edge's own node. `test_node` reports the tip without
        // registering anything, so it is safe while synchronizers run, and it
        // reads the configured node rather than the SDK's default (which is
        // unreachable, and whose tip we would not want to trust anyway: a
        // birthday taken too high leaves earlier notes unscanned).
        if (lightwalletdUrl != null) {
          const result = await walletSdk
            .testLightdEndpoint(lightwalletdUrl)
            .catch(() => undefined)
          const height = result?.latestBlockHeight
          if (result?.success === true && height != null && height > 0) {
            return height
          }
        }

        // 3. Nothing registered and no reachable node, so no synchronizer can
        // be running and mutating the registry is safe. `create_wallet` with
        // no birthday falls back to the SDK's static checkpoint, which is
        // below the true tip and therefore conservative.
        if (wallets.length > 0) {
          throw new Error(
            'Cannot resolve the Pirate Chain height: no wallet reports a tip and the configured node is unreachable'
          )
        }
        const probeWalletId = await walletSdk.createWallet({
          name: 'edge-birthday-probe'
        })
        try {
          const probeWallet = await walletSdk.getWallet(probeWalletId)
          if (probeWallet == null) {
            throw new Error('Missing birthday probe wallet')
          }
          return probeWallet.birthdayHeight
        } finally {
          await walletSdk.deleteWallet(probeWalletId).catch(() => undefined)
        }
      })
      registryLock = task.catch(() => undefined)
      return await task
    },

    async isValidAddress(address) {
      await ensureDeviceStorage()
      const result = await getSdk().validateAddress(address)
      return result.isValid
    },

    async makeSynchronizer(config) {
      const walletSdk = getSdk()
      const walletId = await ensureWallet(config)

      // Point the wallet at Edge's own node. The SDK bakes in a default
      // lightwalletd and never reads the plugin's `networkInfo`, so a wallet
      // left alone scans against that default. When that node is degraded the
      // failure is silent and total: `test_node` still succeeds and the chain
      // tip still resolves, but the scan sits in the `Headers` stage at zero
      // blocks/sec forever, which surfaces in the app as "Sync in Progress,
      // 0% Complete" with no error anywhere.
      if (config.lightwalletdUrl != null) {
        const failoverUrls = config.lightwalletdFailoverUrls ?? []
        let pooled = false
        if (failoverUrls.length > 0) {
          // Multi-server mode, added in SDK 0.3.2 and off by default there:
          // the sync engine spreads block fetches across compatible light
          // servers and moves off one that stalls, which is the networking
          // bottleneck on a fresh scan. The plugin opts in only when its
          // config names alternates, so the single-endpoint call below stays
          // the shipped behavior.
          try {
            await walletSdk.setLightdEndpointPool(
              walletId,
              config.lightwalletdUrl,
              failoverUrls
            )
            pooled = true
          } catch (error: unknown) {
            // The pool list arrives from the info server, so a payload the SDK
            // rejects (an unreachable alternate, a host on another network, a
            // list past its cap) must not cost the wallet its sync. Fall back
            // to the single endpoint, which is what every wallet ran on before
            // 0.3.2:
            console.warn(
              `piratechain: lightwalletd pool rejected, falling back to a single endpoint: ${String(
                error
              )}`
            )
          }
        }
        if (!pooled) {
          await walletSdk.setLightdEndpoint(walletId, config.lightwalletdUrl)
        }
      }

      const realSynchronizer = walletSdk.createSynchronizer(walletId, {
        transactionLimit: null
      })

      realSynchronizer.subscribe({
        onError(error): void {
          emit(out, 'error', {
            message: error instanceof Error ? error.message : String(error)
          })
        },
        onStatusChanged(status): void {
          emit(out, 'statusChanged', { name: status.name })
        },
        onUpdate(snapshot): void {
          const { progressPercent } = snapshot
          const syncStatus = asMaybe(asSyncStatus)(snapshot.syncStatus)
          // The first polls can fire before the backend reports heights;
          // skip those so progress trackers never see zero heights:
          if (syncStatus == null || syncStatus.targetHeight <= 0) return
          emit(out, 'update', {
            lastDownloadedHeight: syncStatus.localHeight,
            networkBlockHeight: syncStatus.targetHeight,
            progressPercent
          })
        }
      })

      const out: PiratechainSynchronizer = bridgifyObject({
        on: onMethod,
        getBalance: async () => {
          // The polling synchronizer refreshes this before each update event:
          return (
            asMaybe(asBalance)(realSynchronizer.balance) ??
            (await walletSdk.getBalance(walletId))
          )
        },
        getCurrentAddress: async () => {
          return await walletSdk.getCurrentReceiveAddress(walletId)
        },
        getTransactions: async () => {
          // Same cache as the balance, refreshed by the poller each round:
          return (
            asMaybe(asTransactions)(realSynchronizer.transactions) ??
            (await walletSdk.listTransactions(walletId, null))
          )
        },
        rescan: async fromHeight => {
          await walletSdk.rescan(walletId, fromHeight ?? null)
        },
        send: async (outputs, fee) => {
          // The SDK's send builds, signs, and broadcasts, keeping the opaque
          // pending/signed payloads verbatim between steps and serializing
          // amounts as strings so large sends keep full precision:
          return await walletSdk.send(walletId, outputs, fee ?? null)
        },
        start: async () => {
          try {
            await realSynchronizer.start()
          } catch (error: unknown) {
            // A poller that failed to start may still hold its native sync
            // registration; close it so a retry does not leave a second
            // synchronizer running against the same registry wallet:
            await realSynchronizer.close().catch(() => undefined)
            throw error
          }
        },
        stop: async () => {
          await realSynchronizer.close()
        }
      })

      return out
    }
  })
}
