import { EdgeCurrencyInfo } from 'edge-core-js/types'

import { makeOuterPlugin } from '../common/innerPlugin'
import type { HederaTools } from './HederaTools'
import type { HederaNetworkInfo } from './hederaTypes'
import { hederaOtherMethodNames } from './hederaTypes'

const networkInfo: HederaNetworkInfo = {
  creatorApiServers: ['https://creator.myhbarwallet.com'],
  mirrorNodes: ['https://mainnet-public.mirrornode.hedera.com'],
  client: 'Mainnet',
  checksumNetworkID: '0',
  maxFee: 900000
}

const currencyInfo: EdgeCurrencyInfo = {
  currencyCode: 'HBAR',
  displayName: 'Hedera',
  pluginId: 'hedera',
  walletType: 'wallet:hedera',

  // Explorers:
  addressExplorer: 'https://hashscan.io/mainnet/account/%s',
  transactionExplorer: 'https://hashscan.io/mainnet/transaction/%s',

  denominations: [
    // Other denominations are specified but these are the most common:
    {
      name: 'HBAR',
      multiplier: '100000000', // 100,000,000
      symbol: 'ℏ'
    },
    {
      name: 'tHBAR',
      multiplier: '1',
      symbol: 'tℏ'
    }
  ],

  // Deprecated:
  defaultSettings: {},
  memoMaxLength: 100,
  metaTokens: []
}

export const hedera = makeOuterPlugin<HederaNetworkInfo, HederaTools>({
  currencyInfo,
  networkInfo,
  otherMethodNames: hederaOtherMethodNames,

  async getInnerPlugin() {
    return await import(
      /* webpackChunkName: "hedera" */
      './HederaTools'
    )
  }
})
