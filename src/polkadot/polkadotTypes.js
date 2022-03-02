// @flow

import {
  asArray,
  asBoolean,
  asEither,
  asNull,
  asNumber,
  asObject,
  asString,
  asTuple,
  asUnknown
} from 'cleaners'

export type PolkadotSettings = {
  subscanBaseUrl: string,
  subscanQueryLimit: number
}

export type PolkadotOtherData = {
  processedTxCount: number
}

export const asSubscanResponse = asObject({
  data: asObject(asUnknown)
})

// https://docs.api.subscan.io/#v2-api
export const asBalance = asObject({
  account: asObject({
    balance: asString
  })
})

// https://docs.api.subscan.io/#blocks
export const asBlockheight = asObject({
  blocks: asTuple(
    asObject({
      block_num: asNumber
    })
  )
})

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
  transfers: asEither(asArray(asUnknown), asNull)
})
