import { EdgeCurrencyInfo, EdgeTokenMap } from 'edge-core-js/types'

import { makeOuterPlugin } from '../../common/innerPlugin'
import { makeMetaTokens } from '../../common/tokenHelpers'
import type { PolkadotTools } from '../PolkadotTools'
import type { PolkadotNetworkInfo } from '../polkadotTypes'

const builtinTokens: EdgeTokenMap = {
  '1': {
    currencyCode: 'LKN',
    displayName: 'Liberland Merit Testnet',
    denominations: [{ name: 'LKN', multiplier: '1000000000000' }],
    networkLocation: {
      contractAddress: '1' // Assets pallet ID
    }
  }
}

const networkInfo: PolkadotNetworkInfo = {
  rpcNodes: ['wss://testchain.liberland.org/'],
  subscanBaseUrl: undefined,
  subscanQueryLimit: 100,
  lengthFeePerByte: '1000000'
}

export const currencyInfo: EdgeCurrencyInfo = {
  currencyCode: 'LDN',
  displayName: 'Liberland Testnet',
  pluginId: 'liberlandtestnet',
  walletType: 'wallet:liberlandtestnet',

  addressExplorer: '',
  transactionExplorer:
    'https://polkadot.js.org/apps/?rpc=wss%%3A%%2F%%2Ftestchain.liberland.org%%2F#/explorer/query/%s',

  denominations: [
    {
      name: 'LDN',
      multiplier: '1000000000000',
      symbol: ''
    }
  ],

  // Deprecated
  defaultSettings: {},
  metaTokens: makeMetaTokens(builtinTokens) // Deprecated
}

export const liberlandtestnet = makeOuterPlugin<
  PolkadotNetworkInfo,
  PolkadotTools
>({
  builtinTokens,
  currencyInfo,
  networkInfo,

  checkEnvironment: () => {
    if (global.BigInt == null) {
      throw new Error('Liberland Testnet requires bigint support')
    }
  },

  async getInnerPlugin() {
    return await import('../PolkadotTools')
  }
})
