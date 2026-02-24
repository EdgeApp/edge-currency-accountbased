import { abs, add, eq, gt, lt, mul, sub } from 'biggystring'
import { asMaybe } from 'cleaners'
import {
  EdgeCurrencyEngine,
  EdgeCurrencyEngineOptions,
  EdgeEnginePrivateKeyOptions,
  EdgeMemo,
  EdgeSpendInfo,
  EdgeSpendTarget,
  EdgeTokenId,
  EdgeTransaction,
  EdgeTxAmount,
  EdgeWalletInfo,
  InsufficientFundsError,
  JsonObject,
  NoAmountSpecifiedError
} from 'edge-core-js/types'
import type { RecentTransaction, TransferParams } from 'react-native-zano'
import { CppBridge } from 'react-native-zano'

import { CurrencyEngine } from '../common/CurrencyEngine'
import { PluginEnvironment } from '../common/innerPlugin'
import {
  LifecycleManager,
  makeLifecycleManager
} from '../common/lifecycleManager'
import { MakeTxParams } from '../common/types'
import { cleanTxLogs } from '../common/utils'
import {
  makeWeightedSyncTracker,
  WeightedSyncTracker
} from '../common/WeightedSyncTracker'
import { ZanoTools } from './ZanoTools'
import {
  asGetAliasDetailsResponse,
  asSafeZanoWalletInfo,
  asZanoBurnAssetParams,
  asZanoPrivateKeys,
  asZanoTransferParams,
  asZanoWalletOtherData,
  SafeZanoWalletInfo,
  ZanoNetworkInfo,
  ZanoOtherMethods,
  ZanoPrivateKeys,
  ZanoWalletOtherData
} from './zanoTypes'

export class ZanoEngine extends CurrencyEngine<
  ZanoTools,
  SafeZanoWalletInfo,
  WeightedSyncTracker
