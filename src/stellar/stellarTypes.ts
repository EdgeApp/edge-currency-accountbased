import type { Horizon } from '@stellar/stellar-sdk'
import { asArray, asMaybe, asObject, asOptional, asString } from 'cleaners'

import { asSafeCommonWalletInfo } from '../common/types'

export interface StellarNetworkInfo {
  baseReserve: string
  /** Signs transactions for one network, such as the public network. */
  networkPassphrase: string
  stellarServers: string[]
}

/** Where a token lives: its asset code and issuing account. */
export const asStellarNetworkLocation = asObject({
  code: asString,
  issuer: asString
})
export type StellarNetworkLocation = ReturnType<typeof asStellarNetworkLocation>

/** The records Horizon's payments endpoint returns. */
export type StellarPaymentRecord =
  | Horizon.ServerApi.CreateAccountOperationRecord
  | Horizon.ServerApi.PaymentOperationRecord
  | Horizon.ServerApi.PathPaymentOperationRecord
  | Horizon.ServerApi.PathPaymentStrictSendOperationRecord
  | Horizon.ServerApi.AccountMergeOperationRecord
  | Horizon.ServerApi.InvokeHostFunctionOperationRecord

export const asStellarWalletOtherData = asObject({
  lastPagingToken: asMaybe(asString, '0'),
  accountSequence: asMaybe(asString, '0')
})

export type StellarWalletOtherData = ReturnType<typeof asStellarWalletOtherData>

export const asFeeStats = asObject({
  last_ledger_base_fee: asString,
  ledger_capacity_usage: asString
})

export type SafeStellarWalletInfo = ReturnType<typeof asSafeStellarWalletInfo>
export const asSafeStellarWalletInfo = asSafeCommonWalletInfo

export type StellarPrivateKeys = ReturnType<typeof asStellarPrivateKeys>
export const asStellarPrivateKeys = asObject({
  stellarKey: asString,
  stellarMnemonic: asMaybe(asString)
})

//
// Info Payload
//

export const asStellarInfoPayload = asObject({
  stellarServers: asOptional(asArray(asString))
})
export type StellarInfoPayload = ReturnType<typeof asStellarInfoPayload>
