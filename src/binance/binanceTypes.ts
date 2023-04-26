import {
  asArray,
  asBoolean,
  asNumber,
  asObject,
  asOptional,
  asString
} from 'cleaners'

import { asSafeCommonWalletInfo } from '../common/types'

export interface BinanceNetworkInfo {
  binanceApiServers: string[]
  beaconChainApiServers: string[]
}

export const asBinanceApiNodeInfo = asObject({
  sync_info: asObject({
    latest_block_height: asNumber
  })
})

export const asBinanceApiAccountBalance = asObject({
  balances: asArray(
    asObject({
      free: asString,
      frozen: asString,
      locked: asString,
      symbol: asString
    })
  )
})

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

export const asBnbKeys = asObject({
  binanceMnemonic: asOptional(asString),
  publicKey: asOptional(asString)
})

export const asBroadcastTxResponse = asObject({
  result: asArray(
    asObject({
      ok: asBoolean,
      hash: asOptional(asString)
    })
  )
})

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

export type SafeBnbWalletInfo = ReturnType<typeof asSafeBnbWalletInfo>
export const asSafeBnbWalletInfo = asSafeCommonWalletInfo

export type BnbPrivateKey = ReturnType<typeof asBnbPrivateKey>
export const asBnbPrivateKey = asObject({
  binanceKey: asString,
  binanceMnemonic: asString
})
