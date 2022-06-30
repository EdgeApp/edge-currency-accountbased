/**
 * Created by paul on 8/8/17.
 */
// @flow

import 'regenerator-runtime/runtime'

import { makeBinancePlugin } from './binance/bnbPlugin.js'
import { eosPlugins } from './eos/index.js'
import { ethPlugins } from './ethereum/ethInfos.js'
import { makeFioPlugin } from './fio/fioPlugin'
import { makeHederaPlugin } from './hedera/hederaInfo.js'
import { makeSolanaPlugin } from './solana/solanaInfo.js'
import { makeStellarPlugin } from './stellar/stellarPlugin.js'
import { makeTezosPlugin } from './tezos/tezosPlugin.js'
import { makeRipplePlugin } from './xrp/xrpPlugin.js'
import { makeZcashPlugin } from './zcash/zecPlugin.js'

const plugins = {
  ...eosPlugins,
  ...ethPlugins,
  binance: makeBinancePlugin,
  fio: makeFioPlugin,
  hedera: makeHederaPlugin,
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
  window.addEdgeCorePlugins(plugins)
}

export default plugins
