/**
 * Created by paul on 8/26/17.
 */
// @flow

export type EosSettings = {
  eosHyperionNodes: string[],
  eosNodes: string[]
}

export type EosTransactionSuperNode = {
  act: {
    data: {
      from: string,
      to: string,
      amount: string,
      symbol: string,
      memo?: string
    }
  },
  trx_id: string,
  '@timestamp': string,
  block_num: number
}

export type EosTransaction = {
  block_time: string,
  block_num: number,
  account_action_seq: number,
  trx_id: string,
  act: {
    authorization: any,
    data: {
      from: string,
      to: string,
      memo: string,
      amount: number,
      symbol: string
    },
    account: string,
    name: string
  },
  '@timestamp': string,
  block_num: number,
  producer: string,
  trx_id: string,
  parent: number,
  global_sequence: number,
  notified: string[]
}

export type EosAction = {
  act: {
    authorization: any,
    data: {
      from: string,
      to: string,
      memo: string,
      amount: number,
      symbol: string
    },
    account: string,
    name: string
  },
  '@timestamp': string,
  block_num: number,
  producer: string,
  trx_id: string,
  parent: number,
  global_sequence: number,
  notified: string[]
}

export type EosParams = {}

export type EosWalletOtherData = {
  accountName: string,
  lastQueryActionSeq: { [string]: number },
  highestTxHeight: { [string]: number }
}

export type EosJsConfig = {
  chainId: string,
  keyProvider: any[],
  httpEndpoint: string,
  fetch: Function,
  verbose: boolean // verbose logging such as API activity
}
