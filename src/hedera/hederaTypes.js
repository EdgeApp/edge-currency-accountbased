// @flow

import { asArray, asNumber, asObject, asOptional, asString } from 'cleaners'

export type HederaSettings = {
  creatorApiServers: [string],
  mirrorNodes: [string],
  client: string,
  checksumNetworkID: string,
  maxFee: number
}

export const asGetActivationCost = asObject({
  hbar: asString
})

export const asGetHederaAccount = asObject({
  accounts: asArray(
    asObject({ account: asString, key: asObject({ key: asString }) })
  )
})

export const asMirrorNodeTransactionResponse = asObject({
  transactions: asArray(
    asObject({
      transaction_hash: asString, // base64
      transaction_id: asString,
      valid_start_timestamp: asString, // '1631741313.128000000'
      transfers: asArray(
        asObject({
          account: asString,
          amount: asNumber
        })
      ),
      memo_base64: asString,
      result: asString,
      name: asString,
      consensus_timestamp: asString, // '1631741326.928156000'
      charged_tx_fee: asNumber
    })
  )
})

export const asGetAccountActivationQuote = asObject({
  amount: asString,
  address: asString,
  request_id: asString
})

export const asCheckAccountCreationStatus = asObject({
  status: asString,
  account_id: asOptional(asString)
})
