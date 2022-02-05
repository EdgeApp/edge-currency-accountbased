// @flow
import { asArray, asNumber, asObject, asString, asUnknown } from 'cleaners'

export type SolanaSettings = {
  rpcNodes: string[],
  commitment: 'confirmed' | 'finalized',
  txQueryLimit: number
}

export type SolanaOtherData = {
  newestTxid: string
}

export const asRpcBalance = asObject({
  value: asNumber
})

export type RpcSignatureForAddress = {
  signature: string,
  blocktime?: number,
  err?: any
}

export const asRpcGetTransaction = asObject({
  meta: asObject({
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

export type RpcGetTransaction = $Call<typeof asRpcGetTransaction>

export const asRecentBlockHash = asObject({
  value: asObject({
    blockhash: asString,
    feeCalculator: asObject({
      lamportsPerSignature: asNumber
    })
  })
})
