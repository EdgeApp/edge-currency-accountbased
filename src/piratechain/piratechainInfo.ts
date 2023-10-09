/* global */

import { EdgeCurrencyInfo } from 'edge-core-js/types'

import { makeOuterPlugin } from '../common/innerPlugin'
import { PiratechainTools } from './PiratechainTools'
import { PiratechainNetworkInfo } from './piratechainTypes'

const networkInfo: PiratechainNetworkInfo = {
  rpcNode: {
    networkName: 'mainnet',
    defaultHost: 'piratelightd1.cryptoforge.cc',
    defaultPort: 443
  },
  defaultBirthday: 2040000,
  defaultNetworkFee: '10000',
  transactionQueryLimit: 999
}

const currencyInfo: EdgeCurrencyInfo = {
  currencyCode: 'ARRR',
  displayName: 'Pirate Chain',
  pluginId: 'piratechain',
  requiredConfirmations: 10,
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
  defaultSettings: {},
  metaTokens: []
}

export const piratechain = makeOuterPlugin<
  PiratechainNetworkInfo,
  PiratechainTools
>({
  currencyInfo,
  networkInfo,

  async getInnerPlugin() {
    /* webpackChunkName: "piratechain" */
    return await import('./PiratechainTools')
  }
})
