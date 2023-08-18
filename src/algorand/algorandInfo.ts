import { EdgeCurrencyInfo, EdgeTokenMap } from 'edge-core-js/types'

import { makeOuterPlugin } from '../common/innerPlugin'
import { makeMetaTokens } from '../common/tokenHelpers'
import type { AlgorandTools } from './AlgorandTools'
import { AlgorandNetworkInfo } from './algorandTypes'

const builtinTokens: EdgeTokenMap = {
  '31566704': {
    currencyCode: 'USDC',
    displayName: 'USD Coin',
    denominations: [{ name: 'USDC', multiplier: '1000000' }],
    networkLocation: {
      contractAddress: '31566704' // assetIndex
    }
  }
}

const networkInfo: AlgorandNetworkInfo = {
  algodServers: [
    'https://mainnet-api.algonode.cloud',
    'http://node.algoexplorerapi.io',
    'https://xna-mainnet-api.algonode.cloud'
  ],
  indexerServers: [
    'https://mainnet-idx.algonode.cloud',
    'https://algoindexer.algoexplorerapi.io'
  ],
  genesisID: 'mainnet-v1.0',
  genesisHash: 'wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=',
  minimumTxFee: 1000,
  minimumAddressBalance: '100000' // 0.1 ALGO
}

const currencyInfo: EdgeCurrencyInfo = {
  currencyCode: 'ALGO',
  displayName: 'Algorand',
  pluginId: 'algorand',
  walletType: 'wallet:algorand',

  // Explorers:
  addressExplorer: 'https://algoexplorer.io/address/%s',
  transactionExplorer: 'https://algoexplorer.io/tx/%s',

  denominations: [
    {
      name: 'ALGO',
      multiplier: '1000000',
      symbol: 'Ⱥ'
    }
  ],

  // Deprecated:
  defaultSettings: { customFeeSettings: ['fee'] },
  memoType: 'text',
  metaTokens: makeMetaTokens(builtinTokens)
}

export const algorand = makeOuterPlugin<AlgorandNetworkInfo, AlgorandTools>({
  builtinTokens,
  currencyInfo,
  networkInfo,

  checkEnvironment: () => {
    if (global.BigInt == null) {
      throw new Error('Algorand requires bigint support')
    }
  },

  async getInnerPlugin() {
    return await import(
      /* webpackChunkName: "algorand" */
      './AlgorandTools'
    )
  }
})
