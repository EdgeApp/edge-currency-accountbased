import { EdgeCurrencyInfo, EdgeTokenMap } from 'edge-core-js/types'

import { makeOuterPlugin } from '../../common/innerPlugin'
import type { CosmosTools } from '../CosmosTools'
import { asCosmosInfoPayload, CosmosInfoPayload } from '../cosmosTypes'
import { ThorchainNetworkInfo } from '../thorchainTypes'
// import { cosmosCustomTokenTemplate } from './cosmosCommonInfo'

const builtinTokens: EdgeTokenMap = {
  tcy: {
    currencyCode: 'TCY',
    displayName: 'TCY',
    denominations: [{ name: 'TCY', multiplier: '100000000' }],
    networkLocation: {
      contractAddress: 'tcy'
    }
  }
}

const networkInfo: ThorchainNetworkInfo = {
  bech32AddressPrefix: 'sthor',
  bip39Path: `m/44'/931'/0'/0/0`,
  chainInfo: {
    chainName: 'thorchainstagenet',
    url: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/thorchain/chain.json'
  },
  defaultChainId: 'thorchain-stagenet-2',
  chainIdUpdateUrl: 'https://stagenet-rpc.ninerealms.com/status',
  defaultChainData: {
    chainName: 'thorchain',
    chainType: 'cosmos',
    chainId: 'thorchain-stagenet-2',
    networkType: 'testnet',
    fees: {
      feeTokens: [
        {
          denom: 'RUNE'
        }
      ]
    }
  },
  transactionFeeConnectionInfo: {
    url: 'https://stagenet-thornode.ninerealms.com/thorchain/network',
    headers: { 'x-client-id': '{{ninerealmsClientId}}' }
  },
  midgardConnctionInfo: {
    url: 'https://stagenet-midgard.ninerealms.com',
    headers: { 'x-client-id': '{{ninerealmsClientId}}' }
  },
  nativeDenom: 'rune',
  pluginMnemonicKeyName: 'thorchainrunestagenetMnemonic',
  rpcNode: {
    url: 'https://stagenet-rpc.ninerealms.com',
    headers: { 'x-client-id': '{{ninerealmsClientId}}' }
  }
}

const currencyInfo: EdgeCurrencyInfo = {
  currencyCode: 'RUNE',
  // customTokenTemplate: cosmosCustomTokenTemplate,
  assetDisplayName: 'THORChain Stagenet',
  chainDisplayName: 'THORChain Stagenet',
  pluginId: 'thorchainrunestagenet',
  walletType: 'wallet:thorchainrunestagenet',

  // Explorers:
  addressExplorer: 'https://viewblock.io/thorchain/address/%s?network=stagenet',
  transactionExplorer: 'https://viewblock.io/thorchain/tx/%s?network=stagenet',

  denominations: [
    {
      name: 'RUNE',
      multiplier: '100000000',
      symbol: 'ᚱ'
    }
  ],

  memoOptions: [{ type: 'text', maxLength: 250 }],

  // Deprecated:
  displayName: 'THORChain Stagenet'
}

export const thorchainrunestagenet = makeOuterPlugin<
  ThorchainNetworkInfo,
  CosmosTools,
  CosmosInfoPayload
>({
  currencyInfo,
  asInfoPayload: asCosmosInfoPayload,
  networkInfo,
  builtinTokens,

  checkEnvironment() {
    if (global.BigInt == null) {
      throw new Error('Thorchain Stagenet requires BigInt support')
    }
  },

  async getInnerPlugin() {
    return await import(
      /* webpackChunkName: "thorchainrunestagebet" */
      '../CosmosTools'
    )
  }
})
