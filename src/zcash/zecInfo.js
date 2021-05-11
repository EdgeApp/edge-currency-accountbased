/* global */
// @flow

import type { EdgeCurrencyInfo } from 'edge-core-js/types'

import { imageServerUrl } from './../common/utils.js'
import type { ZcashSettings } from './zecTypes.js'

const otherSettings: ZcashSettings = {
  binanceApiServers: ['https://dex.binance.org']
}

const defaultSettings: any = {
  otherSettings
}

export const currencyInfo: EdgeCurrencyInfo = {
  // Basic currency information:
  currencyCode: 'ZEC',
  displayName: 'Zcash',
  pluginId: 'zcash',
  walletType: 'wallet:zcash',

  defaultSettings,

  addressExplorer: '',
  transactionExplorer: '',
  blockExplorer: '',

  denominations: [
    // An array of Objects of the possible denominations for this currency
    {
      name: 'ZEC',
      multiplier: '100000000',
      symbol: 'Z'
    }
  ],
  symbolImage: `${imageServerUrl}/binance-coin-logo-solo-64.png`,
  symbolImageDarkMono: `${imageServerUrl}/binance-coin-logo-solo-64.png`,
  metaTokens: []
}
