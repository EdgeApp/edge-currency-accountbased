import { EdgeCurrencyInfo } from 'edge-core-js/types'

import { makeOuterPlugin } from '../../common/innerPlugin'
import type { CosmosTools } from '../CosmosTools'
import {
  asCosmosInfoPayload,
  CosmosInfoPayload,
  CosmosNetworkInfo
} from '../cosmosTypes'
import { makeCosmosDefaultSettings } from './cosmosCommonInfo'

const networkInfo: CosmosNetworkInfo = {
  bech32AddressPrefix: 'core',
  bip39Path: `m/44'/990'/0'/0/0`,
  chainInfo: {
    chainName: 'coreum',
    url: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/coreum/chain.json'
  },
  defaultChainId: 'coreum-mainnet-1',
  nativeDenom: 'ucore',
  pluginMnemonicKeyName: 'coreumMnemonic',
  rpcNode: {
    url: 'https://full-node.mainnet-1.coreum.dev:26657',
    headers: {}
  },
  archiveNodes: [
    {
      blockTimeRangeSeconds: {
        start: 0
      },
      endpoint: {
        url: 'https://full-node.mainnet-1.coreum.dev:26657',
        headers: {}
      }
    }
  ]
}

const currencyInfo: EdgeCurrencyInfo = {
  currencyCode: 'COREUM',
  // customTokenTemplate: cosmosCustomTokenTemplate,
  assetDisplayName: 'TX',
  chainDisplayName: 'TX',
  pluginId: 'coreum',
  walletType: 'wallet:coreum',

  // Explorers:
  addressExplorer: 'https://explorer.coreum.com/coreum/accounts/%s',
  transactionExplorer: 'https://explorer.coreum.com/coreum/transactions/%s',

  denominations: [
    {
      name: 'COREUM',
      multiplier: '1000000',
      symbol: ''
    }
  ],

  memoOptions: [{ type: 'text', maxLength: 250 }],

  // Deprecated:
  defaultSettings: makeCosmosDefaultSettings(),
  displayName: 'TX'
}

export const coreum = makeOuterPlugin<
  CosmosNetworkInfo,
  CosmosTools,
  CosmosInfoPayload
>({
  currencyInfo,
  asInfoPayload: asCosmosInfoPayload,
  networkInfo,

  checkEnvironment() {
    if (global.BigInt == null) {
      throw new Error('TX requires BigInt support')
    }
  },

  async getInnerPlugin() {
    return await import(
      /* webpackChunkName: "coreum" */
      '../CosmosTools'
    )
  }
})
