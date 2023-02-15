import { asMaybe, asNumber, asObject, asString } from 'cleaners'

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

export const asXrpWalletOtherData = asObject({
  recommendedFee: asMaybe(asString, '0') // Floating point value in full XRP value
})

export type XrpWalletOtherData = ReturnType<typeof asXrpWalletOtherData>

export const asXrpTransaction = asObject({
  date: asNumber,
  hash: asString,
  ledger_index: asNumber
})

export type XrpTransaction = ReturnType<typeof asXrpTransaction>

export const asXrpNetworkLocation = asObject({
  currency: asString,
  issuer: asString
})
