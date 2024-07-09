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

// ----WAX MAIN NET----
export const waxNetworkInfo: EosNetworkInfo = {
  chainId: '1064487b3cd1a897ce03ae5b6a865651747e2e152090f99c1d19d44e01aea5a4', // Wax main net
  eosActivationServers: [],
  eosDfuseServers: [],
  eosHyperionNodes: ['https://api.waxsweden.org'],
  eosNodes: ['https://api.waxsweden.org'],
  powerUpServers: [],
  uriProtocol: 'wax'
}

export const waxCurrencyInfo: EdgeCurrencyInfo = {
  currencyCode: 'WAX',
  customTokenTemplate: eosCustomTokenTemplate,
  displayName: 'Wax',
  memoOptions: eosMemoOptions,
  pluginId: 'wax',
  walletType: 'wallet:wax',

  // Explorers:
  addressExplorer: 'https://wax.bloks.io/account/%s',
  transactionExplorer: 'https://wax.bloks.io/transaction/%s',

  denominations: [
    {
      name: 'WAX',
      multiplier: '100000000',
      symbol: 'W'
    }
  ]
}

export const wax = makeOuterPlugin<EosNetworkInfo, EosTools, EosInfoPayload>({
  currencyInfo: waxCurrencyInfo,
  asInfoPayload: asEosInfoPayload,
  networkInfo: waxNetworkInfo,
  otherMethodNames: eosOtherMethodNames,

  async getInnerPlugin() {
    return await import('../EosTools')
  }
})
