import {
  asArray,
  asBoolean,
  asDate,
  asMaybe,
  asNumber,
  asObject,
  asOptional,
  asString,
  asValue
} from 'cleaners'

import { asAny } from '../common/types'
import { FioTxName } from './fioSchema'

export const FIO_REG_API_ENDPOINTS = {
  buyAddress: 'buy-address',
  getDomains: 'get-domains',
  isDomainPublic: 'is-domain-public'
}
export const HISTORY_NODE_ACTIONS = {
  getActions: 'get_actions'
}
export const HISTORY_NODE_PAGE_SIZE = 20

export const ACTIONS = {
  transferTokens: 'transferTokens',
  addPublicAddress: 'addPublicAddress',
  addPublicAddresses: 'addPublicAddresses',
  removePublicAddresses: 'removePublicAddresses',
  setFioDomainPublic: 'setFioDomainVisibility',
  rejectFundsRequest: 'rejectFundsRequest',
  cancelFundsRequest: 'cancelFundsRequest',
  requestFunds: 'requestFunds',
  recordObtData: 'recordObtData',
  registerFioAddress: 'registerFioAddress',
  registerFioDomain: 'registerFioDomain',
  renewFioDomain: 'renewFioDomain',
  transferFioAddress: 'transferFioAddress',
  transferFioDomain: 'transferFioDomain',
  pushTransaction: 'pushTransaction',
  addBundledTransactions: 'addBundledTransactions',
  stakeFioTokens: 'stakeFioTokens',
  unStakeFioTokens: 'unStakeFioTokens'
}

export const BROADCAST_ACTIONS = {
  [ACTIONS.recordObtData]: true,
  [ACTIONS.requestFunds]: true,
  [ACTIONS.rejectFundsRequest]: true,
  [ACTIONS.cancelFundsRequest]: true,
  [ACTIONS.registerFioAddress]: true,
  [ACTIONS.registerFioDomain]: true,
  [ACTIONS.renewFioDomain]: true,
  [ACTIONS.transferTokens]: true,
  [ACTIONS.addPublicAddresses]: true,
  [ACTIONS.removePublicAddresses]: true,
  [ACTIONS.transferFioAddress]: true,
  [ACTIONS.transferFioDomain]: true,
  [ACTIONS.addBundledTransactions]: true,
  [ACTIONS.setFioDomainPublic]: true,
  [ACTIONS.stakeFioTokens]: true,
  [ACTIONS.unStakeFioTokens]: true
}

export const ACTIONS_TO_END_POINT_KEYS = {
  [ACTIONS.requestFunds]: 'newFundsRequest',
  [ACTIONS.registerFioAddress]: 'registerFioAddress',
  [ACTIONS.registerFioDomain]: 'registerFioDomain',
  [ACTIONS.renewFioDomain]: 'renewFioDomain',
  [ACTIONS.addPublicAddresses]: 'addPubAddress',
  [ACTIONS.removePublicAddresses]: 'removePubAddress',
  [ACTIONS.setFioDomainPublic]: 'setFioDomainPublic',
  [ACTIONS.rejectFundsRequest]: 'rejectFundsRequest',
  [ACTIONS.cancelFundsRequest]: 'cancelFundsRequest',
  [ACTIONS.recordObtData]: 'recordObtData',
  [ACTIONS.transferTokens]: 'transferTokens',
  [ACTIONS.pushTransaction]: 'pushTransaction',
  [ACTIONS.transferFioAddress]: 'transferFioAddress',
  [ACTIONS.transferFioDomain]: 'transferFioDomain',
  [ACTIONS.stakeFioTokens]: 'pushTransaction',
  [ACTIONS.unStakeFioTokens]: 'pushTransaction',
  addBundledTransactions: 'addBundledTransactions'
} as const

export const ACTIONS_TO_TX_ACTION_NAME = {
  [ACTIONS.transferTokens]: 'trnsfiopubky',
  [ACTIONS.stakeFioTokens]: 'stakefio',
  [ACTIONS.unStakeFioTokens]: 'unstakefio',
  transfer: 'transfer'
}

export const DEFAULT_BUNDLED_TXS_AMOUNT = 100
export const DEFAULT_APR = 450
export const STAKING_REWARD_MEMO = 'Paying Staking Rewards'
export const STAKING_LOCK_PERIOD = 1000 * 60 * 60 * 24 * 7 // 7 days
export const DAY_INTERVAL = 1000 * 60 * 60 * 24

export const asFioRequest = asObject({
  fio_request_id: asString,
  payer_fio_address: asString,
  payee_fio_address: asString,
  payee_fio_public_key: asString,
  payer_fio_public_key: asString,
  amount: asString,
  token_code: asString,
  metadata: asString,
  time_stamp: asString,
  content: asString
})

export type FioRequest = ReturnType<typeof asFioRequest>

export const asEncryptedFioRequest = asObject({
  fio_request_id: asNumber,
  payer_fio_address: asString,
  payee_fio_address: asString,
  payer_fio_public_key: asString,
  payee_fio_public_key: asString,
  content: asString,
  time_stamp: asString,
  status: asOptional(
    asValue('cancelled', 'rejected', 'requested', 'sent_to_blockchain')
  )
})

export type EncryptedFioRequest = ReturnType<typeof asEncryptedFioRequest>

export const asFioAddress = asObject({
  name: asString,
  bundledTxs: asOptional(asNumber)
})

export type FioAddress = ReturnType<typeof asFioAddress>

export const asFioDomain = asObject({
  name: asString,
  expiration: asString,
  isPublic: asBoolean
})

export type FioDomain = ReturnType<typeof asFioDomain>

export interface TxOtherParams {
  account: string
  name: FioTxName
  authorization: Array<{ actor: string; permission: string }>
  data?: {
    amount?: number
    max_fee?: number
    tpid?: string
    actor?: string
  } & any
  action?: {
    name: FioTxName
    params: any
  }
  meta: {
    isTransferProcessed?: boolean
    isFeeProcessed?: boolean
  }
  ui?: any
}

export const asEdgeStakingStatus = asObject({
  stakedAmounts: asArray(
    asObject({
      nativeAmount: asString,
      unlockDate: asOptional(asDate),
      otherParams: asOptional(asAny)
    })
  )
})

export const asFioWalletOtherData = asObject({
  highestTxHeight: asMaybe(asNumber, 0),
  fioAddresses: asMaybe(asArray(asFioAddress), () => []),
  fioDomains: asMaybe(asArray(asFioDomain), () => []),
  fioRequests: asMaybe(
    asObject({
      PENDING: asArray(asFioRequest),
      SENT: asArray(asFioRequest)
    }),
    () => ({
      SENT: [],
      PENDING: []
    })
  ),
  srps: asMaybe(asNumber, 0),
  stakingRoe: asMaybe(asString, ''),
  lockedBalances: asMaybe(
    asObject({
      staked: asString,
      locked: asString
    }),
    {
      staked: '0',
      locked: '0'
    }
  ),
  stakingStatus: asMaybe(asEdgeStakingStatus, () => ({
    stakedAmounts: []
  }))
})

export type FioWalletOtherData = ReturnType<typeof asFioWalletOtherData>

export const NO_FIO_NAMES = 'No FIO names'
export const PUBLIC_KEY_NOT_FOUND = 'Public key not found'
