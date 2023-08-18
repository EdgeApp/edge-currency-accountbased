import { EdgeCurrencyInfo } from 'edge-core-js/types'

import { makeOuterPlugin } from '../common/innerPlugin'
import type { StellarTools } from './StellarTools'
import type { StellarNetworkInfo } from './stellarTypes'

const networkInfo: StellarNetworkInfo = {
  baseReserve: '10000000',
  stellarServers: ['https://horizon.stellar.org']
}

export const currencyInfo: EdgeCurrencyInfo = {
  currencyCode: 'XLM',
  displayName: 'Stellar',
  pluginId: 'stellar',
  walletType: 'wallet:stellar',

  // Explorers:
  addressExplorer: 'https://stellarchain.io/address/%s',
  transactionExplorer: 'https://stellarchain.io/tx/%s',

  denominations: [
    {
      name: 'XLM',
      multiplier: '10000000',
      symbol: '*'
    }
  ],

  // Deprecated:
  defaultSettings: {},
  memoMaxLength: 19,
  metaTokens: []
}

export const stellar = makeOuterPlugin<StellarNetworkInfo, StellarTools>({
  currencyInfo,
  networkInfo,

  async getInnerPlugin() {
    return await import(
      /* webpackChunkName: "stellar" */
      './StellarTools'
    )
  }
})
