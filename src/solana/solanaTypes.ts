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
export const asAccountBalance = asRpcResponse(asRpcBalance)
export type AccountBalance = ReturnType<typeof asAccountBalance>

const asRpcTokenBalance = asObject({
  // "context": { "apiVersion": "1.16.18", "slot": 232646289 },
  value: asArray(
    asObject({
      account: asObject({
        data: asObject({
          parsed: asObject({
            info: asObject({
              // isNative: asBoolean,
              // mint: asString,
              // owner: asString,
              // state: asString,
              tokenAmount: asObject({
                amount: asString
                // decimals: asNumber
                // "uiAmount": 0.000375,
                // "uiAmountString": "0.000375"
              })
            })
            // type: asString
          })
          // program: asValue('spl-token')
          // "space": 165
        })
        // "executable": false,
        // "lamports": 2039280,
        // "owner": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        // "rentEpoch": 361,
        // "space": 165
      })
      // pubkey: asString
    })
  )
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
