/**
 * Created by paul on 8/8/17.
 */
// @flow

import 'regenerator-runtime/runtime'

import { makeBinancePlugin } from './binance/bnbPlugin.js'
import { makeEosPlugin } from './eos/eosPlugin.js'
import { makeEthereumPlugin } from './ethereum/ethPlugin.js'
import { makeRskPlugin } from './ethereum/rskPlugin.js'
import { makeFioPlugin } from './fio/fioPlugin'
import { makeStellarPlugin } from './stellar/stellarPlugin.js'
import { makeTezosPlugin } from './tezos/tezosPlugin.js'
import { makeRipplePlugin } from './xrp/xrpPlugin.js'

const plugins = {
  eos: makeEosPlugin,
  ethereum: makeEthereumPlugin,
  fio: makeFioPlugin,
  // "ripple" is network name. XRP is just an asset:
  ripple: makeRipplePlugin,
  stellar: makeStellarPlugin,
  tezos: makeTezosPlugin,
  rsk: makeRskPlugin,
  binance: makeBinancePlugin
}

if (
  typeof window !== 'undefined' &&
  typeof window.addEdgeCorePlugins === 'function'
) {
  window.addEdgeCorePlugins(plugins)
}

export default plugins
