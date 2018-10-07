/* global */
// @flow

import { type EdgeCurrencyInfo } from 'edge-core-js'
import { type StellarSettings } from './stellarTypes.js'

const otherSettings: StellarSettings = {
  stellarServers: [
    'https://stellar1.edge.app',
    'https://horizon.stellar.org'
  ]
}

const defaultSettings: any = {
  otherSettings
}

export const currencyInfo: EdgeCurrencyInfo = {
  // Basic currency information:
  currencyCode: 'XLM',
  currencyName: 'Stellar',
  pluginName: 'stellar',
  walletTypes: [
    'wallet:stellar'
  ],

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
  symbolImage: 'https://developer.airbitz.co/content/Ripple-logo-blue-64.png',
  symbolImageDarkMono: 'https://developer.airbitz.co/content/Ripple-logo-grey-64.png',
  metaTokens: []
}
