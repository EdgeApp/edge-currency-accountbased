// @flow

export type OneSettings = {
  oneServers: Array<string>
}

export type OneBalanceChange = {
  result: string
}
export type OneGetTransaction = {
  blockHash: string,
  blockNumber: string,
  from: string,
  timestamp: string,
  gas: string,
  gasPrice: string,
  hash: string,
  input: string,
  nonce: string,
  to: string,
  transactionIndex: string,
  value: string,
  shardID: number,
  toShardID: number,
  v: string,
  r: string,
  s: string
}

export type OneGetLastHeader = {
  result: {
    blockHash: string,
    blockNumber: number,
    shardID: number,
    leader: string,
    viewID: number,
    epoch: number,
    timestamp: string,
    unixtime: number
  }
}

export type OneWalletOtherData = {
  recommendedFee: string, // Floating point value in full XRP value
  gasPrice: string,
  gasLimit: string,
  numberTransactions: number
}

export type OneGetTransactions = {
  result: {
    transactions: Array<OneGetTransaction>
  }
}
