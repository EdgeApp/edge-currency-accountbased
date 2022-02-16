// @flow

import { makeAvalanchePlugin } from './avaxInfo'
import { makeBinanceSmartChainPlugin } from './bscInfo.js'
import { makeCeloPlugin } from './celoInfo.js'
import { makeEthereumClassicPlugin } from './etcInfo.js'
import { makeEthereumPlugin } from './ethInfo.js'
import { makeFantomPlugin } from './ftminfo.js'
import { makePolygonPlugin } from './maticInfo'
import { makeRskPlugin } from './rskInfo.js'

export const ethPlugins = {
  binancesmartchain: makeBinanceSmartChainPlugin,
  ethereum: makeEthereumPlugin,
  ethereumclassic: makeEthereumClassicPlugin,
  fantom: makeFantomPlugin,
  rsk: makeRskPlugin,
  polygon: makePolygonPlugin,
  celo: makeCeloPlugin,
  avalanche: makeAvalanchePlugin
}
