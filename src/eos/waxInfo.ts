import { EdgeCurrencyInfo } from 'edge-core-js/types'

import { makeOuterPlugin } from '../common/innerPlugin'
import type { EosTools } from './eosPlugin'
import { EosNetworkInfo, eosOtherMethodNames } from './eosTypes'

// ----WAX MAIN NET----
export const waxNetworkInfo: EosNetworkInfo = {
  chainId: '1064487b3cd1a897ce03ae5b6a865651747e2e152090f99c1d19d44e01aea5a4', // Wax main net

  createAccountViaSingleApiEndpoints: [
    'https://edge.maltablock.org/api/v1/activateAccount'
  ],
  eosActivationServers: [],
  eosDfuseServers: [],
  eosFuelServers: [], // this will need to be fixed
  eosHyperionNodes: ['https://api.waxsweden.org'],
  eosNodes: ['https://api.waxsweden.org'],
  uriProtocol: 'wax'
}

const denominations = [
  // An array of Objects of the possible denominations for this currency
  {
    name: 'WAX',
    multiplier: '100000000',
    symbol: 'W'
  }
]

export const waxCurrencyInfo: EdgeCurrencyInfo = {
  // Basic currency information:
  currencyCode: 'WAX',
  displayName: 'Wax',
  pluginId: 'wax',
  walletType: 'wallet:wax',

  defaultSettings: {},

  memoMaxLength: 256,

  addressExplorer: 'https://wax.bloks.io/account/%s',
  transactionExplorer: 'https://wax.bloks.io/transaction/%s',

  denominations,
  metaTokens: []
}

export const wax = makeOuterPlugin<EosNetworkInfo, EosTools>({
  currencyInfo: waxCurrencyInfo,
  networkInfo: waxNetworkInfo,
  otherMethodNames: eosOtherMethodNames,

  async getInnerPlugin() {
    return await import('./eosPlugin')
  }
})
