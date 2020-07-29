/* global */
// @flow

import { Unit } from '@harmony-js/utils'
import { type EdgeCurrencyInfo } from 'edge-core-js/types'

import { type OneSettings } from './oneTypes.js'

export const GAS_PRICE = new Unit('1').asGwei().toHex()
export const GAS_LIMIT = new Unit('21000').asWei().toHex()

const otherSettings: OneSettings = {
  oneServers: [
    'https://api.s0.t.hmny.io',
    'https://api0.s0.t.hmny.io',
    'https://api1.s0.t.hmny.io'
  ]
}

const defaultSettings: any = {
  otherSettings
}

export const currencyInfo: EdgeCurrencyInfo = {
  // Basic currency information:
  currencyCode: 'ONE',
  displayName: 'Harmony',
  pluginName: 'one',
  walletType: 'wallet:one',

  defaultSettings,

  addressExplorer: 'https://explorer.harmony.one/#/address/%s',
  transactionExplorer: 'https://explorer.harmony.one/#/tx/%s',

  denominations: [
    // An array of Objects of the possible denominations for this currency
    {
      name: 'ONE',
      multiplier: '1000000000000000000',
      symbol: 'ONE'
    }
  ],
  symbolImage: `https://s2.coinmarketcap.com/static/img/coins/64x64/3945.png`,
  symbolImageDarkMono: `https://s2.coinmarketcap.com/static/img/coins/64x64/3945.png`,
  metaTokens: []
}
