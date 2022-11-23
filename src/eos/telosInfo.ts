import { EdgeCorePluginOptions, EdgeCurrencyInfo } from 'edge-core-js/types'

import { makeEosBasedPluginInner } from './eosPlugin'
import { EosNetworkInfo } from './eosTypes'

// ----TELOS MAIN NET----
export const telosNetworkInfo: EosNetworkInfo = {
  chainId: '4667b205c6838ef70ff7988f6e8257e8be0e1284a2f59699054a018f743b1d11', // Telos main net

  eosActivationServers: [
    'https://eospay.edge.app',
    'https://account.teloscrew.com'
  ],
  eosHyperionNodes: ['https://telos.caleos.io'],
  eosNodes: ['https://telos.caleos.io'],
  eosFuelServers: [], // this will need to be fixed
  eosDfuseServers: [],
  uriProtocol: 'telos'
}

const denominations = [
  {
    name: 'TLOS',
    multiplier: '10000',
    symbol: 'T'
  }
]

export const telosCurrencyInfo: EdgeCurrencyInfo = {
  // Basic currency information:
  currencyCode: 'TLOS',
  displayName: 'Telos',
  pluginId: 'telos',
  walletType: 'wallet:telos',

  defaultSettings: {},

  memoMaxLength: 256,

  addressExplorer: 'https://telos.bloks.io/account/%s',
  transactionExplorer: 'https://telos.bloks.io/transaction/%s',

  denominations,
  metaTokens: []
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const makeTelosPlugin = (opts: EdgeCorePluginOptions) => {
  return makeEosBasedPluginInner(opts, telosCurrencyInfo, telosNetworkInfo)
}
