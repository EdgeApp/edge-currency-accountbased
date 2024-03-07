import { asCodec, asObject, asString, Cleaner } from 'cleaners'

import { asWalletInfo } from '../common/types'

export interface CardanoNetworkInfo {
  networkId: number
}

export type SafeCardanoWalletInfo = ReturnType<typeof asSafeCardanoWalletInfo>
export const asSafeCardanoWalletInfo = asWalletInfo(
  asObject({
    bech32Address: asString,
    publicKey: asString
  })
)

export interface CardanoPrivateKeys {
  mnemonic: string
}
export const asCardanoPrivateKeys = (
  pluginId: string
): Cleaner<CardanoPrivateKeys> => {
  const asKeys = asObject({
    [`${pluginId}Mnemonic`]: asString
  })

  return asCodec(
    raw => {
      const clean = asKeys(raw)
      return { mnemonic: clean[`${pluginId}Mnemonic`] }
    },
    clean => {
      return { [`${pluginId}Mnemonic`]: clean.mnemonic }
    }
  )
}
