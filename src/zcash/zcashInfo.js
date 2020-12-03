/* global */
// @flow

import type { EdgeCurrencyInfo } from 'edge-core-js/types'

import { imageServerUrl } from '../common/utils'
import type { ZcashSettings } from './zcashTypes'

const otherSettings: ZcashSettings = {}

const defaultSettings: any = {
  customFeeSettings: ['gasLimit', 'gasPrice'],
  otherSettings
}

export const currencyInfo: EdgeCurrencyInfo = {
  // Basic currency information:
  currencyCode: 'ZEC',
  displayName: 'Zcash',
  pluginId: 'zcash',
  walletType: 'wallet:zcash',

  defaultSettings,

  addressExplorer: 'https://etherscan.io/address/%s',
  transactionExplorer: 'https://etherscan.io/tx/%s',

  denominations: [
    // An array of Objects of the possible denominations for this currency
    {
      name: 'ZEC',
      multiplier: '1000000000000000000',
      symbol: 'Ξ'
    },
    {
      name: 'mZEC',
      multiplier: '1000000000000000',
      symbol: 'mΞ'
    }
  ],
  symbolImage: `${imageServerUrl}/zcash-logo-solo-64.png`,
  symbolImageDarkMono: `${imageServerUrl}/zcash-logo-solo-64.png`,
  metaTokens: []
}
