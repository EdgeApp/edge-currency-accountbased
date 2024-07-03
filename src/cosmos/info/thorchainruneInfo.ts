import { EdgeCurrencyInfo } from 'edge-core-js/types'

import { makeOuterPlugin } from '../../common/innerPlugin'
import type { CosmosTools } from '../CosmosTools'
import { asCosmosInfoPayload, CosmosNetworkInfo } from '../cosmosTypes'
// import { cosmosCustomTokenTemplate } from './cosmosCommonInfo'

const networkInfo: CosmosNetworkInfo = {
  bech32AddressPrefix: 'thor',
  bip39Path: `m/44'/931'/0'/0/0`,
  chainInfo: {
    chainId: 'thorchain-mainnet-v1',
    url: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/thorchain/chain.json'
  },
  defaultTransactionFeeUrl: {
    url: 'https://thornode.ninerealms.com/thorchain/network',
    headers: { 'x-client-id': '{{ninerealmsClientId}}' }
  },
  nativeDenom: 'rune',
  pluginMnemonicKeyName: 'thorchainruneMnemonic',
  rpcNode: {
    url: 'https://rpc.ninerealms.com',
    headers: { 'x-client-id': '{{ninerealmsClientId}}' }
  },
  archiveNode: {
    url: 'https://rpc-v1.ninerealms.com',
    headers: { 'x-client-id': '{{ninerealmsClientId}}' }
  }
}

const currencyInfo: EdgeCurrencyInfo = {
  currencyCode: 'RUNE',
  // customTokenTemplate: cosmosCustomTokenTemplate,
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
      symbol: 'ᚱ'
    }
  ],

  memoOptions: [{ type: 'text', maxLength: 250 }]
}

export const thorchainrune = makeOuterPlugin<CosmosNetworkInfo, CosmosTools>({
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
