/**
 * Created by paul on 8/26/17.
 */
// @flow

import type { EdgeTransaction } from 'edge-core-js/types'

export const DATA_STORE_FILE = 'txEngineFolder/walletLocalData.json'
export const TXID_MAP_FILE = 'txEngineFolder/txidMap.json'
export const TXID_LIST_FILE = 'txEngineFolder/txidList.json'
export const TRANSACTION_STORE_FILE = 'txEngineFolder/transactionList.json'

export type CustomToken = {
  currencyCode: string,
  currencyName: string,
  multiplier: string,
  contractAddress: string
}

export type TxIdMap = { [currencyCode: string]: { [txid: string]: number } }
export type TxIdList = { [currencyCode: string]: Array<string> }
export type TransactionList = { [currencyCode: string]: Array<EdgeTransaction> }

export class WalletLocalData {
  blockHeight: number
  lastAddressQueryHeight: number
  publicKey: string
  totalBalances: { [currencyCode: string]: string }
  enabledTokens: Array<string>
  lastCheckedTxsDropped: number
  numUnconfirmedSpendTxs: number
  otherData: Object

  constructor(jsonString: string | null, primaryCurrency: string) {
    this.blockHeight = 0
    const totalBalances: { [currencyCode: string]: string } = {}
    this.totalBalances = totalBalances
    this.lastAddressQueryHeight = 0
    this.lastCheckedTxsDropped = 0
    this.numUnconfirmedSpendTxs = 0
    this.otherData = {}
    this.publicKey = ''
    this.enabledTokens = [primaryCurrency]
    if (jsonString !== null) {
      const data = JSON.parse(jsonString)

      if (typeof data.blockHeight === 'number') {
        this.blockHeight = data.blockHeight
      }
      if (typeof data.lastCheckedTxsDropped === 'number') {
        this.lastCheckedTxsDropped = data.lastCheckedTxsDropped
      }
      if (typeof data.numUnconfirmedSpendTxs === 'number') {
        this.numUnconfirmedSpendTxs = data.numUnconfirmedSpendTxs
      }
      if (typeof data.lastAddressQueryHeight === 'number') {
        this.lastAddressQueryHeight = data.lastAddressQueryHeight
      }
      if (typeof data.publicKey === 'string') this.publicKey = data.publicKey
      if (typeof data.totalBalances !== 'undefined') {
        this.totalBalances = data.totalBalances
      }
      if (typeof data.enabledTokens !== 'undefined') {
        this.enabledTokens = data.enabledTokens
      }
      if (typeof data.otherData !== 'undefined') this.otherData = data.otherData
    }
  }
}
