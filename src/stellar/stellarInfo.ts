import { EdgeCurrencyInfo } from 'edge-core-js/types'

import { makeOuterPlugin } from '../common/innerPlugin'
import type { StellarTools } from './StellarTools'
import {
  asStellarInfoPayload,
  StellarInfoPayload,
  StellarNetworkInfo
} from './stellarTypes'

const networkInfo: StellarNetworkInfo = {
  baseReserve: '10000000',
  stellarServers: ['https://horizon.stellar.org']
}

const currencyInfo: EdgeCurrencyInfo = {
  currencyCode: 'XLM',
  assetDisplayName: 'Stellar',
  chainDisplayName: 'Stellar',
  pluginId: 'stellar',
  walletType: 'wallet:stellar',

  // Explorers:
  addressExplorer: 'https://stellarchain.io/address/%s',
  transactionExplorer: 'https://stellarchain.io/tx/%s',

  denominations: [
    {
      name: 'XLM',
      multiplier: '10000000',
      symbol: '*'
    }
  ],

  // https://developers.stellar.org/docs/encyclopedia/memos
  memoOptions: [
    { type: 'text', memoName: 'memo_text', maxLength: 28 },
    { type: 'number', memoName: 'memo_id', maxValue: '18446744073709551615' },
    {
      type: 'hex',
      memoName: 'memo_hash',
      hidden: true,
      maxBytes: 32,
      minBytes: 32
    }
    // We also support a transaction ID for returned funds
  ],
  multipleMemos: true,

  // Deprecated:
  displayName: 'Stellar'
}

export const stellar = makeOuterPlugin<
  StellarNetworkInfo,
  StellarTools,
  StellarInfoPayload
>({
  currencyInfo,
  asInfoPayload: asStellarInfoPayload,
  networkInfo,

  async getInnerPlugin() {
    return await import(
      /* webpackChunkName: "stellar" */
      './StellarTools'
    )
  }
})
