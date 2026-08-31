import { EdgeCurrencyInfo } from 'edge-core-js/types'

import { makeOuterPlugin } from '../common/innerPlugin'
import type { DashshieldedTools } from './DashshieldedTools'
import {
  asDashshieldedInfoPayload,
  DashshieldedInfoPayload,
  DashshieldedNetworkInfo
} from './dashshieldedTypes'

export const networkInfo: DashshieldedNetworkInfo = {
  rpcNode: {
    networkName: 'mainnet',
    defaultHost: 'seed-1.mainnet.networks.dash.org',
    defaultPort: 443
  },
  defaultNetworkFee: '200000000' // 2-action Platform minimum, credits
}

export const currencyInfo: EdgeCurrencyInfo = {
  currencyCode: 'DASH',
  assetDisplayName: 'Dash',
  chainDisplayName: 'Dash Shielded',
  pluginId: 'dashshielded',
  requiredConfirmations: 1,
  syncDisplayPrecision: 6,
  unsafeBroadcastTx: true,
  unsafeSyncNetwork: true,
  walletType: 'wallet:dashshielded',

  addressExplorer: '',
  transactionExplorer: '',

  denominations: [
    {
      name: 'DASH',
      multiplier: '100000000000',
      symbol: 'Ð'
    }
  ],

  memoOptions: [{ type: 'text', maxLength: 32 }],

  displayName: 'Dash Shielded'
}

export const dashshielded = makeOuterPlugin<
  DashshieldedNetworkInfo,
  DashshieldedTools,
  DashshieldedInfoPayload
>({
  currencyInfo,
  asInfoPayload: asDashshieldedInfoPayload,
  networkInfo,

  async getInnerPlugin() {
    return await import(
      /* webpackChunkName: "dashshielded" */
      './DashshieldedTools'
    )
  }
})
