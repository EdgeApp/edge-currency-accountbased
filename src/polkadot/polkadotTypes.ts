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

export interface PolkadotNetworkInfo {
  rpcNodes: string[]
  genesisHash: string
  existentialDeposit: string
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
  transfers: asMaybe(asArray(asTransfer), [])
})

export type SafePolkadotWalletInfo = ReturnType<typeof asSafePolkadotWalletInfo>
export const asSafePolkadotWalletInfo = asSafeCommonWalletInfo

export interface PolkapolkadotPrivateKeys {
  mnemonic?: string
  privateKey: string
}
export const asPolkapolkadotPrivateKeys = (
  pluginId: string
): Cleaner<PolkapolkadotPrivateKeys> =>
  asCodec(
    (value: unknown) => {
      const from = asObject({
        [`${pluginId}Mnemonic`]: asOptional(asString),
        [`${pluginId}Key`]: asString
      })(value)
      const to = {
        mnemonic: from[`${pluginId}Mnemonic`],
        privateKey: from[`${pluginId}Key`]
      }
      return asObject({
        mnemonic: asOptional(asString),
        privateKey: asString
      })(to)
    },
    privateKeys => {
      return {
        [`${pluginId}Mnemonic`]: privateKeys.mnemonic,
        [`${pluginId}Key`]: privateKeys.privateKey
      }
    }
  )
