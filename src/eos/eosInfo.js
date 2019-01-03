/* global */
// @flow

import { type EdgeCurrencyInfo } from 'edge-core-js'
import { type EosSettings } from './eosTypes.js'

const otherSettings: EosSettings = {
  eosCryptoLionsNodes: ['https://history.cryptolions.io'],
  eosActivationServers: ['https://eos-pay-sf2.edgesecure.co'],
  eosNodes: ['https://proxy.eosnode.tools']
}

const defaultSettings: any = {
  otherSettings
}

export const currencyInfo: EdgeCurrencyInfo = {
  // Basic currency information:
  currencyCode: 'EOS',
  currencyName: 'EOS',
  pluginName: 'eos',
  walletTypes: ['wallet:eos'],

  defaultSettings,

  addressExplorer: 'https://www.fixme.com/address/%s',
  transactionExplorer: 'https://www.fixme.com/transactions/%s',

  denominations: [
    // An array of Objects of the possible denominations for this currency
    {
      name: 'EOS',
      multiplier: '10000',
      symbol: 'E'
    },
    {
      name: 'dEOS',
      multiplier: '1000',
      symbol: 'dE'
    }
  ],
  symbolImage: 'https://developer.airbitz.co/content/eos-logo-solo-64.png',
  symbolImageDarkMono:
    'https://developer.airbitz.co/content/eos-logo-solo-64.png',
  metaTokens: []
}
