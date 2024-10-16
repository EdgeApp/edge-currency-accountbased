import {
  EdgeCurrencyEngine,
  EdgeCurrencyEngineOptions,
  EdgeFreshAddress,
  EdgeSpendInfo,
  EdgeTransaction,
  EdgeWalletInfo,
  JsonObject
} from 'edge-core-js/types'

import { CurrencyEngine } from '../common/CurrencyEngine'
import { PluginEnvironment } from '../common/innerPlugin'
import { asSafeCommonWalletInfo, SafeCommonWalletInfo } from '../common/types'
import { TonTools } from './TonTools'
import {
  asTonWalletOtherData,
  TonNetworkInfo,
  TonWalletOtherData
} from './tonTypes'

export class TonEngine extends CurrencyEngine<TonTools, SafeCommonWalletInfo> {
  networkInfo: TonNetworkInfo

  otherData!: TonWalletOtherData

  constructor(
    env: PluginEnvironment<TonNetworkInfo>,
    tools: TonTools,
    walletInfo: SafeCommonWalletInfo,
    opts: EdgeCurrencyEngineOptions
  ) {
    super(env, tools, walletInfo, opts)
    this.networkInfo = env.networkInfo
  }

  setOtherData(raw: any): void {
    this.otherData = asTonWalletOtherData(raw)
  }

  async queryBalance(): Promise<void> {
    throw new Error('Method not implemented.')
  }

  async queryTransactions(): Promise<void> {
    throw new Error('Method not implemented.')
  }

  // // ****************************************************************************
  // // Public methods
  // // ****************************************************************************

  async startEngine(): Promise<void> {
    throw new Error('Method not implemented.')
  }

  async resyncBlockchain(): Promise<void> {
    await this.killEngine()
    await this.clearBlockchainCache()
    await this.startEngine()
  }

  async makeSpend(edgeSpendInfoIn: EdgeSpendInfo): Promise<EdgeTransaction> {
    throw new Error('Method not implemented.')
  }

  async signTx(
    edgeTransaction: EdgeTransaction,
    privateKeys: JsonObject
  ): Promise<EdgeTransaction> {
    throw new Error('Method not implemented.')
  }

  async broadcastTx(
    edgeTransaction: EdgeTransaction
  ): Promise<EdgeTransaction> {
    throw new Error('Method not implemented.')
  }

  async getFreshAddress(): Promise<EdgeFreshAddress> {
    // TODO: uQ address format
    throw new Error('Method not implemented.')
  }
}

export async function makeCurrencyEngine(
  env: PluginEnvironment<TonNetworkInfo>,
  tools: TonTools,
  walletInfo: EdgeWalletInfo,
  opts: EdgeCurrencyEngineOptions
): Promise<EdgeCurrencyEngine> {
  const safeWalletInfo = asSafeCommonWalletInfo(walletInfo)

  const engine = new TonEngine(env, tools, safeWalletInfo, opts)

  await engine.loadEngine()

  return engine
}
