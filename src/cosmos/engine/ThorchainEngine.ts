import { EdgeCurrencyEngineOptions } from 'edge-core-js/types'

import { PluginEnvironment } from '../../common/innerPlugin'
import { getRandomDelayMs } from '../../common/network'
import { CosmosTools } from '../CosmosTools'
import { SafeCosmosWalletInfo } from '../cosmosTypes'
import { asChainIdUpdate, ThorchainNetworkInfo } from '../thorchainTypes'
import { CosmosEngine } from './CosmosEngine'

const QUERY_POLL_MILLISECONDS = getRandomDelayMs(20000)

export class ThorchainEngine extends CosmosEngine {
  networkInfo: ThorchainNetworkInfo

  constructor(
    env: PluginEnvironment<ThorchainNetworkInfo>,
    tools: CosmosTools,
    walletInfo: SafeCosmosWalletInfo,
    opts: EdgeCurrencyEngineOptions
  ) {
    super(env, tools, walletInfo, opts)
    this.networkInfo = env.networkInfo
  }

  async queryChainId(): Promise<void> {
    try {
      const res = await this.fetchCors(this.networkInfo.chainIdUpdateUrl)
      if (!res.ok) {
        const message = await res.text()
        throw new Error(message)
      }
      const raw = await res.json()
      const clean = asChainIdUpdate(raw)
      this.chainId = clean.result.node_info.network
      clearTimeout(this.timers.queryChainId)
    } catch (e: any) {
      this.error(`queryChainId Error `, e)
    }
  }

  async startEngine(): Promise<void> {
    await super.startEngine()
    this.addToLoop('queryChainId', QUERY_POLL_MILLISECONDS).catch(() => {})
  }
}
