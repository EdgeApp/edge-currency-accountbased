import { asArray, asMaybe, asNumber, asObject, asString } from 'cleaners'

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
  Account: asString,
  Amount: asString,
  Destination: asString,
  Fee: asString,
  date: asNumber,
  hash: asString,
  ledger_index: asNumber
})

export type XrpTransaction = ReturnType<typeof asXrpTransaction>

export const asGetTransactionsResponse = asObject({
  result: asObject({
    transactions: asArray(
      asObject({
        tx: asMaybe(asXrpTransaction)
      })
    )
  })
})
