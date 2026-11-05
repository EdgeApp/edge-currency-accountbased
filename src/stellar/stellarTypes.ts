import type { Horizon } from '@stellar/stellar-sdk'
import { asArray, asMaybe, asObject, asOptional, asString } from 'cleaners'

import { asSafeCommonWalletInfo } from '../common/types'

export interface StellarNetworkInfo {
  baseReserve: string
  stellarServers: string[]
}

export interface StellarCustomToken {
  currencyCode: string
  currencyName: string
  multiplier: string
  contractAddress: string
}

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
  fee_charged: asObject({
    // max: asString,
    // min: asString,
    // mode: asString,
    // p10: asString,
    // p20: asString,
    // p30: asString,
    // p40: asString,
    p50: asString,
    // p60: asString,
    p70: asString,
    // p80: asString,
    // p90: asString,
    p95: asString
    // p99: asString
  })
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
