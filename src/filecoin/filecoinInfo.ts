import { EdgeCurrencyInfo } from 'edge-core-js/types'

import { makeOuterPlugin } from '../common/innerPlugin'
import type { FilecoinTools } from './FilecoinTools'
import type { FilecoinNetworkInfo } from './filecoinTypes'

const networkInfo: FilecoinNetworkInfo = {
  filfoxUrl: 'https://filfox.info/api/v1',
  filscanUrl: 'https://api-v2.filscan.io/api/v1',
  hdPathCoinType: 461,
  networkPrefix: 'Mainnet',
  rpcNode: {
    networkName: 'Mainnet',
    url: 'https://api.node.glif.io/'
  }
}

export const currencyInfo: EdgeCurrencyInfo = {
  currencyCode: 'FIL',
  displayName: 'Filecoin',
  pluginId: 'filecoin',
  requiredConfirmations: 900,
  unsafeBroadcastTx: true,
  walletType: 'wallet:filecoin',

  // Explorers:
  addressExplorer: 'https://filfox.info/en/address/%s',
  transactionExplorer: 'https://filfox.info/en/message/%s',

  denominations: [
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

  // Deprecated:
  defaultSettings: {},
  metaTokens: []
}

export const filecoin = makeOuterPlugin<FilecoinNetworkInfo, FilecoinTools>({
  currencyInfo,
  networkInfo,

  checkEnvironment: () => {
    if (global.BigInt == null) {
      throw new Error('Filecoin requires BigInt support')
    }
  },

  async getInnerPlugin() {
    return await import(
      /* webpackChunkName: "filecoin" */
      './FilecoinTools'
    )
  }
})
