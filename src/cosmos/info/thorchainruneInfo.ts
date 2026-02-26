import { EdgeCurrencyInfo } from 'edge-core-js/types'

import { makeOuterPlugin } from '../../common/innerPlugin'
import type { CosmosTools } from '../CosmosTools'
import { asCosmosInfoPayload, CosmosInfoPayload } from '../cosmosTypes'
import { ThorchainNetworkInfo } from '../thorchainTypes'
import { makeCosmosDefaultSettings } from './cosmosCommonInfo'
// import { cosmosCustomTokenTemplate } from './cosmosCommonInfo'

const networkInfo: ThorchainNetworkInfo = {
  bech32AddressPrefix: 'thor',
  bip39Path: `m/44'/931'/0'/0/0`,
  chainInfo: {
    chainName: 'thorchain',
    url: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/thorchain/chain.json'
  },
  defaultChainId: 'thorchain-mainnet-v1',
  chainIdUpdateUrl: 'https://rpc.ninerealms.com/status',
  transactionFeeConnectionInfo: {
    url: 'https://thornode.ninerealms.com/thorchain/network',
    headers: { 'x-client-id': '{{ninerealmsClientId}}' }
  },
  midgardConnectionInfo: {
    url: 'https://midgard.ninerealms.com',
    headers: { 'x-client-id': '{{ninerealmsClientId}}' }
  },
  nativeDenom: 'rune',
  pluginMnemonicKeyName: 'thorchainruneMnemonic',
  rpcNode: {
    url: 'https://rpc.ninerealms.com',
    headers: { 'x-client-id': '{{ninerealmsClientId}}' }
  },
  archiveNodes: [
    {
      blockTimeRangeSeconds: {
        start: 1647912564649 // 2022-03-22T01:29:24.649Z
        // end: TBD
      },
      endpoint: {
        url: 'https://rpc-v1.ninerealms.com',
        headers: { 'x-client-id': '{{ninerealmsClientId}}' }
      }
    }
    // {
    //   blockTimeRangeSeconds: {
    //     start: TBD
    //   },
    //   endpoint: {
    //     url: 'https://rpc-v2.ninerealms.com',
    //     headers: { 'x-client-id': '{{ninerealmsClientId}}' }
    //   }
    // }
  ]
}

const currencyInfo: EdgeCurrencyInfo = {
  currencyCode: 'RUNE',
  customTokenTemplate: [],
  assetDisplayName: 'THORChain',
  chainDisplayName: 'THORChain',
  pluginId: 'thorchainrune',
  walletType: 'wallet:thorchainrune',

  // Explorers:
  addressExplorer: 'https://viewblock.io/thorchain/address/%s',
  transactionExplorer: 'https://viewblock.io/thorchain/tx/%s',

  denominations: [
    {
      name: 'RUNE',
      multiplier: '100000000',
      symbol: 'ᚱ'
    }
  ],

  memoOptions: [{ type: 'text', maxLength: 250 }],

  // Deprecated:
  defaultSettings: makeCosmosDefaultSettings(),
  displayName: 'THORChain'
}

export const thorchainrune = makeOuterPlugin<
  ThorchainNetworkInfo,
  CosmosTools,
  CosmosInfoPayload
>({
  currencyInfo,
  asInfoPayload: asCosmosInfoPayload,
  networkInfo,

  checkEnvironment() {
    if (global.BigInt == null) {
      throw new Error('Thorchain requires BigInt support')
    }
  },

  async getInnerPlugin() {
    return await import(
      /* webpackChunkName: "thorchainrune" */
      '../CosmosTools'
    )
  }
})
