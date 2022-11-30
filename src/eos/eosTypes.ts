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
  // @ts-expect-error
  block_num: number
  account_action_seq: number
  // @ts-expect-error
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
  // @ts-expect-error
  block_num: number
  producer: string
  // @ts-expect-error
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

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface EosParams {}

export interface EosWalletOtherData {
  accountName: string
  // @ts-expect-error
  lastQueryActionSeq: { [string]: number }
  // @ts-expect-error
  highestTxHeight: { [string]: number }
}

export interface EosJsConfig {
  chainId: string
  keyProvider: any[]
  httpEndpoint: string
  fetch: Function
  verbose: boolean // verbose logging such as API activity
}
