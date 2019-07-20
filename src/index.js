/**
 * Created by paul on 8/8/17.
 */
// @flow

import 'regenerator-runtime/runtime'

import { makeBinancePlugin } from './binance/bnbPlugin.js'
import { makeEosPlugin } from './eos/eosPlugin.js'
import { makeEthereumPlugin } from './ethereum/ethPlugin.js'
import { makeStellarPlugin } from './stellar/stellarPlugin.js'
import { makeRipplePlugin } from './xrp/xrpPlugin.js'

const plugins = {
  eos: makeEosPlugin,
  ethereum: makeEthereumPlugin,
  // "ripple" is network name. XRP is just an asset:
  ripple: makeRipplePlugin,
  stellar: makeStellarPlugin,
  binance: makeBinancePlugin
}

if (
  typeof window !== 'undefined' &&
  typeof window.addEdgeCorePlugins === 'function'
) {
  window.addEdgeCorePlugins(plugins)
}

export default plugins
