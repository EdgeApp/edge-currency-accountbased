import { EdgeTransaction } from 'edge-core-js/types'

export interface GetTxsParams {
  startBlock: number
  startDate: number
  currencyCode: string
}

export interface BroadcastResults {
  result: {
    result?: string
    error?: any
  }
}

export interface KaspaBalanceResult {
  address: string
  balance: string
  currencyCode: string
}

export interface KaspaTx {
  txid: string
  date: string
  blockHeight: number
  ourReceiveAddresses: string[]
  nativeAmount: string
  networkFee: string
  signedTx: string
  otherParams: {
    fromAddress: string
    toAddress: string
  }
}

export interface KaspaNetworkUpdate {
  blockHeight?: number
  balanceResults?: KaspaBalanceResult[]
  txs?: KaspaTx[]
  server?: string
}

export type ConnectionChangeHandler = (isConnected: boolean) => void