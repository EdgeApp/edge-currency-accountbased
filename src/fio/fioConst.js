// @flow

export const FIO_REG_API_ENDPOINTS = {
  buyAddress: 'buy-address',
  getDomains: 'get-domains',
  isDomainPublic: 'is-domain-public'
}
export const HISTORY_NODE_ACTIONS = {
  getActions: 'get_actions'
}
export const HISTORY_NODE_OFFSET = 20

export const BROADCAST_ACTIONS = {
  recordObtData: true,
  requestFunds: true,
  registerFioAddress: true,
  registerFioDomain: true,
  renewFioDomain: true,
  transferTokens: true,
  addPublicAddresses: true,
  transferFioAddress: true,
  transferFioDomain: true,
  addBundledTransactions: true
}

export const ACTIONS_TO_END_POINT_KEYS = {
  requestFunds: 'newFundsRequest',
  registerFioAddress: 'registerFioAddress',
  registerFioDomain: 'registerFioDomain',
  renewFioDomain: 'renewFioDomain',
  addPublicAddresses: 'addPubAddress',
  setFioDomainPublic: 'setFioDomainPublic',
  rejectFundsRequest: 'rejectFundsRequest',
  recordObtData: 'recordObtData',
  transferTokens: 'transferTokens',
  pushTransaction: 'pushTransaction',
  transferFioAddress: 'transferFioAddress',
  transferFioDomain: 'transferFioDomain',
  addBundledTransactions: 'addBundledTransactions'
}

export const FIO_REQUESTS_TYPES = {
  PENDING: 'PENDING',
  SENT: 'SENT'
}

export const DEFAULT_BUNDLED_TXS_AMOUNT = 100

export type FioRequest = {
  fio_request_id: string,
  payer_fio_address: string,
  payee_fio_address: string,
  payee_fio_public_key: string,
  payer_fio_public_key: string,
  amount: string,
  token_code: string,
  metadata: string,
  time_stamp: string,
  content: string
}

export type FioAddress = {
  name: string,
  bundledTxs?: number
}

export type FioDomain = {
  name: string,
  expiration: string,
  isPublic: boolean
}
