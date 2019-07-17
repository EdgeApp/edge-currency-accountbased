/* global */
// @flow

import type { EdgeCurrencyInfo } from 'edge-core-js/types'

import type { BinanceSettings } from './bnbTypes.js'

export const imageServerUrl = 'https://developer.airbitz.co/content'

const otherSettings: BinanceSettings = {
  binanceApiServers: ['https://dex.binance.org']
}

const defaultSettings: any = {
  // customFeeSettings: ['gasLimit', 'gasPrice'],
  otherSettings
}

export const currencyInfo: EdgeCurrencyInfo = {
  // Basic currency information:
  currencyCode: 'BNB',
  displayName: 'Binance Chain',
  pluginName: 'binance',
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
  symbolImage: `${imageServerUrl}/ethereum-logo-solo-64.png`,
  symbolImageDarkMono: `${imageServerUrl}/ethereum-logo-solo-64.png`,
  metaTokens: []
}
