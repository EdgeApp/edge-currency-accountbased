/**
 * Created by Austin Bonander <austin@launchbadge.com> on 9/30/19.
 */
// @flow

export type HederaSettings = {
  creatorApiServers: [string],
  kabutoApiServers: [string]
}

export type HederaBalance = {
  balance: string,
  buying_liabilities: string,
  selling_liabilities: string,
  asset_type: string
}

export type HederaAccount = {
  id: string,
  sequence: number,
  balances: Array<HederaBalance>
}

export type HederaCustomToken = {
  currencyCode: string,
  currencyName: string,
  multiplier: string,
  contractAddress: string
}

export type HederaPayment = {
  id: string,
  paging_token: string,
  type: 'payment',
  created_at: string,
  transaction_hash: string,
  asset_type: string,
  from: string,
  to: string,
  amount: string,
  transaction: Function
}

export type HederaCreateAccount = {
  id: string,
  paging_token: string,
  type: 'create_account',
  created_at: string,
  transaction_hash: string,
  asset_type: string,
  source_account: string,
  account: string,
  starting_balance: string,
  transaction: Function
}

export type HederaOperation = HederaPayment | HederaCreateAccount

export type HederaTransaction = {
  fee_paid: number,
  memo_type: string,
  ledger_attr: number
}
export type HederaWalletOtherData = {
  lastPagingToken: string,
  accountSequence: number
}
