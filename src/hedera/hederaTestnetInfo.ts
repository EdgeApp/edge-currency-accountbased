import { EdgeCurrencyInfo } from 'edge-core-js/types'

import { makeOuterPlugin } from '../common/innerPlugin'
import type { HederaTools } from './HederaTools'
import { HederaNetworkInfo } from './hederaTypes'

const networkInfo: HederaNetworkInfo = {
  mirrorNodes: ['https://testnet.mirrornode.hedera.com'],
  client: 'testnet',
  checksumNetworkID: '1',
  maxFee: 900000
}

const currencyInfo: EdgeCurrencyInfo = {
  currencyCode: 'THBAR',
  displayName: 'Hedera Testnet',
  pluginId: 'hederatestnet',
  walletType: 'wallet:hederatestnet',

  // Explorers:
  addressExplorer: `https://explorer.kabuto.sh/testnet/id/%s`,
  transactionExplorer: `https://explorer.kabuto.sh/testnet/transaction/%s`,

  denominations: [
    // Other denominations are specified but these are the most common:
    {
      name: 'THBAR',
      multiplier: '100000000', // 100,000,000
      symbol: 'ℏ'
    },
    {
      name: 'tTHBAR',
      multiplier: '1',
      symbol: 'tℏ'
    }
  ]
}

export const hederatestnet = makeOuterPlugin<HederaNetworkInfo, HederaTools>({
  currencyInfo,
  networkInfo,

  async getInnerPlugin() {
    return await import('./HederaTools')
  }
})
