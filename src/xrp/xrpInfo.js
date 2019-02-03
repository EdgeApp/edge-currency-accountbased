/* global */
// @flow

import { type EdgeCurrencyInfo } from 'edge-core-js/types'

import { type XrpSettings } from './xrpTypes.js'

const otherSettings: XrpSettings = {
  rippledServers: [
    'wss://s2.ripple.com',
    'wss://rippled.xrptipbot.com',
    'wss://s1.ripple.com'
  ]
}

const defaultSettings: any = {
  otherSettings
}

export const currencyInfo: EdgeCurrencyInfo = {
  // Basic currency information:
  currencyCode: 'XRP',
  displayName: 'XRP',
  pluginName: 'ripple',
  walletType: 'wallet:ripple',

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
  symbolImage: 'https://developer.airbitz.co/content/ripple-logo-solo-64.png',
  symbolImageDarkMono:
    'https://developer.airbitz.co/content/ripple-logo-solo-64.png',
  metaTokens: []
}
