import { EdgeCurrencyInfo, EdgeTokenMap } from 'edge-core-js/types'

import { makeOuterPlugin } from '../common/innerPlugin'
import { makeMetaTokens } from '../common/tokenHelpers'
import type { AlgorandTools } from './algorandPlugin'
import { AlgorandNetworkInfo } from './algorandTypes'

const builtinTokens: EdgeTokenMap = {
  '10458941': {
    currencyCode: 'USDC',
    displayName: 'USD Coin',
    denominations: [{ name: 'USDC', multiplier: '1000000' }],
    networkLocation: {
      assetIndex: '10458941'
    }
  }
}

const networkInfo: AlgorandNetworkInfo = {
  algodServers: ['https://testnet-api.algonode.cloud'],
  indexerServers: ['https://algoindexer.testnet.algoexplorerapi.io'],
  genesisID: 'testnet-v1.0',
  genesisHash: 'SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=',
  minimumTxFee: 1000,
  minimumAddressBalance: '100000' // 0.1 ALGO
}

const currencyInfo: EdgeCurrencyInfo = {
  // Basic currency information:
  currencyCode: 'ALGO',
  displayName: 'Algorand Testnet',
  pluginId: 'algorandtestnet',
  walletType: 'wallet:algorandtestnet',

  defaultSettings: { customFeeSettings: ['fee'] },

  memoType: 'text',

  addressExplorer: 'https://testnet.algoexplorer.io/address/%s',
  transactionExplorer: 'https://testnet.algoexplorer.io/tx/%s',

  denominations: [
    // An array of Objects of the possible denominations for this currency
    {
      name: 'ALGO',
      multiplier: '1000000',
      symbol: 'Ⱥ'
    }
  ],

  metaTokens: makeMetaTokens(builtinTokens) // Deprecated
}

export const algorandtestnet = makeOuterPlugin<
  AlgorandNetworkInfo,
  AlgorandTools
>({
  builtinTokens,
  currencyInfo,
  networkInfo,

  checkEnvironment: () => {
    if (global.BigInt == null) {
      throw new Error('Algorand Testnet requires bigint support')
    }
  },

  async getInnerPlugin() {
    return await import(
      /* webpackChunkName: "algorandtestnet" */
      './algorandPlugin'
    )
  }
})
