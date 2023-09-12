/* global */

import { EdgeCurrencyInfo } from 'edge-core-js/types'

import { makeOuterPlugin } from '../common/innerPlugin'
import { ZcashTools } from './ZcashTools'
import { ZcashNetworkInfo } from './zcashTypes'

const networkInfo: ZcashNetworkInfo = {
  rpcNode: {
    networkName: 'mainnet',
    defaultHost: 'lightd1.pirate.black',
    defaultPort: 443
  },
  defaultBirthday: 2040000,
  defaultNetworkFee: '10000',
  nativeSdk: 'piratechain',
  transactionQueryLimit: 999
}

const currencyInfo: EdgeCurrencyInfo = {
  currencyCode: 'ARRR',
  displayName: 'Pirate Chain',
  pluginId: 'piratechain',
  requiredConfirmations: 10,
  unsafeBroadcastTx: true,
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
  defaultSettings: {},
  metaTokens: []
}

export const piratechain = makeOuterPlugin<ZcashNetworkInfo, ZcashTools>({
  currencyInfo,
  networkInfo,

  async getInnerPlugin() {
    return await import('./ZcashTools')
  }
})
