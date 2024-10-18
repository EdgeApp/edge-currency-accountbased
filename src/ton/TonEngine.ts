import { Address, TonClient, WalletContractV5R1 } from '@ton/ton'
import { add, lt, sub } from 'biggystring'
import {
  EdgeCurrencyEngine,
  EdgeCurrencyEngineOptions,
  EdgeFreshAddress,
  EdgeLog,
  EdgeMemo,
  EdgeSpendInfo,
  EdgeTransaction,
  EdgeWalletInfo,
  JsonObject
} from 'edge-core-js/types'
import { base16, base64 } from 'rfc4648'
import { parse_tx } from 'ton-watcher/build/modules/txs/Transaction'

import { CurrencyEngine } from '../common/CurrencyEngine'
import { PluginEnvironment } from '../common/innerPlugin'
import { getRandomDelayMs } from '../common/network'
import { asyncWaterfall } from '../common/promiseUtils'
import { asSafeCommonWalletInfo, SafeCommonWalletInfo } from '../common/types'
import { TonTools } from './TonTools'
import {
  asParsedTx,
  asTonWalletOtherData,
  ParsedTx,
  TonNetworkInfo,
  TonWalletOtherData
} from './tonTypes'

const ADDRESS_POLL_MILLISECONDS = getRandomDelayMs(20000)

export class TonEngine extends CurrencyEngine<TonTools, SafeCommonWalletInfo> {
  log: EdgeLog
  networkInfo: TonNetworkInfo
  otherData!: TonWalletOtherData

  wallet: WalletContractV5R1
  archiveTransactions: boolean

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

    // Only the first query needs to use archive nodes
    this.archiveTransactions = true
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
    // Transactions can only be queried newest to oldest.
    const clients = this.tools.getClients()

    // Both of these params must be included to filter results. They should be undefined to start at the most recent.
    let inLoopLogicalTime: string | undefined
    let inLoopHash: string | undefined

    // Save the most recent transaction (first seen) in otherData
    let mostRecentLogicalTime: undefined | string
    let mostRecentHash: undefined | string
    while (true) {
      const funcs = clients.map(client => async () => {
        return await client.getTransactions(this.wallet.address, {
          limit: 50,
          lt: inLoopLogicalTime,
          hash: inLoopHash,
          inclusive: false,
          archival: this.archiveTransactions
        })
      })
      try {
        const transactions: Awaited<ReturnType<TonClient['getTransactions']>> =
          await asyncWaterfall(funcs)

        let breakWhileLoop = false
        for (const tx of transactions) {
          inLoopLogicalTime = tx.lt.toString()
          inLoopHash = base64.stringify(tx.hash())
          if (mostRecentLogicalTime == null && mostRecentHash == null) {
            mostRecentLogicalTime = inLoopLogicalTime
            mostRecentHash = inLoopHash
          }

          if (
            inLoopLogicalTime === this.otherData.mostRecentLogicalTime &&
            inLoopHash === this.otherData.mostRecentHash
          ) {
            breakWhileLoop = true
            break
          }

          try {
            const parsedTx = asParsedTx(parse_tx(tx, false))
            this.processTonTransaction(parsedTx)
          } catch (e) {
            // unknown transaction type
          }
        }
        if (breakWhileLoop || transactions.length === 0) break
      } catch (e) {
        this.log.warn('queryTransactions error:', e)
      }
    }

    this.archiveTransactions = false
    this.otherData.mostRecentLogicalTime = mostRecentLogicalTime
    this.otherData.mostRecentHash = mostRecentHash

    if (this.transactionsChangedArray.length > 0) {
      this.walletLocalDataDirty = true
      this.currencyEngineCallbacks.onTransactionsChanged(
        this.transactionsChangedArray
      )
      this.transactionsChangedArray = []
    }

    this.tokenCheckTransactionsStatus[this.currencyInfo.currencyCode] = 1
    this.updateOnAddressesChecked()
  }

  processTonTransaction(tx: ParsedTx): void {
    const memos: EdgeMemo[] = []
    const ourReceiveAddresses = new Set<string>()
    let nativeAmount: string = '0'

    for (const message of [tx.inMessage, ...tx.outMessages]) {
      const { message: memo } = message
      // Currently, we only parse memos using 0x0 op_code
      if (memo != null && memo !== '') {
        memos.push({
          type: 'text',
          value: memo
        })
      }

      if (message.value == null) continue

      if (
        message.sender != null &&
        Address.parse(message.sender).equals(this.wallet.address)
      ) {
        nativeAmount = sub(nativeAmount, message.value.toString())
      } else if (Address.parse(message.recipient).equals(this.wallet.address)) {
        nativeAmount = add(nativeAmount, message.value.toString())
        ourReceiveAddresses.add(
          this.wallet.address.toString({ bounceable: false })
        )
      }
    }

    const networkFee = tx.originalTx.totalFees.coins.toString()
    if (lt(nativeAmount, '0')) {
      nativeAmount = sub(nativeAmount, networkFee)
    }

    const edgeTransaction: EdgeTransaction = {
      blockHeight: 1, // This isn't readily accessible from the TonClient and isn't important if we just mark it confirmed
      confirmations: 'confirmed',
      currencyCode: this.currencyInfo.currencyCode,
      date: tx.now,
      isSend: false,
      nativeAmount: nativeAmount,
      networkFee,
      memos,
      ourReceiveAddresses: [...ourReceiveAddresses],
      tokenId: null,
      txid: tx.hash,
      signedTx: '',
      walletId: this.walletId
    }
    this.addTransaction(this.currencyInfo.currencyCode, edgeTransaction)
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
