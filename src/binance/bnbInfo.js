/* global */
// @flow

import type { EdgeCurrencyInfo } from 'edge-core-js/types'

import { imageServerUrl } from './../common/utils.js'
import type { BinanceSettings } from './bnbTypes.js'

const otherSettings: BinanceSettings = {
  binanceApiServers: ['https://dex.binance.org']
}

const defaultSettings: any = {
  otherSettings
}

export const currencyInfo: EdgeCurrencyInfo = {
  // Basic currency information:
  currencyCode: 'BNB',
  displayName: 'Binance Chain',
  pluginId: 'binance',
  walletType: 'wallet:binance',

  defaultSettings,

  addressExplorer: 'https://explorer.binance.org/address/%s',
  transactionExplorer: 'https://explorer.binance.org/tx/%s',
  blockExplorer: 'https://explorer.binance.org/block/%s',

  denominations: [
    // An array of Objects of the possible denominations for this currency
    {
      name: 'BNB',
      multiplier: '100000000',
      symbol: 'B'
    }
  ],
  symbolImage: `${imageServerUrl}/binance-coin-logo-solo-64.png`,
  symbolImageDarkMono: `${imageServerUrl}/binance-coin-logo-solo-64.png`,
  metaTokens: []
}
