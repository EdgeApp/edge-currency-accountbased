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
