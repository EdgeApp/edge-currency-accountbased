import { EdgeCurrencyInfo } from 'edge-core-js/types'

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
  chainDisplayName: 'XRPL',
  pluginId: 'ripple',
  walletType: 'wallet:ripple',

  // Explorers:
  addressExplorer: 'https://xrpscan.com/account/%s',
  transactionExplorer: 'https://xrpscan.com/tx/%s',

  customTokenTemplate: [
    {
      displayName: 'Issuer Address',
      key: 'issuer',
      type: 'string'
    }
  ],

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
  displayName: 'XRPL' // Matches chainDisplayName
}

export const ripple = makeOuterPlugin<
  XrpNetworkInfo,
  RippleTools,
  XrpInfoPayload
>({
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
