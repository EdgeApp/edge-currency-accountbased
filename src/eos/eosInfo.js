/* global */
// @flow

import { type EdgeCurrencyInfo } from 'edge-core-js/types'

import { type EosSettings } from './eosTypes.js'

const otherSettings: EosSettings = {
  eosHyperionNodes: ['https://eos.hyperion.eosrio.io'],
  eosActivationServers: ['https://eos-pay-sf2.edgesecure.co'],
  eosNodes: ['https://proxy.eosnode.tools']
}

const defaultSettings: any = {
  otherSettings
}

export const currencyInfo: EdgeCurrencyInfo = {
  // Basic currency information:
  currencyCode: 'EOS',
  displayName: 'EOS',
  pluginName: 'eos',
  walletType: 'wallet:eos',

  defaultSettings,

  addressExplorer: 'https://eospark.com/account/%s',
  transactionExplorer: 'https://eospark.com/tx/%s',

  denominations: [
    // An array of Objects of the possible denominations for this currency
    {
      name: 'EOS',
      multiplier: '10000',
      symbol: 'E'
    }
  ],
  symbolImage: 'https://developer.airbitz.co/content/eos-logo-solo-64.png',
  symbolImageDarkMono:
    'https://developer.airbitz.co/content/eos-logo-solo-64.png',
  metaTokens: []
}
