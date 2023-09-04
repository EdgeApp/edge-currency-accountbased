import { EdgeCurrencyInfo } from 'edge-core-js/types'

import { makeOuterPlugin } from '../../common/innerPlugin'
import type { PolkadotTools } from '../PolkadotTools'
import type { PolkadotNetworkInfo } from '../polkadotTypes'

const networkInfo: PolkadotNetworkInfo = {
  rpcNodes: ['wss://rpc.polkadot.io'],
  subscanBaseUrl: 'https://polkadot.api.subscan.io/api',
  subscanQueryLimit: 100,
  partialFeeOffsetMultiplier: '1',
  lengthFeePerByte: '1000000'
}

export const currencyInfo: EdgeCurrencyInfo = {
  // Basic currency information:
  currencyCode: 'DOT',
  displayName: 'Polkadot',
  pluginId: 'polkadot',
  walletType: 'wallet:polkadot',

  defaultSettings: {},

  addressExplorer: 'https://polkadot.subscan.io/account/%s',
  transactionExplorer: 'https://polkadot.subscan.io/extrinsic/%s',

  denominations: [
    // An array of Objects of the possible denominations for this currency
    {
      name: 'DOT',
      multiplier: '10000000000',
      symbol: ''
    }
  ],
  metaTokens: [] // Deprecated
}

export const polkadot = makeOuterPlugin<PolkadotNetworkInfo, PolkadotTools>({
  currencyInfo,
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
