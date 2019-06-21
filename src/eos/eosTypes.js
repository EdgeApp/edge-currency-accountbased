/**
 * Created by paul on 8/26/17.
 */
// @flow

export type EosSettings = {
  eosHyperionNodes: Array<string>,
  eosNodes: Array<string>
}

export type EosTransactionSuperNode = {
  act: {
    data: {
      from: string,
      to: string,
      amount: string,
      symbol: string,
      memo?: string
    }
  },
  trx_id: string,
  '@timestamp': string,
  block_num: number
}

export type EosTransaction = {
  block_time: string,
  block_num: number,
  account_action_seq: number,
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
  accountName: string,
  lastQueryActionSeq: number,
  highestTxHeight: number
}
