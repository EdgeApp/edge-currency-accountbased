import {
  asArray,
  asEither,
  asMaybe,
  asNumber,
  asObject,
  asOptional,
  asString,
  asUndefined,
  asUnknown
} from 'cleaners'
import {
  EdgeToken,
  EdgeTokenInfo,
  EdgeTransaction,
  JsonObject
} from 'edge-core-js/types'

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
  lastTransactionQueryHeight: asMaybe(asObject(asNumber), {}),
  lastTransactionDate: asMaybe(asObject(asNumber), {}),
  publicKey: asMaybe(asString, ''),
  totalBalances: asMaybe(asObject(asEither(asString, asUndefined)), {}),
  lastCheckedTxsDropped: asMaybe(asNumber, 0),
  numUnconfirmedSpendTxs: asMaybe(asNumber, 0),
  numTransactions: asMaybe(asObject(asNumber), {}),
  unactivatedTokenIds: asMaybe(asArray(asString), []),
  otherData: asOptional(asUnknown, {})
})

export type WalletLocalData = ReturnType<typeof asWalletLocalData>

export interface PublicKeys {
  id: string
  keys: JsonObject & { publicKey: string }
  type: string
}
