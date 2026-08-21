import 'regenerator-runtime/runtime'

import { monero } from './monero/moneroInfo.node'
import { makePluginMap } from './pluginMap'
import { zano } from './zano/zanoInfo.node'

export default makePluginMap(monero, zano)
