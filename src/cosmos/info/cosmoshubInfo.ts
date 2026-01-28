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
  bech32AddressPrefix: 'cosmos',
  bip39Path: `m/44'/118'/0'/0/0`,
  chainInfo: {
    chainName: 'cosmoshub',
    url: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/cosmoshub/chain.json'
  },
  defaultChainId: 'cosmoshub-4',
  nativeDenom: 'uatom',
  pluginMnemonicKeyName: 'cosmoshubMnemonic',
  rpcNode: {
    url: 'https://cosmos-rpc.publicnode.com:443',
    headers: {}
  }
  // archiveNode: {
  //   url: 'https://cosmosarchive-rpc.quickapi.com:443',
  //   headers: {}
  // }
}

const currencyInfo: EdgeCurrencyInfo = {
  currencyCode: 'ATOM',
  // customTokenTemplate: cosmosCustomTokenTemplate,
  assetDisplayName: 'Cosmos Hub',
  chainDisplayName: 'Cosmos Hub',
  pluginId: 'cosmoshub',
  walletType: 'wallet:cosmoshub',

  // Explorers:
  addressExplorer: 'https://www.mintscan.io/cosmos/address/%s',
  transactionExplorer: 'https://www.mintscan.io/cosmos/tx/%s',

  denominations: [
    {
      name: 'ATOM',
      multiplier: '1000000',
      symbol: ''
    }
  ],

  memoOptions: [{ type: 'text', maxLength: 250 }],

  // Deprecated:
  defaultSettings: makeCosmosDefaultSettings(),
  displayName: 'Cosmos Hub'
}

export const cosmoshub = makeOuterPlugin<
  CosmosNetworkInfo,
  CosmosTools,
  CosmosInfoPayload
>({
  currencyInfo,
  asInfoPayload: asCosmosInfoPayload,
  networkInfo,

  checkEnvironment() {
    if (global.BigInt == null) {
      throw new Error('Cosmos Hub requires BigInt support')
    }
  },

  async getInnerPlugin() {
    return await import(
      /* webpackChunkName: "cosmoshub" */
      '../CosmosTools'
    )
  }
})
