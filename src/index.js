/**
 * Created by paul on 8/8/17.
 */
// @flow

import 'regenerator-runtime/runtime'

import { makeBinancePlugin } from './binance/bnbPlugin'
import { makeEosPlugin } from './eos/eosPlugin'
import { makeTelosPlugin } from './eos/telosPlugin'
import { makeEthereumPlugin } from './ethereum/ethPlugin'
import { makeFioPlugin } from './fio/fioPlugin'
import { makeRskPlugin } from './rsk/rskPlugin'
import { makeStellarPlugin } from './stellar/stellarPlugin'
import { makeTezosPlugin } from './tezos/tezosPlugin'
import { makeRipplePlugin } from './xrp/xrpPlugin'

const plugins = {
  eos: makeEosPlugin,
  telos: makeTelosPlugin,
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
