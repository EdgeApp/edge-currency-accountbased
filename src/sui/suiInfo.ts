import { EdgeCurrencyInfo, EdgeTokenMap } from 'edge-core-js/types'

import { makeOuterPlugin } from '../common/innerPlugin'
import type { SuiTools } from './SuiTools'
import { asSuiInfoPayload, SuiInfoPayload, SuiNetworkInfo } from './suiTypes'

const builtinTokens: EdgeTokenMap = {
  '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7usdcUSDC':
    {
      currencyCode: 'USDC',
      denominations: [{ multiplier: '1000000', name: 'USDC' }],
      displayName: 'USD Coin',
      networkLocation: {
        contractAddress:
          '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC'
      }
    }
}

const networkInfo: SuiNetworkInfo = {
  pluginMnemonicKeyName: 'suiMnemonic'
}

const currencyInfo: EdgeCurrencyInfo = {
  currencyCode: 'SUI',
  displayName: 'Sui',
  pluginId: 'sui',
  walletType: 'wallet:sui',

  // Explorers:
  addressExplorer: 'https://suivision.xyz/account/%s',
  transactionExplorer: 'https://suivision.xyz/txblock/%s',

  denominations: [
    {
      name: 'SUI',
      multiplier: '1000000000',
      symbol: ''
    }
  ],

  memoOptions: [{ type: 'text', memoName: 'memo', maxLength: 127 }]
}

export const sui = makeOuterPlugin<SuiNetworkInfo, SuiTools, SuiInfoPayload>({
  builtinTokens,
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
