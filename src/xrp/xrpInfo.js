/* global */
// @flow

import { type EdgeCurrencyInfo } from 'edge-core-js/types'

import { imageServerUrl } from '../common/utils'
import { type XrpSettings } from './xrpTypes.js'

const otherSettings: XrpSettings = {
  rippledServers: [
    'wss://s2.ripple.com',
    'wss://rippled.xrptipbot.com',
    'wss://s1.ripple.com'
  ]
}

const defaultSettings: any = {
  otherSettings,
  fee: '0.00001'
}

export const currencyInfo: EdgeCurrencyInfo = {
  // Basic currency information:
  currencyCode: 'XRP',
  displayName: 'XRP',
  pluginId: 'ripple',
  walletType: 'wallet:ripple',

  defaultSettings,

  addressExplorer: 'https://bithomp.com/explorer/%s',
  transactionExplorer: 'https://bithomp.com/explorer/%s',

  denominations: [
    // An array of Objects of the possible denominations for this currency
    {
      name: 'XRP',
      multiplier: '1000000',
      symbol: 'X'
    }
  ],
  symbolImage: `${imageServerUrl}/ripple-logo-solo-64.png`,
  symbolImageDarkMono: `${imageServerUrl}/ripple-logo-solo-64.png`,
  metaTokens: []
}
