import { EdgeCurrencyInfo } from 'edge-core-js/types'

import { makeOuterPlugin } from '../common/innerPlugin'
import type { CardanoTools } from './CardanoTools'
import type { CardanoNetworkInfo } from './cardanoTypes'

const networkInfo: CardanoNetworkInfo = {
  networkId: 1,
  rpcServer: 'https://api.koios.rest'
}

const currencyInfo: EdgeCurrencyInfo = {
  currencyCode: 'ADA',
  displayName: 'Cardano',
  pluginId: 'cardano',
  walletType: 'wallet:cardano',

  // Explorers:
  addressExplorer: 'https://cardanoscan.io/address/%s',
  transactionExplorer: 'https://cardanoscan.io/transaction/%s',

  denominations: [
    {
      name: 'ADA',
      multiplier: '1000000'
    }
  ]
}

export const cardano = makeOuterPlugin<CardanoNetworkInfo, CardanoTools>({
  currencyInfo,
  networkInfo,

  checkEnvironment: () => {
    if (global.BigInt == null) {
      throw new Error('Cardano requires bigint support')
    }
  },

  async getInnerPlugin() {
    return await import(
      /* webpackChunkName: "cardano" */
      './CardanoTools'
    )
  }
})
