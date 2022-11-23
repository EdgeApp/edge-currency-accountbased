import { EdgeCorePluginOptions, EdgeCurrencyInfo } from 'edge-core-js/types'

import { makeEosBasedPluginInner } from './eosPlugin'
import { EosNetworkInfo } from './eosTypes'

// ----EOSIO MAIN NET----
export const eosNetworkInfo: EosNetworkInfo = {
  chainId: 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906', // eosio main net

  eosActivationServers: ['https://eospay.edge.app'],
  eosHyperionNodes: ['https://api.eossweden.org'],
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
  eosDfuseServers: ['https://eos.dfuse.eosnation.io'],
  uriProtocol: 'eos'
}

const denominations = [
  // An array of Objects of the possible denominations for this currency
  {
    name: 'EOS',
    multiplier: '10000',
    symbol: 'E'
  }
]

export const eosCurrencyInfo: EdgeCurrencyInfo = {
  // Basic currency information:
  currencyCode: 'EOS',
  displayName: 'EOS',
  pluginId: 'eos',
  walletType: 'wallet:eos',

  defaultSettings: {},

  memoMaxLength: 256,

  addressExplorer: 'https://bloks.io/account/%s',
  transactionExplorer: 'https://bloks.io/transaction/%s',

  denominations,
  metaTokens: []
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const makeEosPlugin = (opts: EdgeCorePluginOptions) => {
  return makeEosBasedPluginInner(opts, eosCurrencyInfo, eosNetworkInfo)
}
