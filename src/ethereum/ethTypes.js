/**
 * Created by paul on 8/26/17.
 */
// @flow

export type EthereumInitOptions = {
  blockcypherApiKey?: string,
  etherscanApiKey?: string | Array<string>,
  infuraProjectId?: string,
  blockchairApiKey?: string,
  alethioApiKey?: string
}

export type EthereumSettings = {
  etherscanApiServers: Array<string>,
  blockcypherApiServers: Array<string>,
  superethServers: Array<string>,
  iosAllowedTokens: { [currencyCode: string]: boolean }
}

type EthereumFeesGasLimit = {
  regularTransaction: string,
  tokenTransaction: string
}

export type EthereumFeesGasPrice = {
  lowFee: string,
  standardFeeLow: string,
  standardFeeHigh: string,

  // The amount of wei which will be charged the standardFeeLow
  standardFeeLowAmount: string,

  // The amount of wei which will be charged the standardFeeHigh
  standardFeeHighAmount: string,
  highFee: string
}

export type EthereumFee = {
  gasLimit: EthereumFeesGasLimit,
  gasPrice?: EthereumFeesGasPrice
}

export type EthereumFees = {
  [address: string]: EthereumFee
}

export type EthereumCalcedFees = {
  gasPrice: string,
  gasLimit: string,
  useDefaults: boolean
}

export type EtherscanTransaction = {
  hash: string,
  blockNumber: string,
  timeStamp: string,
  gasPrice: string,
  gasUsed: string,
  value: string,
  nonce: string,
  from: string,
  to: string,
  gas: string,
  gasPrice: string,
  gasUsed: string,
  cumulativeGasUsed: string,
  isError: string,
  contractAddress?: string,
  tokenName?: string,
  tokenSymbol?: string,
  tokenDecimal?: string
}

export type EthereumTxOtherParams = {
  from: Array<string>,
  to: Array<string>,
  gas: string,
  gasPrice: string,
  gasUsed: string,
  cumulativeGasUsed?: string,
  errorVal: number,
  tokenRecipientAddress: string | null,
  data?: string | null
}

export type EthereumWalletOtherData = {
  nextNonce: string,
  unconfirmedNextNonce: string,
  networkFees: EthereumFees
}

export type AlethioTokenTransferAttributes = {
  blockCreationTime: number,
  symbol: string,
  fee: string,
  value: string,
  globalRank: Array<number>
}

export type AlethioTransactionDataObj = {
  data: { id: string },
  links: { related: string }
}

export type AlethioTransactionRelationships = {
  from: AlethioTransactionDataObj,
  to: AlethioTransactionDataObj,
  transaction: AlethioTransactionDataObj,
  token: AlethioTransactionDataObj
}

export type AlethioTokenTransfer = {
  type: string,
  attributes: AlethioTokenTransferAttributes,
  relationships: AlethioTransactionRelationships
}
