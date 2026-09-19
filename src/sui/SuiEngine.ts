import {
  CoinStruct,
  GasCostSummary,
  SuiTransactionBlockResponse
} from '@mysten/sui/client'
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
import {
  cleanTxLogs,
  getOtherParams,
  makeMutex,
  shuffleArray
} from '../common/utils'
import { SuiTools } from './SuiTools'
import {
  asSuiPrivateKeys,
  asSuiSignedTx,
  asSuiUnsignedTx,
  asSuiWalletOtherData,
  SuiNetworkInfo,
  SuiOtherMethods,
  SuiWalletOtherData
} from './suiTypes'

const ADDRESS_POLL_MILLISECONDS = getRandomDelayMs(20000)

/**
 * A pruned node reports a cursor outside its retention window as JSON-RPC
 * -32602 rather than as an empty page, so this is how "too old for me" arrives.
 * Reading it too broadly is safe: the only consequence is falling back to an
 * archival node, which is the conservative choice anyway.
 */
const isUnknownCursorError = (error: unknown): boolean => {
  if ((error as { code?: unknown } | null)?.code === -32602) return true
  return /could not find the referenced transaction/i.test(
    String((error as Error | null)?.message ?? error)
  )
}

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
   * Whether a full sweep has finished this session. Not persisted: every
   * session re-validates against an archival node before trusting a pruned one.
   */
  private historySynced = false

  /** Set when a pruned node rejects our cursor. Archival-only from then on. */
  private shallowCursorRejected = false

  /**
   * Serializes transaction passes, the way Tron, Polkadot, Algorand, and
   * Monero guard `queryTransactions`. Overlapping passes would race the saved
   * cursors and the `historySynced` / `shallowCursorRejected` flags, and
   * `killEngine` drains this before a resync resets that state.
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
   * Builds and dry-runs on a single node, raced across nodes. The build
   * resolves object versions that the dry run then validates, so the pair has
   * to see one node's view of the chain -- but racing the pair as a unit still
   * spreads load. Each attempt deserializes its own `Transaction` so that
   * parallel builds cannot interleave on shared internal state.
   */
  async buildAndDryRun(
    unsignedTx: string | Uint8Array
  ): Promise<{ serialized: Uint8Array; networkFee: string }> {
    return await this.tools.raceRpc(this.tools.rpcNodes, async client => {
      const serialized = await Transaction.from(unsignedTx).build({ client })
      const dryRun = await client.dryRunTransactionBlock({
        transactionBlock: serialized
      })
      return { serialized, networkFee: this.feeSum(dryRun.effects.gasUsed) }
    })
  }

  async queryBalance(): Promise<void> {
    try {
      const balances = await this.tools.raceRpc(
        this.tools.rpcNodes,
        async client => await client.getAllBalances({ owner: this.suiAddress })
      )

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
        this.reportDetectedTokens(detectedTokenIds)
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

    let fromOk = false
    let toOk = false

    try {
      await this.queryTransactionsInner('from')
      fromOk = true
    } catch (e) {
      this.log.warn('queryTransactions from error:', e)
    }

    // Only report progress that actually happened. These calls used to sit
    // outside the try/catch, so history claimed to be complete even when both
    // sweeps threw -- which is why a total RPC outage presented as a wallet
    // frozen at 50% instead of one visibly failing to sync.
    if (fromOk) {
      this.syncTracker.setHistoryRatios([null, ...this.enabledTokenIds], 0.5)
    }

    try {
      await this.queryTransactionsInner('to')
      toOk = true
    } catch (e) {
      this.log.warn('queryTransactions to error:', e)
    }

    this.sendTransactionEvents()

    if (fromOk && toOk) {
      this.syncTracker.setHistoryRatios([null, ...this.enabledTokenIds], 1)
      this.historySynced = true
    }
  }

  /**
   * Nodes eligible to serve a transaction sweep. Until a sweep completes this
   * session the walk begins at the wallet's oldest transaction and the saved
   * cursor may predate a pruned node's retention window, so only archival
   * nodes can answer. Once caught up the cursor is recent enough for any node.
   */
  private getTxQueryUrls(): string[] {
    const { rpcNodes, rpcNodesArchival } = this.tools
    if (!this.historySynced || this.shallowCursorRejected) {
      return rpcNodesArchival
    }
    return [...new Set([...rpcNodes, ...rpcNodesArchival])]
  }

  /**
   * Sweeps one direction to completion. The node stays pinned for the whole
   * sweep so pagination follows a single provider's view of history, while the
   * choice of node is shuffled per sweep to spread load. Rotating to another
   * node on failure is safe because each page commits its cursor as it goes.
   */
  async queryTransactionsInner(direction: 'from' | 'to'): Promise<void> {
    const urls = shuffleArray([...this.getTxQueryUrls()])
    let lastError: Error | undefined

    for (const url of urls) {
      try {
        await this.sweepTransactions(url, direction)
        return
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        if (
          isUnknownCursorError(error) &&
          !this.tools.rpcNodesArchival.includes(url)
        ) {
          // A dormant wallet's cursor can predate a pruned node's window even
          // when we are legitimately caught up, and it would fail this way on
          // every poll. Drop back to archival for the rest of the session.
          this.shallowCursorRejected = true
        }
      }
    }

    throw lastError ?? new Error('Sui: no RPC node available for tx query')
  }

  private async sweepTransactions(
    url: string,
    direction: 'from' | 'to'
  ): Promise<void> {
    const filter =
      direction === 'from'
        ? { FromAddress: this.suiAddress }
        : { ToAddress: this.suiAddress }

    let cursor = this.getCursor(direction)
    let queryMore = true

    while (queryMore) {
      const { data, hasNextPage, nextCursor } = await this.tools.callRpc(
        url,
        async client =>
          await client.queryTransactionBlocks({
            cursor,
            filter,
            order: 'ascending',
            options: {
              showBalanceChanges: true,
              showEffects: true,
              showRawInput: true
            }
          })
      )

      data.forEach(tx => this.processTransaction(tx, direction))

      // Nothing to advance to. The old code assigned a null cursor through,
      // which would restart the walk from the beginning on the next page.
      if (nextCursor == null) break

      cursor = nextCursor
      // Commit every page. The cursor was previously returned only after the
      // loop finished, so any mid-sweep failure discarded all of it and the
      // next poll began again from the start -- meaning a wallet whose history
      // could not be swept in a single pass never advanced at all.
      this.saveCursor(direction, cursor)
      queryMore = hasNextPage
    }
  }

  private getCursor(direction: 'from' | 'to'): string | undefined {
    return direction === 'from'
      ? this.otherData.latestTxidFrom
      : this.otherData.latestTxidTo
  }

  private saveCursor(direction: 'from' | 'to', cursor: string): void {
    if (this.getCursor(direction) === cursor) return
    if (direction === 'from') {
      this.otherData.latestTxidFrom = cursor
    } else {
      this.otherData.latestTxidTo = cursor
    }
    this.walletLocalDataDirty = true
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

    for (const [coinType, bal] of coinTypeMap) {
      let tokenId = null
      let nativeAmount = bal
      if (coinType !== SUI_TYPE_ARG) {
        tokenId = this.tools.edgeTokenIdFromCoinType(coinType)
        const edgeToken = this.allTokensMap[tokenId]
        if (edgeToken == null) continue
      }

      if (tokenId == null && direction === 'from') {
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
        ourReceiveAddresses: direction === 'to' ? [this.suiAddress] : [],
        signedTx: tx.rawTransaction,
        isSend: direction === 'from',
        memos: [], // TODO:
        tokenId,
        walletId: this.walletId
      }
      this.addTransaction(tokenId, edgeTx)
    }
  }

  /**
   * Gathers coins of one type until they cover `amount`. Read-only by design:
   * it returns the selection instead of touching the transaction, so racing it
   * across nodes cannot produce two conflicting builds.
   */
  private async collectCoins(
    url: string,
    coinType: string,
    amount: string
  ): Promise<{ coins: CoinStruct[]; total: string }> {
    const coins: CoinStruct[] = []
    let total = '0'
    let cursor: string | null | undefined

    while (true) {
      // Page through `callRpc` so each request is throttled and time-boxed on
      // its own, the way `sweepTransactions` does. The node stays pinned for
      // the whole walk, so pagination follows a single provider's view.
      const { data, hasNextPage, nextCursor } = await this.tools.callRpc(
        url,
        async client =>
          await client.getCoins({
            owner: this.suiAddress,
            coinType,
            cursor
          })
      )

      for (const coin of data) {
        coins.push(coin)
        total = add(total, coin.balance)
        if (!lt(total, amount)) return { coins, total }
      }

      // This loop used to page without passing a cursor, so a wallet whose
      // first page did not cover the amount re-read that same page forever.
      if (!hasNextPage || nextCursor == null) return { coins, total }
      cursor = nextCursor
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
    this.addToLoop('queryBalance', ADDRESS_POLL_MILLISECONDS)
    this.addToLoop('queryTransactions', ADDRESS_POLL_MILLISECONDS)
    await super.startEngine()
  }

  async killEngine(): Promise<void> {
    await super.killEngine()
    // Drain any in-flight transaction pass BEFORE `resyncBlockchain` clears the
    // cursors and resets `historySynced` below. That pass started while the
    // engine was on and keeps running (a promise cannot be cancelled); it can
    // still `saveCursor` and set `historySynced = true` until it finishes, so
    // resetting first would let those late writes clobber the reset and hand a
    // pruned node an ascending walk that silently drops history. `super`
    // already set `engineOn = false`, so a pass queued behind the mutex exits
    // immediately, and this empty pass simply waits out the running one.
    await this.queryTxMutex(async () => {})
  }

  async resyncBlockchain(): Promise<void> {
    await this.killEngine()
    await this.clearBlockchainCache()
    // `clearBlockchainCache` drops the cursors, so the next sweep walks from
    // the wallet's oldest transaction again and has to go back through an
    // archival node. Without resetting these, a resync in a session that had
    // already synced would allow a pruned node -- and a cursor-less ascending
    // walk against one returns truncated history rather than an error, so the
    // resync would report complete with transactions silently missing.
    this.historySynced = false
    this.shallowCursorRejected = false
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

      // Gather coins from one node at a time, shuffled, paging that node with
      // per-page throttle + timeout (like `sweepTransactions`). Running the
      // whole pagination inside a single `raceRpc` call throttled only once
      // and had to finish within one RPC timeout, so a wallet with many coin
      // objects could burst a provider's rate limit or time out. Rotating on
      // failure OR shortfall also drops a lagging node that under-reports
      // coins in favor of a healthy one; `InsufficientFundsError` surfaces
      // only once every node comes up short.
      const coinUrls = shuffleArray([...this.tools.rpcNodes])
      let coins: CoinStruct[] | undefined
      let total: string | undefined
      let lastCoinError: Error | undefined
      for (const url of coinUrls) {
        try {
          const result = await this.collectCoins(
            url,
            networkLocation.contractAddress,
            amount
          )
          if (lt(result.total, amount)) {
            lastCoinError = new InsufficientFundsError({ tokenId })
            continue
          }
          coins = result.coins
          total = result.total
          break
        } catch (error) {
          lastCoinError =
            error instanceof Error ? error : new Error(String(error))
        }
      }
      if (coins == null || total == null) {
        throw lastCoinError ?? new InsufficientFundsError({ tokenId })
      }

      const transferCoins = [...coins]
      if (gt(total, amount)) {
        // The final coin overshoots, so split off exactly what is needed and
        // send that alongside the whole coins gathered before it.
        const overshoot = transferCoins.pop() as CoinStruct
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
      nativeAmount: `-${nativeAmount}`,
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
      const broadcastResult = await formatAggregateError(
        this.tools.blastRpc(
          this.tools.rpcNodes,
          async client =>
            await client.executeTransactionBlock({
              transactionBlock: signedTxObj.bytes,
              signature: signedTxObj.signature
            })
        ),
        'Sui broadcast failed:'
      )

      edgeTransaction.txid = broadcastResult.digest
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
