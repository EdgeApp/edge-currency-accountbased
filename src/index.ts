import 'regenerator-runtime/runtime'

import type { EdgeCorePlugins } from 'edge-core-js/types'

import { monero } from './monero/moneroInfo'
import { piratechain } from './piratechain/piratechainInfo'
import { makePluginMap } from './pluginMap'
import { zano } from './zano/zanoInfo'
import { zcash } from './zcash/zcashInfo'

const plugins = makePluginMap(monero, piratechain, zano, zcash)

declare global {
  interface Window {
    addEdgeCorePlugins?: (plugins: EdgeCorePlugins) => void
  }
}

if (
  typeof window !== 'undefined' &&
  typeof window.addEdgeCorePlugins === 'function'
) {
  window.addEdgeCorePlugins(plugins)
}

export default plugins
