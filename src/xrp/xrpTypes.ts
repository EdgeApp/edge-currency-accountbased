import { asNumber, asObject, asString } from 'cleaners'

export interface XrpNetworkInfo {
  rippledServers: string[]
  defaultFee: string
  baseReserve: string
}

export interface XrpCustomToken {
  currencyCode: string
  currencyName: string
  multiplier: string
  contractAddress: string
}

export interface XrpWalletOtherData {
  recommendedFee: string // Floating point value in full XRP value
}

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
