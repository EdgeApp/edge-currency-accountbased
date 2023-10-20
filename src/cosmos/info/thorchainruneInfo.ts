import { EdgeCurrencyInfo } from 'edge-core-js/types'

import { makeOuterPlugin } from '../../common/innerPlugin'
import type { CosmosTools } from '../CosmosTools'
import type { CosmosNetworkInfo } from '../cosmosTypes'

const networkInfo: CosmosNetworkInfo = {
  bech32AddressPrefix: 'thor',
  bip39Path: `m/44'/931'/0'/0/0`,
  pluginMnemonicKeyName: 'thorchainruneMnemonic',
  rpcNode: 'https://rpc.ninerealms.com'
}

const currencyInfo: EdgeCurrencyInfo = {
  currencyCode: 'RUNE',
  displayName: 'THORChain',
  pluginId: 'thorchainrune',
  walletType: 'wallet:thorchainrune',

  // Explorers:
  addressExplorer: 'https://viewblock.io/thorchain/address/%s',
  transactionExplorer: 'https://viewblock.io/thorchain/tx/%s',

  denominations: [
    {
      name: 'RUNE',
      multiplier: '100000000',
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

export const thorchainrune = makeOuterPlugin<CosmosNetworkInfo, CosmosTools>({
  currencyInfo,
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
