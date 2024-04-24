import {
  asCodec,
  asMaybe,
  asNumber,
  asObject,
  asString,
  Cleaner
} from 'cleaners'
import type { Subscriber } from 'yaob'

import { asWalletInfo } from '../common/types'

type PiratechainNetworkName = 'mainnet' | 'testnet'

export interface PiratechainNetworkInfo {
  rpcNode: {
    networkName: PiratechainNetworkName
    defaultHost: string
    defaultPort: number
  }
  defaultNetworkFee: string
  defaultBirthday: number
  transactionQueryLimit: number
}

export interface PiratechainSpendInfo {
  zatoshi: string
  toAddress: string
  memo: string
  fromAccountIndex: number
  mnemonicSeed: string
}

export interface PiratechainTransaction {
  rawTransactionId: string
  blockTimeInSeconds: number
  minedHeight: number
  value: string
  toAddress?: string
  memos: string[]
}

export interface PiratechainPendingTransaction {
  txId: string
  raw: string
}

export interface PiratechainWalletBalance {
  availableZatoshi: string
  totalZatoshi: string
}

export interface UnifiedViewingKey {
  extfvk: string
  extpub: string
}

export interface PiratechainInitializerConfig {
  networkName: PiratechainNetworkName
  defaultHost: string
  defaultPort: number
  mnemonicSeed: string
  alias: string
  birthdayHeight: number
}

export interface PiratechainAddresses {
  // unifiedAddress: string
  saplingAddress: string
  // transparentAddress: string
}

export type PiratechainSynchronizerStatus =
  | 'STOPPED'
  | 'DISCONNECTED'
  | 'SYNCING'
  | 'SYNCED'

export interface PiratechainStatusEvent {
  alias: string
  name: PiratechainSynchronizerStatus
}

export interface PiratechainUpdateEvent {
  alias: string
  isDownloading: boolean
  isScanning: boolean
  lastDownloadedHeight: number
  lastScannedHeight: number
  scanProgress: number // 0 - 100
  networkBlockHeight: number
}

// Block range is inclusive
export const asPiratechainBlockRange = asObject({
  first: asNumber,
  last: asNumber
})

export type PiratechainBlockRange = ReturnType<typeof asPiratechainBlockRange>

export const asPiratechainWalletOtherData = asObject({
  alias: asMaybe(asString),
  blockRange: asMaybe(asPiratechainBlockRange, () => ({
    first: 0,
    last: 0
  }))
})

export type PiratechainWalletOtherData = ReturnType<
  typeof asPiratechainWalletOtherData
>

export interface PiratechainSynchronizer {
  on: Subscriber<{
    statusChanged: PiratechainStatusEvent
    update: PiratechainUpdateEvent
  }>
  start: () => Promise<void>
  stop: () => Promise<void>
  deriveUnifiedAddress: () => Promise<PiratechainAddresses>
  getTransactions: (
    arg: PiratechainBlockRange
  ) => Promise<PiratechainTransaction[]>
  rescan: () => Promise<string>
  sendToAddress: (
    arg: PiratechainSpendInfo
  ) => Promise<PiratechainPendingTransaction>
  getBalance: () => Promise<PiratechainWalletBalance>
}

export type PiratechainMakeSynchronizer = () => (
  config: PiratechainInitializerConfig
) => Promise<PiratechainSynchronizer>

export const asArrrPublicKey = asObject({
  birthdayHeight: asNumber,
  publicKey: asString
})

export type SafePiratechainWalletInfo = ReturnType<
  typeof asSafePiratechainWalletInfo
>
export const asSafePiratechainWalletInfo = asWalletInfo(asArrrPublicKey)

export interface PiratechainPrivateKeys {
  mnemonic: string
  birthdayHeight: number
}
export const asPiratechainPrivateKeys = (
  pluginId: string
): Cleaner<PiratechainPrivateKeys> => {
  const asKeys = asObject({
    [`${pluginId}Mnemonic`]: asString,
    [`${pluginId}BirthdayHeight`]: asNumber
  })

  return asCodec(
    raw => {
      const clean = asKeys(raw)
      return {
        mnemonic: clean[`${pluginId}Mnemonic`] as string,
        birthdayHeight: clean[`${pluginId}BirthdayHeight`] as number
      }
    },
    clean => {
      return {
        [`${pluginId}Mnemonic`]: clean.mnemonic,
        [`${pluginId}BirthdayHeight`]: clean.birthdayHeight
      }
    }
  )
}
