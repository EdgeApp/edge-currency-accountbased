import { asNumber, asObject } from 'cleaners'
import { Subscriber } from 'yaob'

type ZcashNetworkName = 'mainnet' | 'testnet'

export interface ZcashNetworkInfo {
  rpcNode: {
    networkName: ZcashNetworkName
    defaultHost: string
    defaultPort: number
  }
  blockchairServers: string[]
  defaultNetworkFee: string
  defaultBirthday: number
  transactionQueryLimit: number
}

export interface ZcashSpendInfo {
  zatoshi: string
  toAddress: string
  memo: string
  fromAccountIndex: number
  spendingKey: string
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
  txId: string
  raw: string
}

export interface ZcashWalletBalance {
  availableZatoshi: string
  totalZatoshi: string
}

export interface UnifiedViewingKey {
  extfvk: string
  extpub: string
}

export interface ZcashInitializerConfig {
  networkName: ZcashNetworkName
  defaultHost: string
  defaultPort: number
  fullViewingKey: UnifiedViewingKey
  alias: string
  birthdayHeight: number
}

export type ZcashSynchronizerStatus =
  | 'STOPPED'
  | 'DISCONNECTED'
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
