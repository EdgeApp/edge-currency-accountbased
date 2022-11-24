/**
 * Created by paul on 8/8/17.
 */

import 'regenerator-runtime/runtime'

import { makeBinancePlugin } from './binance/bnbPlugin'
import { eosPlugins } from './eos/index'
import { ethPlugins } from './ethereum/ethInfos'
import { makeFioPlugin } from './fio/fioPlugin'
import { makeHederaPlugin } from './hedera/hederaInfo'
import { makePolkadotPlugin } from './polkadot/polkadotInfo'
import { makeSolanaPlugin } from './solana/solanaInfo'
import { makeStellarPlugin } from './stellar/stellarPlugin'
import { makeTezosPlugin } from './tezos/tezosPlugin'
import { makeRipplePlugin } from './xrp/xrpPlugin'
import { makeZcashPlugin } from './zcash/zecPlugin'

const plugins = {
  ...eosPlugins,
  ...ethPlugins,
  binance: makeBinancePlugin,
  fio: makeFioPlugin,
  hedera: makeHederaPlugin,
  polkadot: makePolkadotPlugin,
  // "ripple" is network name. XRP is just an asset:
  ripple: makeRipplePlugin,
  solana: makeSolanaPlugin,
  stellar: makeStellarPlugin,
  tezos: makeTezosPlugin,
  zcash: makeZcashPlugin
}

if (
  typeof window !== 'undefined' &&
  typeof window.addEdgeCorePlugins === 'function'
) {
  // @ts-expect-error
  window.addEdgeCorePlugins(plugins)
}

export default plugins
