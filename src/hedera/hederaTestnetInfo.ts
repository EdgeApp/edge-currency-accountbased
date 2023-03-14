import { EdgeCurrencyInfo } from 'edge-core-js/types'

import { makeOuterPlugin } from '../common/innerPlugin'
import type { HederaTools } from './hederaPlugin'
import { HederaNetworkInfo, hederaOtherMethodNames } from './hederaTypes'

const networkInfo: HederaNetworkInfo = {
  creatorApiServers: ['https://creator.testnet.myhbarwallet.com'],
  mirrorNodes: ['https://testnet.mirrornode.hedera.com'],
  client: 'TestNet',
  checksumNetworkID: '1',
  maxFee: 900000
}

const currencyInfo: EdgeCurrencyInfo = {
  // Basic currency information:
  currencyCode: 'THBAR',
  displayName: 'Hedera Testnet',
  pluginId: 'hederatestnet',
  walletType: 'wallet:hederatestnet',

  defaultSettings: {},

  addressExplorer: `https://explorer.kabuto.sh/testnet/id/%s`,
  transactionExplorer: `https://explorer.kabuto.sh/testnet/transaction/%s`,

  denominations: [
    // An array of Objects of the possible denominations for this currency
    // other denominations are specified but these are the most common
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
  ],
  metaTokens: [] // Deprecated
}

export const hederatestnet = makeOuterPlugin<HederaNetworkInfo, HederaTools>({
  currencyInfo,
  networkInfo,
  otherMethodNames: hederaOtherMethodNames,

  async getInnerPlugin() {
    return await import('./hederaPlugin')
  }
})
