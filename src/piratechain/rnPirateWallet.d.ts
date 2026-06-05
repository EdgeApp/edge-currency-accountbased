/**
 * Type declarations for `react-native-pirate-wallet`.
 *
 * The package lives in the PirateNetwork/Pirate-Unified-Light-Wallet monorepo
 * (bindings/react-native-pirate-wallet) and is not published to npm, so the
 * GUI installs it from a hosted tarball and this repo carries the typings
 * needed to compile against it. Only the surface consumed by the piratechain
 * plugin is declared here.
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

  /** Result of the `get_balance` RPC. Values are arrrtoshis. */
  export interface PirateBalance {
    total: number
    spendable: number
    pending: number
  }

  /** Entry of the `list_transactions` RPC result. Amounts are arrrtoshis. */
  export interface PirateTransaction {
    txId: string
    height: number | null
    timestamp: number
    amount: number
    fee: number
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
    amount: number
    memo?: string | null
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
    onError?: (error: Error) => void
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
      fee?: number | null
    ) => Promise<string>

    exportSaplingViewingKey: (walletId: string) => Promise<string>
    exportOrchardViewingKey: (walletId: string) => Promise<string>
  }

  export function createPirateWalletSdk(): PirateWalletSdk
}
