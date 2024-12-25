import { Ed25519PublicKey } from '@mysten/sui/keypairs/ed25519'
import { SUI_TYPE_ARG } from '@mysten/sui/utils'
import {
  EdgeAddress,
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
import { asSafeCommonWalletInfo, SafeCommonWalletInfo } from '../common/types'
import { SuiTools } from './SuiTools'
import {
  asSuiWalletOtherData,
  SuiNetworkInfo,
  SuiWalletOtherData
} from './suiTypes'

const ADDRESS_POLL_MILLISECONDS = getRandomDelayMs(20000)

export class SuiEngine extends CurrencyEngine<SuiTools, SafeCommonWalletInfo> {
  networkInfo: SuiNetworkInfo

  otherData!: SuiWalletOtherData
  suiAddress: string

  constructor(
    env: PluginEnvironment<SuiNetworkInfo>,
    tools: SuiTools,
    walletInfo: SafeCommonWalletInfo,
    opts: EdgeCurrencyEngineOptions
  ) {
    super(env, tools, walletInfo, opts)
    this.networkInfo = env.networkInfo
    const publicKey = new Ed25519PublicKey(walletInfo.keys.publicKey)
    this.suiAddress = publicKey.toSuiAddress()
  }

  setOtherData(raw: any): void {
    this.otherData = asSuiWalletOtherData(raw)
  }

  async queryBalance(): Promise<void> {
    try {
      const balances = await this.tools.suiClient.getAllBalances({
        owner: this.suiAddress
      })

      const detectedTokenIds: string[] = []

      for (const bal of balances) {
        const { coinType, totalBalance } = bal

        if (coinType === SUI_TYPE_ARG) {
          this.updateBalance(this.currencyInfo.currencyCode, totalBalance)
          continue
        }

        const tokenId = this.tools.edgeTokenIdFromCoinType(coinType)
        const edgeToken = this.allTokensMap[tokenId]
        if (edgeToken == null) continue

        this.updateBalance(edgeToken.currencyCode, totalBalance)
        if (!this.enabledTokenIds.includes(tokenId)) {
          detectedTokenIds.push(tokenId)
        }
      }

      if (detectedTokenIds.length > 0) {
        this.currencyEngineCallbacks.onNewTokens(detectedTokenIds)
      }

      for (const cc of [
        this.currencyInfo.currencyCode,
        ...this.enabledTokens
      ]) {
        this.tokenCheckBalanceStatus[cc] = 1
      }
      this.updateOnAddressesChecked()
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

  async getAddresses(): Promise<EdgeAddress[]> {
    return [{ addressType: 'publicAddress', publicAddress: this.suiAddress }]
  }
}

export async function makeCurrencyEngine(
  env: PluginEnvironment<SuiNetworkInfo>,
  tools: SuiTools,
  walletInfo: EdgeWalletInfo,
  opts: EdgeCurrencyEngineOptions
): Promise<EdgeCurrencyEngine> {
  const safeWalletInfo = asSafeCommonWalletInfo(walletInfo)

  const engine = new SuiEngine(env, tools, safeWalletInfo, opts)

  await engine.loadEngine()

  return engine
}
