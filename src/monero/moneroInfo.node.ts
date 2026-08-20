import { JsonObject } from 'edge-core-js/types'

import { makeOuterPlugin } from '../common/innerPlugin'
import { currencyInfo, networkInfo } from './moneroInfo'
import type { MoneroTools } from './MoneroTools'
import type { MoneroNetworkInfo } from './moneroTypes'

export const monero = makeOuterPlugin<
  MoneroNetworkInfo,
  MoneroTools,
  JsonObject
>({
  currencyInfo,
  asInfoPayload: payload => payload,
  networkInfo,

  async getInnerPlugin() {
    return await import('./MoneroTools.node')
  }
})
