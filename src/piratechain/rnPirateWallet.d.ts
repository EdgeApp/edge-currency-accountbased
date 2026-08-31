/**
 * Type declarations for `react-native-pirate-wallet`.
 *
 * The package is a peer dependency the GUI installs, so it is absent from
 * this repo's own node_modules and this file carries the typings needed to
 * compile against it. Only the surface consumed by the piratechain plugin is
 * declared here; the shapes follow the package's `src/index.d.ts` at the
 * version `package.json` requires.
 */
declare module 'react-native-pirate-wallet' {
  export type SyncMode = 'Compact' | 'Deep'
  export type SynchronizerStatus = 'STOPPED' | 'SYNCING' | 'SYNCED'

  export interface WalletMeta {
    id: string
    name: string
    createdAt: number
    watchOnly: boolean
    birthdayHeight: number
    networkType?: 'mainnet' | 'testnet' | 'regtest' | null
  }

  export interface SynchronizerConfig {
    syncMode?: SyncMode
    syncingPollIntervalMs?: number
    syncedPollIntervalMs?: number
    errorPollIntervalMs?: number
    transactionLimit?: number | null
  }

  /** Result of the `sync_status` RPC. Heights are absolute block heights. */
  export interface PirateSyncStatus {
    localHeight: number
    targetHeight: number
    percent: number
    eta: number | null
    stage: string | null
    lastCheckpoint: number | null
    blocksPerSecond: number | null
    notesDecrypted: number | null
    lastBatchMs: number | null
  }

  /**
   * Result of the `get_balance` RPC. Values are arrrtoshis serialized as
   * decimal strings so balances above 2^53-1 keep full precision.
   */
  export interface PirateBalance {
    total: string
    spendable: string
    pending: string
  }

  /**
   * Why a wallet cannot sign right now. `OK` means it can. The repair and
   * finalizing states stay reported until witness reconstruction and anchor
   * validation have both finished, so a status that reads `OK` is one the
   * node will accept a transaction from.
   */
  export type PirateSpendabilityReasonCode =
    | 'OK'
    | 'ERR_SYNC_FINALIZING'
    | 'ERR_WITNESS_REPAIR_QUEUED'
    | 'ERR_RESCAN_REQUIRED'

  /**
   * Result of the `get_spendability_status` RPC. A wallet reports `SYNCED`
   * before its spend anchor is usable, and this is the only surface that
   * separates the two: `spendable` is false for the whole finalizing window,
   * with `reasonCode` naming which state the wallet is in.
   */
  export interface PirateSpendabilityStatus {
    spendable: boolean
    rescanRequired: boolean
    repairQueued: boolean
    reasonCode: PirateSpendabilityReasonCode
    targetHeight: number | null
    anchorHeight: number | null
    validatedAnchorHeight: number | null
  }

  /**
   * Result of the wallet signing session RPCs. Once protection is enabled,
   * `sign_tx` fails with `ERR_SIGNING_SESSION_LOCKED` until the wallet is
   * unlocked with the credential it was protected with.
   */
  export interface PirateWalletSigningStatus {
    protectionEnabled: boolean
    unlocked: boolean
  }

  export interface PirateEndpointHealthDiagnostic {
    endpoint: string
    healthy: boolean
    active: boolean
    tipHeight: number | null
    latencyMs: number | null
    reason: string | null
  }

  /**
   * Result of the `get_lightd_endpoint_pool_diagnostics` RPC: a live probe of
   * every configured endpoint over the wallet's current transport.
   * `activeEndpoint` is null when none of them passes connectivity,
   * compact-cache readiness and canonical-chain validation.
   */
  export interface PirateEndpointPoolDiagnostics {
    walletId: string
    configuredEndpoint: string
    activeEndpoint: string | null
    automaticFailover: boolean
    endpoints: PirateEndpointHealthDiagnostic[]
  }

  /**
   * Entry of the `list_transactions` RPC result. Amounts are arrrtoshis
   * serialized as decimal strings (see PirateBalance).
   */
  export interface PirateTransaction {
    txid: string
    height: number | null
    timestamp: number
    amount: string
    fee: string
    memo: string | null
    confirmed: boolean
  }

  export interface PirateNetworkInfo {
    name: string
    coinType: number
    rpcPort: number
    defaultBirthday: number
  }

  export interface PirateFeeInfo {
    defaultFee: number
    minFee: number
    maxFee: number
    feePerOutput: number
    memoFeeMultiplier: number
  }

  export interface PirateAddressValidation {
    isValid: boolean
    addressType: string | null
    reason: string | null
  }

  export interface PirateTransactionOutput {
    addr: string
    /** Arrrtoshis as a decimal string to preserve precision above 2^53-1. */
    amount: string
    memo?: string | null
  }

  /**
   * Selects the encrypted wallet registry, by path and passphrase. This is
   * global state: one registry is active at a time, and switching cancels any
   * running sync and clears the registry and block caches. Edge configures a
   * single device-scoped registry once and keeps every wallet inside it.
   */
  export interface PirateAccountStorageConfig {
    accountId: string
    passphrase: string
    storagePath?: string | null
  }

