import { EdgeCurrencyInfo } from 'edge-core-js/types'

import { makeOuterPlugin } from '../common/innerPlugin'
import type { BinanceTools } from './bnbPlugin'
import { BinanceSettings } from './bnbTypes'

const otherSettings: BinanceSettings = {
  binanceApiServers: [
    'https://dex.binance.org',
    'https://dex-atlantic.binance.org',
    'https://dex-asiapacific.binance.org',
    'https://dex-european.binance.org'
  ],
  beaconChainApiServers: ['https://api.binance.org']
}

const defaultSettings: any = {
  otherSettings
}

export const currencyInfo: EdgeCurrencyInfo = {
  // Basic currency information:
  currencyCode: 'BNB',
  displayName: 'BNB Beacon Chain',
  pluginId: 'binance',
  walletType: 'wallet:binance',

  defaultSettings,

  memoMaxLength: 128,

  addressExplorer: 'https://explorer.binance.org/address/%s',
  transactionExplorer: 'https://explorer.binance.org/tx/%s',
  blockExplorer: 'https://explorer.binance.org/block/%s',

  denominations: [
    // An array of Objects of the possible denominations for this currency
    {
      name: 'BNB',
      multiplier: '100000000',
      symbol: 'B'
    }
  ],
  metaTokens: []
}

export const binance = makeOuterPlugin<{}, BinanceTools>({
  currencyInfo,
  networkInfo: {},

  async getInnerPlugin() {
    return await import('./bnbPlugin')
  }
})
