import {
  EdgeCurrencyEngine,
  EdgeCurrencyEngineOptions,
  EdgeWalletInfo
} from 'edge-core-js/types'

import { CurrencyEngine } from '../common/CurrencyEngine'
import { PluginEnvironment } from '../common/innerPlugin'
import { makeTokenSyncTracker } from '../common/SyncTracker'
import { BinanceTools } from './BinanceTools'
import { asSafeBnbWalletInfo, BinanceNetworkInfo } from './binanceTypes'

// Binance Beacon Chain is deprecated as of December 2024
// https://www.bnbchain.org/en/bnb-chain-fusion

export async function makeCurrencyEngine(
  env: PluginEnvironment<BinanceNetworkInfo>,
  tools: BinanceTools,
  walletInfo: EdgeWalletInfo,
  opts: EdgeCurrencyEngineOptions
): Promise<EdgeCurrencyEngine> {
  const safeWalletInfo = asSafeBnbWalletInfo(walletInfo)
  const engine = new CurrencyEngine(
    env,
    tools,
    safeWalletInfo,
    opts,
    makeTokenSyncTracker
  )

  // Do any async initialization necessary for the engine
  await engine.loadEngine()

  return engine
}
