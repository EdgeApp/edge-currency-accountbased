import { EdgeCurrencyInfo, EdgeTokenMap } from 'edge-core-js/types'

import { makeOuterPlugin } from '../common/innerPlugin'
import { makeMetaTokens } from '../common/tokenHelpers'
import type { AlgorandTools } from './AlgorandTools'
import {
  AlgorandInfoPayload,
  AlgorandNetworkInfo,
  asAlgorandInfoPayload
} from './algorandTypes'

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
  assetDisplayName: 'Algorand',
  chainDisplayName: 'Algorand',
  pluginId: 'algorand',
  walletType: 'wallet:algorand',

  // Explorers:
  addressExplorer: 'https://allo.info/account/%s',
  transactionExplorer: 'https://allo.info/tx/%s',

  customFeeTemplate: [
    {
      displayName: 'Fee',
      key: 'fee',
      type: 'string'
    }
  ],
  customTokenTemplate: [
    {
      displayName: 'Contract Address',
      key: 'contractAddress',
      type: 'string'
    }
  ],
  denominations: [
    {
      name: 'ALGO',
      multiplier: '1000000',
      symbol: 'Ⱥ'
    }
  ],

  // https://developer.algorand.org/docs/get-details/transactions/transactions/
  memoOptions: [{ type: 'text', memoName: 'note', maxLength: 1000 }],

  // Deprecated:
  defaultSettings: { customFeeSettings: ['fee'] },
  displayName: 'Algorand',
  metaTokens: makeMetaTokens(builtinTokens)
}

export const algorand = makeOuterPlugin<
  AlgorandNetworkInfo,
  AlgorandTools,
  AlgorandInfoPayload
>({
  builtinTokens,
  currencyInfo,
  asInfoPayload: asAlgorandInfoPayload,
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
