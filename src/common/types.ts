import { asObject, asString } from 'cleaners'
import { EdgeToken, EdgeTokenInfo, EdgeTransaction } from 'edge-core-js/types'

export const DATA_STORE_FILE = 'txEngineFolder/walletLocalData.json'
export const TXID_MAP_FILE = 'txEngineFolder/txidMap.json'
export const TXID_LIST_FILE = 'txEngineFolder/txidList.json'
export const TRANSACTION_STORE_FILE = 'txEngineFolder/transactionList.json'

// Same as asOptional but will not throw if cleaner fails but will
// return the fallback instead
export const asAny = (raw: any): any => raw

export const asErrorMessage = asObject({
  message: asString
})

export interface BooleanMap {
  readonly [key: string]: boolean
}
export type CustomToken = EdgeTokenInfo & EdgeToken

export interface TxIdMap {
  [currencyCode: string]: { [txid: string]: number }
}
export interface TxIdList {
  [currencyCode: string]: string[]
}
export interface TransactionList {
  [currencyCode: string]: EdgeTransaction[]
}

export class WalletLocalData {
  blockHeight: number
  lastAddressQueryHeight: number
  lastTransactionQueryHeight: { [currencyCode: string]: number }
  lastTransactionDate: { [currencyCode: string]: number }
  publicKey: string
  totalBalances: { [currencyCode: string]: string }
  lastCheckedTxsDropped: number
  numUnconfirmedSpendTxs: number
  numTransactions: { [currencyCode: string]: number }
  otherData: unknown

  constructor(jsonString: string | null) {
    this.blockHeight = 0
    const totalBalances: { [currencyCode: string]: string } = {}
    this.totalBalances = totalBalances
    this.lastAddressQueryHeight = 0
    this.lastTransactionQueryHeight = {}
    this.lastTransactionDate = {}
    this.lastCheckedTxsDropped = 0
    this.numUnconfirmedSpendTxs = 0
    this.numTransactions = {}
    this.otherData = undefined
    this.publicKey = ''
    if (jsonString !== null) {
      const data = JSON.parse(jsonString)

      if (typeof data.blockHeight === 'number') {
        this.blockHeight = data.blockHeight
      }
      if (typeof data.lastCheckedTxsDropped === 'number') {
        this.lastCheckedTxsDropped = data.lastCheckedTxsDropped
      }
      if (typeof data.numUnconfirmedSpendTxs === 'number') {
        this.numUnconfirmedSpendTxs = data.numUnconfirmedSpendTxs
      }
      if (typeof data.numTransactions === 'object') {
        this.numTransactions = data.numTransactions
      }
      if (typeof data.lastAddressQueryHeight === 'number') {
        this.lastAddressQueryHeight = data.lastAddressQueryHeight
      }
      if (typeof data.publicKey === 'string') this.publicKey = data.publicKey
      if (typeof data.totalBalances !== 'undefined') {
        this.totalBalances = data.totalBalances
      }
      if (typeof data.otherData !== 'undefined') this.otherData = data.otherData
      if (typeof data.lastTransactionQueryHeight === 'object')
        this.lastTransactionQueryHeight = data.lastTransactionQueryHeight
      if (typeof data.lastTransactionDate === 'object')
        this.lastTransactionDate = data.lastTransactionDate
    }
  }
}
