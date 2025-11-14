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
    currencyCode: 'LLM',
    displayName: 'Liberland Merit',
    denominations: [{ name: 'LLM', multiplier: '1000000000000' }],
    networkLocation: {
      contractAddress: '1' // Assets pallet ID
    }
  }
}

const networkInfo: PolkadotNetworkInfo = {
  rpcNodes: [
    'wss://mainnet.liberland.org/',
    'wss://liberland-rpc.dwellir.com/'
  ],
  ss58Format: 42,
  subscanBaseUrls: [],
  subscanQueryLimit: 100,
  partialFeeOffsetMultiplier: '2',
  lengthFeePerByte: '76800000',
  liberlandScanUrl: 'https://archive.mainnet.liberland.org/'
}

const currencyInfo: EdgeCurrencyInfo = {
  currencyCode: 'LLD',
  assetDisplayName: 'Liberland Dollar',
  chainDisplayName: 'Liberland',
  pluginId: 'liberland',
  walletType: 'wallet:liberland',

  // Explorers:
  addressExplorer: 'https://chainscan.mainnet.liberland.org/account/%s',
  transactionExplorer: 'https://chainscan.mainnet.liberland.org/%s',

  denominations: [
    {
      name: 'LLD',
      multiplier: '1000000000000',
      symbol: ''
    }
  ],

  // Deprecated:
  displayName: 'Liberland',
  metaTokens: makeMetaTokens(builtinTokens)
}

export const liberland = makeOuterPlugin<
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
      throw new Error('Liberland requires bigint support')
    }
  },

  async getInnerPlugin() {
    return await import('../PolkadotTools')
  }
})
