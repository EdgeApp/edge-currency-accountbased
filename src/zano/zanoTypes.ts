import {
  asCodec,
  asNumber,
  asObject,
  asOptional,
  asString,
  Cleaner
} from 'cleaners'
import { EdgeToken } from 'edge-core-js/types'

import { createTokenIdFromContractAddress } from '../common/tokenHelpers'
import { asSafeCommonWalletInfo } from '../common/types'

export interface ZanoNetworkInfo {
  nativeAssetId: string
  walletRpcAddress: string
}

export type SafeZanoWalletInfo = ReturnType<typeof asSafeZanoWalletInfo>
export const asSafeZanoWalletInfo = asSafeCommonWalletInfo

export const asZanoWalletOtherData = asObject({
  transactionQueryOffset: asOptional(asNumber, 0)
})
export type ZanoWalletOtherData = ReturnType<typeof asZanoWalletOtherData>

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

export const asZanoTransferParams = asObject({
  assetId: asString,
  fee: asNumber,
  nativeAmount: asNumber,
  recipient: asString,

  comment: asOptional(asString),
  paymentId: asOptional(asString)
})

export const createZanoTokenId = (token: EdgeToken): string => {
  return createTokenIdFromContractAddress(token).toLowerCase()
}
