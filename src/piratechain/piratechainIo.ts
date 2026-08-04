import {
  asBoolean,
  asJSON,
  asObject,
  asOptional,
  asString,
  asUnknown
} from 'cleaners'
import type { JsonObject } from 'edge-core-js/types'
import type {
  PirateBalance,
  PirateTransaction,
  PirateWalletSdk,
  SynchronizerStatus
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
  mnemonic: string
  name: string
}

export interface PiratechainSynchronizer {
  on: Subscriber<PiratechainEvents>
  getBalance: () => Promise<PirateBalance>
  getCurrentAddress: () => Promise<string>
  getStatus: () => Promise<SynchronizerStatus>
  getTransactions: () => Promise<PirateTransaction[]>
  rescan: (fromHeight?: number) => Promise<void>
  send: (outputs: PiratechainSpendOutput[], fee?: string) => Promise<string>
  stop: () => Promise<void>
}

export interface PiratechainIo {
  deriveViewingKey: (config: PiratechainWalletConfig) => Promise<string>
  getLatestNetworkHeight: () => Promise<number>
  isValidAddress: (address: string) => Promise<boolean>
  makeSynchronizer: (
    config: PiratechainWalletConfig
  ) => Promise<PiratechainSynchronizer>
  setDevicePassphrase: (passphrase: string) => Promise<void>
}

/**
 * `configureAccountStorage` selects the SDK's registry namespace globally:
 * only one is active at a time, and switching cancels any running sync and
 * clears the registry and block caches. So Edge configures exactly one
 * device-scoped namespace, holds every ARRR wallet inside it keyed by alias,
 * and runs a wallet-scoped synchronizer per wallet concurrently. Wallet-free
 * reads (address validation, chain-tip probe) use the same namespace.
 *
 * The core side owns the namespace passphrase — a per-device random secret
 * kept in local storage (see piratechainDeviceStorage) — and hands it over
 * through `setDevicePassphrase` before the first wallet call.
 */
const DEVICE_ACCOUNT_ID = 'edge-pirate-device'

const asInvokeEnvelope = asObject({
  ok: asBoolean,
  result: asOptional(asUnknown),
  error: asOptional(asString)
})

export function makePiratechainIo(): PiratechainIo {
  // The SDK constructor throws when the native module isn't linked, so
  // create it lazily to keep `makePiratechainIo` safe on every platform:
  let sdk: PirateWalletSdk | undefined
  const getSdk = (): PirateWalletSdk => {
    if (sdk == null) sdk = createPirateWalletSdk()
    return sdk
  }

  /** Calls a service method the typed JS wrapper doesn't expose. */
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

  // Supplied by the core side, which reads it from local storage:
  let devicePassphrase: string | undefined

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
    const passphrase = devicePassphrase
    if (passphrase == null) {
      throw new Error('Piratechain device storage passphrase is not set')
    }
    await getSdk().configureAccountStorage({
      accountId: DEVICE_ACCOUNT_ID,
      passphrase
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
    async setDevicePassphrase(passphrase) {
      devicePassphrase = passphrase
    },

    async deriveViewingKey(config) {
      const walletId = await ensureWallet(config)
      return await getSdk().exportSaplingViewingKey(walletId)
    },

    async getLatestNetworkHeight() {
      // The SDK has no wallet-free "get chain tip" call. Any wallet already in
      // the registry carries it on its sync status, so ask one of those first:
      // adding and removing a throwaway wallet mutates the shared registry,
      // and the native service panics (aborting the app) when the registry
      // changes underneath a running synchronizer.
      const task = registryLock.then(async () => {
        const walletSdk = getSdk()
        await ensureDeviceStorage()

        if (await walletSdk.walletRegistryExists()) {
          const wallets = await walletSdk.listWallets()
          for (const wallet of wallets) {
            const syncStatus = await walletSdk
              .getSyncStatus(wallet.id)
              .catch(() => undefined)
            if (syncStatus != null && syncStatus.targetHeight > 0) {
              return syncStatus.targetHeight
            }
          }
        }

        // Nothing in the registry to ask, so no synchronizer can be running
        // either, and mutating it is safe. `create_wallet` with no birthday
        // resolves the height from the lightwalletd tip, falling back to the
        // SDK's static checkpoint:
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
          const { progressPercent, syncStatus } = snapshot
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
            realSynchronizer.balance ?? (await walletSdk.getBalance(walletId))
          )
        },
        getCurrentAddress: async () => {
          return await walletSdk.getCurrentReceiveAddress(walletId)
        },
        getStatus: async () => {
          return realSynchronizer.status
        },
        getTransactions: async () => {
          return realSynchronizer.transactions
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
        stop: async () => {
          await realSynchronizer.close()
        }
      })

      await realSynchronizer.start()
      return out
    }
  })
}
