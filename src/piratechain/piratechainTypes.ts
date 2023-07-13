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
  spendingKey: string
}

export interface PiratechainTransaction {
  rawTransactionId: string
  blockTimeInSeconds: number
  minedHeight: number
  value: string
  toAddress?: string
  memo?: string
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
  fullViewingKey: UnifiedViewingKey
  alias: string
  birthdayHeight: number
}

export type PiratechainSynchronizerStatus =
  | 'STOPPED'
  | 'DISCONNECTED'
  | 'DOWNLOADING'
  | 'VALIDATING'
  | 'SCANNING'
  | 'ENHANCING'
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
  blockRange: asMaybe(asPiratechainBlockRange, {
    first: 0,
    last: 0
  })
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
  getTransactions: (
    arg: PiratechainBlockRange
  ) => Promise<PiratechainTransaction[]>
  rescan: (arg: number) => Promise<string>
  sendToAddress: (
    arg: PiratechainSpendInfo
  ) => Promise<PiratechainPendingTransaction>
  getShieldedBalance: () => Promise<PiratechainWalletBalance>
}

export type PiratechainMakeSynchronizer = () => (
  config: PiratechainInitializerConfig
) => Promise<PiratechainSynchronizer>

export const asArrrPublicKey = asObject({
  birthdayHeight: asNumber,
  publicKey: asString,
  unifiedViewingKeys: asObject({
    extfvk: asString,
    extpub: asString
  })
})

export type SafePiratechainWalletInfo = ReturnType<
  typeof asSafePiratechainWalletInfo
>
export const asSafePiratechainWalletInfo = asWalletInfo(asArrrPublicKey)

export interface PiratechainPrivateKeys {
  mnemonic: string
  spendKey: string
  birthdayHeight: number
}
export const asPiratechainPrivateKeys = (
  pluginId: string
): Cleaner<PiratechainPrivateKeys> => {
  const asKeys = asObject({
    [`${pluginId}Mnemonic`]: asString,
    [`${pluginId}SpendKey`]: asString,
    [`${pluginId}BirthdayHeight`]: asNumber
  })

  return asCodec(
    raw => {
      const clean = asKeys(raw)
      return {
        mnemonic: clean[`${pluginId}Mnemonic`] as string,
        spendKey: clean[`${pluginId}SpendKey`] as string,
        birthdayHeight: clean[`${pluginId}BirthdayHeight`] as number
      }
    },
    clean => {
      return {
        [`${pluginId}Mnemonic`]: clean.mnemonic,
        [`${pluginId}SpendKey`]: clean.spendKey,
        [`${pluginId}BirthdayHeight`]: clean.birthdayHeight
      }
    }
  )
}
