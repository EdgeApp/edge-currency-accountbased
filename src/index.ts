import 'regenerator-runtime/runtime'

import type { EdgeCorePlugins } from 'edge-core-js/types'

import { monero } from './monero/moneroInfo'
import { makePluginMap } from './pluginMap'
import { zano } from './zano/zanoInfo'
import { zcash } from './zcash/zcashInfo'

const plugins = makePluginMap(monero, zano, zcash)

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
