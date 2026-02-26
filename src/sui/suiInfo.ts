import { EdgeCurrencyInfo } from 'edge-core-js/types'

import { makeOuterPlugin } from '../common/innerPlugin'
import type { SuiTools } from './SuiTools'
import { asSuiInfoPayload, SuiInfoPayload, SuiNetworkInfo } from './suiTypes'

const networkInfo: SuiNetworkInfo = {
  network: 'mainnet',
  pluginMnemonicKeyName: 'suiMnemonic'
}

const currencyInfo: EdgeCurrencyInfo = {
  currencyCode: 'SUI',
  assetDisplayName: 'Sui',
  chainDisplayName: 'Sui',
  pluginId: 'sui',
  walletType: 'wallet:sui',

  // Explorers:
  addressExplorer: 'https://suivision.xyz/account/%s',
  transactionExplorer: 'https://suivision.xyz/txblock/%s',

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
  displayName: 'Sui'
}

export const sui = makeOuterPlugin<SuiNetworkInfo, SuiTools, SuiInfoPayload>({
  currencyInfo,
  asInfoPayload: asSuiInfoPayload,
  networkInfo,

  checkEnvironment() {
    if (global.BigInt == null) {
      throw new Error('SUI requires BigInt support')
    }
  },

  async getInnerPlugin() {
    return await import(
      /* webpackChunkName: "sui" */
      './SuiTools'
    )
  }
})
