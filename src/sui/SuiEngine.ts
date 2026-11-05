import { GasCostSummary } from '@mysten/sui/client'
import { SignatureWithBytes } from '@mysten/sui/cryptography'
import { Ed25519Keypair, Ed25519PublicKey } from '@mysten/sui/keypairs/ed25519'
import { Transaction } from '@mysten/sui/transactions'
import { SUI_TYPE_ARG } from '@mysten/sui/utils'
import { add, gt, lt, sub } from 'biggystring'
import {
  EdgeAddress,
  EdgeCurrencyEngine,
  EdgeCurrencyEngineOptions,
  EdgeSpendInfo,
  EdgeTransaction,
  EdgeWalletInfo,
  InsufficientFundsError,
  JsonObject,
  NoAmountSpecifiedError
} from 'edge-core-js/types'
import { base64 } from 'rfc4648'

import { CurrencyEngine } from '../common/CurrencyEngine'
import { PluginEnvironment } from '../common/innerPlugin'
import { getRandomDelayMs } from '../common/network'
import { formatAggregateError } from '../common/promiseUtils'
import { makeTokenSyncTracker, TokenSyncTracker } from '../common/SyncTracker'
import { asMaybeContractLocation } from '../common/tokenHelpers'
import {
  asSafeCommonWalletInfo,
  MakeTxParams,
  SafeCommonWalletInfo
} from '../common/types'
import { cleanTxLogs, getOtherParams, makeMutex } from '../common/utils'
import {
  executeTransaction,
  makeSuiBuildClient,
  simulateTransaction
} from './suiBuildClient'
import {
  cleanGraphqlCoins,
  coinObjectType,
  COINS_QUERY,
  SuiGraphqlCoin
} from './suiGraphql'
import { SuiHistoryTxPage, SuiTools } from './SuiTools'
import {
  asSuiPrivateKeys,
  asSuiSignedTx,
  asSuiUnsignedTx,
  asSuiWalletOtherData,
  SuiHistoryTx,
  SuiNetworkInfo,
  SuiOtherMethods,
  SuiWalletOtherData
} from './suiTypes'

const ADDRESS_POLL_MILLISECONDS = getRandomDelayMs(20000)

/**
 * GraphQL rejects a cursor it cannot decode this way. A saved cursor should
 * never hit it, but if one does, the only way forward is to start over. The
 * live service words it as a failure to parse the `String` cursor variable,
 * such as `Failed to parse "String": Invalid Base64` for a cursor that is not
 * base64, or `Failed to parse "String": Invalid encoding: failed to decode
 * Protobuf message: buffer underflow` for one that decodes to nothing usable.
 */
const isInvalidCursorError = (error: unknown): boolean =>
  /Failed to parse "String"|invalid cursor/i.test(
    String((error as Error | null)?.message ?? error)
  )

export class SuiEngine extends CurrencyEngine<
  SuiTools,
  SafeCommonWalletInfo,
  TokenSyncTracker
