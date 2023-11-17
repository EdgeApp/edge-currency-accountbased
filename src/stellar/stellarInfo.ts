import { EdgeCurrencyInfo } from 'edge-core-js/types'

import { makeOuterPlugin } from '../common/innerPlugin'
import type { StellarTools } from './StellarTools'
import type { StellarNetworkInfo } from './stellarTypes'

const networkInfo: StellarNetworkInfo = {
  baseReserve: '10000000',
  stellarServers: ['https://horizon.stellar.org']
}

const currencyInfo: EdgeCurrencyInfo = {
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

  // https://developers.stellar.org/docs/encyclopedia/memos
  memoOptions: [
    { type: 'text', maxLength: 28 },
    { type: 'number', maxValue: '18446744073709551615' },
    { type: 'hex', maxBytes: 32, minBytes: 32 }
    // We also support a transaction ID for returned funds
  ],
  multipleMemos: true,

  // Deprecated:
  defaultSettings: {},
  memoMaxLength: 19,
  memoType: 'text',
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
