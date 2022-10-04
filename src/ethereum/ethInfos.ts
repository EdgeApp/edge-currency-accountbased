import { makeAvalanchePlugin } from './info/avaxInfo'
import { makeBinanceSmartChainPlugin } from './info/bscInfo'
import { makeCeloPlugin } from './info/celoInfo'
import { makeEthereumClassicPlugin } from './info/etcInfo'
import { makeEthDevPlugin } from './info/ethDevInfo'
import { makeEthereumPlugin } from './info/ethInfo'
import { makeEthereumPoWPlugin } from './info/ethwInfo'
import { makeFantomPlugin } from './info/ftmInfo'
import { makeGoerliPlugin } from './info/goerliInfo'
import { makeKovanPlugin } from './info/kovanInfo'
import { makePolygonPlugin } from './info/maticInfo'
import { makeRinkebyPlugin } from './info/rinkebyInfo'
import { makeRopstenPlugin } from './info/ropstenInfo'
import { makeRskPlugin } from './info/rskInfo'

export const ethPlugins = {
  binancesmartchain: makeBinanceSmartChainPlugin,
  ethereum: makeEthereumPlugin,
  ethereumclassic: makeEthereumClassicPlugin,
  ethereumpow: makeEthereumPoWPlugin,
  ethDev: makeEthDevPlugin,
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
