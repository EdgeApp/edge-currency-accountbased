/* global */

import { EdgeCurrencyInfo } from 'edge-core-js/types'

import { makeOuterPlugin } from '../common/innerPlugin'
import type { PiratechainTools } from './PiratechainTools'
import {
  asPiratechainInfoPayload,
  PiratechainInfoPayload,
  PiratechainNetworkInfo
} from './piratechainTypes'

const networkInfo: PiratechainNetworkInfo = {
  rpcNode: {
    networkName: 'mainnet',
    defaultHost: 'lightd1.pirate.black',
    defaultPort: 443
  },
  defaultNetworkFee: '10000',
  transactionQueryLimit: 999
}

const currencyInfo: EdgeCurrencyInfo = {
  currencyCode: 'ARRR',
  assetDisplayName: 'Pirate Chain',
  chainDisplayName: 'Pirate Chain',
  pluginId: 'piratechain',
  requiredConfirmations: 10,
  syncDisplayPrecision: 6,
  unsafeBroadcastTx: true,
  unsafeSyncNetwork: true,
  walletType: 'wallet:piratechain',

  // Explorers:
  addressExplorer: '',
  transactionExplorer: 'https://explorer.pirate.black/tx/%s',

  denominations: [
    {
      name: 'ARRR',
      multiplier: '100000000',
      symbol: 'P'
    }
  ],

  // Copied from Zcash:
  memoOptions: [{ type: 'text', maxLength: 512 }],

  // Deprecated:
  displayName: 'Pirate Chain'
}

export const piratechain = makeOuterPlugin<
  PiratechainNetworkInfo,
  PiratechainTools,
  PiratechainInfoPayload
>({
  currencyInfo,
  asInfoPayload: asPiratechainInfoPayload,
  networkInfo,

  async getInnerPlugin() {
    /* webpackChunkName: "piratechain" */
    return await import('./PiratechainTools')
  }
})
