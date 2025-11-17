import {
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
import type { BalanceEvent } from 'react-native-zcash'

import { asWalletInfo } from '../common/types'

type ZcashNetworkName = 'mainnet' | 'testnet'

export interface ZcashNetworkInfo {
  rpcNode: {
    networkName: ZcashNetworkName
    defaultHost: string
    defaultPort: number
  }
  defaultNetworkFee: string
}

const asCachedEdgeAddresses = asTuple<EdgeAddress[]>(
  asObject({
    addressType: asValue('unifiedAddress'),
    publicAddress: asString
  }),
  asObject({
    addressType: asValue('saplingAddress'),
    publicAddress: asString
  }),
  asObject({
    addressType: asValue('transparentAddress'),
    publicAddress: asString
  })
)
export type CachedEdgeAddresses = ReturnType<typeof asCachedEdgeAddresses>

export const asZcashWalletOtherData = asObject({
  cachedAddresses: asMaybe(asCachedEdgeAddresses),
  isSdkInitializedOnDisk: asMaybe(asBoolean, false)
})

export type ZcashWalletOtherData = ReturnType<typeof asZcashWalletOtherData>

export type ZcashBalances = Omit<
  BalanceEvent,
  'availableZatoshi' | 'totalZatoshi'
>

export const asZecPublicKey = asObject({
  birthdayHeight: asNumber,
  publicKey: asString
})

export type SafeZcashWalletInfo = ReturnType<typeof asSafeZcashWalletInfo>
export const asSafeZcashWalletInfo = asWalletInfo(asZecPublicKey)

export interface ZcashPrivateKeys {
  mnemonic: string
  birthdayHeight: number
}
export const asZcashPrivateKeys = (
  pluginId: string
): Cleaner<ZcashPrivateKeys> => {
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

//
// Info Payload
//

export const asZcashInfoPayload = asObject({
  rpcNode: asOptional(
    asObject({
      networkName: asValue('mainnet', 'testnet'),
      defaultHost: asString,
      defaultPort: asNumber
    })
  )
})
export type ZcashInfoPayload = ReturnType<typeof asZcashInfoPayload>
