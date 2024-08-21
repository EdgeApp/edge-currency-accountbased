import { asObject, asString } from 'cleaners'

import { PluginEnvironment } from '../common/innerPlugin'
import { CosmosNetworkInfo } from './cosmosTypes'

export interface ThorchainNetworkInfo extends CosmosNetworkInfo {
  chainIdUpdateUrl: string
}

export function isThorchainEnvironment(
  env: PluginEnvironment<CosmosNetworkInfo | ThorchainNetworkInfo>
): env is PluginEnvironment<ThorchainNetworkInfo> {
  return (
    (env as PluginEnvironment<ThorchainNetworkInfo>).currencyInfo.pluginId ===
    'thorchainrune'
  )
}

export const asChainIdUpdate = asObject({
  result: asObject({
    node_info: asObject({
      network: asString // 'thorchain-mainnet-v1',
    })
  })
})
