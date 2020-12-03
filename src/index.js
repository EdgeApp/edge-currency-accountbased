/**
 * Created by paul on 8/8/17.
 */
// @flow

import 'regenerator-runtime/runtime'

import { makeBinancePlugin } from './binance/bnbPlugin.js'
import { makeEosPlugin } from './eos/eosInfo.js'
import { makeTelosPlugin } from './eos/telosInfo.js'
import { makeWaxPlugin } from './eos/waxInfo.js'
import { makeEthereumClassicPlugin } from './ethereum/etcInfo.js'
import { makeEthereumPlugin } from './ethereum/ethInfo.js'
import { makeRskPlugin } from './ethereum/rskInfo.js'
import { makeFioPlugin } from './fio/fioPlugin'
import { makeStellarPlugin } from './stellar/stellarPlugin.js'
import { makeTezosPlugin } from './tezos/tezosPlugin.js'
import { makeRipplePlugin } from './xrp/xrpPlugin.js'
import { makeZcashPlugin } from './zcash/zcashPlugin'

const plugins = {
  eos: makeEosPlugin,
  telos: makeTelosPlugin,
  wax: makeWaxPlugin,
  ethereum: makeEthereumPlugin,
  ethereumclassic: makeEthereumClassicPlugin,
  fio: makeFioPlugin,
  // "ripple" is network name. XRP is just an asset:
  ripple: makeRipplePlugin,
  stellar: makeStellarPlugin,
  tezos: makeTezosPlugin,
  rsk: makeRskPlugin,
  zcash: makeZcashPlugin,
  binance: makeBinancePlugin
}

if (
  typeof window !== 'undefined' &&
  typeof window.addEdgeCorePlugins === 'function'
) {
  window.addEdgeCorePlugins(plugins)
}

export default plugins
