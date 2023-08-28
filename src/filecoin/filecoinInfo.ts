import { Network } from '@zondax/izari-filecoin'
import { EdgeCurrencyInfo } from 'edge-core-js/types'

import { makeOuterPlugin } from '../common/innerPlugin'
import type { FilecoinTools } from './FilecoinTools'
import type { FilecoinNetworkInfo } from './filecoinTypes'

const networkInfo: FilecoinNetworkInfo = {
  filscanUrl: 'https://api-v2.filscan.io/api/v1',
  hdPathCoinType: 461,
  rpcNode: {
    networkName: Network.Mainnet,
    url: 'https://api.node.glif.io/'
  }
}

export const currencyInfo: EdgeCurrencyInfo = {
  // Basic currency information:
  currencyCode: 'FIL',
  displayName: 'Filecoin',
  pluginId: 'filecoin',
  requiredConfirmations: 900,
  walletType: 'wallet:filecoin',

  defaultSettings: {},

  addressExplorer: 'https://blockchair.com/filecoin/address/%s?from=edgeapp',
  transactionExplorer:
    'https://blockchair.com/filecoin/transaction/%s?from=edgeapp',

  denominations: [
    // An array of Objects of the possible denominations for this currency
    {
      name: 'FIL',
      multiplier: '1000000000000000000',
      symbol: '⨎'
    },
    {
      name: 'milliFIL',
      multiplier: '1000000000000000',
      symbol: 'm⨎'
    },
    {
      name: 'microFIL',
      multiplier: '1000000000000',
      symbol: 'µ⨎'
    },
    {
      name: 'nanoFIL',
      multiplier: '1000000000',
      symbol: 'n⨎'
    },
    {
      name: 'picoFIL',
      multiplier: '1000000',
      symbol: 'p⨎'
    },
    {
      name: 'femtoFIL',
      multiplier: '1000',
      symbol: 'f⨎'
    },
    {
      name: 'attoFIL',
      multiplier: '1',
      symbol: 'a⨎'
    }
  ],

  metaTokens: [], // Deprecated

  unsafeBroadcastTx: true
}

export const filecoin = makeOuterPlugin<FilecoinNetworkInfo, FilecoinTools>({
  currencyInfo,
  networkInfo,

  async getInnerPlugin() {
    return await import(
      /* webpackChunkName: "filecoin" */
      './FilecoinTools'
    )
  }
})