  /**
   * Same selection as `PirateAccountStorageConfig`, but the native module
   * mints the passphrase itself and keeps it in the iOS Keychain or Android
   * Keystore, so it never crosses the bridge. The registry directory is
   * derived from `accountId` alone, so an id that was ever used with a
   * caller-supplied passphrase must not be reused here.
   */
  export interface PirateSecureAccountStorageConfig {
    accountId: string
    storagePath?: string | null
  }

  export interface SynchronizerSnapshot {
    walletId: string
    alias: string
    status: SynchronizerStatus
    progressPercent: number
    syncStatus: PirateSyncStatus | null
    latestBirthdayHeight: number | null
    balance: PirateBalance | null
    transactions: PirateTransaction[]
    updatedAtMillis: number | null
    lastError: Error | null
  }

  export interface SynchronizerCallbacks {
    onStatusChanged?: (event: {
      walletId: string
      alias: string
      name: SynchronizerStatus
    }) => void
    onUpdate?: (snapshot: SynchronizerSnapshot) => void
    // Native errors are serialized across the RN bridge and arrive as plain
    // objects or strings, not real Error instances, so consumers must narrow:
    onError?: (error: unknown) => void
  }

  export class PirateWalletSynchronizer {
    constructor(
      sdk: PirateWalletSdk,
      walletId: string,
      config?: SynchronizerConfig
    )
    walletId: string
    config: SynchronizerConfig
    status: SynchronizerStatus
    progress: number
    syncStatus: PirateSyncStatus | null
    latestBirthdayHeight: number | null
    balance: PirateBalance | null
    transactions: PirateTransaction[]
    lastError: Error | null
    currentSnapshot: () => SynchronizerSnapshot
    isRunning: () => boolean
    isSyncing: () => boolean
    isComplete: () => boolean
    start: () => Promise<void>
    stop: () => Promise<void>
    refresh: () => Promise<SynchronizerSnapshot>
    close: () => Promise<void>
    subscribe: (callbacks?: SynchronizerCallbacks) => () => void
  }

  export class PirateWalletSdk {
    invoke: (requestJson: string, pretty?: boolean) => Promise<string>
    createSynchronizer: (
      walletId: string,
      config?: SynchronizerConfig
    ) => PirateWalletSynchronizer

    walletRegistryExists: () => Promise<boolean>
    listWallets: () => Promise<WalletMeta[]>
    getWallet: (walletId: string) => Promise<WalletMeta | null>
    createWallet: (
      requestOrName: string | { name: string; birthdayHeight?: number | null },
      birthdayHeight?: number | null
    ) => Promise<string>

    restoreWallet: (
      requestOrName:
        | string
        | { name: string; mnemonic: string; birthdayHeight?: number | null },
      mnemonic?: string,
      birthdayHeight?: number | null
    ) => Promise<string>

    deleteWallet: (walletId: string) => Promise<unknown>
    getLatestBirthdayHeight: (walletId: string) => Promise<number | null>
    validateMnemonic: (mnemonic: string) => Promise<boolean>
    getNetworkInfo: () => Promise<PirateNetworkInfo>
    isValidShieldedAddr: (address: string) => Promise<boolean>
    validateAddress: (address: string) => Promise<PirateAddressValidation>
    getCurrentReceiveAddress: (walletId: string) => Promise<string>
    getNextReceiveAddress: (walletId: string) => Promise<string>
    getBalance: (walletId: string) => Promise<PirateBalance>
    getSpendabilityStatus: (
      walletId: string
    ) => Promise<PirateSpendabilityStatus>

    listTransactions: (
      walletId: string,
      limit?: number | null
    ) => Promise<PirateTransaction[]>

    getFeeInfo: () => Promise<PirateFeeInfo>
    startSync: (walletId: string, mode?: SyncMode) => Promise<unknown>
    getSyncStatus: (walletId: string) => Promise<PirateSyncStatus>
    cancelSync: (walletId: string) => Promise<unknown>
    rescan: (walletId: string, fromHeight?: number | null) => Promise<unknown>
    send: (
      walletId: string,
      outputsOrOutput: PirateTransactionOutput | PirateTransactionOutput[],
      fee?: string | null
    ) => Promise<string>

    configureAccountStorage: (
      config: PirateAccountStorageConfig
    ) => Promise<unknown>

    configureSecureAccountStorage: (
      config: PirateSecureAccountStorageConfig
    ) => Promise<unknown>

    getLightdEndpointPoolDiagnostics: (
      walletId: string
    ) => Promise<PirateEndpointPoolDiagnostics>

    enableWalletSigningProtection: (
      walletId: string,
      sessionCredential: string
    ) => Promise<PirateWalletSigningStatus>

    unlockWalletSigning: (
      walletId: string,
      sessionCredential: string
    ) => Promise<PirateWalletSigningStatus>

    lockWalletSigning: (walletId: string) => Promise<PirateWalletSigningStatus>
    lockAllWalletSigning: () => Promise<unknown>
    getWalletSigningStatus: (
      walletId: string
    ) => Promise<PirateWalletSigningStatus>

    exportSaplingViewingKey: (walletId: string) => Promise<string>
    exportIronwoodViewingKey: (walletId: string) => Promise<string>
  }

  export function createPirateWalletSdk(): PirateWalletSdk
}
