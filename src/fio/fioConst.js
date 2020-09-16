export const FIO_REG_API_ENDPOINTS = {
  buyAddress: 'buy-address',
  getDomains: 'get-domains'
}
export const HISTORY_NODE_ACTIONS = {
  getActions: 'get_actions'
}
export const HISTORY_NODE_OFFSET = 20

export const ACTIONS_SKIP_SWITCH = {
  recordObtData: true,
  requestFunds: true,
  registerFioAddress: true,
  registerFioDomain: true,
  renewFioAddress: true,
  renewFioDomain: true,
  transferTokens: true,
  addPublicAddresses: true
}

export const ACTIONS_TO_END_POINT_KEYS = {
  requestFunds: 'newFundsRequest',
  registerFioAddress: 'registerFioAddress',
  registerFioDomain: 'registerFioDomain',
  renewFioDomain: 'renewFioDomain',
  renewFioAddress: 'renewFioAddress',
  addPublicAddresses: 'addPubAddress',
  setFioDomainPublic: 'setFioDomainPublic',
  rejectFundsRequest: 'rejectFundsRequest',
  recordObtData: 'recordObtData',
  transferTokens: 'transferTokens',
  pushTransaction: 'pushTransaction'
}
