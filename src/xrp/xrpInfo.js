/* global */
// @flow

import { type EdgeCurrencyInfo } from 'edge-core-js'
import { type XrpSettings } from './xrpTypes.js'

const otherSettings: XrpSettings = {
  rippledServers: ['wss://s1.ripple.com', 'wss://s2.ripple.com']
}

const defaultSettings: any = {
  otherSettings
}

export const currencyInfo: EdgeCurrencyInfo = {
  // Basic currency information:
  currencyCode: 'XRP',
  currencyName: 'XRP',
  pluginName: 'ripple',
  walletTypes: ['wallet:ripple'],

  defaultSettings,

  addressExplorer: 'https://xrpcharts.ripple.com/#/transactions/%s',
  transactionExplorer: 'https://xrpcharts.ripple.com/#/transactions/%s',

  denominations: [
    // An array of Objects of the possible denominations for this currency
    {
      name: 'XRP',
      multiplier: '1000000',
      symbol: 'X'
    }
  ],
  symbolImage: 'https://developer.airbitz.co/content/Ripple-logo-blue-64.png',
  symbolImageDarkMono:
    'https://developer.airbitz.co/content/Ripple-logo-grey-64.png',
  metaTokens: []
}
