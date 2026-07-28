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
  /**
   * The registry passphrase, derived from the wallet seed on the core side
   * (see piratechainCrypto). The bridge cannot derive it because Metro does
   * not resolve `crypto`.
   */
  registryPassphrase: string
}

export interface PiratechainSynchronizer {
  on: Subscriber<PiratechainEvents>
  getBalance: () => Promise<PirateBalance>
  getCurrentAddress: () => Promise<string>
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
}

/**
 * The SDK isolates each local wallet in its own encrypted registry namespace,
 * selected by `configureAccountStorage` before any wallet call. The registry
 * passphrase must be unique per local wallet and derived from high-entropy
 * secret material rather than shared or hardcoded; the core side derives it
 * from the wallet seed (see piratechainCrypto) and passes it in the config.
 *
 * A separate throwaway namespace serves wallet-free reads (address validation,
 * chain-tip probe). It never holds funds or spending keys, so a fixed
 * passphrase is safe here.
 */
const PROBE_ACCOUNT_ID = 'edge-arrr-probe'
const PROBE_PASSPHRASE = 'edge-arrr-probe-namespace-v1'

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

  // Selecting a namespace clears the SDK's active wallet and sync caches, so
  // track the active one and only switch when it actually changes:
  let activeAccountId: string | undefined
  const selectNamespace = async (
    accountId: string,
    passphrase: string
  ): Promise<void> => {
    if (activeAccountId === accountId) return
    await getSdk().configureAccountStorage({ accountId, passphrase })
    // The default transport tunnels through Tor, which doesn't reliably
    // bootstrap inside Edge, and a namespace switch clears transport state.
    // Reconnect directly, like every other plugin. Mark the namespace active
    // only after the tunnel is set: if set_tunnel throws, activeAccountId
    // stays unchanged so a retry reconfigures fully instead of early-returning
    // onto the unreliable default Tor transport.
    await invokeCall('set_tunnel', { mode: 'Direct' })
    activeAccountId = accountId
  }

  /**
   * Ensures some namespace is active for a wallet-free read. Reuses the
   * currently-selected wallet namespace when one is active so validating an
   * address never clears a syncing wallet's caches.
   */
  const ensureAnyNamespace = async (): Promise<void> => {
    if (activeAccountId != null) return
    await selectNamespace(PROBE_ACCOUNT_ID, PROBE_PASSPHRASE)
  }

  /**
   * Finds the registry wallet matching the Edge wallet's alias name inside its
   * own namespace, restoring it from the mnemonic if this device hasn't seen
   * it yet. Calls are serialized so a namespace switch never interleaves with
   * another wallet's registry mutation.
   */
  let ensureWalletLock: Promise<unknown> = Promise.resolve()
  const ensureWallet = async (
    config: PiratechainWalletConfig
  ): Promise<string> => {
    const task = ensureWalletLock.then(async () => {
      const { birthdayHeight, mnemonic, name, registryPassphrase } = config
      const walletSdk = getSdk()
      await selectNamespace(name, registryPassphrase)
      const registryExists = await walletSdk.walletRegistryExists()
      if (registryExists) {
        const wallets = await walletSdk.listWallets()
        const existingWallet = wallets.find(wallet => wallet.name === name)
        if (existingWallet != null) return existingWallet.id
      }
      return await walletSdk.restoreWallet({ name, mnemonic, birthdayHeight })
    })
    ensureWalletLock = task.catch(() => undefined)
    return await task
  }

  return bridgifyObject<PiratechainIo>({
    async deriveViewingKey(config) {
      const walletId = await ensureWallet(config)
      return await getSdk().exportSaplingViewingKey(walletId)
    },

    async getLatestNetworkHeight() {
      // The SDK has no wallet-free "get chain tip" call, but `create_wallet`
      // with no birthday resolves one from the lightwalletd tip (falling back
      // to the SDK's static checkpoint), so probe with a throwaway wallet in
      // the throwaway namespace. Shares the serialization lock (see
      // ensureWallet) so it never switches namespaces mid-mutation:
      const task = ensureWalletLock.then(async () => {
        const walletSdk = getSdk()
        await selectNamespace(PROBE_ACCOUNT_ID, PROBE_PASSPHRASE)
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
      ensureWalletLock = task.catch(() => undefined)
      return await task
    },

    async isValidAddress(address) {
      await ensureAnyNamespace()
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
