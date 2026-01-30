import {
  EdgeCurrencyEngine,
  EdgeCurrencyEngineOptions,
  EdgeWalletInfo
} from 'edge-core-js/types'

import { PluginEnvironment } from '../common/innerPlugin'
import { CosmosTools } from './CosmosTools'
import { asSafeCosmosWalletInfo, CosmosNetworkInfo } from './cosmosTypes'
import { CosmosEngine } from './engine/CosmosEngine'
import { ThorchainEngine } from './engine/ThorchainEngine'
import { MidgardNetworkInfo } from './midgardTypes'
import { isThorchainEnvironment, ThorchainNetworkInfo } from './thorchainTypes'

export { CosmosEngine } from './engine/CosmosEngine'
export { MidgardEngine } from './engine/MidgardEngine'
export { ThorchainEngine } from './engine/ThorchainEngine'

type AllNetworkInfo =
  | CosmosNetworkInfo
  | MidgardNetworkInfo
  | ThorchainNetworkInfo

export async function makeCurrencyEngine(
  env: PluginEnvironment<AllNetworkInfo>,
  tools: CosmosTools,
  walletInfo: EdgeWalletInfo,
  opts: EdgeCurrencyEngineOptions
): Promise<EdgeCurrencyEngine> {
  const safeWalletInfo = asSafeCosmosWalletInfo(walletInfo)

  const engine = isThorchainEnvironment(env)
    ? new ThorchainEngine(env, tools, safeWalletInfo, opts)
    : new CosmosEngine(env, tools, safeWalletInfo, opts)

  await engine.loadEngine()

  return engine
}
