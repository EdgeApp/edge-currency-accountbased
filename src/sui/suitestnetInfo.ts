import { EdgeCurrencyInfo } from 'edge-core-js/types'

import { makeOuterPlugin } from '../common/innerPlugin'
import type { SuiTools } from './SuiTools'
import { asSuiInfoPayload, SuiInfoPayload, SuiNetworkInfo } from './suiTypes'

const networkInfo: SuiNetworkInfo = {
  network: 'testnet',
  pluginMnemonicKeyName: 'suitestnetMnemonic'
}

const currencyInfo: EdgeCurrencyInfo = {
  currencyCode: 'SUI',
  assetDisplayName: 'Sui Testnet',
  chainDisplayName: 'Sui Testnet',
  pluginId: 'suitestnet',
  walletType: 'wallet:suitestnet',

  // Explorers:
  addressExplorer: 'https://testnet.suivision.xyz/account/%s',
  transactionExplorer: 'https://testnet.suivision.xyz/txblock/%s',

  customTokenTemplate: [],

  denominations: [
    {
      name: 'SUI',
      multiplier: '1000000000',
      symbol: ''
    }
  ],

  memoOptions: [{ type: 'text', memoName: 'memo', maxLength: 127 }],

  // Deprecated:
  displayName: 'Sui Testnet'
}

export const suitestnet = makeOuterPlugin<
  SuiNetworkInfo,
  SuiTools,
  SuiInfoPayload
>({
  currencyInfo,
  asInfoPayload: asSuiInfoPayload,
  networkInfo,

  checkEnvironment() {
    if (global.BigInt == null) {
      throw new Error('Sui Testnet requires BigInt support')
    }
  },

  async getInnerPlugin() {
    return await import('./SuiTools')
  }
})
