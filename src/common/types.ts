import {
  asArray,
  asMap,
  asMaybe,
  asNumber,
  asObject,
  asOptional,
  asString,
  asUnknown
} from 'cleaners'
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

export const asWalletLocalData = asObject({
  blockHeight: asMaybe(asNumber, 0),
  lastAddressQueryHeight: asMaybe(asNumber, 0),
  lastTransactionQueryHeight: asMaybe(asMap(asNumber), {}),
  lastTransactionDate: asMaybe(asMap(asNumber), {}),
  publicKey: asMaybe(asString, ''),
  totalBalances: asMaybe(asMap(asString), {}),
  lastCheckedTxsDropped: asMaybe(asNumber, 0),
  numUnconfirmedSpendTxs: asMaybe(asNumber, 0),
  numTransactions: asMaybe(asMap(asNumber), {}),
  unactivatedTokenIds: asMaybe(asArray(asString), []),
  otherData: asOptional(asUnknown, {})
})

export type WalletLocalData = ReturnType<typeof asWalletLocalData>
