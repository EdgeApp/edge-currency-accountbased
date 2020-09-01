/* global */
// @flow

import { HbarUnit } from '@hashgraph/sdk'
import { type EdgeCurrencyInfo } from 'edge-core-js/types'

import { imageServerUrl } from '../common/utils'
// import { imageServerUrl } from '../common/utils'
import { type HederaSettings } from './hederaTypes.js'

export const useTestnet = false

const otherSettings: HederaSettings = {
  creatorApiServers: useTestnet
    ? ['https://creator.testnet.myhbarwallet.com']
    : ['https://creator.myhbarwallet.com'],
  kabutoApiServers: useTestnet
    ? ['https://api.testnet.kabuto.sh']
    : ['https://api.kabuto.sh']
}

const defaultSettings: any = {
  otherSettings
}

const network = useTestnet ? 'testnet' : 'mainnet'

export const currencyInfo: EdgeCurrencyInfo = {
  // Basic currency information:
  currencyCode: 'HBAR',
  displayName: 'Hedera HBAR',
  pluginId: 'hedera',
  walletType: 'wallet:hedera',

  defaultSettings,

  addressExplorer: `https://explorer.kabuto.sh/${network}/id/%s`,
  transactionExplorer: `https://explorer.kabuto.sh/${network}/search?id=%s`,

  denominations: [
    // An array of Objects of the possible denominations for this currency
    // other denominations are specified but these are the most common
    {
      name: 'HBAR',
      multiplier: '100000000', // 100,000,000
      symbol: HbarUnit.Hbar.getSymbol()
    },
    {
      name: 'tHBAR',
      multiplier: '1',
      symbol: HbarUnit.Tinybar.getSymbol()
    }
  ],
  symbolImage: `${imageServerUrl}/hedera-white.png`,
  symbolImageDarkMono: `${imageServerUrl}/hedera-black.png`,
  metaTokens: []
}
