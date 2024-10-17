import { EdgeCurrencyInfo } from 'edge-core-js/types'

import { makeOuterPlugin } from '../common/innerPlugin'
import type { TonTools } from './TonTools'
import { asTonInfoPayload, TonInfoPayload, TonNetworkInfo } from './tonTypes'

const networkInfo: TonNetworkInfo = {
  pluginMnemonicKeyName: 'tonMnemonic',
  tonCenterUrl: 'https://toncenter.com/api/v2/jsonRPC',
  tonOrbsServers: [
    'https://ton.access.orbs.network/4410c0ff5Bd3F8B62C092Ab4D238bEE463E64410/1/mainnet/toncenter-api-v2/jsonRPC',
    'https://ton.access.orbs.network/4411c0ff5Bd3F8B62C092Ab4D238bEE463E64411/1/mainnet/toncenter-api-v2/jsonRPC',
    'https://ton.access.orbs.network/4412c0ff5Bd3F8B62C092Ab4D238bEE463E64412/1/mainnet/toncenter-api-v2/jsonRPC',
    'https://ton.access.orbs.network/55013c0ff5Bd3F8B62C092Ab4D238bEE463E5501/1/mainnet/toncenter-api-v2/jsonRPC',
    'https://ton.access.orbs.network/55023c0ff5Bd3F8B62C092Ab4D238bEE463E5502/1/mainnet/toncenter-api-v2/jsonRPC',
    'https://ton.access.orbs.network/55033c0ff5Bd3F8B62C092Ab4D238bEE463E5503/1/mainnet/toncenter-api-v2/jsonRPC'
  ]
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
