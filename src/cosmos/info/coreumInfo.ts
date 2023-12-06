import type { Chain } from '@chain-registry/types'
import { EdgeCurrencyInfo } from 'edge-core-js/types'

import { makeOuterPlugin } from '../../common/innerPlugin'
import type { CosmosTools } from '../CosmosTools'
import type { CosmosNetworkInfo } from '../cosmosTypes'
import data from '../info/chain-json/coreum.json'

const networkInfo: CosmosNetworkInfo = {
  bech32AddressPrefix: 'core',
  bip39Path: `m/44'/990'/0'/0/0`,
  chainInfo: {
    data: data as Chain,
    name: 'coreum',
    url: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/coreum/chain.json'
  },
  nativeDenom: 'ucore',
  pluginMnemonicKeyName: 'coreumMnemonic',
  rpcNode: {
    url: 'https://coreum-rpc.publicnode.com:443',
    headers: {}
  },
  archiveNode: {
    url: 'https://full-node.mainnet-1.coreum.dev:26657',
    headers: {}
  }
}

const currencyInfo: EdgeCurrencyInfo = {
  currencyCode: 'COREUM',
  displayName: 'Coreum',
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
  defaultSettings: {},
  memoMaxLength: 250,
  memoType: 'text',
  metaTokens: []
}

export const coreum = makeOuterPlugin<CosmosNetworkInfo, CosmosTools>({
  currencyInfo,
  networkInfo,

  checkEnvironment() {
    if (global.BigInt == null) {
      throw new Error('Coreum requires BigInt support')
    }
  },

  async getInnerPlugin() {
    return await import(
      /* webpackChunkName: "coreum" */
      '../CosmosTools'
    )
  }
})
