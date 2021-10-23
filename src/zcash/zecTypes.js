// @flow

import { asNumber, asObject } from 'cleaners'
import { type Subscriber } from 'yaob'

export type ZcashSettings = {
  rpcNode: {
    networkName: string,
    defaultHost: string,
    defaultPort: number
  },
  blockchairServers: [string],
  defaultBirthday: number
}

export type ZcashSpendInfo = {
  zatoshi: string,
  toAddress: string,
  memo: string,
  fromAccountIndex: number,
  spendingKey?: string
}

export type ZcashTransaction = {
  rawTransactionId: string,
  blockTimeInSeconds: number,
  minedHeight: number,
  value: string,
  toAddress?: string,
  memo?: string
}

export type ZcashPendingTransaction = {
  alias: string,
  txId: string,
  raw: string
}

export type ZcashWalletBalance = {
  alias: string,
  availableZatoshi: string,
  totalZatoshi: string
}

export type UnifiedViewingKey = {
  extfvk: string,
  extpub: string
}

export type ZcashInitializerConfig = {
  networkName: string,
  defaultHost: string,
  defaultPort: number,
  fullViewingKey: UnifiedViewingKey,
  alias: string,
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

export type ZcashStatusEvent = {
  alias: string,
  name: ZcashSynchronizerStatus
}

export type ZcashUpdateEvent = {
  alias: string,
  isDownloading: boolean,
  isScanning: boolean,
  lastDownloadedHeight: number,
  lastScannedHeight: number,
  scanProgress: number, // 0 - 100
  networkBlockHeight: number
}

// Block range is inclusive
export type ZcashBlockRange = {
  first: number,
  last: number
}

export type ZcashOtherData = {
  alias: string,
  blockRange: ZcashBlockRange
}

export type ZcashSynchronizer = {
  on: Subscriber<{
    statusChanged: ZcashStatusEvent,
    update: ZcashUpdateEvent,
    shieldedBalanceChanged: ZcashWalletBalance
  }>,
  start: () => Promise<void>,
  stop: () => Promise<void>,
  getTransactions: (arg: ZcashBlockRange) => Promise<ZcashTransaction[]>,
  rescan: (arg: number) => Promise<string>,
  sendToAddress: (arg: ZcashSpendInfo) => Promise<ZcashPendingTransaction>,
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
