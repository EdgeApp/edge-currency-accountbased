/**
 * Created by paul on 8/8/17.
 */
// @flow

import 'regenerator-runtime/runtime'

import { makeBinancePlugin } from './binance/bnbPlugin.js'
import { makeEosPlugin } from './eos/eosPlugin.js'
import { makeEthereumClassicPlugin } from './ethereum/etcInfo.js'
import { makeEthereumPlugin } from './ethereum/ethInfo.js'
import { makeRskPlugin } from './ethereum/rskInfo.js'
import { makeFioPlugin } from './fio/fioPlugin'
import { makeNeoPlugin } from './neo/neoPlugin.js'
import { makeOnePlugin } from './one/onePlugin.js'
import { makeStellarPlugin } from './stellar/stellarPlugin.js'
import { makeTezosPlugin } from './tezos/tezosPlugin.js'
import { makeTronPlugin } from './tron/tronPlugin.js'
import { makeRipplePlugin } from './xrp/xrpPlugin.js'

const plugins = {
  eos: makeEosPlugin,
  ethereum: makeEthereumPlugin,
  ethereumclassic: makeEthereumClassicPlugin,
  fio: makeFioPlugin,
  // "ripple" is network name. XRP is just an asset:
  ripple: makeRipplePlugin,
  stellar: makeStellarPlugin,
  tezos: makeTezosPlugin,
  rsk: makeRskPlugin,
  binance: makeBinancePlugin,
  tron: makeTronPlugin,
  neo: makeNeoPlugin,
  one: makeOnePlugin
}

if (
  typeof window !== 'undefined' &&
  typeof window.addEdgeCorePlugins === 'function'
) {
  window.addEdgeCorePlugins(plugins)
}

export default plugins
