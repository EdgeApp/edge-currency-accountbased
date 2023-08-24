import {
  asArray,
  asBoolean,
  asCodec,
  asMaybe,
  asNumber,
  asObject,
  asOptional,
  asString,
  asUnknown,
  Cleaner
} from 'cleaners'

import { asSafeCommonWalletInfo } from '../common/types'

export const asMaybeAssetsPalletBalance = asMaybe(
  asObject({
    balance: asNumber
    // status: 'Liquid',
    // reason: { sufficient: null },
    // extra: null
  })
)

export interface PolkadotNetworkInfo {
  rpcNodes: string[]
  subscanBaseUrl: string
  subscanQueryLimit: number
  lengthFeePerByte: string
}

export const asPolkadotWalletOtherData = asObject({
  txCount: asMaybe(asNumber, 0)
})

export type PolkadotWalletOtherData = ReturnType<
  typeof asPolkadotWalletOtherData
>

export const asSubscanResponse = asObject({
  code: asNumber,
  message: asString,
  data: asOptional(asObject(asUnknown))
})

export type SubscanResponse = ReturnType<typeof asSubscanResponse>

// https://docs.api.subscan.io/#transfers
export const asTransfer = asObject({
  from: asString,
  to: asString,
  success: asBoolean,
  hash: asString,
  block_num: asNumber,
  block_timestamp: asNumber,
  module: asString,
  amount: asString,
  fee: asString
})

export type SubscanTx = ReturnType<typeof asTransfer>

export const asTransactions = asObject({
  count: asNumber,
  transfers: asMaybe(asArray(asTransfer), () => [])
})

export type SafePolkadotWalletInfo = ReturnType<typeof asSafePolkadotWalletInfo>
export const asSafePolkadotWalletInfo = asSafeCommonWalletInfo

export interface PolkapolkadotPrivateKeys {
  mnemonic?: string
  privateKey: string
}
export const asPolkapolkadotPrivateKeys = (
  pluginId: string
): Cleaner<PolkapolkadotPrivateKeys> => {
  const asKeys = asObject({
    [`${pluginId}Mnemonic`]: asOptional(asString),
    [`${pluginId}Key`]: asString
  })

  return asCodec(
    raw => {
      const clean = asKeys(raw)
      return {
        mnemonic: clean[`${pluginId}Mnemonic`],
        privateKey: clean[`${pluginId}Key`] as string
      }
    },
    clean => {
      return {
        [`${pluginId}Mnemonic`]: clean.mnemonic,
        [`${pluginId}Key`]: clean.privateKey
      }
    }
  )
}
