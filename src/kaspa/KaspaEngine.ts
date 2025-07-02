import {
  EdgeCurrencyEngine,
  EdgeCurrencyEngineOptions,
  EdgeWalletInfo
} from 'edge-core-js/types'

import { CurrencyEngine } from '../common/CurrencyEngine'
import { PluginEnvironment } from '../common/innerPlugin'
import { KaspaTools } from './KaspaTools'
import { asSafeKaspaWalletInfo, KaspaNetworkInfo } from './kaspaTypes'

export async function makeCurrencyEngine(
  env: PluginEnvironment<KaspaNetworkInfo>,
  tools: KaspaTools,
  walletInfo: EdgeWalletInfo,
  opts: EdgeCurrencyEngineOptions
): Promise<EdgeCurrencyEngine> {
  const safeWalletInfo = asSafeKaspaWalletInfo(walletInfo)
  const engine = new CurrencyEngine(env, tools, safeWalletInfo, opts)

  // Do any async initialization necessary for the engine
  await engine.loadEngine()

  return engine
}