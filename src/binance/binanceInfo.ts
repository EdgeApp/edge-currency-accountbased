import { EdgeCurrencyInfo } from 'edge-core-js/types'

import { makeOuterPlugin } from '../common/innerPlugin'
import type { BinanceTools } from './BinanceTools'
import type { BinanceNetworkInfo } from './binanceTypes'

const networkInfo: BinanceNetworkInfo = {
  binanceApiServers: [
    'https://dex.binance.org',
    'https://dex-atlantic.binance.org',
    'https://dex-asiapacific.binance.org',
    'https://dex-european.binance.org'
  ],
  beaconChainApiServers: ['https://api.binance.org']
}

const currencyInfo: EdgeCurrencyInfo = {
  currencyCode: 'BNB',
  displayName: 'BNB Beacon Chain',
  pluginId: 'binance',
  walletType: 'wallet:binance',

  // Explorers:
  addressExplorer: 'https://explorer.binance.org/address/%s',
  transactionExplorer: 'https://explorer.binance.org/tx/%s',
  blockExplorer: 'https://explorer.binance.org/block/%s',

  denominations: [
    {
      name: 'BNB',
      multiplier: '100000000',
      symbol: 'B'
    }
  ],

  // https://github.com/bnb-chain/javascript-sdk/blob/master/docs/api-docs/classes/bncclient.md#transfer
  memoOptions: [{ type: 'text', memoName: 'memo', maxLength: 128 }],

  // Deprecated:
  defaultSettings: {},
  memoMaxLength: 128,
  memoType: 'text',
  metaTokens: []
}

export const binance = makeOuterPlugin<BinanceNetworkInfo, BinanceTools>({
  currencyInfo,
  networkInfo,

  async getInnerPlugin() {
    return await import(
      /* webpackChunkName: "bnb" */
      './BinanceTools'
    )
  }
})
