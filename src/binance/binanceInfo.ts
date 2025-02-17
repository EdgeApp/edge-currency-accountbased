import { EdgeCurrencyInfo } from 'edge-core-js/types'

import { makeOuterPlugin } from '../common/innerPlugin'
import type { BinanceTools } from './BinanceTools'
import {
  asBinanceInfoPayload,
  BinanceInfoPayload,
  BinanceNetworkInfo
} from './binanceTypes'

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
  assetDisplayName: 'BNB Beacon Chain',
  chainDisplayName: 'BNB Beacon Chain',
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
  displayName: 'BNB Beacon Chain'
}

export const binance = makeOuterPlugin<
  BinanceNetworkInfo,
  BinanceTools,
  BinanceInfoPayload
>({
  currencyInfo,
  asInfoPayload: asBinanceInfoPayload,
  networkInfo,

  async getInnerPlugin() {
    return await import(
      /* webpackChunkName: "bnb" */
      './BinanceTools'
    )
  }
})
