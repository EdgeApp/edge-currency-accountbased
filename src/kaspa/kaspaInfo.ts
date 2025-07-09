import { EdgeCurrencyInfo, EdgeTokenMap } from 'edge-core-js/types'

import { makeOuterPlugin } from '../common/innerPlugin'
import type { KaspaTools } from './KaspaTools'
import {
  asKaspaInfoPayload,
  KaspaInfoPayload,
  KaspaNetworkInfo
} from './kaspaTypes'

const builtinTokens: EdgeTokenMap = {
  // Kaspa doesn't have built-in tokens like Ethereum
  // This can be expanded in the future if Kaspa adds token support
}

const networkInfo: KaspaNetworkInfo = {
  rpcServers: [
    'wss://kaspa-mainnet.public-nodes.xyz:443/wrpc',
    'wss://kaspa.aspectron.com:17110/wrpc',
    'wss://kaspa-rpc.blockdag.network:443/wrpc'
  ],
  kaspaApiServers: ['https://api.kaspa.org'],
  networkId: 'kaspa-mainnet',
  genesisHash:
    'b7e3cb3edd042da9ad30b9f8dc3dc8b063d2738e18e97b13cc473a11b88ccfb0',
  defaultFee: '1000', // 0.00001 KAS
  minFee: '1000',
  maxFee: '100000',
  blocksPerSecond: 10,
  utxoRefreshTime: 2000 // 2 seconds
}

const currencyInfo: EdgeCurrencyInfo = {
  currencyCode: 'KAS',
  assetDisplayName: 'Kaspa',
  chainDisplayName: 'Kaspa',
  pluginId: 'kaspa',
  walletType: 'wallet:kaspa',

  // Explorers:
  addressExplorer: 'https://explorer.kaspa.org/addresses/%s',
  transactionExplorer: 'https://explorer.kaspa.org/txs/%s',

  customFeeTemplate: [
    {
      displayName: 'Fee',
      key: 'fee',
      type: 'string'
    }
  ],

  denominations: [
    {
      name: 'KAS',
      multiplier: '100000000', // 1 KAS = 100,000,000 sompi
      symbol: 'K'
    },
    {
      name: 'mKAS',
      multiplier: '100000',
      symbol: 'mK'
    },
    {
      name: 'sompi',
      multiplier: '1',
      symbol: 's'
    }
  ],

  // Kaspa supports transaction notes/memos
  memoOptions: [
    {
      type: 'text',
      memoName: 'note',
      maxLength: 256
    }
  ],

  // Deprecated:
  defaultSettings: { customFeeSettings: ['fee'] },
  displayName: 'Kaspa',
  metaTokens: []
}

export const kaspa = makeOuterPlugin<
  KaspaNetworkInfo,
  KaspaTools,
  KaspaInfoPayload
>({
  builtinTokens,
  currencyInfo,
  asInfoPayload: asKaspaInfoPayload,
  networkInfo,

  checkEnvironment: () => {
    // Kaspa works in all modern JavaScript environments
  },

  async getInnerPlugin() {
    return await import(
      /* webpackChunkName: "kaspa" */
      './KaspaTools'
    )
  }
})
