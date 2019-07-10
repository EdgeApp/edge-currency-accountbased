/**
 * Created by alepc253 on 6/19/19.
 */
// @flow

export type RskInitOptions = {
}

export type RskSettings = {
  etherscanApiServers: Array<string>,
  iosAllowedTokens: { [currencyCode: string]: boolean }
}

type RskFeesGasLimit = {
  regularTransaction: string,
  tokenTransaction: string
}

export type RskFeesGasPrice = {
  lowFee: string,
  standardFeeLow: string,
  standardFeeHigh: string,

  // The amount of wei which will be charged the standardFeeLow
  standardFeeLowAmount: string,

  // The amount of wei which will be charged the standardFeeHigh
  standardFeeHighAmount: string,
  highFee: string
}

export type RskFee = {
  gasLimit: RskFeesGasLimit,
  gasPrice?: RskFeesGasPrice
}

export type RskFees = {
  [address: string]: RskFee
}

export type RskCalcedFees = {
  gasPrice: string,
  gasLimit: string
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

export type RskTxOtherParams = {
  from: Array<string>,
  to: Array<string>,
  gas: string,
  gasPrice: string,
  gasUsed: string,
  cumulativeGasUsed: string,
  errorVal: number,
  tokenRecipientAddress: string | null
}

export type RskWalletOtherData = {
  nextNonce: string,
  unconfirmedNextNonce: string,
  networkFees: RskFees
}
