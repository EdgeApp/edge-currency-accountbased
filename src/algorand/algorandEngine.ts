import algosdk from 'algosdk'
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
import { asyncWaterfall } from '../common/utils'
import { AlgorandTools } from './algorandPlugin'
import {
  AccountInformation,
  AlgorandNetworkInfo,
  AlgorandWalletOtherData,
  asAccountInformation,
  asAlgorandPrivateKeys,
  asAlgorandWalletOtherData,
  asSafeAlgorandWalletInfo,
  SafeAlgorandWalletInfo
} from './algorandTypes'

const { Algodv2 } = algosdk

const ACCOUNT_POLL_MILLISECONDS = 5000

export class AlgorandEngine extends CurrencyEngine<
  AlgorandTools,
  SafeAlgorandWalletInfo
> {
  otherData!: AlgorandWalletOtherData
  networkInfo: AlgorandNetworkInfo

  constructor(
    env: PluginEnvironment<AlgorandNetworkInfo>,
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

  async fetchAccountInfo(account: string): Promise<AccountInformation> {
    return await asyncWaterfall(
      this.networkInfo.algodServers.map(server => async () => {
        const client = new Algodv2('', server, '')
        const response = await client.accountInformation(account).do()
        const out = asAccountInformation(response)
        return out
      })
    )
  }

  async queryBalance(): Promise<void> {
    try {
      const accountInfo: AccountInformation = await this.fetchAccountInfo(
        this.walletLocalData.publicKey
      )

      const { amount, round } = accountInfo

      this.updateBalance(this.currencyInfo.currencyCode, amount.toString())

      if (round > this.walletLocalData.blockHeight) {
        this.walletLocalData.blockHeight = round
        this.walletLocalDataDirty = true
        this.currencyEngineCallbacks.onBlockHeightChanged(
          this.walletLocalData.blockHeight
        )
      }
    } catch (e: any) {
      this.log.warn(`queryBalance Error `, e)
    }
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
    this.engineOn = true
    this.addToLoop('queryBalance', ACCOUNT_POLL_MILLISECONDS).catch(() => {})
    await super.startEngine()
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
  env: PluginEnvironment<AlgorandNetworkInfo>,
  tools: AlgorandTools,
  walletInfo: EdgeWalletInfo,
  opts: EdgeCurrencyEngineOptions
): Promise<EdgeCurrencyEngine> {
  const safeWalletInfo = asSafeAlgorandWalletInfo(walletInfo)
  const engine = new AlgorandEngine(env, tools, safeWalletInfo, opts)

  await engine.loadEngine(tools, safeWalletInfo, opts)

  return engine
}
