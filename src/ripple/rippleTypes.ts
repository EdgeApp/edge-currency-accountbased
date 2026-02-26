import {
  asArray,
  asBoolean,
  asEither,
  asMaybe,
  asNumber,
  asObject,
  asOptional,
  asString
} from 'cleaners'
import type { EdgeTransaction } from 'edge-core-js/types'

import { asSafeCommonWalletInfo, MakeTxParams } from '../common/types'

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
  DestinationTag: asOptional(asNumber),
  hash: asString,
  Fee: asOptional(asString),
  ledger_index: asNumber
})

export type XrpTransaction = ReturnType<typeof asXrpTransaction>

export const asCustomXrpNetworkLocation = asObject({
  currency: asMaybe(asString),
  issuer: asString
})
export const asXrpNetworkLocation = asObject({
  currency: asString,
  issuer: asString
})
export type XrpNetworkLocation = ReturnType<typeof asXrpNetworkLocation>

export type SafeRippleWalletInfo = ReturnType<typeof asSafeRippleWalletInfo>
export const asSafeRippleWalletInfo = asSafeCommonWalletInfo

export type RipplePrivateKeys = ReturnType<typeof asRipplePrivateKeys>
export const asRipplePrivateKeys = asEither(
  asObject({
    rippleKey: asString
  }),
  asObject({
    rippleMnemonic: asString
  })
)

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

//
// Info Payload
//

export const asXrpInfoPayload = asObject({
  rippledServers: asOptional(asArray(asString))
})
export type XrpInfoPayload = ReturnType<typeof asXrpInfoPayload>
