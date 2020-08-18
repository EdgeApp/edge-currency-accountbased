/**
 * Created by paul on 8/26/17.
 */
// @flow

import { asObject, asOptional, asString } from 'cleaners'

export type EthereumInitOptions = {
  blockcypherApiKey?: string,
  etherscanApiKey?: string | Array<string>,
  infuraProjectId?: string,
  blockchairApiKey?: string,
  alethioApiKey?: string,
  amberdataApiKey?: string,
  ethGasStationApiKey?: string,
  alchemyApiKey?: string
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

export const asEtherscanTokenTransaction = asObject({
  blockNumber: asString,
  timeStamp: asString,
  hash: asOptional(asString),
  transactionHash: asOptional(asString),
  to: asString,
  from: asString,
  value: asString,
  nonce: asString,
  gasPrice: asString,
  gas: asString,
  cumulativeGasUsed: asString,
  gasUsed: asString,
  confirmations: asString,
  contractAddress: asString,
  tokenName: asString,
  tokenSymbol: asString,
  tokenDecimal: asString
})

export type EtherscanTokenTransaction = $Call<
  typeof asEtherscanTokenTransaction
>

export const asEtherscanTransaction = asObject({
  hash: asOptional(asString),
  transactionHash: asOptional(asString),
  blockNumber: asString,
  timeStamp: asString,
  gasPrice: asString,
  gasUsed: asString,
  value: asString,
  nonce: asString,
  from: asString,
  to: asString,
  gas: asString,
  isError: asString,
  cumulativeGasUsed: asString,
  confirmations: asOptional(asString)
})

export type EtherscanTransaction = $Call<typeof asEtherscanTransaction>

export const asEtherscanInternalTransaction = asObject({
  hash: asOptional(asString),
  transactionHash: asOptional(asString),
  blockNumber: asString,
  timeStamp: asString,
  gasUsed: asString,
  value: asString,
  from: asString,
  to: asString,
  gas: asString,
  isError: asString,
  contractAddress: asOptional(asString)
})

export type EtherscanInternalTransaction = $Call<
  typeof asEtherscanInternalTransaction
>

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

export type AmberdataTx = {|
  hash: string,
  timestamp: string,
  blockNumber: string,
  value: string,
  fee: string,
  gasLimit: string,
  gasPrice: string,
  gasUsed: string,
  cumulativeGasUsed: string,
  from: Array<{ address: string }>,
  to: Array<{ address: string }>
|}

export type AmberdataInternalTx = {|
  transactionHash: string,
  timestamp: string,
  blockNumber: string,
  value: string,
  initialGas: string,
  leftOverGas: string,
  from: { address: string },
  to: Array<{ address: string }>
|}
