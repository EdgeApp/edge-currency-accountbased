import { EdgeCurrencyInfo, EdgeTokenMap } from 'edge-core-js/types'

import { makeOuterPlugin } from '../common/innerPlugin'
import type { RippleTools } from './RippleTools'
import type { XrpNetworkInfo } from './rippleTypes'

const networkInfo: XrpNetworkInfo = {
  rippledServers: ['wss://s2.ripple.com', 'wss://xrplcluster.com'],
  defaultFee: '10', // in drops
  baseReserve: '10000000',
  baseReservePerToken: '2000000'
}

export const currencyInfo: EdgeCurrencyInfo = {
  // Basic currency information:
  currencyCode: 'XRP',
  displayName: 'XRP',
  pluginId: 'ripple',
  walletType: 'wallet:ripple',

  defaultSettings: {},

  memoMaxLength: 10,
  memoMaxValue: '4294967295',

  addressExplorer: 'https://xrpscan.com/account/%s',
  transactionExplorer: 'https://xrpscan.com/tx/%s',

  denominations: [
    // An array of Objects of the possible denominations for this currency
    {
      name: 'XRP',
      multiplier: '1000000',
      symbol: 'X'
    }
  ],
  metaTokens: [] // Deprecated
}

export const builtinTokens: EdgeTokenMap = {
  'USD-rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq': {
    currencyCode: 'USD.gh',
    displayName: 'Gatehub USD',
    denominations: [
      {
        name: 'USD.gh',
        multiplier: '1000000000000000000'
      }
    ],
    networkLocation: {
      currency: 'USD',
      issuer: 'rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq'
    }
  },
  'EUR-rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq': {
    currencyCode: 'EUR.gh',
    displayName: 'Gatehub EUR',
    denominations: [
      {
        name: 'EUR.gh',
        multiplier: '1000000000000000000'
      }
    ],
    networkLocation: {
      currency: 'EUR',
      issuer: 'rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq'
    }
  },
  'USD-rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B': {
    currencyCode: 'USD.bs',
    displayName: 'Bitstamp USD',
    denominations: [
      {
        name: 'USD.bs',
        multiplier: '1000000000000000000'
      }
    ],
    networkLocation: {
      currency: 'USD',
      issuer: 'rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B'
    }
  },
  'USD-rEn9eRkX25wfGPLysUMAvZ84jAzFNpT5fL': {
    currencyCode: 'USD.st',
    displayName: 'Stably USD',
    denominations: [
      {
        name: 'USD.st',
        multiplier: '1000000000000000000'
      }
    ],
    networkLocation: {
      currency: 'USD',
      issuer: 'rEn9eRkX25wfGPLysUMAvZ84jAzFNpT5fL'
    }
  }
}

export const ripple = makeOuterPlugin<XrpNetworkInfo, RippleTools>({
  builtinTokens,
  currencyInfo,
  networkInfo,

  async getInnerPlugin() {
    return await import(
      /* webpackChunkName: "ripple" */
      './RippleTools'
    )
  }
})
