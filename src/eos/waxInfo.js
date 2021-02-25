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

const denominations = [
  // An array of Objects of the possible denominations for this currency
  {
    name: 'WAX',
    multiplier: '100000000',
    symbol: 'W'
  }
]

// ----WAX MAIN NET----
export const eosJsConfig: EosJsConfig = {
  chainId: '1064487b3cd1a897ce03ae5b6a865651747e2e152090f99c1d19d44e01aea5a4', // Wax main net
  keyProvider: [],
  httpEndpoint: '', // main net
  fetch: fetch,
  verbose: false // verbose logging such as API activity
}

const otherSettings: EosSettings = {
  eosActivationServers: [],
  // used for the following routines, is Hyperion v2:

  // getIncomingTransactions
  // `/v2/history/get_transfers?to=${acct}&symbol=${currencyCode}&skip=${skip}&limit=${limit}&sort=desc`

  // getOutgoingTransactions
  // `/v2/history/get_actions?transfer.from=${acct}&transfer.symbol=${currencyCode}&skip=${skip}&limit=${limit}&sort=desc`

  // getKeyAccounts
  // `${server}/v2/state/get_key_accounts?public_key=${params[0]}`

  eosHyperionNodes: ['https://api.waxsweden.org'],

  // used for eosjs fetch routines
  // getCurrencyBalance
  // getInfo
  // transaction
  eosNodes: ['https://api.waxsweden.org'],
  eosFuelServers: [], // this will need to be fixed
  eosDfuseServers: [],
  uriProtocol: 'wax',
  createAccountViaSingleApiEndpoints: [
    'https://edge.maltablock.org/api/v1/activateAccount'
  ]
}

const defaultSettings: any = {
  otherSettings
}

export const waxCurrencyInfo: EdgeCurrencyInfo = {
  // Basic currency information:
  currencyCode: 'WAX',
  displayName: 'Wax',
  pluginId: 'wax',
  pluginName: 'wax',
  // do we need plugin name?
  walletType: 'wallet:wax',

  defaultSettings,

  addressExplorer: 'https://wax.bloks.io/account/%s',
  transactionExplorer: 'https://wax.bloks.io/transaction/%s',

  denominations,
  symbolImage: `${imageServerUrl}/wax-logo-solo-64.png`,
  symbolImageDarkMono: `${imageServerUrl}/wax-logo-solo-64.png`,
  metaTokens: [
    {
      name: 'WAX',
      currencyName: 'WAX',
      multiplier: '100000000',
      symbol: 'W',
      currencyCode: 'WAX',
      contractAddress: 'eosio.token',
      denominations
    }
  ]
}

export const makeWaxPlugin = (opts: EdgeCorePluginOptions) => {
  return makeEosBasedPluginInner(opts, waxCurrencyInfo, eosJsConfig)
}
