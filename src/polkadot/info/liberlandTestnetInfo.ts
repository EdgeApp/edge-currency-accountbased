import { EdgeCurrencyInfo } from 'edge-core-js/types'

import { makeOuterPlugin } from '../../common/innerPlugin'
import type { PolkadotTools } from '../PolkadotTools'
import {
  asPolkadotInfoPayload,
  PolkadotInfoPayload,
  PolkadotNetworkInfo
} from '../polkadotTypes'

const networkInfo: PolkadotNetworkInfo = {
  rpcNodes: ['wss://testchain.liberland.org/'],
  ss58Format: 42,
  subscanBaseUrls: [],
  subscanQueryLimit: 100,
  partialFeeOffsetMultiplier: '2',
  lengthFeePerByte: '76800000',
  liberlandScanUrl: 'https://archive.testchain.liberland.org/graphql/'
}

const currencyInfo: EdgeCurrencyInfo = {
  currencyCode: 'LDN',
  assetDisplayName: 'Liberland Testnet',
  chainDisplayName: 'Liberland Testnet',
  pluginId: 'liberlandtestnet',
  walletType: 'wallet:liberlandtestnet',

  // Explorers:
  addressExplorer: '',
  transactionExplorer: '',

  denominations: [
    {
      name: 'LDN',
      multiplier: '1000000000000',
      symbol: ''
    }
  ],

  // Deprecated:
  displayName: 'Liberland Testnet'
}

export const liberlandtestnet = makeOuterPlugin<
  PolkadotNetworkInfo,
  PolkadotTools,
  PolkadotInfoPayload
>({
  currencyInfo,
  asInfoPayload: asPolkadotInfoPayload,
  networkInfo,

  checkEnvironment: () => {
    if (global.BigInt == null) {
      throw new Error('Liberland Testnet requires bigint support')
    }
  },

  async getInnerPlugin() {
    return await import('../PolkadotTools')
  }
})
