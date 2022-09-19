import { asNumber, asObject } from 'cleaners'
import { Subscriber } from 'yaob'

export interface ZcashSettings {
  rpcNode: {
    networkName: string
    defaultHost: string
    defaultPort: number
  }
  blockchairServers: [string]
  defaultBirthday: number
}

export interface ZcashSpendInfo {
  zatoshi: string
  toAddress: string
  memo: string
  fromAccountIndex: number
  spendingKey?: string
}

export interface ZcashTransaction {
  rawTransactionId: string
  blockTimeInSeconds: number
  minedHeight: number
  value: string
  toAddress?: string
  memo?: string
}

export interface ZcashPendingTransaction {
  alias: string
  txId: string
  raw: string
}

export interface ZcashWalletBalance {
  alias: string
  availableZatoshi: string
  totalZatoshi: string
}

export interface UnifiedViewingKey {
  extfvk: string
  extpub: string
}

export interface ZcashInitializerConfig {
  networkName: string
  defaultHost: string
  defaultPort: number
  fullViewingKey: UnifiedViewingKey
  alias: string
  birthdayHeight: number
}

export type ZcashSynchronizerStatus =
  | 'STOPPED'
  | 'DISCONNECTED'
  | 'PREPARING'
  | 'DOWNLOADING'
  | 'VALIDATING'
  | 'SCANNING'
  | 'ENHANCING'
  | 'SYNCED'

export interface ZcashStatusEvent {
  alias: string
  name: ZcashSynchronizerStatus
}

export interface ZcashUpdateEvent {
  alias: string
  isDownloading: boolean
  isScanning: boolean
  lastDownloadedHeight: number
  lastScannedHeight: number
  scanProgress: number // 0 - 100
  networkBlockHeight: number
}

// Block range is inclusive
export interface ZcashBlockRange {
  first: number
  last: number
}

export interface ZcashOtherData {
  alias: string
  blockRange: ZcashBlockRange
}

export interface ZcashSynchronizer {
  on: Subscriber<{
    statusChanged: ZcashStatusEvent
    update: ZcashUpdateEvent
  }>
  start: () => Promise<void>
  stop: () => Promise<void>
  getTransactions: (arg: ZcashBlockRange) => Promise<ZcashTransaction[]>
  rescan: (arg: number) => Promise<string>
  sendToAddress: (arg: ZcashSpendInfo) => Promise<ZcashPendingTransaction>
  getShieldedBalance: () => Promise<ZcashWalletBalance>
}

export type ZcashMakeSynchronizer = () => (
  config: ZcashInitializerConfig
) => Promise<ZcashSynchronizer>

export const asBlockchairInfo = asObject({
  data: asObject({
    best_block_height: asNumber
  })
})
