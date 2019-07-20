/* global */
// @flow

import { type EdgeCurrencyInfo } from 'edge-core-js/types'

export const currencyInfo: EdgeCurrencyInfo = {
  // Basic currency information:
  currencyCode: 'FIO',
  displayName: 'FIO',
  pluginName: 'fio',
  walletType: 'wallet:fio',

  addressExplorer: 'https://eospark.com/account/%s',
  transactionExplorer: 'https://eospark.com/tx/%s',

  denominations: [
    // An array of Objects of the possible denominations for this currency
    {
      name: 'FIO',
      multiplier: '1000000000',
      symbol: 'ᵮ'
    }
  ],
  symbolImage: 'https://firebasestorage.googleapis.com/v0/b/whitelabel-eventshouse.appspot.com/o/fio.png?alt=media&token=a8de6377-453a-4c66-96dc-d1ba6fdec78a',
  symbolImageDarkMono: 'https://firebasestorage.googleapis.com/v0/b/whitelabel-eventshouse.appspot.com/o/fio.png?alt=media&token=a8de6377-453a-4c66-96dc-d1ba6fdec78a',
  metaTokens: []
}
