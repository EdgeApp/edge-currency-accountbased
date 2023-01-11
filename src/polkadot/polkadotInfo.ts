import { EdgeCurrencyInfo } from 'edge-core-js/types'

import { makeOuterPlugin } from '../common/innerPlugin'
import type { PolkadotTools } from './polkadotPlugin'
import { PolkadotSettings } from './polkadotTypes'

const otherSettings: PolkadotSettings = {
  rpcNodes: ['wss://rpc.polkadot.io'],
  genesisHash:
    '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
  subscanBaseUrl: 'https://polkadot.api.subscan.io/api',
  subscanQueryLimit: 100,
  existentialDeposit: '10000000000',
  lengthFeePerByte: '1000000'
}

const defaultSettings: any = {
  otherSettings
}

export const currencyInfo: EdgeCurrencyInfo = {
  // Basic currency information:
  currencyCode: 'DOT',
  displayName: 'Polkadot',
  pluginId: 'polkadot',
  walletType: 'wallet:polkadot',

  defaultSettings,

  addressExplorer: 'https://polkadot.subscan.io/account/%s',
  transactionExplorer: 'https://polkadot.subscan.io/extrinsic/%s',

  denominations: [
    // An array of Objects of the possible denominations for this currency
    {
      name: 'DOT',
      multiplier: '10000000000',
      symbol: ''
    }
  ],
  metaTokens: []
}

export const polkadot = makeOuterPlugin<{}, PolkadotTools>({
  currencyInfo,
  networkInfo: {},

  async getInnerPlugin() {
    return await import(
      /* webpackChunkName: "polkadot" */
      './polkadotPlugin'
    )
  }
})
