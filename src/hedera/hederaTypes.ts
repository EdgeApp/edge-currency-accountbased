import {
  asArray,
  asBoolean,
  asCodec,
  asMaybe,
  asNumber,
  asObject,
  asOptional,
  asString,
  Cleaner
} from 'cleaners'

import { asSafeCommonWalletInfo } from '../common/types'

export interface HederaNetworkInfo {
  creatorApiServers: [string]
  mirrorNodes: [string]
  client: string
  checksumNetworkID: string
  maxFee: number
}

export const asHederaWalletOtherData = asObject({
  activationRequestId: asMaybe(asString),
  accountActivationQuoteAddress: asMaybe(asString),
  accountActivationQuoteAmount: asMaybe(asString),
  hederaAccount: asMaybe(asString),
  latestTimestamp: asMaybe(asString, '1535068800'), // genesis '2018-08-24T00:00:00.000Z'
  paymentSubmitted: asMaybe(asBoolean)
})

export type HederaWalletOtherData = ReturnType<typeof asHederaWalletOtherData>

export const hederaOtherMethodNames = [
  'getActivationSupportedCurrencies',
  'getActivationCost',
  'validateAccount'
] as const

export const asGetActivationCost = asObject({
  hbar: asString
})

export const asGetHederaAccount = asObject({
  accounts: asArray(
    asObject({ account: asString, key: asObject({ key: asString }) })
  )
})

export const asMirrorNodeQueryBalance = asObject({
  balances: asArray(
    asObject({
      account: asString,
      balance: asNumber
      // tokens: []
    })
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

export type SafeHederaWalletInfo = ReturnType<typeof asSafeHederaWalletInfo>
export const asSafeHederaWalletInfo = asSafeCommonWalletInfo

export interface HederaPrivateKeys {
  mnemonic?: string
  privateKey: string
}
export const asHederaPrivateKeys = (
  pluginId: string
): Cleaner<HederaPrivateKeys> => {
  const asKeys = asObject({
    [`${pluginId}Mnemonic`]: asOptional(asString),
    [`${pluginId}Key`]: asString
  })

  return asCodec(
    raw => {
      const from = asKeys(raw)
      return {
        mnemonic: from[`${pluginId}Mnemonic`],
        privateKey: from[`${pluginId}Key`] as string
      }
    },
    clean => {
      return {
        [`${pluginId}Mnemonic`]: clean.mnemonic,
        [`${pluginId}Key`]: clean.privateKey
      }
    }
  )
}
