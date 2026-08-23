import { EdgeCurrencyInfo } from 'edge-core-js/types'

import { makeOuterPlugin } from '../common/innerPlugin'
import type { AnimicaTools } from './AnimicaTools'
import {
  AnimicaInfoPayload,
  AnimicaNetworkInfo,
  asAnimicaInfoPayload
} from './animicaTypes'

/**
 * Animica (ANM): a proof-of-work L1 with post-quantum ML-DSA-65 (FIPS 204)
 * account signatures. Mainnet has been live since 2026-04.
 *
 * Resources:
 * - Website:       https://animica.org
 * - Explorer:      https://explorer.animica.org
 * - RPC:           https://rpc.animica.org/rpc (JSON-RPC 2.0, CORS enabled)
 * - Source:        https://github.com/animicaorg/all
 * - HD derivation: https://github.com/animicaorg/all/blob/36f995f241cd3e54f66c7a5a6f373d4587bbc60d/docs/wallet/HD_DERIVATION.md
 * - Market:        https://nonkyc.io/market/ANM_USDT
 */

const networkInfo: AnimicaNetworkInfo = {
  rpcServers: ['https://rpc.animica.org/rpc'],
  explorerApi: 'https://explorer.animica.org/api',
  chainId: 1,
  genesisHash:
    '0xa0892158cf997c56e91d0aa12e60c36037dae34800a2b54111a8fa17ec88b7de',
  forkId: 3511060514,
  gasLimit: '21000',
  defaultGasPrice: '1',
  validityWindow: 120,
  pluginMnemonicKeyName: 'animicaMnemonic'
}

const currencyInfo: EdgeCurrencyInfo = {
  currencyCode: 'ANM',
  assetDisplayName: 'Animica',
  chainDisplayName: 'Animica',
  pluginId: 'animica',
  walletType: 'wallet:animica',

  // Explorers:
  addressExplorer: 'https://explorer.animica.org/address/%s',
  transactionExplorer: 'https://explorer.animica.org/tx/%s',

  denominations: [
    {
      name: 'ANM',
      multiplier: '1000000000',
      symbol: ''
    },
    {
      name: 'nANM',
      multiplier: '1',
      symbol: ''
    }
  ],

  // Proof-of-work with no finality gadget, so wait for a few blocks:
  requiredConfirmations: 6,

  // Deprecated:
  displayName: 'Animica'
}

export const animica = makeOuterPlugin<
  AnimicaNetworkInfo,
  AnimicaTools,
  AnimicaInfoPayload
>({
  currencyInfo,
  asInfoPayload: asAnimicaInfoPayload,
  networkInfo,

  checkEnvironment() {
    if (global.BigInt == null) {
      throw new Error('Animica requires BigInt support')
    }
  },

  async getInnerPlugin() {
    return await import(
      /* webpackChunkName: "animica" */
      './AnimicaTools'
    )
  }
})
