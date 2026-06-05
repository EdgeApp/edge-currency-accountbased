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
    defaultHost: 'lightwalletd2.cryptoforge.cc',
    defaultPort: 443
  },
  // gRPC over TLS. The Pirate team named this host and its sibling when they
  // retired the SDK's built-in default, and both terminate TLS on 443 with a
  // Let's Encrypt certificate whose SAN covers the lightwalletd name. Using
  // them replaces two problems at once. The plaintext endpoint this used to
  // name left sync and broadcast without TLS integrity or authentication,
  // which is a real exposure for a shielded chain: a network observer learns
  // which block ranges this device fetches and when it broadcasts, and an
  // active attacker can serve a forked view. It was also, separately, slow:
  // a cold scan of a 1.06M-block wallet took over half an hour against
  // `lightd1.pirate.black:9067` and 95 seconds against this host, on the same
  // simulator minutes apart (see the design doc's testing section).
  lightwalletdUrl: 'https://lightwalletd2.cryptoforge.cc:443',
  // Multi-server sync, on by default now that a second reachable node exists.
  // The SDK refuses a pool whose members disagree on transport ("Automatic
  // failover endpoint ... changes the connection security mode"), so every
  // entry here has to be TLS like the primary; `lightd1.pirate.black:9067`
  // stays out for that reason rather than for reachability.
  lightwalletdFailoverUrls: ['https://lightwalletd1.cryptoforge.cc:443'],
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
