import { GasCostSummary, SuiTransactionBlockResponse } from '@mysten/sui/client'
import { Ed25519PublicKey } from '@mysten/sui/keypairs/ed25519'
import { SUI_TYPE_ARG } from '@mysten/sui/utils'
import { add, sub } from 'biggystring'
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
    const cursorFrom = this.otherData.latestTxidFrom
    try {
      const latestTxid = await this.queryTransactionsInner('from', cursorFrom)
      if (latestTxid !== cursorFrom) {
        this.otherData.latestTxidFrom = latestTxid
        this.walletLocalDataDirty = true
      }
    } catch (e) {
      this.log.warn('queryTransactions from error:', e)
    }

    for (const token of this.enabledTokens) {
      this.tokenCheckTransactionsStatus[token] = 0.5
    }

    const cursorTo = this.otherData.latestTxidTo
    try {
      const latestTxid = await this.queryTransactionsInner('to', cursorTo)
      if (latestTxid !== cursorTo) {
        this.otherData.latestTxidTo = latestTxid
        this.walletLocalDataDirty = true
      }
    } catch (e) {
      this.log.warn('queryTransactions to error:', e)
    }

    if (this.transactionsChangedArray.length > 0) {
      this.currencyEngineCallbacks.onTransactionsChanged(
        this.transactionsChangedArray
      )
      this.transactionsChangedArray = []
    }

    for (const token of this.enabledTokens) {
      this.tokenCheckTransactionsStatus[token] = 1
    }
    this.updateOnAddressesChecked()
  }

  async queryTransactionsInner(
    direction: 'from' | 'to',
    latestTxid?: string
  ): Promise<string | undefined> {
    const filter =
      direction === 'from'
        ? { FromAddress: this.suiAddress }
        : { ToAddress: this.suiAddress }

    let queryMore = true
    let cursor = latestTxid

    while (queryMore) {
      const { data, hasNextPage, nextCursor } =
        await this.tools.suiClient.queryTransactionBlocks({
          cursor,
          filter,
          order: 'ascending',
          options: {
            showBalanceChanges: true,
            showEffects: true,
            // showEvents: false,
            // showInput: false,
            // showObjectChanges: false,
            // showRawEffects: false,
            showRawInput: true
          }
        })

      data.forEach(tx => this.processTransaction(tx, direction))
      cursor = nextCursor ?? undefined
      queryMore = hasNextPage
    }
    return cursor
  }

  processTransaction(
    tx: SuiTransactionBlockResponse,
    direction: 'from' | 'to'
  ): void {
    if (tx.checkpoint == null) return
    if (tx.rawTransaction == null) return

    if (tx.effects?.gasUsed == null) return
    const networkFee = this.feeSum(tx.effects?.gasUsed)
    const networkFees = [{ tokenId: null, nativeAmount: networkFee }]

    if (tx.timestampMs == null) return
    const date = Math.floor(parseInt(tx.timestampMs) / 1000)

    const coinTypeMap = new Map<string, string>()
    const balanceChanges = tx.balanceChanges ?? []
    for (const bal of balanceChanges) {
      const owner = bal.owner
      if (typeof owner === 'string') continue
      if ('AddressOwner' in owner && owner.AddressOwner === this.suiAddress) {
        const balance = coinTypeMap.get(bal.coinType) ?? '0'
        coinTypeMap.set(bal.coinType, add(balance, bal.amount))
      }
    }

    for (const [coinType, bal] of Object.entries(coinTypeMap)) {
      let tokenId = null
      let currencyCode = this.currencyInfo.currencyCode
      let nativeAmount = bal
      if (coinType !== SUI_TYPE_ARG) {
        tokenId = this.tools.edgeTokenIdFromCoinType(coinType)
        const edgeToken = this.allTokensMap[tokenId]
        if (edgeToken == null) continue
        currencyCode = this.allTokensMap[tokenId].currencyCode
      }

      if (tokenId == null && direction === 'from') {
        nativeAmount = sub(nativeAmount, networkFee)
      }

      const edgeTx: EdgeTransaction = {
        txid: tx.digest,
        date,
        currencyCode,
        confirmations: 'confirmed',
        blockHeight: parseInt(tx.checkpoint),
        nativeAmount,
        networkFee,
        networkFees,
        ourReceiveAddresses: direction === 'to' ? [this.suiAddress] : [],
        signedTx: tx.rawTransaction,
        isSend: direction === 'from',
        memos: [], // TODO:
        tokenId,
        walletId: this.walletId
      }
      this.addTransaction(currencyCode, edgeTx)
    }
  }

  feeSum(gasUsed: GasCostSummary): string {
    const { computationCost, storageCost, storageRebate } = gasUsed
    return sub(add(computationCost, storageCost), storageRebate)
  }

  // // ****************************************************************************
  // // Public methods
  // // ****************************************************************************

  async startEngine(): Promise<void> {
    this.engineOn = true
    this.addToLoop('queryBalance', ADDRESS_POLL_MILLISECONDS).catch(() => {})
    this.addToLoop('queryTransactions', ADDRESS_POLL_MILLISECONDS).catch(
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
