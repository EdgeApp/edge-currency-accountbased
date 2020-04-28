/**
 * Created by Kylan on 2020-02-14
 */
/* global fetch */
// @flow

import {
  type EdgeCorePluginOptions,
  type EdgeCurrencyInfo
} from 'edge-core-js/types'

import { imageServerUrl } from '../common/utils'
import { makeEosBasedPluginInner } from './eosBasedPlugin'
import { type EosJsConfig, type EosSettings } from './eosTypes'

// ----TELOS MAIN NET----
export const eosJsConfig: EosJsConfig = {
  chainId: '4667b205c6838ef70ff7988f6e8257e8be0e1284a2f59699054a018f743b1d11', // Telos main net
  keyProvider: [],
  httpEndpoint: '', // main net
  fetch: fetch,
  verbose: false // verbose logging such as API activity
}

const otherSettings: EosSettings = {
  eosActivationServers: ['http://localhost:80'],
  // used for the following routines, is Hyperion v2:

  // getIncomingTransactions
  // `/v2/history/get_transfers?to=${acct}&symbol=${currencyCode}&skip=${skip}&limit=${limit}&sort=desc`

  // getOutgoingTransactions
  // `/v2/history/get_actions?transfer.from=${acct}&transfer.symbol=${currencyCode}&skip=${skip}&limit=${limit}&sort=desc`

  // getKeyAccounts
  // `${server}/v2/state/get_key_accounts?public_key=${params[0]}`

  eosHyperionNodes: [
    'https://mainnet.telosusa.io',
    'https://telos.caleos.io',
    'https://telos.eosphere.io',
    'https://api-telos-21zephyr.maltablock.org/'
  ],

  // used for eosjs fetch routines
  // getCurrencyBalance
  // getInfo
  // transaction
  eosNodes: ['https://telos.caleos.io'],
  eosFuelServers: ['https://eos.greymass.com'] // this will need to be fixed
}

const defaultSettings: any = {
  otherSettings
}

export const telosCurrencyInfo: EdgeCurrencyInfo = {
  // Basic currency information:
  currencyCode: 'TLOS',
  displayName: 'Telos',
  pluginName: 'telos',
  // do we need plugin name?
  walletType: 'wallet:telos',

  defaultSettings,

  addressExplorer: 'https://telos.eosx.io/account/%s',
  transactionExplorer: 'https://telos.eosx.io/tx/%s?listView=traces',

  denominations: [
    // An array of Objects of the possible denominations for this currency
    {
      name: 'TLOS',
      multiplier: '10000',
      symbol: 'T'
    }
  ],
  symbolImage: `${imageServerUrl}/telos-logo-solo-64.png`,
  symbolImageDarkMono: `${imageServerUrl}/telos-logo-solo-64.png`,
  metaTokens: []
}

export const makeTelosPlugin = (opts: EdgeCorePluginOptions) => {
  return makeEosBasedPluginInner(opts, telosCurrencyInfo, eosJsConfig)
}
