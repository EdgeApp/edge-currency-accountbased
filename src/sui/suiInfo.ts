import { EdgeCurrencyInfo, EdgeTokenMap } from 'edge-core-js/types'

import { makeOuterPlugin } from '../common/innerPlugin'
import type { SuiTools } from './SuiTools'
import { asSuiInfoPayload, SuiInfoPayload, SuiNetworkInfo } from './suiTypes'

const builtinTokens: EdgeTokenMap = {
  '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7usdcUSDC':
    {
      currencyCode: 'USDC',
      denominations: [{ multiplier: '1000000', name: 'USDC' }],
      displayName: 'USD Coin',
      networkLocation: {
        contractAddress:
          '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC'
      }
    }
}

const networkInfo: SuiNetworkInfo = {
  network: 'mainnet',
  pluginMnemonicKeyName: 'suiMnemonic',
  totalSupply: '10000000000000000000',

  // Mysten removed JSON-RPC from the public fullnodes, so `getFullnodeUrl` is
  // no longer usable. These are third-party nodes that still serve it.
  rpcNodes: [
    'https://sui-rpc.publicnode.com',
    'https://rpc-mainnet.suiscan.xyz'
    // mainnet.suiet.app is left out: its owner index is missing coin objects,
    // so it reports balances short of what the address really holds.
  ],
  rpcNodesArchival: [
    // Both list an address's digests back to its first transaction, but keep
    // the transactions themselves for only days:
    'https://sui-rpc.publicnode.com',
    'https://rpc-mainnet.suiscan.xyz'
    // blockvision's public endpoint rate-limits below the 5 req/s its own docs
    // advertise, and returns no Retry-After to pace against. Left out rather
    // than have sweeps stall on it.
  ],
  // Mysten's own service, which holds every transaction in full:
  graphqlNodes: ['https://graphql.mainnet.sui.io/graphql'],
  maxRequestsPerSecond: 10
}

export const currencyInfo: EdgeCurrencyInfo = {
  currencyCode: 'SUI',
  assetDisplayName: 'Sui',
  chainDisplayName: 'Sui',
  pluginId: 'sui',
  walletType: 'wallet:sui',

  // Explorers:
  addressExplorer: 'https://suivision.xyz/account/%s',
  transactionExplorer: 'https://suivision.xyz/txblock/%s',

  denominations: [
    {
      name: 'SUI',
      multiplier: '1000000000',
      symbol: ''
    }
  ],

  memoOptions: [{ type: 'text', memoName: 'memo', maxLength: 127 }],

  // Deprecated:
  displayName: 'Sui'
}

export const sui = makeOuterPlugin<SuiNetworkInfo, SuiTools, SuiInfoPayload>({
  builtinTokens,
  currencyInfo,
  asInfoPayload: asSuiInfoPayload,
  networkInfo,

  checkEnvironment() {
    if (global.BigInt == null) {
      throw new Error('SUI requires BigInt support')
    }
  },

  async getInnerPlugin() {
    return await import(
      /* webpackChunkName: "sui" */
      './SuiTools'
    )
  }
})
