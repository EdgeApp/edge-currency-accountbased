import { EdgeCurrencyInfo, EdgeTokenMap } from 'edge-core-js/types'

import { makeOuterPlugin } from '../../common/innerPlugin'
import { makeMetaTokens } from '../../common/tokenHelpers'
import type { CosmosTools } from '../CosmosTools'
import {
  asCosmosInfoPayload,
  CosmosInfoPayload,
  CosmosNetworkInfo
} from '../cosmosTypes'
import { cosmosCustomTokenTemplate } from './cosmosCommonInfo'

const builtinTokens: EdgeTokenMap = {
  uion: {
    currencyCode: 'ION',
    displayName: 'Ion',
    denominations: [{ name: 'ION', multiplier: '1000000' }],
    networkLocation: {
      contractAddress: 'uion'
    }
  }
}

const networkInfo: CosmosNetworkInfo = {
  bech32AddressPrefix: 'osmo',
  bip39Path: `m/44'/118'/0'/0/0`,
  chainInfo: {
    chainName: 'osmosis',
    url: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/osmosis/chain.json'
  },
  defaultChainId: 'osmosis-1',
  nativeDenom: 'uosmo',
  pluginMnemonicKeyName: 'osmosisMnemonic',
  rpcNode: {
    url: 'https://rpc.osmosis.zone:443',
    headers: {}
  },
  archiveNodes: [
    {
      blockTimeRangeSeconds: {
        start: 0
      },
      endpoint: {
        url: 'https://skilled-neat-forest.osmosis-mainnet.quiknode.pro/{quiknodeApiKey}',
        headers: {}
      }
    }
  ]
}

const currencyInfo: EdgeCurrencyInfo = {
  currencyCode: 'OSMO',
  customTokenTemplate: cosmosCustomTokenTemplate,
  assetDisplayName: 'Osmosis',
  chainDisplayName: 'Osmosis',
  pluginId: 'osmosis',
  walletType: 'wallet:osmosis',

  // Explorers:
  addressExplorer: 'https://www.mintscan.io/osmosis/address/%s',
  transactionExplorer: 'https://www.mintscan.io/osmosis/tx/%s',

  denominations: [
    {
      name: 'OSMO',
      multiplier: '1000000',
      symbol: ''
    }
  ],

  memoOptions: [{ type: 'text', maxLength: 250 }],

  // Deprecated:
  displayName: 'Osmosis',
  metaTokens: makeMetaTokens(builtinTokens)
}

export const osmosis = makeOuterPlugin<
  CosmosNetworkInfo,
  CosmosTools,
  CosmosInfoPayload
>({
  currencyInfo,
  asInfoPayload: asCosmosInfoPayload,
  networkInfo,
  builtinTokens,

  checkEnvironment() {
    if (global.BigInt == null) {
      throw new Error('Osmosis requires BigInt support')
    }
  },

  async getInnerPlugin() {
    return await import(
      /* webpackChunkName: "osmosis" */
      '../CosmosTools'
    )
  }
})