> {
  networkInfo: SuiNetworkInfo

  otherData!: SuiWalletOtherData
  suiAddress: string
  otherMethods: SuiOtherMethods

  /**
   * Serializes transaction passes, the way Tron, Polkadot, Algorand, and
   * Monero guard `queryTransactions`. Overlapping passes would race the saved
   * cursor, and `killEngine` drains this before a resync clears it.
   */
  private readonly queryTxMutex = makeMutex()

  constructor(
    env: PluginEnvironment<SuiNetworkInfo>,
    tools: SuiTools,
    walletInfo: SafeCommonWalletInfo,
    opts: EdgeCurrencyEngineOptions
  ) {
    super(env, tools, walletInfo, opts, makeTokenSyncTracker)
    this.networkInfo = env.networkInfo
    const publicKey = new Ed25519PublicKey(walletInfo.keys.publicKey)
    this.suiAddress = publicKey.toSuiAddress()

    this.otherMethods = {
      makeTx: async (makeTxParams: MakeTxParams): Promise<EdgeTransaction> => {
        if (makeTxParams.type !== 'MakeTx') {
          throw new Error('Unrecognized makeTx type')
        }
        const { unsignedTx, metadata } = makeTxParams
        const { serialized, networkFee } = await this.buildAndDryRun(unsignedTx)

        // For pre-built transactions, we can't determine the exact amount being sent
        // from the transaction data alone, so we set nativeAmount to '0'
        const nativeAmount = '0'

        // Check balance for fees
        const mainnetBalance = this.getBalance({ tokenId: null })
        if (gt(networkFee, mainnetBalance)) {
          throw new InsufficientFundsError({ tokenId: null, networkFee })
        }

        // Create the EdgeTransaction
        const edgeTx: EdgeTransaction = {
          blockHeight: 0,
          date: 0,
          currencyCode: this.currencyInfo.currencyCode,
          isSend: true,
          memos: metadata?.memos ?? [],
          nativeAmount,
          networkFee,
          networkFees: [{ tokenId: null, nativeAmount: networkFee }],
          ourReceiveAddresses: [this.suiAddress],
          otherParams: {
            unsignedBase64: base64.stringify(serialized)
          },
          tokenId: null,
          txid: '',
          signedTx: '',
          walletId: this.walletId,
          // Add metadata fields if provided
          ...(metadata?.assetAction != null && {
            assetAction: metadata.assetAction
          }),
          ...(metadata?.savedAction != null && {
            savedAction: metadata.savedAction
          }),
          ...(metadata?.metadata != null && { metadata: metadata.metadata }),
          ...(metadata?.swapData != null && { swapData: metadata.swapData })
        }
        return edgeTx
      }
    }
  }

  setOtherData(raw: any): void {
    this.otherData = asSuiWalletOtherData(raw)
  }

  /**
   * Builds and simulates on a single node. The build resolves object versions
   * that the simulation then checks, so the pair has to see one node's view of
   * the chain. Each attempt deserializes its own `Transaction` so that a retry
   * on the next node starts from the unresolved transaction.
   */
  async buildAndDryRun(
    unsignedTx: string | Uint8Array
  ): Promise<{ serialized: Uint8Array; networkFee: string }> {
    return await this.tools.withGraphqlNode(async call => {
      const serialized = await Transaction.from(unsignedTx).build({
        client: makeSuiBuildClient(call)
      })
      const simulation = await simulateTransaction(call, serialized)
      // The chain would charge gas for this and then abort it, so stop here
      // rather than let the user sign a transaction that cannot succeed:
      if (simulation.status !== 'success') {
        throw new Error(
          `Sui transaction would fail: ${simulation.error ?? 'unknown error'}`
        )
      }
      return { serialized, networkFee: this.feeSum(simulation.gasUsed) }
    })
  }

  async queryBalance(): Promise<void> {
    try {
      const balances = await this.tools.fetchBalances(this.suiAddress)

      const detectedTokenIds: string[] = []

      for (const bal of balances) {
        const { coinType, totalBalance } = bal

        if (coinType === SUI_TYPE_ARG) {
          this.updateBalance(null, totalBalance)
          continue
        }

        const tokenId = this.tools.edgeTokenIdFromCoinType(coinType)
        const edgeToken = this.allTokensMap[tokenId]
        if (edgeToken == null) continue

        this.updateBalance(tokenId, totalBalance)
        if (!this.enabledTokenIds.includes(tokenId)) {
          detectedTokenIds.push(tokenId)
        }
      }

      if (detectedTokenIds.length > 0) {
        this.currencyEngineCallbacks.onNewTokens(detectedTokenIds)
      }

      this.syncTracker.setBalanceRatios([null, ...this.enabledTokenIds], 1)
    } catch (e) {
      this.log.warn('queryBalance error:', e)
    }
  }

  async queryTransactions(): Promise<void> {
    return await this.queryTxMutex(
      async () => await this.queryTransactionsInnerLoop()
    )
  }

  async queryTransactionsInnerLoop(): Promise<void> {
    // A caller queued behind the mutex can land here after `killEngine` (a
    // resync or settings change wipes the session state next); do not write
    // into the fresh state.
    if (!this.engineOn) return

    try {
      await this.sweepTransactions()
      // Only report progress that actually happened, so an outage presents
      // as a wallet visibly failing to sync rather than one claiming to be
      // complete. A sweep cut short by `killEngine` did not finish either:
      if (this.engineOn) {
        this.syncTracker.setHistoryRatios([null, ...this.enabledTokenIds], 1)
      }
    } catch (e) {
      this.log.warn('queryTransactions error:', e)
    }

    this.sendTransactionEvents()
  }

  /**
   * Reads every transaction that touches the wallet, oldest first, from the
   * saved cursor to the newest. One walk covers sends and receipts alike, and
   * each page commits its cursor as it goes, so a failure part way through
   * resumes from the last page read.
   */
  private async sweepTransactions(): Promise<void> {
    let restarted = false

    while (true) {
      const cursor = this.otherData.txCursor ?? null
      let page: SuiHistoryTxPage
      try {
        page = await this.tools.fetchAddressTransactions(
          this.suiAddress,
          cursor
        )
      } catch (error: unknown) {
        if (cursor == null || restarted || !isInvalidCursorError(error)) {
          throw error
        }
        this.log.warn(`Sui cursor rejected, reading history again: ${cursor}`)
        restarted = true
        this.saveCursor(undefined)
        continue
      }

      page.txs.forEach(tx => this.processTransaction(tx))
      if (page.endCursor != null) this.saveCursor(page.endCursor)
      if (!page.hasNextPage) return
      if (page.endCursor == null) {
        throw new Error('Sui GraphQL gave no cursor for the next page')
      }
      // A cursor that does not move would ask for the same page forever:
      if (page.endCursor === cursor) {
        throw new Error(`Sui GraphQL repeated the cursor ${cursor}`)
      }
      // A long walk can outlive the engine; stop at the next page boundary so
      // `killEngine` is not held for the rest of the history:
      if (!this.engineOn) return
    }
  }

  private saveCursor(cursor: string | undefined): void {
    if (this.otherData.txCursor === cursor) return
    this.otherData.txCursor = cursor
    this.walletLocalDataDirty = true
  }

  processTransaction(tx: SuiHistoryTx): void {
    if (tx.checkpoint == null) return
    if (tx.rawTransaction == null) return

    if (tx.effects?.gasUsed == null) return
    const networkFee = this.feeSum(tx.effects?.gasUsed)
    const networkFees = [{ tokenId: null, nativeAmount: networkFee }]

    if (tx.timestampMs == null) return
    const date = Math.floor(parseInt(tx.timestampMs) / 1000)
    const isSend = tx.sender === this.suiAddress

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

    for (const [coinType, bal] of coinTypeMap) {
      let tokenId = null
      let nativeAmount = bal
      if (coinType !== SUI_TYPE_ARG) {
        tokenId = this.tools.edgeTokenIdFromCoinType(coinType)
        const edgeToken = this.allTokensMap[tokenId]
        if (edgeToken == null) continue
      }

      if (tokenId == null && isSend) {
        nativeAmount = sub(nativeAmount, networkFee)
      }

      const currencyCode = this.getCurrencyCode(tokenId)
      if (currencyCode == null) continue

      const edgeTx: EdgeTransaction = {
        txid: tx.digest,
        date,
        currencyCode,
        confirmations: 'confirmed',
        blockHeight: parseInt(tx.checkpoint),
        nativeAmount,
        networkFee,
        networkFees,
        ourReceiveAddresses: isSend ? [] : [this.suiAddress],
        signedTx: tx.rawTransaction,
        isSend,
        memos: [], // TODO:
        tokenId,
        walletId: this.walletId
      }
      this.addTransaction(tokenId, edgeTx)
    }
  }

  /**
   * Gathers coins of one type until they cover `amount`, paging one node at a
   * time. A node that comes up short fails over to the next, so a lagging node
   * that under-reports coins loses to a healthy one, and
   * `InsufficientFundsError` surfaces only once every node comes up short.
   */
  private async collectCoins(
    coinType: string,
    amount: string,
    tokenId: string
  ): Promise<{ coins: SuiGraphqlCoin[]; total: string }> {
    return await this.tools.withGraphqlNode(async call => {
      const coins: SuiGraphqlCoin[] = []
      let total = '0'
      let after: string | null = null

      while (true) {
        const page = cleanGraphqlCoins(
          await call(COINS_QUERY, {
            owner: this.suiAddress,
            type: coinObjectType(coinType),
            after
          })
        )

        for (const coin of page.coins) {
          coins.push(coin)
          total = add(total, coin.balance)
          if (!lt(total, amount)) return { coins, total }
        }

        if (!page.hasNextPage || page.endCursor == null) {
          throw new InsufficientFundsError({ tokenId })
        }
        if (page.endCursor === after) {
          throw new Error(`Sui GraphQL repeated the coin cursor ${after}`)
        }
        after = page.endCursor
      }
    })
  }

  feeSum(gasUsed: GasCostSummary): string {
    const { computationCost, storageCost, storageRebate } = gasUsed
    return sub(add(computationCost, storageCost), storageRebate)
  }

  // // ****************************************************************************
  // // Public methods
  // // ****************************************************************************

  async startEngine(): Promise<void> {
    this.addToLoop('queryBalance', ADDRESS_POLL_MILLISECONDS)
    this.addToLoop('queryTransactions', ADDRESS_POLL_MILLISECONDS)
    await super.startEngine()
  }

  async killEngine(): Promise<void> {
    await super.killEngine()
    // Drain any in-flight transaction pass BEFORE `resyncBlockchain` clears the
    // cursor. That pass started while the engine was on and keeps running (a
    // promise cannot be cancelled); it can still `saveCursor` until it
    // finishes, so clearing first would let that late write clobber the reset
    // and skip the history before it. `super` already set `engineOn = false`,
    // so a pass queued behind the mutex exits immediately, and this empty pass
    // simply waits out the running one.
    await this.queryTxMutex(async () => {})
  }

  async resyncBlockchain(): Promise<void> {
    await this.killEngine()
    await this.clearBlockchainCache()
    await this.startEngine()
  }

  async getMaxSpendable(spendInfo: EdgeSpendInfo): Promise<string> {
    const { tokenId } = spendInfo
    const balance = this.getBalance({
      tokenId
    })
    const publicAddress = spendInfo.spendTargets[0]?.publicAddress
    if (publicAddress == null) {
      throw new Error('Missing publicAddress')
    }

    let maxAmount = '0'
    if (tokenId == null) {
      // We can actually send the whole balance but it requires a small change
      // to the transaction creation which cannot be nicely special-cased. We
      // can actually empty the wallet with upcoming makeMaxSpend API. For now
      // we leave 0.1 SUI behind.
      maxAmount = sub(balance, '100000000')
      if (lt(maxAmount, '0')) {
        throw new InsufficientFundsError({ tokenId: null })
      }
    } else {
      maxAmount = balance
    }

    spendInfo.spendTargets[0].nativeAmount = maxAmount
    // Use makeSpend to test for insufficient funds
    await this.makeSpend(spendInfo)
    return maxAmount
  }

  async makeSpend(edgeSpendInfoIn: EdgeSpendInfo): Promise<EdgeTransaction> {
    const { edgeSpendInfo, currencyCode } = this.makeSpendCheck(edgeSpendInfoIn)
    const { memos = [], tokenId } = edgeSpendInfo

    if (edgeSpendInfo.spendTargets.length !== 1) {
      throw new Error('Error: only one output allowed')
    }

    const { nativeAmount: amount, publicAddress } =
      edgeSpendInfo.spendTargets[0]

    if (publicAddress == null)
      throw new Error('makeSpend Missing publicAddress')
    if (amount == null) throw new NoAmountSpecifiedError()

    const tx = new Transaction()

    if (tokenId == null) {
      const coins = tx.splitCoins(tx.gas, [amount])
      tx.transferObjects([coins], publicAddress)
    } else {
      const networkLocation = asMaybeContractLocation(
        this.allTokensMap[tokenId].networkLocation
      )
      if (networkLocation == null) {
        throw new Error('Unknown token')
      }

      const setGasBudget = (coinCount: number): void => {
        // These are safe overestimates
        const base = 1000000
        const gasPerCoin = 1500000
        tx.setGasBudgetIfNotSet(base + coinCount * gasPerCoin)
      }

      const { coins, total } = await this.collectCoins(
        networkLocation.contractAddress,
        amount,
        tokenId
      )

      const transferCoins = [...coins]
      if (gt(total, amount)) {
        // The final coin overshoots, so split off exactly what is needed and
        // send that alongside the whole coins gathered before it.
        const overshoot = transferCoins.pop() as SuiGraphqlCoin
        const amountNeeded = sub(overshoot.balance, sub(total, amount))
        const [newCoin] = tx.splitCoins(overshoot.coinObjectId, [amountNeeded])

        tx.transferObjects(
          [newCoin, ...transferCoins.map(c => tx.object(c.coinObjectId))],
          publicAddress
        )
        setGasBudget(transferCoins.length + 1)
      } else {
        // Exact match, so no split is needed.
        tx.transferObjects(
          transferCoins.map(c => tx.object(c.coinObjectId)),
          publicAddress
        )
        setGasBudget(transferCoins.length)
      }
    }

    tx.setSender(this.suiAddress)
    const { serialized, networkFee: estimatedFee } = await this.buildAndDryRun(
      await tx.toJSON()
    )
    let networkFee = estimatedFee

    const mainnetBalance = this.getBalance({ tokenId: null })
    let nativeAmount = amount
    let parentNetworkFee: string | undefined
    if (tokenId == null) {
      nativeAmount = add(amount, networkFee)
      if (gt(nativeAmount, mainnetBalance)) {
        throw new InsufficientFundsError({ tokenId: null, networkFee })
      }
    } else {
      const tokenBalance = this.getBalance({ tokenId })
      if (gt(nativeAmount, tokenBalance)) {
        throw new InsufficientFundsError({ tokenId })
      }
      if (gt(networkFee, mainnetBalance)) {
        throw new InsufficientFundsError({ tokenId: null, networkFee })
      }
      parentNetworkFee = networkFee
      networkFee = '0'
    }

    const edgeTx: EdgeTransaction = {
      blockHeight: 0,
      date: 0,
      currencyCode,
      isSend: true,
      memos,
      nativeAmount: sub('0', nativeAmount),
      networkFee,
      networkFees: [
        { tokenId: null, nativeAmount: parentNetworkFee ?? networkFee }
      ],
      parentNetworkFee,
      ourReceiveAddresses: [this.suiAddress],
      otherParams: {
        unsignedBase64: base64.stringify(serialized)
      },
      tokenId,
      txid: '',
      signedTx: '',
      walletId: this.walletId
    }
    return edgeTx
  }

  async signTx(
    edgeTransaction: EdgeTransaction,
    privateKeys: JsonObject
  ): Promise<EdgeTransaction> {
    const { unsignedBase64 } = asSuiUnsignedTx(getOtherParams(edgeTransaction))
    const tx = Transaction.from(unsignedBase64)

    const keys = asSuiPrivateKeys(this.currencyInfo.pluginId)(privateKeys)
    let pair: Ed25519Keypair
    if (keys.mnemonic != null) {
      pair = Ed25519Keypair.deriveKeypair(keys.mnemonic)
    } else if (keys.privateKey != null) {
      const secretKey = Buffer.from(keys.privateKey.replace(/^0x/i, ''), 'hex')
      pair = Ed25519Keypair.fromSecretKey(secretKey)
    } else {
      throw new Error('SUI: Missing keys for signing')
    }
    const res = await tx.sign({ signer: pair })
    edgeTransaction.signedTx = JSON.stringify(res)
    edgeTransaction.txid = await tx.getDigest()
    return edgeTransaction
  }

  async broadcastTx(
    edgeTransaction: EdgeTransaction
  ): Promise<EdgeTransaction> {
    try {
      const signedTxObj: SignatureWithBytes = asSuiSignedTx(
        JSON.parse(edgeTransaction.signedTx)
      )

      // Submit to every node at once. Execution is idempotent by digest, so
      // the duplicates are harmless, and a node reporting the transaction as
      // already executed is ignored as long as one submission succeeds.
      const digest = await formatAggregateError(
        this.tools.blastGraphql(
          async call =>
            await executeTransaction(
              call,
              signedTxObj.bytes,
              signedTxObj.signature
            )
        ),
        'Sui broadcast failed:'
      )

      edgeTransaction.txid = digest
      edgeTransaction.date = Date.now() / 1000
      this.warn(`SUCCESS broadcastTx\n${cleanTxLogs(edgeTransaction)}`)
      return edgeTransaction
    } catch (e: any) {
      this.warn('FAILURE broadcastTx failed: ', e)
      throw e
    }
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
