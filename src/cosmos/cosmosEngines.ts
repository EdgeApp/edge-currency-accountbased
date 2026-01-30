import {
  EdgeCurrencyEngine,
  EdgeCurrencyEngineOptions,
  EdgeWalletInfo
} from 'edge-core-js/types'

import { PluginEnvironment } from '../common/innerPlugin'
import { CosmosTools } from './CosmosTools'
import { asSafeCosmosWalletInfo, CosmosNetworkInfo } from './cosmosTypes'
import { CosmosEngine } from './engine/CosmosEngine'
import { MayachainEngine } from './engine/MayachainEngine'
import { ThorchainEngine } from './engine/ThorchainEngine'
import { isMidgardEnvironment, MidgardNetworkInfo } from './midgardTypes'
import { isThorchainEnvironment, ThorchainNetworkInfo } from './thorchainTypes'

export { CosmosEngine } from './engine/CosmosEngine'
export { MayachainEngine } from './engine/MayachainEngine'
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

  let engine: CosmosEngine

  if (isThorchainEnvironment(env)) {
    // Thorchain uses custom fee API + Midgard transactions
    engine = new ThorchainEngine(env, tools, safeWalletInfo, opts)
  } else if (isMidgardEnvironment(env)) {
    // Other Midgard chains (like MAYAChain / CACAO) use standard Cosmos fees + Midgard transactions
    engine = new MayachainEngine(env, tools, safeWalletInfo, opts)
  } else {
    // Standard Cosmos chains
    engine = new CosmosEngine(env, tools, safeWalletInfo, opts)
  }

  await engine.loadEngine()

  return engine
}