> {
  networkInfo: ZanoNetworkInfo
  otherData!: ZanoWalletOtherData

  unlockedBalanceMap: Map<EdgeTokenId, string>
  private readonly nativeId: LifecycleManager<number>
  private sendKeysToNative?: (keys: ZanoPrivateKeys) => void
  private needsNativeStorageClear: boolean = false

  constructor(
    env: PluginEnvironment<ZanoNetworkInfo>,
    tools: ZanoTools,
    walletInfo: SafeZanoWalletInfo,
    opts: EdgeCurrencyEngineOptions
  ) {
    super(env, tools, walletInfo, opts, makeWeightedSyncTracker)
    this.networkInfo = env.networkInfo

    this.unlockedBalanceMap = new Map()

    // This will receive the private keys on the first network sync:
    const keysPromise = new Promise<ZanoPrivateKeys>(resolve => {
      this.sendKeysToNative = resolve
    })

    // Initialize wallet lifecycle manager
    this.nativeId = makeLifecycleManager({
      onStart: async () => {
        // Block startup until the keys are ready:
        const keys = await keysPromise

        // Delete native wallet storage here in onStart rather than in
        // resyncBlockchain because:
        // 1. We need `keys.storagePath` which is only available after
        //    awaiting `keysPromise` above.
        // 2. The lifecycle manager serializes stop→start transitions,
        //    so this runs only after the previous wallet has fully closed,
        //    avoiding deletion of files while the native wallet is open.
        // 3. Placing the delete at the top of onStart guarantees the
        //    files are removed before the next startWallet call.
        if (this.needsNativeStorageClear) {
          this.needsNativeStorageClear = false
          try {
            await this.tools.zano.deleteWallet(keys.storagePath)
            this.log('Deleted native wallet storage for resync')
          } catch (error: unknown) {
            this.log.warn(
              'Failed to delete native wallet storage: ' + String(error)
            )
          }
        }

        try {
          await this.tools.zano.init(this.networkInfo.walletRpcAddress, -1)
          const response = await this.tools.zano.startWallet(
            keys.mnemonic,
            keys.passphrase ?? '',
            keys.storagePath
          )
          return response.wallet_id
        } catch (error: unknown) {
          if (!(error instanceof Error)) throw error
          if (!error.message.includes('ALREADY_EXISTS')) throw error

          this.log(
            `initializeWallet: wallet already exists, finding existing wallet`
          )

          // Get all opened wallets and find ours by storage path
          const openedWalletsResponse = await this.tools.zano.getOpenedWallets()
          if (
            !('result' in openedWalletsResponse) ||
            openedWalletsResponse.result == null
          ) {
            throw new Error(
              'initializeWallet: Failed to retrieve opened wallets'
            )
          }

          // Find the wallet that matches our storage path
          const existingWallet = openedWalletsResponse.result.find(
            info => info.name === keys.storagePath
          )
          if (existingWallet?.wallet_id == null) {
            throw new Error(
              'initializeWallet: Wallet already exists but could not be found'
            )
          }

          this.log(
            `initializeWallet: found existing wallet with ID ${existingWallet.wallet_id}`
          )
          return existingWallet.wallet_id
        }
      },

      onStop: async (nativeId: number) => {
        await this.tools.zano.stopWallet(nativeId)
      },

      onError: error => {
        this.log.error('Wallet lifecycle error:', String(error))
      }
    })
  }

  setOtherData(raw: any): void {
    this.otherData = asZanoWalletOtherData(raw)
  }

  async queryBalance(): Promise<void> {
    const nativeId = await this.nativeId.get()
    if (nativeId == null) return

    const balancesResponse = await this.tools.zano.getBalances(nativeId)

    const balances: {
      [key: string]: Awaited<
        ReturnType<CppBridge['getBalances']>
      >['balances'][0]
    } = {}
    for (const balanceObj of balancesResponse.balances) {
      balances[balanceObj.asset_info.asset_id] = balanceObj
    }

    const mainnetBalObj = balances[this.networkInfo.nativeAssetId]
    this.updateBalance(null, mainnetBalObj?.total.toString() ?? '0')
    this.unlockedBalanceMap.set(null, mainnetBalObj?.unlocked.toString() ?? '0')

    const detectedTokenIds: string[] = []
    for (const tokenId of Object.keys(this.allTokensMap)) {
      const tokenBalObj = balances[tokenId]
      if (tokenBalObj == null) continue

      this.updateBalance(tokenId, tokenBalObj.total.toString())
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

    this.syncTracker.updateBalanceRatio(1)
  }

  async queryTransactions(): Promise<void> {
    const nativeId = await this.nativeId.get()
    if (nativeId == null) return

    while (true) {
      const offset = this.otherData.transactionQueryOffset
      const transactions = await this.tools.zano.getTransactions(
        nativeId,
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
      this.syncTracker.updateHistoryRatio(
        transactions.total_transfers / transactions.last_item_index
      )
    }
    this.sendTransactionEvents()
    this.syncTracker.updateHistoryRatio(1)
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

    // Use subtransfers as the primary source for amounts. The Zano V2
    // API (get_recent_txs_and_info2) documents subtransfers as the
    // "essential part of transfer entry" while employed_entries can be
    // empty, especially for emit/mint operations like BTCx bridging.
    const nativeAmountMap = new Map<string, string>()
    const subtransfers = tx.subtransfers ?? []
    if (subtransfers.length > 0) {
      for (const transfer of subtransfers) {
        const { asset_id: assetId, amount } = transfer
        const currentAmount = nativeAmountMap.get(assetId) ?? '0'
        if (transfer.is_income) {
          nativeAmountMap.set(assetId, add(currentAmount, amount.toFixed()))
        } else {
          nativeAmountMap.set(assetId, sub(currentAmount, amount.toFixed()))
        }
      }
    } else {
      // Fallback to employed_entries for backward compatibility
      for (const entry of tx.employed_entries.receive ?? []) {
        const { asset_id: assetId, amount } = entry
        const currentAmount = nativeAmountMap.get(assetId) ?? '0'
        nativeAmountMap.set(assetId, add(currentAmount, amount.toFixed()))
      }
      for (const entry of tx.employed_entries.spent ?? []) {
        const { asset_id: assetId, amount } = entry
        const currentAmount = nativeAmountMap.get(assetId) ?? '0'
        nativeAmountMap.set(assetId, sub(currentAmount, amount.toFixed()))
      }
    }

    for (const [assetId, nativeAmount] of nativeAmountMap.entries()) {
      const ourReceiveAddresses: string[] = []

      // Zano asset_id is analogous to Edge tokenId
      const tokenId: EdgeTokenId =
        assetId === this.networkInfo.nativeAssetId ? null : assetId
      const currencyCode = this.getCurrencyCode(tokenId)
      if (currencyCode == null) continue

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

      this.addTransaction(tokenId, edgeTransaction)
    }
  }

  async syncNetwork(opts: EdgeEnginePrivateKeyOptions): Promise<number> {
    if (!this.engineOn) return 1000

    if (this.sendKeysToNative != null) {
      this.sendKeysToNative(
        asZanoPrivateKeys(this.currencyInfo.pluginId)(opts.privateKeys)
      )
    }
    const nativeId = await this.nativeId.get()
    if (nativeId == null) return 1000

    const status = await this.tools.zano.getWalletStatus(nativeId)
    const blockheight = Math.max(
      status.current_wallet_height,
      status.current_daemon_height
    )
    this.updateBlockHeight(blockheight)

    if (status.progress === 100 || status.wallet_state === 2) {
      this.syncTracker.updateBlockRatio(
        1,
        status.current_wallet_height,
        status.current_daemon_height
      )
      await this.tools.zano.whitelistAssets(
        nativeId,
        Object.keys(this.allTokensMap)
      )
      await this.queryBalance()
      await this.queryTransactions()
      return 20000
    } else {
      this.syncTracker.updateBlockRatio(
        status.progress / 100,
        status.current_wallet_height,
        status.current_daemon_height
      )
      return 1000
    }
  }

  // // ****************************************************************************
  // // Public methods
  // // ****************************************************************************

  async resyncBlockchain(): Promise<void> {
    this.needsNativeStorageClear = true
    this.nativeId.stop()
    this.unlockedBalanceMap.clear()
    await this.killEngine()
    this.syncTracker.resetSync()
    await this.clearBlockchainCache()
    await this.startEngine()
  }

  async killEngine(): Promise<void> {
    this.nativeId.stop()
    await super.killEngine()
  }

  getDisplayPublicSeed(): string {
    /** Return the private view key */
    const realGetDisplayPublicSeed = async (): Promise<string> => {
      try {
        const nativeId = await this.nativeId.get()
        if (nativeId == null) {
          throw new Error('Wallet is not running, cannot get view key')
        }

        const walletInfo = await this.tools.zano.getWalletInfo(nativeId)
        return walletInfo.wi_extended.view_private_key
      } catch (error: unknown) {
        throw new Error('Failed to get wallet info: ' + JSON.stringify(error))
      }
    }

    // HACK: We implemented `getDisplayPublicSeed` as an async fn.
    // This is OK because the core currently calls that method with an await.
    // @ts-expect-error
    return realGetDisplayPublicSeed()
  }

  async getMaxSpendable(edgeSpendInfo: EdgeSpendInfo): Promise<string> {
    const { tokenId } = edgeSpendInfo

    const feeNumber = await this.tools.zano.getCurrentTxFee(2)
    const networkFee = feeNumber.toFixed()
    const zanoAvailableBalance = this.unlockedBalanceMap.get(null) ?? '0'

    if (lt(zanoAvailableBalance, networkFee)) {
      throw new InsufficientFundsError({ tokenId: null })
    }

    if (tokenId == null) {
      return sub(zanoAvailableBalance, networkFee)
    } else {
      const assetAvailableBalance = this.unlockedBalanceMap.get(tokenId) ?? '0'
      if (eq(assetAvailableBalance, '0')) {
        throw new InsufficientFundsError({ tokenId })
      }

      return assetAvailableBalance
    }
  }

  async makeSpend(edgeSpendInfoIn: EdgeSpendInfo): Promise<EdgeTransaction> {
    const { edgeSpendInfo, currencyCode } = this.makeSpendCheck(edgeSpendInfoIn)
    const { memos = [], tokenId } = edgeSpendInfo

    let nativeAmountTotal = '0'
    const cleanTargets: Array<
      Required<Pick<EdgeSpendTarget, 'publicAddress' | 'nativeAmount'>>
    > = []
    for (const spendTarget of edgeSpendInfo.spendTargets) {
      const { publicAddress, nativeAmount } = spendTarget

      if (publicAddress == null)
        throw new Error('makeSpend Missing publicAddress')
      if (nativeAmount == null) throw new NoAmountSpecifiedError()
      if (eq(nativeAmount, '0')) throw new NoAmountSpecifiedError()

      cleanTargets.push({
        publicAddress,
        nativeAmount
      })
      nativeAmountTotal = add(nativeAmountTotal, nativeAmount)
    }

    const feeNumber = await this.tools.zano.getCurrentTxFee(2)

    const availableBalance = this.unlockedBalanceMap.get(tokenId) ?? '0'
    const availableZanoBalance = this.unlockedBalanceMap.get(null) ?? '0'

    let networkFee = feeNumber.toFixed()
    let parentNetworkFee: string | undefined
    let totalTxAmount = nativeAmountTotal
    if (tokenId == null) {
      totalTxAmount = add(nativeAmountTotal, networkFee)
      if (gt(totalTxAmount, availableBalance)) {
        throw new InsufficientFundsError({ tokenId })
      }
    } else {
      parentNetworkFee = networkFee
      networkFee = '0'
      totalTxAmount = nativeAmountTotal

      if (gt(nativeAmountTotal, availableBalance)) {
        throw new InsufficientFundsError({ tokenId })
      }
      if (gt(parentNetworkFee, availableZanoBalance)) {
        throw new InsufficientFundsError({ tokenId: null })
      }
    }

    const comment = memos.find(memo => memo.memoName === 'comment')?.value
    const paymentId = memos.find(memo => memo.memoName === 'paymentId')?.value

    const assetId = tokenId != null ? tokenId : this.networkInfo.nativeAssetId

    const otherParams: TransferParams = {
      transfers: cleanTargets.map(st => ({
        assetId,
        nativeAmount: parseInt(abs(st.nativeAmount)),
        recipient: st.publicAddress
      })),

      comment,
      fee: feeNumber,
      paymentId
    }

    // **********************************
    // Create the unsigned EdgeTransaction

    const txNativeAmount = mul(totalTxAmount, '-1')

    const edgeTransaction: EdgeTransaction = {
      blockHeight: 0,
      currencyCode,
      date: 0,
      isSend: true,
      memos,
      nativeAmount: txNativeAmount,
      networkFee,
      networkFees: [
        { tokenId: null, nativeAmount: parentNetworkFee ?? networkFee }
      ],
      parentNetworkFee,
      otherParams,
      ourReceiveAddresses: [],
      signedTx: '',
      tokenId,
      txid: '',
      walletId: this.walletId
    }

    return edgeTransaction
  }

  async signTx(
    edgeTransaction: EdgeTransaction,
    privateKeys: JsonObject
  ): Promise<EdgeTransaction> {
    // Transaction is signed and broadcast at the same time
    return edgeTransaction
  }

  async broadcastTx(
    edgeTransaction: EdgeTransaction
  ): Promise<EdgeTransaction> {
    const nativeId = await this.nativeId.get()
    if (nativeId == null) throw new Error('Wallet is not running')

    let txid: string | undefined
    try {
      const burnAssetParams = asMaybe(asZanoBurnAssetParams)(
        edgeTransaction.otherParams
      )
      if (burnAssetParams != null) {
        txid = await this.tools.zano.burnAsset(nativeId, burnAssetParams)
      } else {
        const transferParams = asZanoTransferParams(edgeTransaction.otherParams)
        txid = await this.tools.zano.transfer(nativeId, transferParams)
      }

      edgeTransaction.txid = txid
      edgeTransaction.date = Date.now() / 1000
      this.warn(`SUCCESS broadcastTx\n${cleanTxLogs(edgeTransaction)}`)
      return edgeTransaction
    } catch (e: any) {
      this.warn('FAILURE broadcastTx failed: ', e)
      throw e
    }
  }

  /**
   * Resolve Zano aliases, for example: "@bob"
   */
  private async resolveName(alias: string): Promise<string> {
    const { walletRpcAddress } = this.networkInfo

    if (!alias.startsWith('@')) {
      throw new Error('Invalid Zano alias: ' + alias)
    }

    // Remove the @ prefix
    const aliasParam = alias.replace('@', '')

    const response = await this.tools.io.fetch(`${walletRpcAddress}/json_rpc`, {
      method: 'POST',
      body: JSON.stringify({
        method: 'get_alias_details',
        params: { alias: aliasParam }
      })
    })

    if (!response.ok) {
      const message = await response.text()
      throw new Error(message)
    }

    const json: unknown = await response.json()
    const data = asGetAliasDetailsResponse(json)

    return data.result.alias_details.address
  }

  otherMethods: ZanoOtherMethods = {
    resolveName: this.resolveName.bind(this),
    makeTx: async (makeTxParams: MakeTxParams): Promise<EdgeTransaction> => {
      if (makeTxParams.type === 'MakeTx') {
        const { unsignedTx, metadata } = makeTxParams

        const decoder = new TextDecoder()
        const transaction = JSON.parse(decoder.decode(unsignedTx))

        const burnAssetParams = asMaybe(asZanoBurnAssetParams)(transaction)
        if (burnAssetParams == null) {
          throw new Error('Invalid transaction')
        }

        const tokenId = burnAssetParams.assetId
        const currencyCode = this.getCurrencyCode(tokenId)
        if (currencyCode == null) throw new Error('Unknown tokenId')

        const nativeAmount = burnAssetParams.burnAmount.toString()

        const networkFee = '0'
        const feeNumber = await this.tools.zano.getCurrentTxFee(2)
        const parentNetworkFee = feeNumber.toFixed()

        const availableBalance = this.unlockedBalanceMap.get(tokenId) ?? '0'
        const availableZanoBalance = this.unlockedBalanceMap.get(null) ?? '0'

        if (gt(nativeAmount, availableBalance)) {
          throw new InsufficientFundsError({ tokenId })
        }
        if (gt(parentNetworkFee, availableZanoBalance)) {
          throw new InsufficientFundsError({ tokenId: null })
        }

        const out: EdgeTransaction = {
          assetAction: metadata?.assetAction,
          savedAction: metadata?.savedAction,
          blockHeight: 0,
          currencyCode,
          date: Date.now() / 1000,
          isSend: true,
          memos: [],
          nativeAmount: `-${nativeAmount}`,
          networkFee,
          networkFees: [{ tokenId: null, nativeAmount: parentNetworkFee }],
          otherParams: burnAssetParams,
          ourReceiveAddresses: [],
          signedTx: '',
          tokenId,
          txid: '',
          walletId: this.walletId
        }
        return out
      } else {
        throw new Error('Unrecognized makeTx type')
      }
    }
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
