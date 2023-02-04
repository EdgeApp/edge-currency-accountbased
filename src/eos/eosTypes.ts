import { asMaybe, asNumber, asObject, asString } from 'cleaners'

export interface EosNetworkInfo {
  chainId: string
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

export interface EosTransactionSuperNode {
  act: {
    data: {
      from: string
      to: string
      amount: string
      symbol: string
      memo?: string
    }
  }
  trx_id: string
  '@timestamp': string
  block_num: number
}

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

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface EosParams {}

export const asEosWalletOtherData = asObject({
  accountName: asMaybe(asString, ''),
  lastQueryActionSeq: asMaybe(asObject(asNumber), {}),
  highestTxHeight: asMaybe(asObject(asNumber), {})
})

export type EosWalletOtherData = ReturnType<typeof asEosWalletOtherData>

export interface ReferenceBlock {
  ref_block_num: number
  ref_block_prefix: number
}
