/**
 * Created by paul on 8/26/17.
 */

export interface EosSettings {
  eosHyperionNodes: string[]
  eosNodes: string[]
}

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
  block_num: number
  producer: string
  trx_id: string
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

export interface EosParams {}

export interface EosWalletOtherData {
  accountName: string
  lastQueryActionSeq: { [string]: number }
  highestTxHeight: { [string]: number }
}

export interface EosJsConfig {
  chainId: string
  keyProvider: any[]
  httpEndpoint: string
  fetch: Function
  verbose: boolean // verbose logging such as API activity
}
