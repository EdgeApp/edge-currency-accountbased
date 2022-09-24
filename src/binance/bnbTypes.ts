/**
 * Created by paul on 8/26/17.
 */

import { asArray, asNumber, asObject, asString } from 'cleaners'

export const asBinanceApiTransaction = asObject({
  hash: asString,
  blockHeight: asNumber,
  blockTime: asNumber,
  type: asString,
  fee: asNumber,
  memo: asString,
  asset: asString,
  amount: asNumber,
  fromAddr: asString,
  toAddr: asString
})
export const asBinanceApiGetTransactions = asObject({
  // total: asNumber,
  txs: asArray(asBinanceApiTransaction)
})
export type BinanceApiTransaction = ReturnType<typeof asBinanceApiTransaction>

export interface BinanceSettings {
  binanceApiServers: string[]
  binanceNewApiServers: string[]
}

export interface BinanceTxOtherParams {
  from: string[]
  to: string[]
  // gas: string,
  // gasPrice: string,
  // gasUsed: string,
  // cumulativeGasUsed: string,
  errorVal: number
  tokenRecipientAddress: string | null
  data?: string | null
  memo?: string
}
