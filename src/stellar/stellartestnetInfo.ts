import { EdgeCurrencyInfo, EdgeTokenMap } from 'edge-core-js/types'

import { makeOuterPlugin } from '../common/innerPlugin'
import type { StellarTools } from './StellarTools'
import {
  asStellarInfoPayload,
  StellarInfoPayload,
  StellarNetworkInfo
} from './stellarTypes'

// Circle's testnet USDC, the asset testanchor.stellar.org deposits:
export const builtinTokens: EdgeTokenMap = {
  'USDC-GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5': {
    currencyCode: 'USDC',
    displayName: 'USD Coin',
    denominations: [{ name: 'USDC', multiplier: '10000000' }],
    networkLocation: {
      code: 'USDC',
      issuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5'
    }
  }
}

const networkInfo: StellarNetworkInfo = {
  baseReserve: '10000000',
  entryReserve: '5000000',
  // Networks.TESTNET, written out so the outer plugin does not pull in stellar-sdk:
  networkPassphrase: 'Test SDF Network ; September 2015',
  sponsoredTrustlines: false,
  stellarServers: ['https://horizon-testnet.stellar.org']
}

const currencyInfo: EdgeCurrencyInfo = {
  currencyCode: 'XLM',
  assetDisplayName: 'Stellar Testnet',
  chainDisplayName: 'Stellar Testnet',
  pluginId: 'stellartestnet',
  walletType: 'wallet:stellartestnet',

  // Explorers:
  addressExplorer: 'https://stellar.expert/explorer/testnet/account/%s',
  transactionExplorer: 'https://stellar.expert/explorer/testnet/tx/%s',

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
  ],
  multipleMemos: false,

  // Deprecated:
  displayName: 'Stellar Testnet'
}

export const stellartestnet = makeOuterPlugin<
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
