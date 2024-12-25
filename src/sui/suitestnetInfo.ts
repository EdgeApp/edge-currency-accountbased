import { EdgeCurrencyInfo, EdgeTokenMap } from 'edge-core-js/types'

import { makeOuterPlugin } from '../common/innerPlugin'
import type { SuiTools } from './SuiTools'
import { asSuiInfoPayload, SuiInfoPayload, SuiNetworkInfo } from './suiTypes'

const builtinTokens: EdgeTokenMap = {
  '0xcf9856788a9738fe7b679f57e2aace7e7226cca1acb2298c457d2e0687806e92wispWISP':
    {
      currencyCode: 'WISP',
      denominations: [{ multiplier: '1000000000', name: 'Wisp' }],
      displayName: 'Wisp',
      networkLocation: {
        contractAddress:
          '0xcf9856788a9738fe7b679f57e2aace7e7226cca1acb2298c457d2e0687806e92::wisp::WISP'
      }
    }
}

const networkInfo: SuiNetworkInfo = {
  pluginMnemonicKeyName: 'suitestnetMnemonic'
}

const currencyInfo: EdgeCurrencyInfo = {
  currencyCode: 'SUI',
  displayName: 'Sui Testnet',
  pluginId: 'suitestnet',
  walletType: 'wallet:suitestnet',

  // Explorers:
  addressExplorer: 'https://testnet.suivision.xyz/account/%s',
  transactionExplorer: 'https://testnet.suivision.xyz/txblock/%s',

  denominations: [
    {
      name: 'SUI',
      multiplier: '1000000000',
      symbol: ''
    }
  ],

  memoOptions: [{ type: 'text', memoName: 'memo', maxLength: 127 }]
}

export const suitestnet = makeOuterPlugin<
  SuiNetworkInfo,
  SuiTools,
  SuiInfoPayload
>({
  builtinTokens,
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
