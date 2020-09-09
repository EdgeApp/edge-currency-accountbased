// @flow

export type NeoTxOtherParams = {
  from: Array<string>,
  to: Array<string>,
  networkFee: number,
  isNative: boolean,
  data?: string | null,
  asset?: string // default as neo
}
