import {
  asArray,
  asCodec,
  asEither,
  asMaybe,
  asNull,
  asNumber,
  asObject,
  asOptional,
  asString,
  asTuple,
  asUnknown,
  Cleaner
} from 'cleaners'

import { asSafeCommonWalletInfo } from '../common/types'

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
  newestTxid: asMaybe(asString, '')
})

export type SolanaWalletOtherData = ReturnType<typeof asSolanaWalletOtherData>

export const asRpcBalance = asObject({
  value: asNumber
})

export const asRpcSignatureForAddress = asObject({
  signature: asString,
  blocktime: asOptional(asNumber),
  err: asUnknown
})

export type RpcSignatureForAddress = ReturnType<typeof asRpcSignatureForAddress>

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
): Cleaner<SolanaPrivateKeys> => {
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
export const asRpcSignatureForAddressResponse = asTuple(
  asRpcResponse(asArray(asRpcSignatureForAddress))
)
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
export type TokenBalance = ReturnType<typeof asTokenBalance>

export const asAccountInfo = asObject({
  // context: { apiVersion: '1.16.19', slot: 232816397 },
  value: asEither(
    asNull,
    asObject({
      // data: ['', 'base58'],
      // executable: false,
      // lamports: 254385770,
      // owner: '11111111111111111111111111111111',
      // rentEpoch: 0,
      // space: 0
    })
  )
})

const asTxTokenBalance = asObject({
  accountIndex: asNumber,
  mint: asString,
  owner: asString,
  programId: asString,
  uiTokenAmount: asObject({
    amount: asString
    // "decimals": asNumber,
    // "uiAmount": 7150.402259,
    // "uiAmountString": "7150.402259"
  })
})

export const asRpcGetTransaction = asObject({
  meta: asObject({
    err: asOptional(asUnknown),
    fee: asNumber,
    innerInstructions: asArray(asUnknown),
    postBalances: asArray(asNumber),
    postTokenBalances: asArray(asMaybe(asTxTokenBalance)),
    preBalances: asArray(asNumber),
    preTokenBalances: asArray(asMaybe(asTxTokenBalance))
  }),
  slot: asNumber,
  transaction: asObject({
    message: asObject({
      accountKeys: asArray(asString),
      instructions: asArray(asUnknown),
      recentBlockhash: asString
    }),
    signatures: asArray(asString)
  })
})
export const asTransaction = asRpcResponse(asRpcGetTransaction)

export type RpcGetTransaction = ReturnType<typeof asTransaction>

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
