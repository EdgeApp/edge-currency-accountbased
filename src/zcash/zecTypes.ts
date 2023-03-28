import {
  asCodec,
  asMaybe,
  asNumber,
  asObject,
  asString,
  Cleaner
} from 'cleaners'
import { Subscriber } from 'yaob'

import { asWalletInfo } from '../common/types'

type ZcashNetworkName = 'mainnet' | 'testnet'

export interface ZcashNetworkInfo {
  rpcNode: {
    networkName: ZcashNetworkName
    defaultHost: string
    defaultPort: number
  }
  defaultNetworkFee: string
  defaultBirthday: number
  nativeSdk: 'zcash' | 'piratechain'
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
export const asZcashBlockRange = asObject({
  first: asNumber,
  last: asNumber
})

export type ZcashBlockRange = ReturnType<typeof asZcashBlockRange>

export const asZcashWalletOtherData = asObject({
  alias: asMaybe(asString),
  blockRange: asMaybe(asZcashBlockRange, {
    first: 0,
    last: 0
  })
})

export type ZcashWalletOtherData = ReturnType<typeof asZcashWalletOtherData>

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

export const asZecPublicKey = asObject({
  birthdayHeight: asNumber,
  publicKey: asString,
  unifiedViewingKeys: asObject({
    extfvk: asString,
    extpub: asString
  })
})

export type SafeZcashWalletInfo = ReturnType<typeof asSafeZcashWalletInfo>
export const asSafeZcashWalletInfo = asWalletInfo(asZecPublicKey)

export interface ZcashPrivateKeys {
  mnemonic: string
  spendKey: string
  birthdayHeight: number
}
export const asZcashPrivateKeys = (
  pluginId: string
): Cleaner<ZcashPrivateKeys> =>
  asCodec(
    (value: unknown) => {
      const from = asObject({
        [`${pluginId}Mnemonic`]: asString,
        [`${pluginId}SpendKey`]: asString,
        [`${pluginId}BirthdayHeight`]: asNumber
      })(value)
      const to = {
        mnemonic: from[`${pluginId}Mnemonic`],
        spendKey: from[`${pluginId}SpendKey`],
        birthdayHeight: from[`${pluginId}BirthdayHeight`]
      }
      return asObject({
        mnemonic: asString,
        spendKey: asString,
        birthdayHeight: asNumber
      })(to)
    },
    zecPrivateKey => {
      return {
        [`${pluginId}Mnemonic`]: zecPrivateKey.mnemonic,
        [`${pluginId}SpendKey`]: zecPrivateKey.spendKey,
        [`${pluginId}BirthdayHeight`]: zecPrivateKey.birthdayHeight
      }
    }
  )
