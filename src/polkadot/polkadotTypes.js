// @flow

import {
  asArray,
  asBoolean,
  asEither,
  asNull,
  asNumber,
  asObject,
  asOptional,
  asString,
  asUnknown
} from 'cleaners'

export type PolkadotSettings = {
  rpcNodes: string[],
  genesisHash: string,
  existentialDeposit: string,
  subscanBaseUrl: string,
  subscanQueryLimit: number,
  lengthFeePerByte: string
}

export const asSubscanResponse = asObject({
  code: asNumber,
  message: asString,
  data: asOptional(asObject(asUnknown))
})

export type SubscanResponse = $Call<typeof asSubscanResponse>

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

export type SubscanTx = $Call<typeof asTransfer>

export const asTransactions = asObject({
  count: asNumber,
  transfers: asEither(asArray(asTransfer), asNull)
})

export type SdkBalance = {
  nonce: number,
  consumers: number,
  providers: number,
  sufficients: number,
  data: {
    free: number,
    reserved: number,
    miscFrozen: number,
    feeFrozen: number
  }
}

export type SdkBlockHeight = {
  block: {
    header: {
      parentHash: string,
      number: number,
      stateRoot: string,
      extrinsicsRoot: string
    }
  }
}

export type SdkPaymentInfo = {
  weight: number, // 137709000,
  class: string, // 'Normal',
  partialFee: number // s152000016
}
