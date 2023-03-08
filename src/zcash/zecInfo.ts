import { EdgeCurrencyInfo } from 'edge-core-js/types'

import { makeOuterPlugin } from '../common/innerPlugin'
import type { ZcashTools } from './zecPlugin'
import type { ZcashNetworkInfo } from './zecTypes'

const networkInfo: ZcashNetworkInfo = {
  rpcNode: {
    networkName: 'mainnet',
    defaultHost: 'mainnet.lightwalletd.com',
    defaultPort: 9067
  },
  defaultBirthday: 1310000,
  defaultNetworkFee: '1000', // hardcoded default ZEC fee
  nativeSdk: 'zcash',
  transactionQueryLimit: 999
}

export const currencyInfo: EdgeCurrencyInfo = {
  // Basic currency information:
  currencyCode: 'ZEC',
  displayName: 'Zcash',
  pluginId: 'zcash',
  requiredConfirmations: 10,
  walletType: 'wallet:zcash',

  defaultSettings: {},

  addressExplorer: 'https://blockchair.com/zcash/address/%s?from=edgeapp',
  transactionExplorer:
    'https://blockchair.com/zcash/transaction/%s?from=edgeapp',

  denominations: [
    // An array of Objects of the possible denominations for this currency
    {
      name: 'ZEC',
      multiplier: '100000000',
      symbol: 'Z'
    }
  ],
  metaTokens: [] // Deprecated
}

export const zcash = makeOuterPlugin<ZcashNetworkInfo, ZcashTools>({
  currencyInfo,
  networkInfo,

  async getInnerPlugin() {
    return await import(
      /* webpackChunkName: "zcash" */
      './zecPlugin'
    )
  }
})
