// @flow

export type TronSettings = {
  tronApiServers: Array<string>
}

export type TronApiTransaction = {
  amount: number,
  owner_address: string,
  to_address: string,
  blockNumber: number,
  block_timestamp: number,
  txID: string,
  networkFee: string,
  raw_data: Object,
  raw_data_hex: string
}

export type TronTxOtherParams = {
  visible: boolean,
  txID: string,
  raw_data: Object,
  raw_data_hex: string
}

export type TronNetworkFees = {
  createAccountFee: string,
  transactionFee: string
}
