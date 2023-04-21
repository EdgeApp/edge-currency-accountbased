import WalletConnect from '@walletconnect/client'
import {
  asArray,
  asEither,
  asMaybe,
  asNumber,
  asObject,
  asOptional,
  asString,
  asUndefined,
  asUnknown,
  Cleaner
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
  lastTransactionQueryHeight: asMaybe(asObject(asNumber), () => ({})),
  lastTransactionDate: asMaybe(asObject(asNumber), () => ({})),
  publicKey: asMaybe(asString, ''),
  totalBalances: asMaybe(asObject(asEither(asString, asUndefined)), () => ({})),
  lastCheckedTxsDropped: asMaybe(asNumber, 0),
  numUnconfirmedSpendTxs: asMaybe(asNumber, 0),
  numTransactions: asMaybe(asObject(asNumber), () => ({})),
  unactivatedTokenIds: asMaybe(asArray(asString), () => []),
  otherData: asOptional(asUnknown, () => ({}))
})

export type WalletLocalData = ReturnType<typeof asWalletLocalData>

export interface WalletInfo<Keys> {
  id: string
  type: string
  keys: Keys
}
export const asWalletInfo = <Keys>(
  asKeys: Cleaner<Keys>
): Cleaner<WalletInfo<Keys>> =>
  asObject({
    id: asString,
    type: asString,
    keys: asKeys
  })

export type SafeCommonWalletInfo = ReturnType<typeof asSafeCommonWalletInfo>
export const asSafeCommonWalletInfo = asWalletInfo(
  asObject({ publicKey: asString })
)

export function asIntegerString(raw: unknown): string {
  const clean = asString(raw)
  if (!/^\d+$/.test(clean)) {
    throw new Error('Expected an integer string')
  }
  return clean
}

export const asWcProps = asObject({
  uri: asString,
  language: asMaybe(asString),
  token: asMaybe(asString)
})

export type WcProps = ReturnType<typeof asWcProps>

const asWcDappDetails = asObject({
  peerId: asString,
  peerMeta: asObject({
    description: asString,
    url: asString,
    icons: asArray(asString),
    name: asString
  }),
  chainId: asOptional(asNumber, 1)
})

export type WcDappDetails = {
  timeConnected: number
} & ReturnType<typeof asWcDappDetails>

export type Dapp = { timeConnected: number } & WcProps & WcDappDetails

export interface WalletConnectors {
  [uri: string]: {
    connector: WalletConnect
    wcProps: WcProps
    dApp: WcDappDetails
    walletId?: string
  }
}

export const asWcSessionRequestParams = asObject({
  params: asArray(asWcDappDetails)
})
