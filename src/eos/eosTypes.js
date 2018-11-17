/**
 * Created by paul on 8/26/17.
 */
// @flow

import { type EdgeMetadata } from 'edge-core-js'
export type EosSettings = {
  eosSuperNodes: Array<string>,
  eosNodes: Array<string>
}

export type EosTransactionSuperNode = {
  txid: string,
  date: string,
  currencyCode: string,
  blockHeight: number,
  networkFee: string,
  parentNetworkFee: string,
  signedTx: string,
  otherParams: {
    fromAddress: string,
    toAddress: string
  },
  exchangeAmount: string,
  metadata: EdgeMetadata
}

export type EosTransaction = {
  block_time: string,
  block_num: number,
  action_trace: {
    trx_id: string,
    act: {
      name: string,
      data: {
        from: string,
        to: string,
        memo: string,
        quantity: string
      }
    }
  }

  // type: string,
  // address: string,
  // id: string,
  // outcome: {
  //   result: string,
  //   timestamp: string,
  //   fee: string,
  //   ledgerVersion: number,
  //   balanceChanges: {
  //     [address: string]: Array<XrpBalanceChange>
  //   }
  // }
}

export type EosParams = {}

export type EosWalletOtherData = {
  accountName: string
}
