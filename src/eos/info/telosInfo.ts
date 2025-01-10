import { EdgeCurrencyInfo } from 'edge-core-js/types'

import { makeOuterPlugin } from '../../common/innerPlugin'
import type { EosTools } from '../EosTools'
import {
  asEosInfoPayload,
  EosInfoPayload,
  EosNetworkInfo,
  eosOtherMethodNames
} from '../eosTypes'
import { eosCustomTokenTemplate, eosMemoOptions } from './eosCommonInfo'

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
  customTokenTemplate: eosCustomTokenTemplate,
  assetDisplayName: 'Telos',
  chainDisplayName: 'Telos',
  memoOptions: eosMemoOptions,
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
  displayName: 'Telos'
}

export const telos = makeOuterPlugin<EosNetworkInfo, EosTools, EosInfoPayload>({
  currencyInfo: telosCurrencyInfo,
  asInfoPayload: asEosInfoPayload,
  networkInfo: telosNetworkInfo,
  otherMethodNames: eosOtherMethodNames,

  async getInnerPlugin() {
    return await import('../EosTools')
  }
})
