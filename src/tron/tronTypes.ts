import { asNumber, asObject, asString } from 'cleaners'

export interface TronSettings {
  tronApiServers: string[]
  tronNodeServers: string[]
  defaultFeeLimit: number
}

export interface TxQueryCache {
  txid: string
  timestamp: number
}

export interface ReferenceBlock {
  hash: string
  number: number
  timestamp: number
}

export interface TronOtherdata {
  lastAddressQueryHeight: number
  mostRecentTxid: string
  txQueryCache: {
    mainnet: TxQueryCache
    trc20: TxQueryCache
  }
}

export const asTronBlockHeight = asObject({
  blockID: asString, // "0000000002bcfcd64f36c254e7161b145f25f1e84e874d213cc36b223c830966"
  block_header: asObject({
    raw_data: asObject({
      number: asNumber,
      timestamp: asNumber
    })
  })
})
