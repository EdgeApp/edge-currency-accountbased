import { makeOuterPlugin } from '../common/innerPlugin'
import { currencyInfo, networkInfo } from './piratechainInfo'
import type { PiratechainTools } from './PiratechainTools'
import {
  asPiratechainInfoPayload,
  PiratechainInfoPayload,
  PiratechainNetworkInfo
} from './piratechainTypes'

export const piratechain = makeOuterPlugin<
  PiratechainNetworkInfo,
  PiratechainTools,
  PiratechainInfoPayload
>({
  currencyInfo,
  asInfoPayload: asPiratechainInfoPayload,
  networkInfo,

  async getInnerPlugin() {
    return await import('./PiratechainTools.node')
  }
})
