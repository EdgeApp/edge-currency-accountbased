/**
 * Created by paul on 8/26/17.
 */
// @flow

// export type EthereumInitOptions = {
//   blockcypherApiKey?: string,
//   etherscanApiKey?: string,
//   infuraProjectId?: string
// }

export type BinanceSettings = {
  binanceApiServers: Array<string>
  // blockcypherApiServers: Array<string>,
  // superethServers: Array<string>,
  // iosAllowedTokens: { [currencyCode: string]: boolean }
}

export type BinanceApiTransaction = {
  txHash: string,
  blockHeight: number,
  txType: string,
  timeStamp: string,
  fromAddr: string,
  toAddr: string,
  value: string,
  txAsset: string,
  txFee: string,
  txAge: number,
  orderId: null | string,
  code: number,
  data: null | string,
  confirmBlocks: number,
  memo: string
}

export type BinanceTxOtherParams = {
  from: Array<string>,
  to: Array<string>,
  // gas: string,
  // gasPrice: string,
  // gasUsed: string,
  // cumulativeGasUsed: string,
  errorVal: number,
  tokenRecipientAddress: string | null,
  data?: string | null,
  memo?: string
}
