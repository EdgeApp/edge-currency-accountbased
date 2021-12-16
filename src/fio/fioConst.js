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

export const ACTIONS = {
  transferTokens: 'transferTokens',
  addPublicAddress: 'addPublicAddress',
  addPublicAddresses: 'addPublicAddresses',
  setFioDomainPublic: 'setFioDomainPublic',
  rejectFundsRequest: 'rejectFundsRequest',
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
  [ACTIONS.registerFioAddress]: true,
  [ACTIONS.registerFioDomain]: true,
  [ACTIONS.renewFioDomain]: true,
  [ACTIONS.transferTokens]: true,
  [ACTIONS.addPublicAddresses]: true,
  [ACTIONS.transferFioAddress]: true,
  [ACTIONS.transferFioDomain]: true,
  [ACTIONS.addBundledTransactions]: true,
  [ACTIONS.stakeFioTokens]: true,
  [ACTIONS.unStakeFioTokens]: true
}

export const ACTIONS_TO_END_POINT_KEYS = {
  [ACTIONS.requestFunds]: 'newFundsRequest',
  [ACTIONS.registerFioAddress]: 'registerFioAddress',
  [ACTIONS.registerFioDomain]: 'registerFioDomain',
  [ACTIONS.renewFioDomain]: 'renewFioDomain',
  [ACTIONS.addPublicAddresses]: 'addPubAddress',
  [ACTIONS.setFioDomainPublic]: 'setFioDomainPublic',
  [ACTIONS.rejectFundsRequest]: 'rejectFundsRequest',
  [ACTIONS.recordObtData]: 'recordObtData',
  [ACTIONS.transferTokens]: 'transferTokens',
  [ACTIONS.pushTransaction]: 'pushTransaction',
  [ACTIONS.transferFioAddress]: 'transferFioAddress',
  [ACTIONS.transferFioDomain]: 'transferFioDomain',
  [ACTIONS.stakeFioTokens]: 'pushTransaction',
  [ACTIONS.unStakeFioTokens]: 'pushTransaction',
  addBundledTransactions: 'addBundledTransactions'
}

export const ACTIONS_TO_FEE_END_POINT_KEYS = {
  [ACTIONS.requestFunds]: 'newFundsRequest',
  [ACTIONS.registerFioAddress]: 'registerFioAddress',
  [ACTIONS.registerFioDomain]: 'registerFioDomain',
  [ACTIONS.renewFioDomain]: 'renewFioDomain',
  [ACTIONS.addPublicAddresses]: 'addPubAddress',
  [ACTIONS.setFioDomainPublic]: 'setFioDomainPublic',
  [ACTIONS.rejectFundsRequest]: 'rejectFundsRequest',
  [ACTIONS.recordObtData]: 'recordObtData',
  [ACTIONS.transferTokens]: 'transferTokens',
  [ACTIONS.pushTransaction]: 'pushTransaction',
  [ACTIONS.transferFioAddress]: 'transferFioAddress',
  [ACTIONS.transferFioDomain]: 'transferFioDomain',
  [ACTIONS.addBundledTransactions]: 'addBundledTransactions',
  [ACTIONS.stakeFioTokens]: 'stakeFioTokens',
  [ACTIONS.unStakeFioTokens]: 'unStakeFioTokens'
}

export const FIO_REQUESTS_TYPES = {
  PENDING: 'PENDING',
  SENT: 'SENT'
}

export const FEE_ACTION_MAP = {
  [ACTIONS.addPublicAddress]: {
    action: 'getFeeForAddPublicAddress',
    propName: 'fioAddress'
  },
  [ACTIONS.addPublicAddresses]: {
    action: 'getFeeForAddPublicAddress',
    propName: 'fioAddress'
  },
  [ACTIONS.rejectFundsRequest]: {
    action: 'getFeeForRejectFundsRequest',
    propName: 'payerFioAddress'
  },
  [ACTIONS.requestFunds]: {
    action: 'getFeeForNewFundsRequest',
    propName: 'payeeFioAddress'
  },
  [ACTIONS.recordObtData]: {
    action: 'getFeeForRecordObtData',
    propName: 'payerFioAddress'
  },
  [ACTIONS.stakeFioTokens]: {
    propName: 'fioAddress'
  },
  [ACTIONS.unStakeFioTokens]: {
    propName: 'fioAddress'
  }
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

export type TxOtherParams = {
  account: string,
  name: string,
  authorization: Array<{ actor: string, permission: string }>,
  data?: {
    amount?: number,
    max_fee?: number,
    tpid?: string,
    actor?: string
  } & any,
  action?: {
    name: string,
    params: any
  },
  meta: {
    isTransferProcessed?: boolean,
    isFeeProcessed?: boolean
  },
  ui?: any
}
