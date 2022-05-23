// @flow

import { makeAvalanchePlugin } from './info/avaxInfo'
import { makeBinanceSmartChainPlugin } from './info/bscInfo.js'
import { makeCeloPlugin } from './info/celoInfo.js'
import { makeEthereumClassicPlugin } from './info/etcInfo.js'
import { makeEthereumPlugin } from './info/ethInfo.js'
import { makeFantomPlugin } from './info/ftmInfo.js'
import { makeGoerliPlugin } from './info/goerliInfo.js'
import { makeKovanPlugin } from './info/kovanInfo.js'
import { makePolygonPlugin } from './info/maticInfo'
import { makeRinkebyPlugin } from './info/rinkebyInfo.js'
import { makeRopstenPlugin } from './info/ropstenInfo.js'
import { makeRskPlugin } from './info/rskInfo.js'

export const ethPlugins = {
  binancesmartchain: makeBinanceSmartChainPlugin,
  ethereum: makeEthereumPlugin,
  ethereumclassic: makeEthereumClassicPlugin,
  fantom: makeFantomPlugin,
  goerli: makeGoerliPlugin,
  kovan: makeKovanPlugin,
  rinkeby: makeRinkebyPlugin,
  ropsten: makeRopstenPlugin,
  rsk: makeRskPlugin,
  polygon: makePolygonPlugin,
  celo: makeCeloPlugin,
  avalanche: makeAvalanchePlugin
}
