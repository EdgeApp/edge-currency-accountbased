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
import { type EosSettings } from './eosTypes.js'

// ----TELOS MAIN NET----
export const eosJsConfig = {
  chainId: '4667b205c6838ef70ff7988f6e8257e8be0e1284a2f59699054a018f743b1d11', // main net
  keyProvider: [],
  httpEndpoint: '', // main net
  fetch: fetch,
  expireInSeconds: 60,
  sign: false, // sign the transaction with a private key. Leaving a transaction unsigned avoids the need to provide a private key
  broadcast: false, // post the transaction to the blockchain. Use false to obtain a fully signed transaction
  verbose: false // verbose logging such as API activity
}

const otherSettings: EosSettings = {
  eosActivationServers: ['https://eos-pay-sf2.edgesecure.co'],
  // used for the following routines, is Hyperion v2:

  // getIncomingTransactions
  // `/v2/history/get_transfers?to=${acct}&symbol=${currencyCode}&skip=${skip}&limit=${limit}&sort=desc`

  // getOutgoingTransactions
  // `/v2/history/get_actions?transfer.from=${acct}&transfer.symbol=${currencyCode}&skip=${skip}&limit=${limit}&sort=desc`

  // getKeyAccounts
  // `${server}/v2/state/get_key_accounts?public_key=${params[0]}`

  eosHyperionNodes: [
    'https://mainnet.telosusa.io', // v2
    'https://telos.eosphere.io',
    'https://api-telos-21zephyr.maltablock.org',
    'https://hyperion.telos.eosdetroit.io'
  ],

  // used for eosjs fetch routines
  // getCurrencyBalance
  // getInfo
  // transaction
  eosNodes: [
    'https://api.telos.alohaeos.com',
    'https://telosapi.atticlab.net',
    'https://telos.caleos.io',
    'https://telos.cryptolions.io',
    'https://telos.cryptosuvi.io',
    'https://telos-bp.dmail.co',
    'https://telos.eos.barcelona',
    'https://telos.eosdublin.io',
    'https://telosapi.eosmetal.io',
    'https://telos.eosphere.io',
    'https://telos.eosrio.io',
    'https://api.telos.eostribe.io',
    'https://telos.eosvibes.io',
    'https://api.telos.africa',
    'https://telos.eossweden.eu',
    'https://api.mainnet.bp.teleology.world:8000',
    'https://api.telosarabia.net',
    'https://api.telosgermany.io',
    'https://api.telos.telosgreen.com',
    'https://api.telosmadrid.io',
    'https://api.eos.miami',
    'https://api.telosuk.io',
    'https://api.eosimpera.com',
    'https://telos.get-scatter.com'
  ],
  eosJsConfig
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
  return makeEosBasedPluginInner(opts, telosCurrencyInfo)
}
