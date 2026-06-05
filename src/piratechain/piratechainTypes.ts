import {
  asCodec,
  asMaybe,
  asNumber,
  asObject,
  asOptional,
  asString,
  asValue,
  Cleaner
} from 'cleaners'

import { asWalletInfo } from '../common/types'

type PiratechainNetworkName = 'mainnet' | 'testnet'

export interface PiratechainNetworkInfo {
  /** Unused by the unified SDK (endpoints live in the native core); kept for
   * info-server payload compatibility. */
  rpcNode: {
    networkName: PiratechainNetworkName
    defaultHost: string
    defaultPort: number
  }
  defaultNetworkFee: string
}

export const asPiratechainWalletOtherData = asObject({
  cachedAddress: asMaybe(asString)
})

export type PiratechainWalletOtherData = ReturnType<
  typeof asPiratechainWalletOtherData
>

export const asArrrPublicKey = asObject({
  birthdayHeight: asOptional(asNumber),
  publicKey: asOptional(asString, '') // In case sdk is not present for platform
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

//
// Info Payload
//

export const asPiratechainInfoPayload = asObject({
  rpcNode: asOptional(
    asObject({
      networkName: asValue('mainnet', 'testnet'),
      defaultHost: asString,
      defaultPort: asNumber
    })
  )
})
export type PiratechainInfoPayload = ReturnType<typeof asPiratechainInfoPayload>
