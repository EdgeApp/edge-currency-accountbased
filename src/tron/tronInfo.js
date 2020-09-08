/* global */
// @flow

import type { EdgeCurrencyInfo } from 'edge-core-js/types'

import type { TronSettings } from './tronTypes.js'

export const imageServerUrl = 'https://developer.airbitz.co/content'

const otherSettings: TronSettings = {
  tronApiServers: ['https://api.trongrid.io']
}

const defaultSettings: any = {
  otherSettings
}

export const currencyInfo: EdgeCurrencyInfo = {
  // Basic currency information:
  currencyCode: 'TRX',
  displayName: 'Tron',
  pluginId: 'tron',
  walletType: 'wallet:tron',

  defaultSettings,

  addressExplorer: 'https://tronscan.org/#/address/%s',
  transactionExplorer: 'https://tronscan.org/#/transaction/%s',
  blockExplorer: 'https://tronscan.org/#/block/%s',

  denominations: [
    // An array of Objects of the possible denominations for this currency
    {
      name: 'TRX',
      multiplier: '1000000',
      symbol: 'T'
    }
  ],
  symbolImage: `${imageServerUrl}/tron-logo-solo-64.png`,
  symbolImageDarkMono: `${imageServerUrl}/tron-logo-solo-64.png`,
  metaTokens: []
}
