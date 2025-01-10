import { EdgeCurrencyInfo } from 'edge-core-js/types'

import { makeOuterPlugin } from '../common/innerPlugin'
import type { CardanoTools } from './CardanoTools'
import {
  asCardanoInfoPayload,
  CardanoInfoPayload,
  CardanoNetworkInfo
} from './cardanoTypes'

const networkInfo: CardanoNetworkInfo = {
  networkId: 1,
  koiosServer: 'https://api.koios.rest',
  blockfrostServer: 'https://cardano-mainnet.blockfrost.io',
  maestroServer: 'https://mainnet.gomaestro-api.org'
}

const currencyInfo: EdgeCurrencyInfo = {
  currencyCode: 'ADA',
  assetDisplayName: 'Cardano',
  chainDisplayName: 'Cardano',
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
  ],

  // Deprecated:
  displayName: 'Cardano'
}

export const cardano = makeOuterPlugin<
  CardanoNetworkInfo,
  CardanoTools,
  CardanoInfoPayload
>({
  currencyInfo,
  asInfoPayload: asCardanoInfoPayload,
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
