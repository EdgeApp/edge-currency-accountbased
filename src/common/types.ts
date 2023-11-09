import {
  asArray,
  asCodec,
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
import {
  EdgeMetadata,
  EdgeToken,
  EdgeTokenInfo,
  EdgeTransaction,
  EdgeTxSwap
} from 'edge-core-js/types'
import { base16 } from 'rfc4648'

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

/**
 * A string of hex-encoded binary data.
 */
export const asBase16: Cleaner<Uint8Array> = asCodec(
  raw => base16.parse(asString(raw)),
  clean => base16.stringify(clean).toLowerCase()
)

export function asIntegerString(raw: unknown): string {
  const clean = asString(raw)
  if (!/^\d+$/.test(clean)) {
    throw new Error('Expected an integer string')
  }
  return clean
}

export interface WalletConnectPayload {
  nativeAmount: string
  networkFee: string
  tokenId?: string // can't provide tokenId until we can parse from DATA
}

/**
 * Template for a future generalized makeTx type that can be used for all
 * chains
 */
export type MakeTxParams =
  | {
      type: 'MakeTxDexSwap'
      metadata?: EdgeMetadata
      swapData?: EdgeTxSwap
      fromTokenId?: string
      fromNativeAmount: string
      toTokenId?: string
      toNativeAmount: string

      /**
       * UNIX time (seconds) to expire the DEX swap if it hasn't executed
       */
      expiration?: number
    }
  | {
      type: 'MakeTxDummyType'
    }
