import { EdgeCurrencyInfo } from 'edge-core-js/types'

import { makeOuterPlugin } from '../common/innerPlugin'
import type { TonTools } from './TonTools'
import { asTonInfoPayload, TonInfoPayload, TonNetworkInfo } from './tonTypes'

const networkInfo: TonNetworkInfo = {
  pluginMnemonicKeyName: 'tonMnemonic'
}

const currencyInfo: EdgeCurrencyInfo = {
  currencyCode: 'TON',
  displayName: 'Toncoin',
  pluginId: 'ton',
  walletType: 'wallet:ton',

  // Explorers:
  addressExplorer: 'https://tonscan.org/address/%s',
  transactionExplorer: 'https://tonscan.org/tx/%s',

  denominations: [
    {
      name: 'TON',
      multiplier: '1000000000',
      symbol: ''
    }
  ],

  memoOptions: [{ type: 'text', memoName: 'memo', maxLength: 127 }]
}

export const ton = makeOuterPlugin<TonNetworkInfo, TonTools, TonInfoPayload>({
  currencyInfo,
  asInfoPayload: asTonInfoPayload,
  networkInfo,

  checkEnvironment() {
    if (global.BigInt == null) {
      throw new Error('TON requires BigInt support')
    }
  },

  async getInnerPlugin() {
    return await import(
      /* webpackChunkName: "ton" */
      './TonTools'
    )
  }
})
