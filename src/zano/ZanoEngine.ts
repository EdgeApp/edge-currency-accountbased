import {
  EdgeCurrencyEngine,
  EdgeCurrencyEngineOptions,
  EdgeSpendInfo,
  EdgeTransaction,
  EdgeWalletInfo,
  JsonObject
} from 'edge-core-js/types'

import { CurrencyEngine } from '../common/CurrencyEngine'
import { PluginEnvironment } from '../common/innerPlugin'
import { getRandomDelayMs } from '../common/network'
import { ZanoTools } from './ZanoTools'
import {
  asSafeZanoWalletInfo,
  SafeZanoWalletInfo,
  ZanoNetworkInfo
} from './zanoTypes'

const ACCOUNT_POLL_MILLISECONDS = getRandomDelayMs(20000)
const TRANSACTION_POLL_MILLISECONDS = getRandomDelayMs(20000)

export class ZanoEngine extends CurrencyEngine<ZanoTools, SafeZanoWalletInfo> {
  networkInfo: ZanoNetworkInfo

  constructor(
    env: PluginEnvironment<ZanoNetworkInfo>,
    tools: ZanoTools,
    walletInfo: SafeZanoWalletInfo,
    opts: EdgeCurrencyEngineOptions
  ) {
    super(env, tools, walletInfo, opts)
    this.networkInfo = env.networkInfo
  }

  async queryBalance(): Promise<void> {
    throw new Error('unimplemented')
  }

  async queryTransactions(): Promise<void> {
    throw new Error('unimplemented')
  }

  // // ****************************************************************************
  // // Public methods
  // // ****************************************************************************

  async startEngine(): Promise<void> {
    this.addToLoop('queryBalance', ACCOUNT_POLL_MILLISECONDS)
    this.addToLoop('queryTransactions', TRANSACTION_POLL_MILLISECONDS)
    await super.startEngine()
  }

  async resyncBlockchain(): Promise<void> {
    await this.killEngine()
    await this.clearBlockchainCache()
    await this.startEngine()
  }

  async makeSpend(edgeSpendInfoIn: EdgeSpendInfo): Promise<EdgeTransaction> {
    throw new Error('unimplemented')
  }

  async signTx(
    edgeTransaction: EdgeTransaction,
    privateKeys: JsonObject
  ): Promise<EdgeTransaction> {
    throw new Error('unimplemented')
  }

  async broadcastTx(
    edgeTransaction: EdgeTransaction
  ): Promise<EdgeTransaction> {
    throw new Error('unimplemented')
  }
}

export async function makeCurrencyEngine(
  env: PluginEnvironment<ZanoNetworkInfo>,
  tools: ZanoTools,
  walletInfo: EdgeWalletInfo,
  opts: EdgeCurrencyEngineOptions
): Promise<EdgeCurrencyEngine> {
  const safeWalletInfo = asSafeZanoWalletInfo(walletInfo)
  const engine = new ZanoEngine(env, tools, safeWalletInfo, opts)

  await engine.loadEngine()

  return engine
}
