import { EdgeCurrencyInfo } from 'edge-core-js/types'

import { makeOuterPlugin } from '../common/innerPlugin'
import type { ZcashTools } from './ZcashTools'
import {
  asZcashInfoPayload,
  ZcashInfoPayload,
  ZcashNetworkInfo
} from './zcashTypes'

const networkInfo: ZcashNetworkInfo = {
  rpcNode: {
    networkName: 'testnet',
    defaultHost: 'testnet.zec.rocks',
    defaultPort: 443
  },
  defaultNetworkFee: '10000' // hardcoded default TAZ fee
}

const currencyInfo: EdgeCurrencyInfo = {
  currencyCode: 'TAZ',
  assetDisplayName: 'Zcash Testnet',
  chainDisplayName: 'Zcash Testnet',
  pluginId: 'zcashtestnet',
  requiredConfirmations: 10,
  syncDisplayPrecision: 6,
  unsafeBroadcastTx: true,
  unsafeSyncNetwork: true,
  walletType: 'wallet:zcashtestnet',

  // Explorers:
  addressExplorer: 'https://testnet.zecblock.com/address/%s',
  transactionExplorer: 'https://testnet.zecblock.com/tx/%s',

  denominations: [
    {
      name: 'TAZ',
      multiplier: '100000000',
      symbol: 'Z'
    }
  ],

  // https://zips.z.cash/zip-0302
  memoOptions: [{ type: 'text', maxLength: 512 }],

  // Deprecated:
  displayName: 'Zcash Testnet'
}

export const zcashtestnet = makeOuterPlugin<
  ZcashNetworkInfo,
  ZcashTools,
  ZcashInfoPayload
>({
  currencyInfo,
  asInfoPayload: asZcashInfoPayload,
  networkInfo,

  async getInnerPlugin() {
    return await import(
      /* webpackChunkName: "zcash" */
      './ZcashTools'
    )
  }
})
