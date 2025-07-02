import { EdgeCurrencyInfo } from 'edge-core-js/types'

import { makeOuterPlugin } from '../common/innerPlugin'
import type { KaspaTools } from './KaspaTools'
import {
  asKaspaInfoPayload,
  KaspaInfoPayload,
  KaspaNetworkInfo
} from './kaspaTypes'

const networkInfo: KaspaNetworkInfo = {
  kaspaServers: [
    // RPC endpoints for direct node connections
    'mainnet-dnsseed-1.kaspanet.org:18110', // wRPC JSON
    'mainnet-dnsseed-2.kaspanet.org:18110',
    'mainnet-dnsseed-3.kaspanet.org:18110',
    // Alternative RPC endpoints
    'kas.fyi:18110',
    'kaspa.aspectron.org:18110'
  ],
  kaspaExplorerServers: [
    'https://explorer.kaspa.org',
    'https://kas.fyi',
    'https://kaspalytics.com',
    'https://kaspagames.org/api'
  ]
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
  blockExplorer: 'https://explorer.kaspa.org/blocks/%s',

  denominations: [
    {
      name: 'KAS',
      multiplier: '100000000', // 1 KAS = 100,000,000 sompis (base units)
      symbol: 'KAS'
    }
  ],

  // No memo support in Kaspa
  memoOptions: [],

  // Deprecated:
  displayName: 'Kaspa'
}

export const kaspa = makeOuterPlugin<
  KaspaNetworkInfo,
  KaspaTools,
  KaspaInfoPayload
>({
  currencyInfo,
  asInfoPayload: asKaspaInfoPayload,
  networkInfo,

  async getInnerPlugin() {
    return await import(
      /* webpackChunkName: "kaspa" */
      './KaspaTools'
    )
  }
})