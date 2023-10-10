import {
  asBoolean,
  asEither,
  asMaybe,
  asNumber,
  asObject,
  asOptional,
  asString
} from 'cleaners'
import { EdgeMetadata, EdgeTransaction, EdgeTxSwap } from 'edge-core-js/types'

import { asSafeCommonWalletInfo } from '../common/types'

export interface XrpNetworkInfo {
  rippledServers: string[]
  defaultFee: string
  baseReserve: string
  baseReservePerToken: string
}

export interface XrpCustomToken {
  currencyCode: string
  currencyName: string
  multiplier: string
  contractAddress: string
}

export const asMaybeActivateTokenParams = asMaybe(
  asObject({
    activateTokenId: asString
  })
)

export const asXrpWalletOtherData = asObject({
  // A one-time flag to re-process transactions to add new data
  txListReset: asMaybe(asBoolean, true),

  // Floating point value in full XRP value
  recommendedFee: asMaybe(asString, '0')
})

export type XrpWalletOtherData = ReturnType<typeof asXrpWalletOtherData>

export const asXrpTransaction = asObject({
  date: asNumber,
  hash: asString,
  Fee: asOptional(asString),
  ledger_index: asNumber
})

export type XrpTransaction = ReturnType<typeof asXrpTransaction>

export const asXrpNetworkLocation = asObject({
  currency: asString,
  issuer: asString
})

export type SafeRippleWalletInfo = ReturnType<typeof asSafeRippleWalletInfo>
export const asSafeRippleWalletInfo = asSafeCommonWalletInfo

export type RipplePrivateKeys = ReturnType<typeof asRipplePrivateKeys>
export const asRipplePrivateKeys = asObject({
  rippleKey: asString
})

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

export interface RippleOtherMethods {
  makeTx: (makeTxParams: MakeTxParams) => Promise<EdgeTransaction>
}

// Nice-to-haves missing from xrpl lib:
export const asIssuedCurrencyAmount = asObject({
  currency: asString,
  issuer: asString,
  value: asString
})
export const asAmount = asEither(asIssuedCurrencyAmount, asString)

export const asFinalFieldsCanceledOffer = asObject({
  TakerPays: asAmount,
  TakerGets: asAmount
  // Add other fields that might appear in `FinalFields` as needed
})
export type FinalFieldsCanceledOffer = ReturnType<
  typeof asFinalFieldsCanceledOffer
>
