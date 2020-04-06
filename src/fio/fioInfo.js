/* global */
// @flow

import { type EdgeCurrencyInfo } from 'edge-core-js/types'

const defaultSettings: any = {
  apiUrls: ['https://fio.cryptolions.io:443/v1/'],
  historyNodeUrls: ['https://fio.greymass.com/v1/'],
  historyNodeActions: {
    getActions: 'get_actions'
  },
  fioAddressRegApiUrl: 'https://reg.fioprotocol.io/public-api/buy-address',
  fioDomain: 'edge'
}

export const currencyInfo: EdgeCurrencyInfo = {
  // Basic currency information:
  currencyCode: 'FIO',
  displayName: 'FIO',
  pluginName: 'fio',
  walletType: 'wallet:fio',

  defaultSettings,

  // todo: Get proper urls
  addressExplorer: 'https://monitor.testnet.fioprotocol.io/#accountInfo',
  transactionExplorer: 'https://monitor.testnet.fioprotocol.io/',

  denominations: [
    // An array of Objects of the possible denominations for this currency
    {
      name: 'FIO',
      multiplier: '1000000000',
      symbol: 'ᵮ'
    }
  ],
  symbolImage:
    'https://firebasestorage.googleapis.com/v0/b/whitelabel-eventshouse.appspot.com/o/fio.png?alt=media&token=a8de6377-453a-4c66-96dc-d1ba6fdec78a',
  symbolImageDarkMono:
    'https://firebasestorage.googleapis.com/v0/b/whitelabel-eventshouse.appspot.com/o/fio.png?alt=media&token=a8de6377-453a-4c66-96dc-d1ba6fdec78a',
  metaTokens: []
}
