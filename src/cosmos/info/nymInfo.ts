import { EdgeCurrencyInfo, EdgeTokenMap } from 'edge-core-js/types'

import { makeOuterPlugin } from '../../common/innerPlugin'
import { makeMetaTokens } from '../../common/tokenHelpers'
import type { CosmosTools } from '../CosmosTools'
import {
  asCosmosInfoPayload,
  CosmosInfoPayload,
  CosmosNetworkInfo
} from '../cosmosTypes'
import { makeCosmosDefaultSettings } from './cosmosCommonInfo'

const builtinTokens: EdgeTokenMap = {
  unyx: {
    currencyCode: 'NYX',
    displayName: 'NYX',
    denominations: [{ name: 'NYX', multiplier: '1000000' }],
    networkLocation: {
      contractAddress: 'unyx'
    }
  }
}

const networkInfo: CosmosNetworkInfo = {
  bech32AddressPrefix: 'n',
  bip39Path: `m/44'/118'/0'/0/0`,
  chainInfo: {
    chainName: 'nyx',
    url: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/nyx/chain.json'
  },
  defaultChainId: 'nyx',
  nativeDenom: 'unym',
  pluginMnemonicKeyName: 'nymMnemonic',
  rpcNode: {
    url: 'https://rpc.nymtech.net:443',
    headers: {}
  }
}

const currencyInfo: EdgeCurrencyInfo = {
  currencyCode: 'NYM',
  assetDisplayName: 'Nym',
  chainDisplayName: 'Nyx',
  pluginId: 'nym',
  walletType: 'wallet:nym',

  // Explorers:
  addressExplorer: 'https://nym.explorers.guru/account/%s',
  transactionExplorer: 'https://nym.explorers.guru/transaction/%s',

  denominations: [
    {
      name: 'NYM',
      multiplier: '1000000',
      symbol: ''
    }
  ],

  memoOptions: [{ type: 'text', maxLength: 250 }],

  // Deprecated:
  defaultSettings: makeCosmosDefaultSettings(),
  displayName: 'Nym',
  metaTokens: makeMetaTokens(builtinTokens)
}

export const nym = makeOuterPlugin<
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
      throw new Error('Nym requires BigInt support')
    }
  },

  async getInnerPlugin() {
    return await import(
      /* webpackChunkName: "nym" */
      '../CosmosTools'
    )
  }
})
