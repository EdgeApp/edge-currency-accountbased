import { EdgeCurrencyInfo } from 'edge-core-js/types'

import { makeOuterPlugin } from '../../common/innerPlugin'
import type { PolkadotTools } from '../PolkadotTools'
import {
  asPolkadotInfoPayload,
  PolkadotInfoPayload,
  PolkadotNetworkInfo
} from '../polkadotTypes'

const networkInfo: PolkadotNetworkInfo = {
  rpcNodes: ['wss://polkadot-asset-hub-rpc.polkadot.io'],
  ss58Format: 0,
  subscanBaseUrls: [
    'https://polkadot.api.subscan.io/api',
    'https://assethub-polkadot.api.subscan.io/api'
  ],
  subscanQueryLimit: 100,
  partialFeeOffsetMultiplier: '1',
  lengthFeePerByte: '1000000',
  liberlandScanUrl: undefined
}

const currencyInfo: EdgeCurrencyInfo = {
  currencyCode: 'DOT',
  assetDisplayName: 'Polkadot',
  chainDisplayName: 'Polkadot',
  pluginId: 'polkadot',
  walletType: 'wallet:polkadot',

  // Explorers:
  addressExplorer: 'https://assethub-polkadot.subscan.io/account/%s',
  transactionExplorer: 'https://assethub-polkadot.subscan.io/extrinsic/%s',

  denominations: [
    {
      name: 'DOT',
      multiplier: '10000000000',
      symbol: ''
    }
  ],

  // No memo support:
  memoOptions: [],

  // Deprecated:
  displayName: 'Polkadot'
}

export const polkadot = makeOuterPlugin<
  PolkadotNetworkInfo,
  PolkadotTools,
  PolkadotInfoPayload
>({
  currencyInfo,
  asInfoPayload: asPolkadotInfoPayload,
  networkInfo,

  checkEnvironment: () => {
    if (global.BigInt == null) {
      throw new Error('Polkadot requires bigint support')
    }
  },

  async getInnerPlugin() {
    return await import(
      /* webpackChunkName: "polkadot" */
      '../PolkadotTools'
    )
  }
})
