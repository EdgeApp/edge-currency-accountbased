import type { Network, NetworkPrefix } from '@zondax/izari-filecoin'
import {
  asCodec,
  asNumber,
  asObject,
  asOptional,
  asString,
  asValue,
  Cleaner
} from 'cleaners'

import { asWalletInfo } from '../common/types'

export interface FilecoinNetworkInfo {
  filfoxUrl: string
  filscanUrl: string
  hdPathCoinType: number
  networkPrefix: keyof typeof NetworkPrefix
  rpcNode: {
    networkName: keyof typeof Network
    url: string
  }
}

export type FilecoinWalletOtherData = ReturnType<
  typeof asFilecoinWalletOtherData
>
export const asFilecoinWalletOtherData = asObject({})

export type FilecoinTxOtherParams = ReturnType<typeof asFilecoinTxOtherParams>
export const asFilecoinTxOtherParams = asObject({
  sigJson: asOptional(
    asObject({
      Data: asString,
      Type: asValue(1, 3)
    })
  ),
  txJson: asObject({
    To: asString,
    From: asString,
    Nonce: asNumber,
    Value: asString,
    GasLimit: asNumber,
    GasFeeCap: asString,
    GasPremium: asString,
    Method: asNumber,
    Params: asString
  })
})

export const asFilPublicKey = asObject({
  address: asString,
  publicKey: asString
})

export type SafeFilecoinWalletInfo = ReturnType<typeof asSafeFilecoinWalletInfo>
export const asSafeFilecoinWalletInfo = asWalletInfo(asFilPublicKey)

export interface FilecoinPrivateKeys {
  mnemonic: string
  privateKey: string
}
export const asFilecoinPrivateKeys = (
  pluginId: string
): Cleaner<FilecoinPrivateKeys> => {
  const asKeys = asObject({
    [`${pluginId}Mnemonic`]: asString,
    [`${pluginId}Key`]: asString
  })

  return asCodec(
    raw => {
      const clean = asKeys(raw)
      return {
        mnemonic: clean[`${pluginId}Mnemonic`],
        privateKey: clean[`${pluginId}Key`]
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
