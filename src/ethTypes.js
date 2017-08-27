/**
 * Created by paul on 8/26/17.
 */
// @flow

export type EthereumSettings = {
  etherscanApiServers:Array<string>,
  superethServers:Array<string>
}

type EthereumFeesGasLimit = {
  regularTransaction: string,
  tokenTransaction: string
}

type EthereumFeesGasPrice = {
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
  gasLimit:EthereumFeesGasLimit, gasPrice?:EthereumFeesGasPrice
}

export type EthereumFees = {
  [address:string]: EthereumFee
}

export type EthereumCalcedFees = {
  gasPrice: string,
  gasLimit: string
}
