/* global */
// @flow

import type {
  EdgeCorePluginOptions,
  EdgeCurrencyInfo
} from 'edge-core-js/types'

import { makeSolanaPluginInner } from './solanaPlugin.js'
import type { SolanaSettings } from './solanaTypes.js'

const otherSettings: SolanaSettings = {
  rpcNodes: [
    // 'https://solana-api.projectserum.com', // Doesn't have full history
    'https://ssc-dao.genesysgo.net',
    'https://api.mainnet-beta.solana.com'
  ]
}

const defaultSettings: any = {
  otherSettings
}

export const currencyInfo: EdgeCurrencyInfo = {
  // Basic currency information:
  currencyCode: 'SOL',
  displayName: 'Solana',
  pluginId: 'solana',
  walletType: 'wallet:solana',

  defaultSettings,

  addressExplorer: 'https://solanabeach.io/address/%s',
  transactionExplorer: 'solanabeach.io/transaction/%s',

  denominations: [
    // An array of Objects of the possible denominations for this currency
    {
      name: 'SOL',
      multiplier: '1000000000',
      symbol: '◎'
    }
  ],
  metaTokens: []
}

export const makeSolanaPlugin = (opts: EdgeCorePluginOptions) => {
  return makeSolanaPluginInner(opts, currencyInfo)
}
