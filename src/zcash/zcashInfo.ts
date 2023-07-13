import { EdgeCurrencyInfo } from 'edge-core-js/types'

import { makeOuterPlugin } from '../common/innerPlugin'
import type { ZcashTools } from './ZcashTools'
import type { ZcashNetworkInfo } from './zcashTypes'

const networkInfo: ZcashNetworkInfo = {
  rpcNode: {
    networkName: 'mainnet',
    defaultHost: 'mainnet.lightwalletd.com',
    defaultPort: 9067
  },
  defaultBirthday: 1310000,
  defaultNetworkFee: '1000', // hardcoded default ZEC fee
  transactionQueryLimit: 999
}

export const currencyInfo: EdgeCurrencyInfo = {
  currencyCode: 'ZEC',
  displayName: 'Zcash',
  pluginId: 'zcash',
  requiredConfirmations: 10,
  unsafeBroadcastTx: true,
  walletType: 'wallet:zcash',

  // Explorers:
  addressExplorer: 'https://blockchair.com/zcash/address/%s?from=edgeapp',
  transactionExplorer:
    'https://blockchair.com/zcash/transaction/%s?from=edgeapp',

  denominations: [
    {
      name: 'ZEC',
      multiplier: '100000000',
      symbol: 'Z'
    }
  ],

  // https://zips.z.cash/zip-0302
  memoOptions: [{ type: 'text', maxLength: 512 }],

  // Deprecated:
  defaultSettings: {},
  metaTokens: []
}

export const zcash = makeOuterPlugin<ZcashNetworkInfo, ZcashTools>({
  currencyInfo,
  networkInfo,

  async getInnerPlugin() {
    return await import(
      /* webpackChunkName: "zcash" */
      './ZcashTools'
    )
  }
})
