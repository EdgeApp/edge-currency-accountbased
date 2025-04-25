import { add, gt, lt, sub } from 'biggystring'
import {
  EdgeCurrencyEngine,
  EdgeCurrencyEngineOptions,
  EdgeEnginePrivateKeyOptions,
  EdgeMemo,
  EdgeSpendInfo,
  EdgeTokenId,
  EdgeTransaction,
  EdgeTxAmount,
  EdgeWalletInfo,
  JsonObject
} from 'edge-core-js/types'
import type { RecentTransaction } from 'react-native-zano'
import { CppBridge } from 'react-native-zano'

import { CurrencyEngine } from '../common/CurrencyEngine'
import { PluginEnvironment } from '../common/innerPlugin'
import { createWeightedAverageCalculator } from '../common/utils'
import { ZanoTools } from './ZanoTools'
import {
  asSafeZanoWalletInfo,
  asZanoPrivateKeys,
  asZanoWalletOtherData,
  SafeZanoWalletInfo,
  ZanoNetworkInfo,
  ZanoWalletOtherData
} from './zanoTypes'

const SYNC_PROGRESS_WEIGHT = 0.6
const BALANCE_PROGRESS_WEIGHT = 0.1
const TRANSACTION_PROGRESS_WEIGHT = 0.3

export class ZanoEngine extends CurrencyEngine<ZanoTools, SafeZanoWalletInfo> {
  networkInfo: ZanoNetworkInfo
  otherData!: ZanoWalletOtherData

  zanoWalletId?: number
  calculateSyncProgress: (values: { [key: string]: number }) => number
  unlockedBalanceMap: Map<EdgeTokenId, string>

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
    this.unlockedBalanceMap = new Map()
  }

  setOtherData(raw: any): void {
    this.otherData = asZanoWalletOtherData(raw)
  }

  async queryBalance(): Promise<void> {
    if (this.zanoWalletId == null) return

    const balancesResponse = await this.tools.zano.getBalances(
      this.zanoWalletId
    )

    const balances: {
      [key: string]: Awaited<
        ReturnType<CppBridge['getBalances']>
      >['balances'][0]
    } = {}
    for (const balanceObj of balancesResponse.balances) {
      balances[balanceObj.asset_info.asset_id] = balanceObj
    }

    const mainnetBalObj = balances[this.networkInfo.nativeAssetId]
    this.updateBalance(
      this.currencyInfo.currencyCode,
      mainnetBalObj?.total.toString() ?? '0'
    )
    this.unlockedBalanceMap.set(null, mainnetBalObj?.unlocked.toString() ?? '0')

    const detectedTokenIds: string[] = []
    for (const tokenId of Object.keys(this.allTokensMap)) {
      const tokenBalObj = balances[tokenId]
      if (tokenBalObj == null) continue

      const currencyCode = this.allTokensMap[tokenId].currencyCode
      this.updateBalance(currencyCode, tokenBalObj.total.toString())
      this.unlockedBalanceMap.set(
        tokenId,
        tokenBalObj?.unlocked.toString() ?? '0'
      )

      if (gt(tokenBalObj.total.toString(), '0')) {
        detectedTokenIds.push(tokenId)
      }
    }

    if (detectedTokenIds.length > 0) {
      this.currencyEngineCallbacks.onNewTokens(detectedTokenIds)
    }

    this.updateProgress({ balance: 1 })
  }

  async queryTransactions(): Promise<void> {
    if (this.zanoWalletId == null) return

    while (true) {
      const offset = this.otherData.transactionQueryOffset
      const transactions = await this.tools.zano.getTransactions(
        this.zanoWalletId,
        offset
      )

      if (offset !== transactions.last_item_index) {
        this.otherData.transactionQueryOffset = transactions.last_item_index
        this.walletLocalDataDirty = true
      }

      const transfers = transactions.transfers ?? []
      transfers.forEach(this.processTransaction)

      if (
        transactions.total_transfers === 0 ||
        transactions.total_transfers - transactions.last_item_index === 1
      ) {
        break
      }
      this.updateProgress({
        transaction: transactions.total_transfers / transactions.last_item_index
      })
    }
    if (this.transactionEvents.length > 0) {
      this.currencyEngineCallbacks.onTransactions(this.transactionEvents)
      this.transactionEvents = []
    }
    this.updateProgress({ transaction: 1 })
  }

  processTransaction = (tx: RecentTransaction): void => {
    const { comment, fee, payment_id: paymentId } = tx

    const memos: EdgeMemo[] = []
    if (comment != null) {
      memos.push({
        memoName: 'Comment',
        type: 'text',
        value: comment
      })
    }
    if (paymentId != null) {
      memos.push({
        memoName: 'Payment ID',
        type: 'hex',
        value: paymentId
      })
    }

    const nativeAmountMap = new Map<string, string>()
    for (const entry of tx.employed_entries.receive ?? []) {
      const { asset_id: assetId, amount } = entry
      const currentAmount = nativeAmountMap.get(assetId) ?? '0'
      nativeAmountMap.set(assetId, add(currentAmount, amount.toFixed()))
    }
    for (const entry of tx.employed_entries.spent ?? []) {
      // spent amounts include the fee
      const { asset_id: assetId, amount } = entry
      const currentAmount = nativeAmountMap.get(assetId) ?? '0'
      nativeAmountMap.set(assetId, sub(currentAmount, amount.toFixed()))
    }

    for (const [assetId, nativeAmount] of nativeAmountMap.entries()) {
      const ourReceiveAddresses: string[] = []

      // Zano asset_id is analogous to Edge tokenId
      const tokenId: EdgeTokenId =
        assetId === this.networkInfo.nativeAssetId ? null : assetId
      let currencyCode = this.currencyInfo.currencyCode
      if (tokenId != null) {
        const token = this.allTokensMap[assetId]
        if (token == null) {
          continue
        }
        currencyCode = token.currencyCode
      }

      const isSend = lt(nativeAmount, '0')
      const isMainnet = tokenId == null
      let networkFee = '0'
      let parentNetworkFee: string | undefined
      const networkFees: EdgeTxAmount[] = []

      if (isSend) {
        if (isMainnet) {
          networkFee = fee.toFixed()
          networkFees.push({ tokenId: null, nativeAmount: networkFee })
        } else {
          parentNetworkFee = fee.toFixed()
          networkFees.push({ tokenId: null, nativeAmount: parentNetworkFee })
        }
      } else {
        ourReceiveAddresses.push(this.walletInfo.keys.publicKey)
      }

      const edgeTransaction: EdgeTransaction = {
        blockHeight: tx.height,
        confirmations: this.walletLocalData.blockHeight - tx.height,
        currencyCode,
        date: tx.timestamp,
        isSend,
        memos,
        nativeAmount,
        networkFee,
        networkFees,
        ourReceiveAddresses,
        parentNetworkFee,
        signedTx: '',
        tokenId,
        txid: tx.tx_hash,
        walletId: this.walletId
      }

      this.addTransaction(currencyCode, edgeTransaction)
    }
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
    this.unlockedBalanceMap.clear()
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
