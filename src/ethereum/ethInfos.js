// @flow

import { makeAvalanchePlugin } from './info/avaxInfo'
import { makeBinanceSmartChainPlugin } from './info/bscInfo.js'
import { makeCeloPlugin } from './info/celoInfo.js'
import { makeEthereumClassicPlugin } from './info/etcInfo.js'
import { makeEthDevPlugin } from './info/ethDevInfo.js'
import { makeEthereumPlugin } from './info/ethInfo.js'
import { makeFantomPlugin } from './info/ftmInfo.js'
import { makeGoerliPlugin } from './info/goerliInfo.js'
import { makeKovanPlugin } from './info/kovanInfo.js'
import { makePolygonPlugin } from './info/maticInfo'
import { makeMumbaiPlugin } from './info/mumbaiInfo'
import { makeRinkebyPlugin } from './info/rinkebyInfo.js'
import { makeRopstenPlugin } from './info/ropstenInfo.js'
import { makeRskPlugin } from './info/rskInfo.js'

export const ethPlugins = {
  avalanche: makeAvalanchePlugin,
  binancesmartchain: makeBinanceSmartChainPlugin,
  celo: makeCeloPlugin,
  ethereum: makeEthereumPlugin,
  ethereumclassic: makeEthereumClassicPlugin,
  ethDev: makeEthDevPlugin,
  fantom: makeFantomPlugin,
  goerli: makeGoerliPlugin,
  kovan: makeKovanPlugin,
  mumbai: makeMumbaiPlugin,
  polygon: makePolygonPlugin,
  rinkeby: makeRinkebyPlugin,
  ropsten: makeRopstenPlugin,
  rsk: makeRskPlugin
}
