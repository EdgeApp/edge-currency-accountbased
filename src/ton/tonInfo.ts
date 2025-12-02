import { Address } from '@ton/core'
import { EdgeCurrencyInfo, EdgeTokenMap } from 'edge-core-js/types'

import { makeOuterPlugin } from '../common/innerPlugin'
import { makeMetaTokens } from '../common/tokenHelpers'
import type { TonTools } from './TonTools'
import { asTonInfoPayload, TonInfoPayload, TonNetworkInfo } from './tonTypes'

//
// Jetton (TEP-74) Tokens
// TokenId is the raw address format of the jetton master contract
//

const builtinTokens: EdgeTokenMap = {
  // USDT on TON - Official Tether contract
  '0:b113a994b5024a16719f69139328eb759596c38a25f590288b1c46fe4dc3621d': {
    currencyCode: 'USDT',
    displayName: 'Tether USD',
    denominations: [{ name: 'USDT', multiplier: '1000000' }], // 6 decimals
    networkLocation: {
      contractAddress: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs'
    }
  }
}

const networkInfo: TonNetworkInfo = {
  defaultWalletContract: 'v5r1',
  minimumAddressBalance: '50000000', // 0.5 TON There isn't a hardcoded minimum but the user needs to keep something left
  pluginMnemonicKeyName: 'tonMnemonic',
  tonCenterUrl: 'https://toncenter.com/api/v2/jsonRPC',
  tonOrbsServers: [
    'https://ton.access.orbs.network/4410c0ff5Bd3F8B62C092Ab4D238bEE463E64410/1/mainnet/toncenter-api-v2/jsonRPC',
    'https://ton.access.orbs.network/4411c0ff5Bd3F8B62C092Ab4D238bEE463E64411/1/mainnet/toncenter-api-v2/jsonRPC',
    'https://ton.access.orbs.network/4412c0ff5Bd3F8B62C092Ab4D238bEE463E64412/1/mainnet/toncenter-api-v2/jsonRPC',
    'https://ton.access.orbs.network/55013c0ff5Bd3F8B62C092Ab4D238bEE463E5501/1/mainnet/toncenter-api-v2/jsonRPC',
    'https://ton.access.orbs.network/55023c0ff5Bd3F8B62C092Ab4D238bEE463E5502/1/mainnet/toncenter-api-v2/jsonRPC',
    'https://ton.access.orbs.network/55033c0ff5Bd3F8B62C092Ab4D238bEE463E5503/1/mainnet/toncenter-api-v2/jsonRPC'
  ]
}

const currencyInfo: EdgeCurrencyInfo = {
  currencyCode: 'TON',
  assetDisplayName: 'Toncoin',
  chainDisplayName: 'Toncoin',
  pluginId: 'ton',
  walletType: 'wallet:ton',

  // Explorers:
  addressExplorer: 'https://tonscan.org/address/%s',
  transactionExplorer: 'https://tonscan.org/tx/%s',

  // Identical to evmCustomTokenTemplate, but would be weird to import for TON so keeping it distinct.
  customTokenTemplate: [
    {
      displayName: 'Contract Address',
      key: 'contractAddress',
      type: 'string'
    }
  ],
  denominations: [
    {
      name: 'TON',
      multiplier: '1000000000',
      symbol: ''
    }
  ],

  memoOptions: [{ type: 'text', memoName: 'memo', maxLength: 127 }],

  // Deprecated:
  displayName: 'Toncoin',
  metaTokens: makeMetaTokens(builtinTokens)
}

/**
 * Convert a user-friendly TON address to raw format for use as tokenId.
 * Raw format: workchain:hex_address (e.g., "0:b113a994...")
 */
const addressToRaw = (friendlyAddress: string): string => {
  const addr = Address.parse(friendlyAddress)
  return `${addr.workChain}:${addr.hash.toString('hex')}`
}

export const ton = makeOuterPlugin<TonNetworkInfo, TonTools, TonInfoPayload>({
  builtinTokens,
  currencyInfo,
  asInfoPayload: asTonInfoPayload,
  networkInfo,

  checkEnvironment() {
    if (global.BigInt == null) {
      throw new Error('TON requires BigInt support')
    }
  },

  createTokenId(token) {
    const { networkLocation } = token
    if (
      networkLocation == null ||
      typeof networkLocation !== 'object' ||
      !('contractAddress' in networkLocation) ||
      typeof networkLocation.contractAddress !== 'string'
    ) {
      throw new Error('Invalid jetton contract address')
    }
    // Normalize to raw address format for consistent tokenId
    return addressToRaw(networkLocation.contractAddress)
  },

  async getInnerPlugin() {
    return await import(
      /* webpackChunkName: "ton" */
      './TonTools'
    )
  }
})
