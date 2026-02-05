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
  EdgeAssetAction,
  EdgeDenomination,
  EdgeMetadata,
  EdgeTokenId,
  EdgeTxAction,
  EdgeTxSwap
} from 'edge-core-js/types'
import { base16, base64 } from 'rfc4648'

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

export const asNumberString = (raw: any): string => {
  const n = asEither(asString, asNumber)(raw)
  return n.toString()
}

export const asWalletLocalData = asObject({
  blockHeight: asMaybe(asNumber, 0),
  highestTxBlockHeight: asMaybe(asNumber, 0),
  lastAddressQueryHeight: asMaybe(asNumber, 0),
  lastTransactionQueryHeight: asMaybe<Record<string, number>>(
    asObject(asNumber),
    () => ({})
  ),
  lastTransactionDate: asMaybe<Record<string, number>>(
    asObject(asNumber),
    () => ({})
  ),
  publicKey: asMaybe(asString, ''),
  totalBalances: asMaybe<Record<string, string | undefined>>(
    asObject(asEither(asString, asUndefined)),
    () => ({})
  ),
  numTransactions: asMaybe<Record<string, number>>(
    asObject(asNumber),
    () => ({})
  ),
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

/**
 * A string of base64-encoded binary data.
 */
export const asBase64: Cleaner<Uint8Array> = asCodec(
  raw => base64.parse(asString(raw)),
  clean => base64.stringify(clean)
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
  tokenId: EdgeTokenId // can't provide tokenId until we can parse from DATA
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

      txData?: string

      /**
       * UNIX time (seconds) to expire the DEX swap if it hasn't executed
       */
      expiration?: number
    }
  | {
      type: 'MakeTxDeposit'
      assets: Array<{
        amount: string
        asset: string
        decimals: string
      }>
      memo: string
      metadata?: EdgeMetadata
    }
  | {
      type: 'MakeTx'
      unsignedTx: Uint8Array
      metadata?: MakeTxMetadata
    }

export interface MakeTxMetadata {
  assetAction?: EdgeAssetAction
  savedAction?: EdgeTxAction
  metadata?: EdgeMetadata
  swapData?: EdgeTxSwap
  memos?: Array<{
    type: 'text' | 'number' | 'hex'
    value: string
    hidden?: boolean
  }>
}

export interface EdgeTransactionHelperAmounts {
  nativeAmount: string
  networkFee: string
  parentNetworkFee?: string
}

/**
 * A cleaner for something that must be an object,
 * but we don't care about the keys inside:
 */
const asJsonObject: Cleaner<object> = raw => {
  if (raw == null || typeof raw !== 'object') {
    throw new TypeError('Expected a JSON object')
  }
  return raw
}

const asEdgeDenomination = asObject<EdgeDenomination>({
  multiplier: asString,
  name: asString,
  symbol: asOptional(asString)
})

export const asEdgeToken = asObject({
  currencyCode: asString,
  denominations: asArray(asEdgeDenomination),
  displayName: asString,
  networkLocation: asOptional(asJsonObject)
})

export const asInfoServerTokens = asObject({
  infoServerTokens: asMaybe(asArray(asUnknown))
})

export const asMaybeOtherParamsLastSeenTime = asMaybe(
  asObject({
    lastSeenTime: asNumber
  })
)
