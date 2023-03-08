import { EdgeCurrencyInfo } from 'edge-core-js/types'

import { makeOuterPlugin } from '../common/innerPlugin'
import type { HederaTools } from './hederaPlugin'
import type { HederaNetworkInfo, HederaSettings } from './hederaTypes'
import { hederaOtherMethodNames } from './hederaTypes'

const networkInfo: HederaNetworkInfo = {
  hedera: true
}

const otherSettings: HederaSettings = {
  creatorApiServers: ['https://creator.myhbarwallet.com'],
  mirrorNodes: ['https://mainnet-public.mirrornode.hedera.com'],
  client: 'Mainnet',
  checksumNetworkID: '0',
  maxFee: 900000
}

const defaultSettings: any = {
  otherSettings
}

const currencyInfo: EdgeCurrencyInfo = {
  // Basic currency information:
  currencyCode: 'HBAR',
  displayName: 'Hedera',
  pluginId: 'hedera',
  walletType: 'wallet:hedera',

  defaultSettings,

  memoMaxLength: 100,

  addressExplorer: 'https://hashscan.io/mainnet/account/%s',
  transactionExplorer: 'https://hashscan.io/mainnet/transaction/%s',

  denominations: [
    // An array of Objects of the possible denominations for this currency
    // other denominations are specified but these are the most common
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
  metaTokens: [] // Deprecated
}

export const hedera = makeOuterPlugin<HederaNetworkInfo, HederaTools>({
  currencyInfo,
  networkInfo,
  otherMethodNames: hederaOtherMethodNames,

  async getInnerPlugin() {
    return await import(
      /* webpackChunkName: "hedera" */
      './hederaPlugin'
    )
  }
})
