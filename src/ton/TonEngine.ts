import { TonClient, WalletContractV5R1 } from '@ton/ton'
import {
  EdgeCurrencyEngine,
  EdgeCurrencyEngineOptions,
  EdgeFreshAddress,
  EdgeLog,
  EdgeSpendInfo,
  EdgeTransaction,
  EdgeWalletInfo,
  JsonObject
} from 'edge-core-js/types'
import { base16 } from 'rfc4648'

import { CurrencyEngine } from '../common/CurrencyEngine'
import { PluginEnvironment } from '../common/innerPlugin'
import { getRandomDelayMs } from '../common/network'
import { asyncWaterfall } from '../common/promiseUtils'
import { asSafeCommonWalletInfo, SafeCommonWalletInfo } from '../common/types'
import { TonTools } from './TonTools'
import {
  asTonWalletOtherData,
  TonNetworkInfo,
  TonWalletOtherData
} from './tonTypes'

const ADDRESS_POLL_MILLISECONDS = getRandomDelayMs(20000)

export class TonEngine extends CurrencyEngine<TonTools, SafeCommonWalletInfo> {
  log: EdgeLog
  networkInfo: TonNetworkInfo
  otherData!: TonWalletOtherData

  wallet: WalletContractV5R1

  constructor(
    env: PluginEnvironment<TonNetworkInfo>,
    tools: TonTools,
    walletInfo: SafeCommonWalletInfo,
    opts: EdgeCurrencyEngineOptions
  ) {
    super(env, tools, walletInfo, opts)
    this.networkInfo = env.networkInfo
    this.log = env.log

    this.wallet = WalletContractV5R1.create({
      publicKey: Buffer.from(base16.parse(walletInfo.keys.publicKey))
    })
  }

  setOtherData(raw: any): void {
    this.otherData = asTonWalletOtherData(raw)
  }

  async queryBalance(): Promise<void> {
    try {
      const clients = this.tools.getClients()
      const funcs = clients.map(client => async () => {
        return await client.getContractState(this.wallet.address)
      })
      const contractState: Awaited<ReturnType<TonClient['getContractState']>> =
        await asyncWaterfall(funcs)

      this.updateBalance(
        this.currencyInfo.currencyCode,
        contractState.balance.toString()
      )
    } catch (e) {
      this.log.warn('queryBalance error:', e)
    }
  }

  async queryTransactions(): Promise<void> {
    throw new Error('Method not implemented.')
  }

  // // ****************************************************************************
  // // Public methods
  // // ****************************************************************************

  async startEngine(): Promise<void> {
    this.engineOn = true
    this.addToLoop('queryBalance', ADDRESS_POLL_MILLISECONDS).catch(() => {})
    await super.startEngine()
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
