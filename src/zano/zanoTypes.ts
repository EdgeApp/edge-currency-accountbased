import {
  asArray,
  asCodec,
  asNumber,
  asObject,
  asOptional,
  asString,
  Cleaner
} from 'cleaners'
import { EdgeTransaction } from 'edge-core-js/types'
import type { BurnAssetParams, TransferParams } from 'react-native-zano'

import { asSafeCommonWalletInfo, MakeTxParams } from '../common/types'

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

export const asZanoTransferParams = asObject<TransferParams>({
  transfers: asArray(
    asObject({
      assetId: asString,
      nativeAmount: asNumber,
      recipient: asString
    })
  ),

  comment: asOptional(asString),
  fee: asNumber,
  paymentId: asOptional(asString)
})

export const asZanoAssetDetails = asObject({
  result: asObject({
    asset_descriptor: asObject({
      // current_supply: 2100000000000000,
      decimal_point: asNumber, // 8,
      full_name: asString, // 'Get Edgy ',
      // hidden_supply: false,
      // meta_info: '',
      // owner: '7e924fb7f5f6f7f6e683e3f210f9fa4047c9978f7b9e5aa19a10afea0249d8fe',
      // owner_eth_pub_key: '',
      ticker: asString // 'EDGE'
      // total_max_supply: 2100000000000000
    })
    // status: 'OK'
  })
})

export const asGetAliasDetailsResponse = asObject({
  jsonrpc: asString,
  result: asObject({
    alias_details: asObject({
      address: asString
    })
  })
})

export interface ZanoOtherMethods {
  resolveName: (alias: string) => Promise<string>
  makeTx: (makeTxParams: MakeTxParams) => Promise<EdgeTransaction>
}

export const asZanoBurnAssetParams = asObject<BurnAssetParams>({
  assetId: asString,
  burnAmount: asNumber,
  nativeAmount: asOptional(asNumber),
  pointTxToAddress: asOptional(asString),
  serviceEntries: asOptional(
    asArray(
      asObject({
        body: asString,
        flags: asOptional(asNumber),
        instruction: asString,
        security: asOptional(asString),
        service_id: asString
      })
    )
  )
})
