export interface TronSettings {
  tronApiServers: string[]
  tronNodeServers: string[]
  defaultFeeLimit: number
}

export interface TxQueryCache {
  txid: string
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
