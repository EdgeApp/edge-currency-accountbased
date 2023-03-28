import {
  asArray,
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

export interface SolanaNetworkInfo {
  rpcNodes: string[]
  commitment: 'confirmed' | 'finalized'
  txQueryLimit: number
  derivationPath: string
  memoPublicKey: string
}

export const asSolanaWalletOtherData = asObject({
  newestTxid: asMaybe(asString, '')
})

export type SolanaWalletOtherData = ReturnType<typeof asSolanaWalletOtherData>

export const asRpcBalance = asObject({
  value: asNumber
})

export interface RpcSignatureForAddress {
  signature: string
  blocktime?: number
  err?: any
}

export const asRpcGetTransaction = asObject({
  meta: asObject({
    err: asOptional(asUnknown),
    fee: asNumber,
    innerInstructions: asArray(asUnknown),
    postBalances: asArray(asNumber),
    postTokenBalances: asArray(asUnknown),
    preBalances: asArray(asNumber),
    preTokenBalances: asArray(asUnknown)
  }),
  slot: asNumber,
  transaction: asObject({
    message: asObject({
      accountKeys: asArray(asString),
      recentBlockhash: asString
    }),
    signatures: asArray(asString)
  })
})

export type RpcGetTransaction = ReturnType<typeof asRpcGetTransaction>

export const asRecentBlockHash = asObject({
  value: asObject({
    blockhash: asString,
    feeCalculator: asObject({
      lamportsPerSignature: asNumber
    })
  })
})

export type SafeSolanaWalletInfo = ReturnType<typeof asSafeSolanaWalletInfo>
export const asSafeSolanaWalletInfo = asSafeCommonWalletInfo

export interface SolanaPrivateKeys {
  mnemonic: string
  privateKey: string
}
export const asSolanaPrivateKeys = (
  pluginId: string
): Cleaner<SolanaPrivateKeys> =>
  asCodec(
    (value: unknown) => {
      const from = asObject({
        [`${pluginId}Mnemonic`]: asString,
        [`${pluginId}Key`]: asString
      })(value)
      const to = {
        mnemonic: from[`${pluginId}Mnemonic`],
        privateKey: from[`${pluginId}Key`]
      }
      return asObject({
        mnemonic: asString,
        privateKey: asString
      })(to)
    },
    hbarPrivateKey => {
      return {
        [`${pluginId}Mnemonic`]: hbarPrivateKey.mnemonic,
        [`${pluginId}Key`]: hbarPrivateKey.privateKey
      }
    }
  )
