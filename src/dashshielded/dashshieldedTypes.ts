import {
  asArray,
  asBoolean,
  asCodec,
  asMaybe,
  asNumber,
  asObject,
  asOptional,
  asString,
  asTuple,
  asValue,
  Cleaner
} from 'cleaners'
import { EdgeAddress } from 'edge-core-js/types'

import { asWalletInfo } from '../common/types'

type DashshieldedNetworkName = 'mainnet' | 'testnet'

export interface DashshieldedNetworkInfo {
  rpcNode: {
    networkName: DashshieldedNetworkName
    defaultHost: string
    defaultPort: number
  }
  dapi?: {
    mainnet: string[]
    testnet: string[]
  }
  defaultNetworkFee: string
}

const asCachedEdgeAddresses = asTuple<EdgeAddress[]>(
  asObject({
    addressType: asValue('shieldedAddress'),
    publicAddress: asString
  })
)
export type CachedEdgeAddresses = ReturnType<typeof asCachedEdgeAddresses>

export const asDashshieldedWalletOtherData = asObject({
  cachedAddresses: asMaybe(asCachedEdgeAddresses),
  isSdkInitializedOnDisk: asMaybe(asBoolean, false)
})

export type DashshieldedWalletOtherData = ReturnType<
  typeof asDashshieldedWalletOtherData
>

export const asDashshieldedPublicKey = asObject({
  birthdayHeight: asNumber,
  publicKey: asString
})

export type SafeDashshieldedWalletInfo = ReturnType<
  typeof asSafeDashshieldedWalletInfo
>
export const asSafeDashshieldedWalletInfo = asWalletInfo(
  asDashshieldedPublicKey
)

export interface DashshieldedPrivateKeys {
  mnemonic: string
  birthdayHeight: number
}
export const asDashshieldedPrivateKeys = (
  pluginId: string
): Cleaner<DashshieldedPrivateKeys> => {
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

export const asDashshieldedInfoPayload = asObject({
  rpcNode: asOptional(
    asObject({
      networkName: asValue('mainnet', 'testnet'),
      defaultHost: asString,
      defaultPort: asNumber
    })
  ),
  dapi: asOptional(
    asObject({
      mainnet: asArray(asString),
      testnet: asArray(asString)
    })
  )
})
export type DashshieldedInfoPayload = ReturnType<
  typeof asDashshieldedInfoPayload
>
