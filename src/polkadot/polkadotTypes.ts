import {
  asArray,
  asBoolean,
  asMaybe,
  asNumber,
  asObject,
  asOptional,
  asString,
  asUnknown
} from 'cleaners'

export interface PolkadotNetworkInfo {
  // TODO: Replace this placeholder with `typeof otherSettings`:
  polkadot: true
}

export interface PolkadotSettings {
  rpcNodes: string[]
  genesisHash: string
  existentialDeposit: string
  subscanBaseUrl: string
  subscanQueryLimit: number
  lengthFeePerByte: string
}

export const asPolkadotWalletOtherData = asObject({
  txCount: asMaybe(asNumber, 0)
})

export type PolkadotWalletOtherData = ReturnType<
  typeof asPolkadotWalletOtherData
>

export const asSubscanResponse = asObject({
  code: asNumber,
  message: asString,
  data: asOptional(asObject(asUnknown))
})

export type SubscanResponse = ReturnType<typeof asSubscanResponse>

// https://docs.api.subscan.io/#transfers
export const asTransfer = asObject({
  from: asString,
  to: asString,
  success: asBoolean,
  hash: asString,
  block_num: asNumber,
  block_timestamp: asNumber,
  module: asString,
  amount: asString,
  fee: asString
})

export type SubscanTx = ReturnType<typeof asTransfer>

export const asTransactions = asObject({
  count: asNumber,
  transfers: asMaybe(asArray(asTransfer), [])
})
