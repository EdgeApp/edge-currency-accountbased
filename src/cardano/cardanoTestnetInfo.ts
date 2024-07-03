import { EdgeCurrencyInfo } from 'edge-core-js/types'

import { makeOuterPlugin } from '../common/innerPlugin'
import type { CardanoTools } from './CardanoTools'
import { asCardanoInfoPayload, CardanoNetworkInfo } from './cardanoTypes'

const networkInfo: CardanoNetworkInfo = {
  networkId: 0,
  koiosServer: 'https://preprod.koios.rest',
  blockfrostServer: 'https://cardano-preprod.blockfrost.io',
  maestroServer: 'https://preprod.gomaestro-api.org'
}

const currencyInfo: EdgeCurrencyInfo = {
  currencyCode: 'ADA',
  displayName: 'Cardano PreProd Testnet',
  pluginId: 'cardanotestnet',
  walletType: 'wallet:cardanotestnet',

  // Explorers:
  addressExplorer: 'https://preprod.cardanoscan.io/address/%s',
  transactionExplorer: 'https://preprod.cardanoscan.io/transaction/%s',

  denominations: [
    {
      name: 'ADA',
      multiplier: '1000000'
    }
  ]
}

export const cardanotestnet = makeOuterPlugin<CardanoNetworkInfo, CardanoTools>(
  {
    currencyInfo,
    asInfoPayload: asCardanoInfoPayload,
    networkInfo,

    checkEnvironment: () => {
      if (global.BigInt == null) {
        throw new Error('Cardano Testnet requires bigint support')
      }
    },

    async getInnerPlugin() {
      return await import('./CardanoTools')
    }
  }
)
