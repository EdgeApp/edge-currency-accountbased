/**
 * Created by on 2020-02-14
 */
/* global fetch */
// @flow

import {
  type EdgeCorePluginOptions,
  type EdgeCurrencyInfo
} from 'edge-core-js/types'

import { imageServerUrl } from '../common/utils'
import { makeEosBasedPluginInner } from './eosPlugin'
import { type EosJsConfig, type EosSettings } from './eosTypes'

// ----EOSIO MAIN NET----
export const eosJsConfig: EosJsConfig = {
  chainId: 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906', // eosio main net
  keyProvider: [],
  httpEndpoint: '', // main net
  fetch: fetch,
  verbose: false // verbose logging such as API activity
}

const otherSettings: EosSettings = {
  eosActivationServers: ['https://eospay.edge.app'],
  eosHyperionNodes: ['https://api.eossweden.org', 'https://mainnet.eosn.io'],
  eosNodes: [
    'https://api.eoseoul.io',
    'https://api.eoslaomao.com',
    'https://mainnet.eoscannon.io',
    'https://api.eos.wiki',
    'https://mainnet.eosio.sg',
    'https://eos.newdex.one',
    'https://api.bitmars.one',
    'https://node1.zbeos.com',
    'https://api.eosn.io'
  ],
  eosFuelServers: ['https://eos.greymass.com'],
  uriProtocol: 'eos'
}

const defaultSettings: any = {
  otherSettings
}

export const eosCurrencyInfo: EdgeCurrencyInfo = {
  // Basic currency information:
  currencyCode: 'EOS',
  displayName: 'EOS',
  pluginId: 'eos',
  pluginName: 'eos',
  walletType: 'wallet:eos',

  defaultSettings,

  addressExplorer: 'https://bloks.io/account/%s',
  transactionExplorer: 'https://bloks.io/transaction/%s',

  denominations: [
    // An array of Objects of the possible denominations for this currency
    {
      name: 'EOS',
      multiplier: '10000',
      symbol: 'E'
    }
  ],
  symbolImage: `${imageServerUrl}/eos-logo-solo-64.png`,
  symbolImageDarkMono: `${imageServerUrl}/eos-logo-solo-64.png`,
  metaTokens: []
}

export const makeEosPlugin = (opts: EdgeCorePluginOptions) => {
  return makeEosBasedPluginInner(opts, eosCurrencyInfo, eosJsConfig)
}
