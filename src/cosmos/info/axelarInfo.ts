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
  bech32AddressPrefix: 'axelar',
  bip39Path: `m/44'/118'/0'/0/0`,
  chainInfo: {
    chainName: 'axelar',
    url: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/axelar/chain.json'
  },
  defaultChainId: 'axelar-dojo-1',
  nativeDenom: 'uaxl',
  pluginMnemonicKeyName: 'axelarMnemonic',
  rpcNode: {
    url: 'https://axelar.tendermintrpc.lava.build',
    headers: {}
  },
  archiveNodes: [
    {
      blockTimeRangeSeconds: {
        start: 0
      },
      endpoint: {
        url: 'https://axelar-archrpc.chainode.tech',
        headers: {}
      }
    }
  ]
}

const currencyInfo: EdgeCurrencyInfo = {
  currencyCode: 'AXL',
  // customTokenTemplate: cosmosCustomTokenTemplate,
  assetDisplayName: 'Axelar',
  chainDisplayName: 'Axelar',
  pluginId: 'axelar',
  walletType: 'wallet:axelar',

  // Explorers:
  addressExplorer: 'https://www.mintscan.io/axelar/address/%s',
  transactionExplorer: 'https://www.mintscan.io/axelar/tx/%s',

  denominations: [
    {
      name: 'AXL',
      multiplier: '1000000',
      symbol: ''
    }
  ],

  memoOptions: [{ type: 'text', maxLength: 250 }],

  // Deprecated:
  defaultSettings: makeCosmosDefaultSettings(),
  displayName: 'Axelar'
}

export const axelar = makeOuterPlugin<
  CosmosNetworkInfo,
  CosmosTools,
  CosmosInfoPayload
>({
  currencyInfo,
  asInfoPayload: asCosmosInfoPayload,
  networkInfo,

  checkEnvironment() {
    if (global.BigInt == null) {
      throw new Error('Axelar requires BigInt support')
    }
  },

  async getInnerPlugin() {
    return await import(
      /* webpackChunkName: "axelar" */
      '../CosmosTools'
    )
  }
})
