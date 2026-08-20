import 'regenerator-runtime/runtime'

import { monero } from './monero/moneroInfo.node'
import { makePluginMap } from './pluginMap'

export default makePluginMap(monero)
