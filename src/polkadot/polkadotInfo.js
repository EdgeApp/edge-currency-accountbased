/* global */
// @flow

import type {
  EdgeCorePluginOptions,
  EdgeCurrencyInfo
} from 'edge-core-js/types'

import { makePolkadotPluginInner } from './polkadotPlugin.js'
import type { PolkadotSettings } from './polkadotTypes.js'

const otherSettings: PolkadotSettings = {
  subscanBaseUrl: 'https://polkadot.api.subscan.io/api',
  subscanQueryLimit: 100
}

const defaultSettings: any = {
  otherSettings
}

export const currencyInfo: EdgeCurrencyInfo = {
  // Basic currency information:
  currencyCode: 'DOT',
  displayName: 'Polkadot',
  pluginId: 'polkadot',
  walletType: 'wallet:polkadot',

  defaultSettings,

  addressExplorer: 'https://blockchair.com/polkadot/address/%s?from=edgeapp',
  transactionExplorer:
    'https://blockchair.com/polkadot/transaction/%s?from=edgeapp',

  denominations: [
    // An array of Objects of the possible denominations for this currency
    {
      name: 'DOT',
      multiplier: '10000000000',
      symbol: ''
    }
  ],
  metaTokens: []
}

export const makePolkadotPlugin = (opts: EdgeCorePluginOptions) => {
  return makePolkadotPluginInner(opts, currencyInfo)
}
