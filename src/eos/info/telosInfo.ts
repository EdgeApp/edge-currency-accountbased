import { EdgeCurrencyInfo } from 'edge-core-js/types'

import { makeOuterPlugin } from '../../common/innerPlugin'
import type { EosTools } from '../EosTools'
import type { EosNetworkInfo } from '../eosTypes'
import { eosOtherMethodNames } from '../eosTypes'

// ----TELOS MAIN NET----
export const telosNetworkInfo: EosNetworkInfo = {
  chainId: '4667b205c6838ef70ff7988f6e8257e8be0e1284a2f59699054a018f743b1d11', // Telos main net

  eosActivationServers: [
    'https://eospay.edge.app',
    'https://account.teloscrew.com'
  ],
  eosHyperionNodes: ['https://telos.caleos.io'],
  eosNodes: ['https://telos.caleos.io'],
  powerUpServers: [],
  eosDfuseServers: [],
  uriProtocol: 'telos'
}

export const telosCurrencyInfo: EdgeCurrencyInfo = {
  currencyCode: 'TLOS',
  displayName: 'Telos',
  pluginId: 'telos',
  walletType: 'wallet:telos',

  // Explorers:
  addressExplorer: 'https://telos.bloks.io/account/%s',
  transactionExplorer: 'https://telos.bloks.io/transaction/%s',

  denominations: [
    {
      name: 'TLOS',
      multiplier: '10000',
      symbol: 'T'
    }
  ],

  // Deprecated:
  defaultSettings: {},
  memoMaxLength: 256,
  metaTokens: []
}

export const telos = makeOuterPlugin<EosNetworkInfo, EosTools>({
  currencyInfo: telosCurrencyInfo,
  networkInfo: telosNetworkInfo,
  otherMethodNames: eosOtherMethodNames,

  async getInnerPlugin() {
    return await import('../EosTools')
  }
})
