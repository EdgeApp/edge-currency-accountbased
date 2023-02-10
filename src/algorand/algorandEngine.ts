import {
  EdgeCurrencyEngine,
  EdgeCurrencyEngineOptions,
  EdgeSpendInfo,
  EdgeTransaction,
  EdgeWalletInfo,
  JsonObject
} from 'edge-core-js/types'

import { CurrencyEngine } from '../common/engine'
import { PluginEnvironment } from '../common/innerPlugin'
import { AlgorandTools } from './algorandPlugin'
import {
  AlgorandWalletOtherData,
  asAlgorandPrivateKeys,
  asAlgorandWalletOtherData,
  asSafeAlgorandWalletInfo,
  SafeAlgorandWalletInfo
} from './algorandTypes'

export class AlgorandEngine extends CurrencyEngine<
  AlgorandTools,
  SafeAlgorandWalletInfo
> {
  otherData!: AlgorandWalletOtherData
  networkInfo: {}

  constructor(
    env: PluginEnvironment<{}>,
    tools: AlgorandTools,
    walletInfo: SafeAlgorandWalletInfo,
    opts: EdgeCurrencyEngineOptions
  ) {
    super(env, tools, walletInfo, opts)
    this.networkInfo = env.networkInfo
  }

  setOtherData(raw: any): void {
    this.otherData = asAlgorandWalletOtherData(raw)
  }

  async queryBalance(): Promise<void> {
    throw new Error('queryBalance not implemented')
  }

  async queryBlockheight(): Promise<void> {
    throw new Error('queryBlockheight not implemented')
  }

  async queryTransactionParams(): Promise<void> {
    throw new Error('queryTransactionParams not implemented')
  }

  processAlgorandTransaction(tx: any): void {
    throw new Error('processAlgorandTransaction not implemented')
  }

  async queryTransactions(): Promise<void> {
    throw new Error('queryTransactions not implemented')
  }

  // // ****************************************************************************
  // // Public methods
  // // ****************************************************************************

  async startEngine(): Promise<void> {
    throw new Error('startEngine not implemented')
  }

  async resyncBlockchain(): Promise<void> {
    await this.killEngine()
    await this.clearBlockchainCache()
    await this.startEngine()
  }

  async makeSpend(edgeSpendInfo: EdgeSpendInfo): Promise<EdgeTransaction> {
    throw new Error('makeSpend not implemented')
  }

  async signTx(
    edgeTransaction: EdgeTransaction,
    privateKeys: JsonObject
  ): Promise<EdgeTransaction> {
    throw new Error('signTx not implemented')
  }

  async broadcastTx(
    edgeTransaction: EdgeTransaction
  ): Promise<EdgeTransaction> {
    throw new Error('broadcastTx not implemented')
  }

  getDisplayPrivateSeed(privateKeys: JsonObject): string {
    const algorandPrivateKeys = asAlgorandPrivateKeys(
      this.currencyInfo.pluginId
    )(privateKeys)
    return algorandPrivateKeys.mnemonic
  }

  getDisplayPublicSeed(): string {
    return this.walletInfo.keys.publicKey ?? ''
  }
}

export async function makeCurrencyEngine(
  env: PluginEnvironment<{}>,
  tools: AlgorandTools,
  walletInfo: EdgeWalletInfo,
  opts: EdgeCurrencyEngineOptions
): Promise<EdgeCurrencyEngine> {
  const safeWalletInfo = asSafeAlgorandWalletInfo(walletInfo)
  const engine = new AlgorandEngine(env, tools, safeWalletInfo, opts)

  await engine.loadEngine(tools, safeWalletInfo, opts)

  return engine
}
