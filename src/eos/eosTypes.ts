export interface EosNetworkInfo {
  chainId: string

  createAccountViaSingleApiEndpoints?: string[]
  eosActivationServers: string[]
  eosDfuseServers: string[]
  eosHyperionNodes: string[]
  eosNodes: string[]
  uriProtocol: string
}

export const eosOtherMethodNames = [
  'getActivationCost',
  'getActivationSupportedCurrencies',
  'validateAccount'
] as const

export interface EosTransaction {
  block_time: string
  block_num: number
  account_action_seq: number
  trx_id: string
  act: {
    authorization: any
    data: {
      from: string
      to: string
      memo: string
      amount: number
      symbol: string
    }
    account: string
    name: string
  }
  '@timestamp': string
  producer: string
  parent: number
  global_sequence: number
  notified: string[]
}

export interface EosAction {
  act: {
    authorization: any
    data: {
      from: string
      to: string
      memo: string
      amount: number
      symbol: string
    }
    account: string
    name: string
  }
  '@timestamp': string
  block_num: number
  producer: string
  trx_id: string
  parent: number
  global_sequence: number
  notified: string[]
}

export interface EosWalletOtherData {
  accountName: string
  lastQueryActionSeq: { [currencyCode: string]: number }
  highestTxHeight: { [currencyCode: string]: number }
}

export interface ReferenceBlock {
  ref_block_num: number
  ref_block_prefix: number
}
