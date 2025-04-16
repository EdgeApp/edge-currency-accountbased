import { asCodec, asObject, asString, Cleaner } from 'cleaners'

import { asSafeCommonWalletInfo } from '../common/types'

export interface ZanoNetworkInfo {
  nativeAssetId: string
}

export type SafeZanoWalletInfo = ReturnType<typeof asSafeZanoWalletInfo>
export const asSafeZanoWalletInfo = asSafeCommonWalletInfo

export interface ZanoPrivateKeys {
  mnemonic: string
  passphrase?: string
}

export const asZanoPrivateKeys = (
  pluginId: string
): Cleaner<ZanoPrivateKeys> => {
  const asKeys = asObject({
    [`${pluginId}Mnemonic`]: asString,
    [`${pluginId}Passphrase`]: asOptional(asString)
  })

  return asCodec(
    raw => {
      const clean = asKeys(raw)
      return {
        mnemonic: clean[`${pluginId}Mnemonic`] as string,
        passphrase: clean[`${pluginId}Passphrase`]
      }
    },
    clean => {
      return {
        [`${pluginId}Mnemonic`]: clean.mnemonic,
        [`${pluginId}Passphrase`]: clean.passphrase
      }
    }
  )
}

//
// Info Payload
//

export const asZanoInfoPayload = asObject({})
export type ZanoInfoPayload = ReturnType<typeof asZanoInfoPayload>
