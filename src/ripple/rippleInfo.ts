import { EdgeCurrencyInfo, EdgeTokenMap } from 'edge-core-js/types'

import { makeOuterPlugin } from '../common/innerPlugin'
import type { RippleTools } from './RippleTools'
import { asXrpInfoPayload, XrpInfoPayload, XrpNetworkInfo } from './rippleTypes'

export const DIVIDE_PRECISION = 18
export const EST_BLOCK_TIME_MS = 3500

const networkInfo: XrpNetworkInfo = {
  rippledServers: ['wss://s2.ripple.com', 'wss://xrplcluster.com'],
  defaultFee: '10', // in drops
  baseReserve: '1000000',
  baseReservePerToken: '200000'
}

const currencyInfo: EdgeCurrencyInfo = {
  currencyCode: 'XRP',
  assetDisplayName: 'XRP',
  chainDisplayName: 'XRP',
  pluginId: 'ripple',
  walletType: 'wallet:ripple',

  // Explorers:
  addressExplorer: 'https://xrpscan.com/account/%s',
  transactionExplorer: 'https://xrpscan.com/tx/%s',

  denominations: [
    {
      name: 'XRP',
      multiplier: '1000000',
      symbol: 'X'
    }
  ],

  memoOptions: [
    // https://xrpl.org/payment.html#payment-fields
    { type: 'number', memoName: 'destination tag', maxValue: '4294967295' },
    // https://xrpl.org/transaction-common-fields.html#memos-field
    { type: 'text', memoName: 'memo', maxLength: 990 }
  ],
  multipleMemos: true,

  // Deprecated:
  displayName: 'XRP'
}

export const builtinTokens: EdgeTokenMap = {
  '524C555344000000000000000000000000000000-rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De':
    {
      currencyCode: 'RLUSD',
      displayName: 'Ripple USD',
      denominations: [
        {
          name: 'RLUSD',
          multiplier: '1000000000000000000'
        }
      ],
      networkLocation: {
        currency: '524C555344000000000000000000000000000000',
        issuer: 'rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De'
      }
    },
  '534F4C4F00000000000000000000000000000000-rsoLo2S1kiGeCcn6hCUXVrCpGMWLrRrLZz':
    {
      currencyCode: 'SOLO',
      displayName: 'Sologenic',
      denominations: [
        {
          name: 'SOLO',
          multiplier: '1000000000000000000'
        }
      ],
      networkLocation: {
        currency: '534F4C4F00000000000000000000000000000000',
        issuer: 'rsoLo2S1kiGeCcn6hCUXVrCpGMWLrRrLZz'
      }
    },
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
  'EUR-rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B': {
    currencyCode: 'EUR.bs',
    displayName: 'Bitstamp EUR',
    denominations: [
      {
        name: 'EUR.bs',
        multiplier: '1000000000000000000'
      }
    ],
    networkLocation: {
      currency: 'EUR',
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

export const ripple = makeOuterPlugin<
  XrpNetworkInfo,
  RippleTools,
  XrpInfoPayload
>({
  builtinTokens,
  currencyInfo,
  asInfoPayload: asXrpInfoPayload,
  networkInfo,

  async getInnerPlugin() {
    return await import(
      /* webpackChunkName: "ripple" */
      './RippleTools'
    )
  }
})
