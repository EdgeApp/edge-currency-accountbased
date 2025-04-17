import { asCodec, asObject, asOptional, asString, Cleaner } from 'cleaners'

import { asSafeCommonWalletInfo } from '../common/types'

export interface ZanoNetworkInfo {
  nativeAssetId: string
  walletRpcAddress: string
}

export type SafeZanoWalletInfo = ReturnType<typeof asSafeZanoWalletInfo>
export const asSafeZanoWalletInfo = asSafeCommonWalletInfo

export interface ZanoImportPrivateKeyOpts {
  passphrase?: string
  storagePath?: string
}

export interface ZanoPrivateKeys {
  mnemonic: string
  passphrase?: string

  storagePath: string
}

export const asZanoPrivateKeys = (
  pluginId: string
): Cleaner<ZanoPrivateKeys> => {
  const asKeys = asObject({
    [`${pluginId}Mnemonic`]: asString,
    [`${pluginId}Passphrase`]: asOptional(asString),

    [`${pluginId}StoragePath`]: asString
  })

  return asCodec(
    raw => {
      const clean = asKeys(raw)
      return {
        mnemonic: clean[`${pluginId}Mnemonic`] as string,
        passphrase: clean[`${pluginId}Passphrase`],

        storagePath: clean[`${pluginId}StoragePath`] as string
      }
    },
    clean => {
      return {
        [`${pluginId}Mnemonic`]: clean.mnemonic,
        [`${pluginId}Passphrase`]: clean.passphrase,

        [`${pluginId}StoragePath`]: clean.storagePath
      }
    }
  )
}

//
// Info Payload
//

export const asZanoInfoPayload = asObject({})
export type ZanoInfoPayload = ReturnType<typeof asZanoInfoPayload>
