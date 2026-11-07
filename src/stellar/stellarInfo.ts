import { EdgeCurrencyInfo, EdgeTokenMap } from 'edge-core-js/types'

import { makeOuterPlugin } from '../common/innerPlugin'
import type { StellarTools } from './StellarTools'
import {
  asStellarInfoPayload,
  StellarInfoPayload,
  StellarNetworkInfo
} from './stellarTypes'

// Issuers checked against each issuer's own stellar.toml:
// https://circle.com/.well-known/stellar.toml
// https://usdt0.to/.well-known/stellar.toml
export const builtinTokens: EdgeTokenMap = {
  'USDC-GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN': {
    currencyCode: 'USDC',
    displayName: 'USD Coin',
    denominations: [{ name: 'USDC', multiplier: '10000000' }],
    networkLocation: {
      code: 'USDC',
      issuer: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN'
    }
  },
  'USDT0-GATISXX6BZ6NC7IKQBY37CJD4SOZL3CYZJWXEDG6JVIY4WBS6KXJHN6Q': {
    currencyCode: 'USDT0',
    displayName: 'USDT0',
    denominations: [{ name: 'USDT0', multiplier: '10000000' }],
    networkLocation: {
      code: 'USDT0',
      issuer: 'GATISXX6BZ6NC7IKQBY37CJD4SOZL3CYZJWXEDG6JVIY4WBS6KXJHN6Q'
    }
  }
}

const networkInfo: StellarNetworkInfo = {
  baseReserve: '10000000',
  entryReserve: '5000000',
  networkPassphrase: 'Public Global Stellar Network ; September 2015',
  sponsoredTrustlines: false,
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
  multipleMemos: false,

  // Deprecated:
  displayName: 'Stellar'
}

export const stellar = makeOuterPlugin<
  StellarNetworkInfo,
  StellarTools,
  StellarInfoPayload
>({
  builtinTokens,
  currencyInfo,
  asInfoPayload: asStellarInfoPayload,
  networkInfo,

  checkEnvironment() {
    if (global.BigInt == null) {
      throw new Error('Stellar requires BigInt support')
    }
  },

  async getInnerPlugin() {
    return await import(
      /* webpackChunkName: "stellar" */
      './StellarTools'
    )
  }
})
