/* global */

import { EdgeCurrencyInfo } from 'edge-core-js/types'

import { makeOuterPlugin } from '../common/innerPlugin'
import type { PiratechainTools } from './PiratechainTools'
import {
  asPiratechainInfoPayload,
  PiratechainInfoPayload,
  PiratechainNetworkInfo
} from './piratechainTypes'

const networkInfo: PiratechainNetworkInfo = {
  rpcNode: {
    networkName: 'mainnet',
    defaultHost: 'lightd1.pirate.black',
    defaultPort: 443
  },
  // Plain gRPC, not gRPC-over-TLS. The SDK's own `test_node` succeeds against
  // `http://lightd1.pirate.black:9067` and fails against
  // `https://lightd1.pirate.black:443`, so this is the transport the node
  // actually serves; the SDK's built-in default node is plaintext too. That
  // leaves sync and broadcast traffic without TLS integrity or authentication,
  // which is a real exposure for a shielded chain: a network observer learns
  // which block ranges this device fetches and when it broadcasts, and an
  // active attacker can serve a forked view. Move to an `https://` endpoint
  // as soon as the Pirate team publishes a TLS-terminating lightwalletd this
  // SDK can complete a gRPC handshake against.
  lightwalletdUrl: 'http://lightd1.pirate.black:9067',
  defaultNetworkFee: '10000'
}

const currencyInfo: EdgeCurrencyInfo = {
  currencyCode: 'ARRR',
  assetDisplayName: 'Pirate Chain',
  chainDisplayName: 'Pirate Chain',
  pluginId: 'piratechain',
  requiredConfirmations: 10,
  syncDisplayPrecision: 6,
  unsafeBroadcastTx: true,
  unsafeSyncNetwork: true,
  walletType: 'wallet:piratechain',

  // Explorers:
  addressExplorer: '',
  transactionExplorer: 'https://explorer.pirate.black/tx/%s',

  denominations: [
    {
      name: 'ARRR',
      multiplier: '100000000',
      symbol: 'P'
    }
  ],

  // Copied from Zcash:
  memoOptions: [{ type: 'text', maxLength: 512 }],

  // Deprecated:
  displayName: 'Pirate Chain'
}

export const piratechain = makeOuterPlugin<
  PiratechainNetworkInfo,
  PiratechainTools,
  PiratechainInfoPayload
>({
  currencyInfo,
  asInfoPayload: asPiratechainInfoPayload,
  networkInfo,

  async getInnerPlugin() {
    /* webpackChunkName: "piratechain" */
    return await import('./PiratechainTools')
  }
})
