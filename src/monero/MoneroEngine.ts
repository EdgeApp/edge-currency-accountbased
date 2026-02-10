import {
  EdgeCurrencyEngine,
  EdgeCurrencyEngineOptions,
  EdgeEnginePrivateKeyOptions,
  EdgeSpendInfo,
  EdgeTransaction,
  EdgeWalletInfo,
  JsonObject
} from 'edge-core-js/types'

import { CurrencyEngine } from '../common/CurrencyEngine'
import { PluginEnvironment } from '../common/innerPlugin'
import {
  makeWeightedSyncTracker,
  WeightedSyncTracker
} from '../common/WeightedSyncTracker'
import { MoneroTools } from './MoneroTools'
import {
  asSafeMoneroWalletInfo,
  MoneroNetworkInfo,
  SafeMoneroWalletInfo
} from './moneroTypes'

export class MoneroEngine extends CurrencyEngine<
  MoneroTools,
  SafeMoneroWalletInfo,
  WeightedSyncTracker
> {
  setOtherData(_raw: unknown): void {
    // Stub: no-op
  }

  async syncNetwork(_opts: EdgeEnginePrivateKeyOptions): Promise<number> {
    return 1000
  }

  async makeSpend(_edgeSpendInfo: EdgeSpendInfo): Promise<EdgeTransaction> {
    throw new Error('Not implemented')
  }

  async signTx(
    _edgeTransaction: EdgeTransaction,
    _privateKeys: JsonObject
  ): Promise<EdgeTransaction> {
    throw new Error('Not implemented')
  }

  async broadcastTx(
    _edgeTransaction: EdgeTransaction
  ): Promise<EdgeTransaction> {
    throw new Error('Not implemented')
  }
}

export async function makeCurrencyEngine(
  env: PluginEnvironment<MoneroNetworkInfo>,
  tools: MoneroTools,
  walletInfo: EdgeWalletInfo,
  opts: EdgeCurrencyEngineOptions
): Promise<EdgeCurrencyEngine> {
  const safeWalletInfo = asSafeMoneroWalletInfo(walletInfo)
  const engine = new MoneroEngine(
    env,
    tools,
    safeWalletInfo,
    opts,
    makeWeightedSyncTracker
  )
  await engine.loadEngine()
  return engine
}
