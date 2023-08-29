import { EdgeCurrencyInfo, EdgeTokenMap } from 'edge-core-js/types'

import { makeOuterPlugin } from '../../common/innerPlugin'
import { makeMetaTokens } from '../../common/tokenHelpers'
import type { PolkadotTools } from '../PolkadotTools'
import type { PolkadotNetworkInfo } from '../polkadotTypes'

const builtinTokens: EdgeTokenMap = {
  '1': {
    currencyCode: 'LLM',
    displayName: 'Liberland Merit',
    denominations: [{ name: 'LLM', multiplier: '1000000000000' }],
    networkLocation: {
      contractAddress: '1' // Assets pallet ID
    }
  }
}

const networkInfo: PolkadotNetworkInfo = {
  rpcNodes: ['wss://mainnet.liberland.org/'],
  subscanBaseUrl: '',
  subscanQueryLimit: 100,
  lengthFeePerByte: '1000000'
}

export const currencyInfo: EdgeCurrencyInfo = {
  currencyCode: 'LLD',
  displayName: 'Liberland',
  pluginId: 'liberland',
  walletType: 'wallet:liberland',

  addressExplorer: '',
  transactionExplorer:
    'https://polkadot.js.org/apps/?rpc=wss%%3A%%2F%%2Fmainnet.liberland.org%%2F#/explorer/query/%s',

  denominations: [
    {
      name: 'LLD',
      multiplier: '1000000000000',
      symbol: ''
    }
  ],

  // Deprecated
  defaultSettings: {},
  metaTokens: makeMetaTokens(builtinTokens) // Deprecated
}

export const liberland = makeOuterPlugin<PolkadotNetworkInfo, PolkadotTools>({
  builtinTokens,
  currencyInfo,
  networkInfo,

  checkEnvironment: () => {
    if (global.BigInt == null) {
      throw new Error('Liberland requires bigint support')
    }
  },

  async getInnerPlugin() {
    return await import('../PolkadotTools')
  }
})
