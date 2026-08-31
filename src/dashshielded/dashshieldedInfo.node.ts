import { makeOuterPlugin } from '../common/innerPlugin'
import { currencyInfo, networkInfo } from './dashshieldedInfo'
import type { DashshieldedTools } from './DashshieldedTools'
import {
  asDashshieldedInfoPayload,
  DashshieldedInfoPayload,
  DashshieldedNetworkInfo
} from './dashshieldedTypes'

export const dashshielded = makeOuterPlugin<
  DashshieldedNetworkInfo,
  DashshieldedTools,
  DashshieldedInfoPayload
>({
  currencyInfo,
  asInfoPayload: asDashshieldedInfoPayload,
  networkInfo,

  async getInnerPlugin() {
    return await import('./DashshieldedTools.node')
  }
})
