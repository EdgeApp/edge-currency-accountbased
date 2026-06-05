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
  amount: number
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
  getTransactions: () => Promise<PirateTransaction[]>
  rescan: (fromHeight?: number) => Promise<void>
  send: (outputs: PiratechainSpendOutput[], fee?: number) => Promise<string>
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
 * The SDK encrypts its on-device databases (SQLCipher) behind an app
 * passphrase and rejects every wallet call with "App is locked" until
 * `set_app_passphrase`/`unlock_app` runs. Edge already gates wallet access
 * behind its own login, so a fixed passphrase keeps at-rest encryption at
 * parity with the previous SDK (sandbox-protected files).
 */
const APP_PASSPHRASE = 'edge-pirate-wallet'

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

  let unlockPromise: Promise<void> | undefined
  const ensureUnlocked = async (): Promise<void> => {
    if (unlockPromise == null) {
      unlockPromise = (async () => {
        const hasPassphrase = asBoolean(await invokeCall('has_app_passphrase'))
        if (hasPassphrase) {
          await invokeCall('unlock_app', { passphrase: APP_PASSPHRASE })
        } else {
          await invokeCall('set_app_passphrase', { passphrase: APP_PASSPHRASE })
        }
        // The SDK tunnels through Tor by default, which doesn't reliably
        // bootstrap inside Edge. Connect directly, like every other plugin:
        await invokeCall('set_tunnel', { mode: 'Direct' })
      })().catch((error: unknown) => {
        // Allow a retry on the next call instead of caching the failure:
        unlockPromise = undefined
        throw error
      })
    }
    await unlockPromise
  }

  /**
   * Finds the registry wallet matching the Edge wallet's alias name,
   * restoring it from the mnemonic if this device hasn't seen it yet.
   * Calls are serialized because the registry has no name uniqueness:
   * two concurrent restores would create duplicate wallets.
   */
  let ensureWalletLock: Promise<unknown> = Promise.resolve()
  const ensureWallet = async (
    config: PiratechainWalletConfig
  ): Promise<string> => {
    const task = ensureWalletLock.then(async () => {
      const { birthdayHeight, mnemonic, name } = config
      const walletSdk = getSdk()
      await ensureUnlocked()
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
      // to the SDK's static checkpoint), so probe with a throwaway wallet.
      // Registry mutations share the serialization lock (see ensureWallet):
      const task = ensureWalletLock.then(async () => {
        const walletSdk = getSdk()
        await ensureUnlocked()
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
      await ensureUnlocked()
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
          // The wrapper's `send` helper camelizes the build_tx result and
          // feeds it back into sign_tx, which rejects it (snake_case
          // fields), so run the three steps over the raw invoke bridge:
          const pending = await invokeCall('build_tx', {
            wallet_id: walletId,
            outputs,
            fee_opt: fee ?? null
          })
          const signed = await invokeCall('sign_tx', {
            wallet_id: walletId,
            pending
          })
          const txid = await invokeCall('broadcast_tx', { signed })
          return asString(txid)
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
