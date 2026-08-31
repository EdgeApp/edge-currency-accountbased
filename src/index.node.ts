import 'regenerator-runtime/runtime'

import { dashshielded } from './dashshielded/dashshieldedInfo.node'
import { monero } from './monero/moneroInfo.node'
import { makePluginMap } from './pluginMap'
import { zano } from './zano/zanoInfo.node'
import { zcash } from './zcash/zcashInfo.node'

export default makePluginMap(monero, zano, zcash, dashshielded)
