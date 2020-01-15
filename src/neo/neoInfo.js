// @flow
import { type EdgeCurrencyInfo } from 'edge-core-js/types'

import { imageServerUrl } from '../common/utils'

const defaultSettings = {
  neoRpcNodes: ['https://seed11.ngd.network:10331'],
  assets: {
    NEO: '0xc56f33fc6ecfcd0c225c4ab356fee59390af8560be0e930faebe74a6daff7c9b',
    GAS: '0x602c79718b16e442de58778e148d0b1084e3b2dffd5de6b7b16cee7969282de7'
  },
  neoScanUrl: {
    MainNet: 'https://api.neoscan.io/api/main_net',
    TestNet: 'https://neoscan-testnet.io/api/test_net'
  }
}

export const currencyInfo: EdgeCurrencyInfo = {
  // Basic currency information:
  currencyCode: 'NEO',
  displayName: 'NEO',
  pluginName: 'neo',
  walletType: 'wallet:neo',

  defaultSettings,

  addressExplorer: 'https://neoscan.io/addresses/%s',
  transactionExplorer: 'https://neoscan.io/transactions/%s',

  denominations: [
    // An array of Objects of the possible denominations for this currency
    {
      name: 'NEO',
      multiplier: '1',
      symbol: 'N'
    }
  ],
  symbolImage: `${imageServerUrl}/eos-logo-solo-64.png`, // TODO: upload currency logo
  symbolImageDarkMono: `${imageServerUrl}/eos-logo-solo-64.png`, // TODO: upload currency logo
  metaTokens: []
}
