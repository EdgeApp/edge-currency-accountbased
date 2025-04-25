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
import { createWeightedAverageCalculator } from '../common/utils'
import { ZanoTools } from './ZanoTools'
import {
  asSafeZanoWalletInfo,
  asZanoPrivateKeys,
  SafeZanoWalletInfo,
  ZanoNetworkInfo
} from './zanoTypes'

const SYNC_PROGRESS_WEIGHT = 0.6
const BALANCE_PROGRESS_WEIGHT = 0.1
const TRANSACTION_PROGRESS_WEIGHT = 0.3

export class ZanoEngine extends CurrencyEngine<ZanoTools, SafeZanoWalletInfo> {
  networkInfo: ZanoNetworkInfo
  zanoWalletId?: number
  calculateSyncProgress: (values: { [key: string]: number }) => number

  constructor(
    env: PluginEnvironment<ZanoNetworkInfo>,
    tools: ZanoTools,
    walletInfo: SafeZanoWalletInfo,
    opts: EdgeCurrencyEngineOptions
  ) {
    super(env, tools, walletInfo, opts)
    this.networkInfo = env.networkInfo

    this.zanoWalletId = undefined
    this.calculateSyncProgress = createWeightedAverageCalculator({
      balance: BALANCE_PROGRESS_WEIGHT,
      transaction: TRANSACTION_PROGRESS_WEIGHT,
      sync: SYNC_PROGRESS_WEIGHT
    })
  }

  async queryBalance(): Promise<void> {
    throw new Error('unimplemented')
  }

  async queryTransactions(): Promise<void> {
    throw new Error('unimplemented')
  }

  async changeEnabledTokenIds(tokenIds: string[]): Promise<void> {
    if (this.zanoWalletId != null) {
      await this.tools.zano.whitelistAssets(this.zanoWalletId, tokenIds)
    }
    await super.changeEnabledTokenIds(tokenIds)
  }

  async syncNetwork(opts: EdgeEnginePrivateKeyOptions): Promise<number> {
    if (!this.engineOn) return 1000

    if (this.zanoWalletId == null) {
      await this.tools.zano.init(this.networkInfo.walletRpcAddress, -1)

      const zanoPrivateKeys = asZanoPrivateKeys(this.currencyInfo.pluginId)(
        opts?.privateKeys
      )
      const response = await this.tools.zano.startWallet(
        zanoPrivateKeys.mnemonic,
        zanoPrivateKeys.passphrase ?? '',
        zanoPrivateKeys.storagePath
      )
      this.zanoWalletId = response.wallet_id
    }

    const status = await this.tools.zano.walletStatus(this.zanoWalletId)
    const blockheight = Math.max(
      status.current_wallet_height,
      status.current_daemon_height
    )
    if (blockheight > this.walletLocalData.blockHeight) {
      this.walletLocalData.blockHeight = blockheight
      this.walletLocalDataDirty = true
    }

    if (status.progress === 100 || status.wallet_state === 2) {
      this.updateProgress({ sync: 1 })
      await this.tools.zano.whitelistAssets(
        this.zanoWalletId,
        Object.keys(this.allTokensMap)
      )
      await this.queryBalance()
      await this.queryTransactions()
      return 20000
    } else {
      this.updateProgress({ sync: status.progress / 100 })
      return 1000
    }
  }

  private updateProgress(values: { [key: string]: number }): void {
    const previousProgress = this.calculateSyncProgress({})
    const newProgress = this.calculateSyncProgress(values)

    // Update every 10% change
    const flooredPrevProgress = Math.floor(previousProgress * 10)
    const flooredNewProgress = Math.floor(newProgress * 10)

    if (newProgress === 1 || flooredNewProgress > flooredPrevProgress) {
      this.tokenCheckBalanceStatus[this.currencyInfo.currencyCode] = newProgress
      this.tokenCheckTransactionsStatus[this.currencyInfo.currencyCode] =
        newProgress
      for (const tokenId of this.enabledTokenIds) {
        const token = this.allTokensMap[tokenId]
        this.tokenCheckBalanceStatus[token.currencyCode] = newProgress
        this.tokenCheckTransactionsStatus[token.currencyCode] = newProgress
      }
      this.updateOnAddressesChecked()
    }
  }

  // // ****************************************************************************
  // // Public methods
  // // ****************************************************************************

  async resyncBlockchain(): Promise<void> {
    if (this.zanoWalletId != null) {
      await this.tools.zano.removeWallet(this.zanoWalletId)
    }
    this.zanoWalletId = undefined
    await this.killEngine()
    this.updateProgress({ sync: 0, balance: 0, transaction: 0 })
    await this.clearBlockchainCache()
    await this.startEngine()
  }

  async killEngine(): Promise<void> {
    if (this.zanoWalletId != null) {
      await this.tools.zano.stopWallet(this.zanoWalletId)
    }
    this.zanoWalletId = undefined
    await super.killEngine()
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
