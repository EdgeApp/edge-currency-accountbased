import type { BalanceResponse } from '@fioprotocol/fiosdk/lib/entities/BalanceResponse'
import type { FioNamesResponse } from '@fioprotocol/fiosdk/lib/entities/FioNamesResponse'
import {
  asArray,
  asBoolean,
  asEither,
  asMaybe,
  asNumber,
  asObject,
  asOptional,
  asString,
  asUnknown,
  asValue,
  Cleaner
} from 'cleaners'

import { asWalletInfo } from '../common/types'
import { asEncryptedFioRequest } from './fioConst'
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
  chainId: string
}

export type FioRequestTypes = 'PENDING' | 'SENT'

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

export const asFioRecordObtData = asObject({
  payerFioAddress: asString,
  payeeFioAddress: asString,
  payerPublicAddress: asString,
  payeePublicAddress: asString,
  amount: asString,
  tokenCode: asString,
  chainCode: asString,
  obtId: asString,
  memo: asString,
  status: asOptional(
    asValue('cancelled', 'rejected', 'requested', 'sent_to_blockchain')
  ),
  fioRequestId: asOptional(asNumber)
})

export const asFioRequestFundsParams = asObject({
  payerFioAddress: asString,
  payerFioPublicKey: asString,
  payeeFioAddress: asString,
  payeeTokenPublicAddress: asString,
  amount: asString,
  chainCode: asString,
  tokenCode: asString,
  memo: asString
})

export const asFioBroadcastResult = asObject({
  block_num: asNumber,
  block_time: asString,
  transaction_id: asString
}).withRest

export const asFioEmptyResponse = asObject({
  message: asString
})

export const asGetFioRequestsResponse = asObject({
  requests: asArray(asEncryptedFioRequest),
  more: asNumber
})

export const asObtData = asObject({
  payer_fio_address: asString,
  payee_fio_address: asString,
  payer_fio_public_key: asString,
  payee_fio_public_key: asString,
  content: asEither(
    asString,
    asObject({
      amount: asString,
      chain_code: asString,
      hash: asOptional(asString),
      memo: asString,
      obt_id: asString,
      offline_url: asOptional(asString),
      payee_public_address: asString,
      payer_public_address: asString,
      status: asString,
      token_code: asString
    })
  ),
  fio_request_id: asNumber,
  status: asString,
  time_stamp: asString
})

export type ObtData = ReturnType<typeof asObtData>

export const asGetObtDataResponse = asObject({
  obt_data_records: asArray(asObtData),
  more: asNumber
})

export type SafeFioWalletInfo = ReturnType<typeof asSafeFioWalletInfo>
export const asSafeFioWalletInfo = asWalletInfo(
  asObject({
    publicKey: asString
  })
)

export type FioPrivateKeys = ReturnType<typeof asFioPrivateKeys>
export const asFioPrivateKeys = asObject({
  fioKey: asString
})

export const comparisonFioNameString = (res: FioNamesResponse): string => {
  const nameArray: string[] = []
  res.fio_domains.forEach(domain => nameArray.push(domain.fio_domain))
  res.fio_addresses.forEach(address => nameArray.push(address.fio_address))
  return nameArray.sort((a, b) => (a < b ? -1 : 1)).join()
}

export const comparisonFioBalanceString = (res: BalanceResponse): string => {
  const balanceArray: Array<number | string> = []
  balanceArray.push(res.balance)
  balanceArray.push(res.available)
  balanceArray.push(res.staked)
  balanceArray.push(res.srps)
  balanceArray.push(res.roe)
  return balanceArray.join()
}

type FioNothingResponse =
  | {
      data: {
        json: { message: string }
      }
    }
  | undefined
export const asFioNothingResponse = (
  message: string
): Cleaner<FioNothingResponse> =>
  asMaybe(
    asObject({
      data: asObject({
        json: asObject({ message: asValue(message) })
      })
    })
  )

//
// Info Payload
//

export const asFioInfoPayload = asObject({
  apiUrls: asOptional(asArray(asString)),
  historyNodeUrls: asOptional(asArray(asString)),
  fioRegApiUrl: asOptional(asString),
  fioDomainRegUrl: asOptional(asString),
  fioAddressRegUrl: asOptional(asString),
  fioStakingApyUrl: asOptional(asString)
})
export type FioInfoPayload = ReturnType<typeof asFioInfoPayload>
