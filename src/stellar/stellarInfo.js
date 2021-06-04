/* global */
// @flow

import { type EdgeCurrencyInfo } from 'edge-core-js/types'

import { type StellarSettings } from './stellarTypes.js'

const otherSettings: StellarSettings = {
  stellarServers: ['https://horizon.stellar.org']
}

const defaultSettings: any = {
  otherSettings
}

export const currencyInfo: EdgeCurrencyInfo = {
  // Basic currency information:
  currencyCode: 'XLM',
  displayName: 'Stellar',
  pluginId: 'stellar',
  walletType: 'wallet:stellar',

  defaultSettings,

  addressExplorer: 'https://stellarchain.io/address/%s',
  transactionExplorer: 'https://stellarchain.io/tx/%s',

  denominations: [
    // An array of Objects of the possible denominations for this currency
    {
      name: 'XLM',
      multiplier: '10000000',
      symbol: '*'
    }
  ],
  metaTokens: []
}
