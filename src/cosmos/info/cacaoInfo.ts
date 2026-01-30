import { EdgeCurrencyInfo, EdgeTokenMap } from 'edge-core-js/types'

import { makeOuterPlugin } from '../../common/innerPlugin'
import type { CosmosTools } from '../CosmosTools'
import { asCosmosInfoPayload, CosmosInfoPayload } from '../cosmosTypes'
import { MidgardNetworkInfo } from '../midgardTypes'

const builtinTokens: EdgeTokenMap = {
  maya: {
    currencyCode: 'MAYA',
    displayName: 'MAYA',
    denominations: [{ name: 'MAYA', multiplier: '10000' }], // 4 decimals per xchainjs
    networkLocation: {
      contractAddress: 'maya'
    }
  }
}

const networkInfo: MidgardNetworkInfo = {
  bech32AddressPrefix: 'maya',
  bip39Path: `m/44'/931'/0'/0/0`,
  chainInfo: {
    chainName: 'mayachain',
    url: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/mayachain/chain.json'
  },
  defaultChainId: 'mayachain-mainnet-v1',
  chainIdUpdateUrl: 'https://tendermint.mayachain.info/status',
  midgardConnectionInfo: {
    url: 'https://midgard.mayachain.info',
    headers: {}
  },
  nativeDenom: 'cacao',
  pluginMnemonicKeyName: 'cacaoMnemonic',
  rpcNode: {
    url: 'https://tendermint.mayachain.info',
    headers: {}
  }
}

const currencyInfo: EdgeCurrencyInfo = {
  currencyCode: 'CACAO',
  assetDisplayName: 'Cacao',
  chainDisplayName: 'MAYAChain',
  pluginId: 'cacao',
  walletType: 'wallet:cacao',

  // Explorers:
  addressExplorer: 'https://mayascan.org/address/%s',
  transactionExplorer: 'https://mayascan.org/tx/%s',

  denominations: [
    {
      name: 'CACAO',
      multiplier: '10000000000', // 10 decimals per xchainjs
      symbol: ''
    }
  ],

  memoOptions: [{ type: 'text', maxLength: 250 }],

  // Deprecated:
  displayName: 'Cacao'
}

export const cacao = makeOuterPlugin<
  MidgardNetworkInfo,
  CosmosTools,
  CosmosInfoPayload
>({
  currencyInfo,
  asInfoPayload: asCosmosInfoPayload,
  networkInfo,
  builtinTokens,

  checkEnvironment() {
    if (global.BigInt == null) {
      throw new Error('Cacao requires BigInt support')
    }
  },

  async getInnerPlugin() {
    return await import(
      /* webpackChunkName: "cacao" */
      '../CosmosTools'
    )
  }
})
