/**
 * Created by paul on 8/26/17.
 */


export type StellarSettings = {
  stellarServers: string[]
}

export type StellarBalance = {
  balance: string,
  buying_liabilities: string,
  selling_liabilities: string,
  asset_type: string
}

export type StellarAccount = {
  id: string,
  sequence: number,
  balances: StellarBalance[]
}

export type StellarCustomToken = {
  currencyCode: string,
  currencyName: string,
  multiplier: string,
  contractAddress: string
}

export type StellarPayment = {
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

export type StellarCreateAccount = {
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

export type StellarOperation = StellarPayment | StellarCreateAccount

export type StellarTransaction = {
  fee_paid: number,
  memo_type: string,
  ledger_attr: number
}
export type StellarWalletOtherData = {
  lastPagingToken: string,
  accountSequence: number
}
