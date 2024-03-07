import {
  EdgeCurrencyEngine,
  EdgeCurrencyEngineOptions,
  EdgeFetchFunction,
  EdgeFreshAddress,
  EdgeSpendInfo,
  EdgeTransaction,
  EdgeWalletInfo,
  JsonObject
} from 'edge-core-js/types'

import { CurrencyEngine } from '../common/CurrencyEngine'
import { PluginEnvironment } from '../common/innerPlugin'
import { getFetchCors } from '../common/utils'
import { CardanoTools } from './CardanoTools'
import {
  asSafeCardanoWalletInfo,
  CardanoNetworkInfo,
  SafeCardanoWalletInfo
} from './cardanoTypes'

const ACCOUNT_POLL_MILLISECONDS = 20000
const BLOCKCHAIN_POLL_MILLISECONDS = 20000
const TRANSACTION_POLL_MILLISECONDS = 3000

export class CardanoEngine extends CurrencyEngine<
  CardanoTools,
  SafeCardanoWalletInfo
> {
  fetchCors: EdgeFetchFunction
  networkInfo: CardanoNetworkInfo

  constructor(
    env: PluginEnvironment<CardanoNetworkInfo>,
    tools: CardanoTools,
    walletInfo: SafeCardanoWalletInfo,
    initOptions: any, // CardanoInitOptions,
    opts: EdgeCurrencyEngineOptions
  ) {
    super(env, tools, walletInfo, opts)
    this.fetchCors = getFetchCors(env.io)
    this.networkInfo = env.networkInfo
  }

  setOtherData(_raw: any): void {
    this.otherData = {}
  }

  async queryBlockheight(): Promise<void> {
    throw new Error('unimplemented')
  }

  async queryBalance(): Promise<void> {
    throw new Error('unimplemented')
  }

  async queryTransactions(): Promise<void> {
    throw new Error('unimplemented')
  }

  processCardanoTransaction(): void {
    throw new Error('unimplemented')
  }

  // // ****************************************************************************
  // // Public methods
  // // ****************************************************************************

  async startEngine(): Promise<void> {
    this.engineOn = true
    this.addToLoop('queryBlockheight', BLOCKCHAIN_POLL_MILLISECONDS).catch(
      () => {}
    )
    this.addToLoop('queryBalance', ACCOUNT_POLL_MILLISECONDS).catch(() => {})
    this.addToLoop('queryTransactions', TRANSACTION_POLL_MILLISECONDS).catch(
      () => {}
    )
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

  async getFreshAddress(_options: any): Promise<EdgeFreshAddress> {
    const { bech32Address } = asSafeCardanoWalletInfo(this.walletInfo).keys

    return {
      publicAddress: bech32Address
    }
  }
}

export async function makeCurrencyEngine(
  env: PluginEnvironment<CardanoNetworkInfo>,
  tools: CardanoTools,
  walletInfo: EdgeWalletInfo,
  opts: EdgeCurrencyEngineOptions
): Promise<EdgeCurrencyEngine> {
  const { initOptions } = env

  const safeWalletInfo = asSafeCardanoWalletInfo(walletInfo)
  const engine = new CardanoEngine(
    env,
    tools,
    safeWalletInfo,
    initOptions,
    opts
  )

  // Do any async initialization necessary for the engine
  await engine.loadEngine()

  return engine
}
