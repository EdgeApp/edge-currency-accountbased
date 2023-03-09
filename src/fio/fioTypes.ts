import {
  asArray,
  asBoolean,
  asNumber,
  asObject,
  asString,
  asUnknown
} from 'cleaners'

import { FIO_REQUESTS_TYPES } from './fioConst'
import { fioRegApiErrorCodes } from './fioError'

export const fioOtherMethodNames = [
  'getConnectedPublicAddress',
  'isFioAddressValid',
  'validateAccount',
  'isDomainPublic',
  'doesAccountExist',
  'buyAddressRequest',
  'getDomains',
  'getStakeEstReturn'
] as const

export interface FioNetworkInfo {
  apiUrls: string[]
  historyNodeUrls: string[]
  fioRegApiUrl: string
  fioDomainRegUrl: string
  fioAddressRegUrl: string
  fioStakingApyUrl: string
  defaultRef: string
  fallbackRef: string
  freeAddressRef: string
  errorCodes: typeof fioRegApiErrorCodes
  fioRequestsTypes: typeof FIO_REQUESTS_TYPES
  balanceCurrencyCodes: {
    staked: 'FIO:STAKED'
    locked: 'FIO:LOCKED'
  }
  chainId: string
}

export interface FioRefBlock {
  expiration: string
  ref_block_num: number
  ref_block_prefix: number
}

export const asFioAction = asObject({
  name: asString,
  params: asObject(asUnknown)
})

export const asFioTxParams = asObject({
  action: asString,
  account: asString,
  data: asObject(asUnknown)
})

export type FioTxParams = ReturnType<typeof asFioTxParams>

export const asFioSignedTx = asObject({
  compression: asNumber,
  packed_context_free_data: asString,
  packed_trx: asString,
  signatures: asArray(asString)
})

export type FioSignedTx = ReturnType<typeof asFioSignedTx>

export const asFioFee = asObject({ fee: asNumber })

interface FioFee {
  fee: string
  expiration: number
}
export type FioActionFees = Map<string, FioFee>

export const asFioAddressParam = asObject({
  fioAddress: asString
})

export const asFioDomainParam = asObject({
  fioDomain: asString
})

export const asFioTransferDomainParams = asObject({
  fioDomain: asString
})

export const asFioConnectAddressesParams = asObject({
  fioAddress: asString,
  publicAddresses: asArray(
    asObject({
      token_code: asString,
      chain_code: asString,
      public_address: asString
    })
  )
})

export const asFioAddBundledTransactions = asObject({
  fioAddress: asString,
  bundleSets: asNumber
})

export const asSetFioDomainVisibility = asObject({
  fioDomain: asString,
  isPublic: asBoolean
})

export const asRejectFundsRequest = asObject({
  payerFioAddress: asString,
  fioRequestId: asNumber
})

export const asCancelFundsRequest = asObject({
  fioAddress: asString,
  fioRequestId: asNumber
})

export const asFioBroadcastResult = asObject({
  block_num: asNumber,
  block_time: asString,
  transaction_id: asString
}).withRest

export type FioBroadcastResult = ReturnType<typeof asFioBroadcastResult>
