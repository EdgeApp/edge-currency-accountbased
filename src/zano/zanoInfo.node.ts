import { makeOuterPlugin } from '../common/innerPlugin'
import { builtinTokens, currencyInfo, networkInfo } from './zanoInfo'
import type { ZanoTools } from './ZanoTools'
import {
  type ZanoInfoPayload,
  type ZanoNetworkInfo,
  asZanoInfoPayload,
  createZanoTokenId
} from './zanoTypes'

export const zano = makeOuterPlugin<
  ZanoNetworkInfo,
  ZanoTools,
  ZanoInfoPayload
>({
  builtinTokens,
  createTokenId: createZanoTokenId,
  currencyInfo,
  asInfoPayload: asZanoInfoPayload,
  networkInfo,

  async getInnerPlugin() {
    return await import('./ZanoTools.node')
  }
})
