import {
  asArray,
  asCodec,
  asMaybe,
  asNumber,
  asObject,
  asOptional,
  asString,
  Cleaner,
  uncleaner
} from 'cleaners'

import { asBase64, asSafeCommonWalletInfo } from '../common/types'

export interface SolanaNetworkInfo {
  rpcNodes: string[]
  rpcNodesArchival: string[]
  commitment: 'confirmed' | 'finalized'
  txQueryLimit: number
  derivationPath: string
  memoPublicKey: string
  tokenPublicKey: string
  associatedTokenPublicKey: string
}

export const asSolanaWalletOtherData = asObject({
  newestTxid: asMaybe(asObject(asString), () => ({}))
})

export type SolanaWalletOtherData = ReturnType<typeof asSolanaWalletOtherData>

export const asRpcBalance = asObject({
  value: asNumber
})

export type SafeSolanaWalletInfo = ReturnType<typeof asSafeSolanaWalletInfo>
export const asSafeSolanaWalletInfo = asSafeCommonWalletInfo

export interface SolanaPrivateKeys {
  mnemonic?: string
  base58Key?: string
  privateKey: string
}
export const asSolanaPrivateKeys = (
  pluginId: string
): Cleaner<SolanaPrivateKeys> => {
  const asKeys = asObject({
    [`${pluginId}Mnemonic`]: asOptional(asString),
    [`${pluginId}Base58Key`]: asOptional(asString),
    [`${pluginId}Key`]: asString
  })

  return asCodec(
    raw => {
      const clean = asKeys(raw)
      return {
        mnemonic: clean[`${pluginId}Mnemonic`],
        base58Key: clean[`${pluginId}Base58Key`],
        privateKey: clean[`${pluginId}Key`] as string
      }
    },
    clean => {
      return {
        [`${pluginId}Mnemonic`]: clean.mnemonic,
        [`${pluginId}Base58Key`]: clean.base58Key,
        [`${pluginId}Key`]: clean.privateKey
      }
    }
  )
}

export interface RpcRequest {
  method: string
  params: any
}

const asRpcResponse = <T>(cleaner: Cleaner<T>): Cleaner<{ result: T }> =>
  asObject({
    // jsonrpc: '2.0',
    result: cleaner
    // id: 1
  })
export const asAccountBalance = asRpcResponse(asRpcBalance)
export type AccountBalance = ReturnType<typeof asAccountBalance>

const asRpcTokenBalance = asObject({
  // "context": { "apiVersion": "1.16.18", "slot": 232646289 },
  value: asObject({
    amount: asString
    // decimals: 6,
    // uiAmount: 2.301,
    // uiAmountString: '2.301'
  })
})
export const asTokenBalance = asRpcResponse(asRpcTokenBalance)

export const asBlocktime = asRpcResponse(asNumber)
export type Blocktime = ReturnType<typeof asBlocktime>

export interface ParsedTxAmount {
  amount: string
  tokenId?: string
  networkFee: string
  parentNetworkFee?: string
}

export const asSolanaInitOptions = asObject({
  alchemyApiKey: asOptional(asString),
  poktPortalApiKey: asOptional(asString)
})
export type SolanaInitOptions = ReturnType<typeof asSolanaInitOptions>

export const asSolanaCustomFee = asObject({
  microLamports: asString
})

export const asSolanaSpendInfoOtherParams = asObject({
  unsignedTx: asOptional(asBase64)
})

export const asSolanaTxOtherParams = asObject({
  unsignedTx: asBase64
})

export const wasSolanaTxOtherParams = uncleaner(asSolanaTxOtherParams)

//
// Info Payload
//

export const asSolanaInfoPayload = asObject({
  rpcNodes: asOptional(asArray(asString)),
  rpcNodesArchival: asOptional(asArray(asString))
})
export type SolanaInfoPayload = ReturnType<typeof asSolanaInfoPayload>
