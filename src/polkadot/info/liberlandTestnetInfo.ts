import { EdgeCurrencyInfo, EdgeTokenMap } from 'edge-core-js/types'

import { makeOuterPlugin } from '../../common/innerPlugin'
import { makeMetaTokens } from '../../common/tokenHelpers'
import type { PolkadotTools } from '../PolkadotTools'
import {
  asPolkadotInfoPayload,
  PolkadotInfoPayload,
  PolkadotNetworkInfo
} from '../polkadotTypes'

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
  ss58Format: 42,
  subscanBaseUrl: undefined,
  subscanQueryLimit: 100,
  partialFeeOffsetMultiplier: '2',
  lengthFeePerByte: '76800000',
  liberlandScanUrl: 'https://archive.testchain.liberland.org/graphql/'
}

const currencyInfo: EdgeCurrencyInfo = {
  currencyCode: 'LDN',
  assetDisplayName: 'Liberland Testnet',
  chainDisplayName: 'Liberland Testnet',
  pluginId: 'liberlandtestnet',
  walletType: 'wallet:liberlandtestnet',

  // Explorers:
  addressExplorer: '',
  transactionExplorer: '',

  denominations: [
    {
      name: 'LDN',
      multiplier: '1000000000000',
      symbol: ''
    }
  ],

  // Deprecated:
  displayName: 'Liberland Testnet',
  metaTokens: makeMetaTokens(builtinTokens)
}

export const liberlandtestnet = makeOuterPlugin<
  PolkadotNetworkInfo,
  PolkadotTools,
  PolkadotInfoPayload
>({
  builtinTokens,
  currencyInfo,
  asInfoPayload: asPolkadotInfoPayload,
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
