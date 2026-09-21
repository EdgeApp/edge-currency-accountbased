import { add, gt, lt, mul, sub } from 'biggystring'
import { asString } from 'cleaners'
import {
  EdgeAddress,
  EdgeConfirmationState,
  EdgeCurrencyEngine,
  EdgeCurrencyEngineOptions,
  EdgeSpendInfo,
  EdgeTransaction,
  EdgeWalletInfo,
  InsufficientFundsError,
  JsonObject,
  NoAmountSpecifiedError
} from 'edge-core-js/types'
import { base16 } from 'rfc4648'

import { CurrencyEngine } from '../common/CurrencyEngine'
import { PluginEnvironment } from '../common/innerPlugin'
import { getRandomDelayMs } from '../common/network'
import { makeTokenSyncTracker, TokenSyncTracker } from '../common/SyncTracker'
import {
  cache,
  cleanTxLogs,
  getOtherParams,
  makeMutex,
  uint8ArrayToHex
} from '../common/utils'
import {
  addressFromPublicKey,
  decodeAddress,
  keypairFromSeed
} from './animicaCrypto'
import { AnimicaTools } from './AnimicaTools'
import { AnimicaChainParams, signTransfer } from './animicaTx'
import {
  AnimicaExplorerTx,
  AnimicaNetworkInfo,
  AnimicaTxOtherParams,
  AnimicaWalletOtherData,
  asAnimicaAddressHistory,
  asAnimicaExplorerTx,
  asAnimicaHead,
  asAnimicaHexQuantity,
  asAnimicaPrivateKeys,
  asAnimicaTxOtherParams,
  asAnimicaWalletOtherData,
  asSafeAnimicaWalletInfo,
  SafeAnimicaWalletInfo
} from './animicaTypes'

const BLOCKCHAIN_POLL_MILLISECONDS = getRandomDelayMs(20000)
const ADDRESS_POLL_MILLISECONDS = getRandomDelayMs(20000)
const TRANSACTION_POLL_MILLISECONDS = getRandomDelayMs(20000)
const GAS_PRICE_CACHE_MILLISECONDS = 30000

/**
 * Explorer pages per poll. A page is one explorer call, which scans a few
 * dozen blocks in roughly four seconds, so these bound how long one pass can
 * hold the polling loop. Catching up after a short absence normally takes a
 * single page; the backfill walks the rest of history a few pages at a time.
 */
const CATCH_UP_PAGES_PER_POLL = 10
const BACKFILL_PAGES_PER_POLL = 4

interface HistoryPage {
  txs: AnimicaExplorerTx[]
  /** First height the explorer did not scan; undefined once it hit genesis. */
  nextCursor: number | undefined
  /** Highest height this page covered. */
  topHeight: number
}

export class AnimicaEngine extends CurrencyEngine<
  AnimicaTools,
  SafeAnimicaWalletInfo,
  TokenSyncTracker
> {
  networkInfo: AnimicaNetworkInfo
  otherData!: AnimicaWalletOtherData
  animicaAddress: string
  chainParams: AnimicaChainParams
  getGasPrice: () => Promise<string>

  /**
   * Serializes history passes. Overlapping passes would race the scan range,
   * and `killEngine` drains this before a resync resets that range.
   */
  private readonly queryTxMutex = makeMutex()

  constructor(
    env: PluginEnvironment<AnimicaNetworkInfo>,
    tools: AnimicaTools,
    walletInfo: SafeAnimicaWalletInfo,
    opts: EdgeCurrencyEngineOptions
  ) {
    super(env, tools, walletInfo, opts, makeTokenSyncTracker)
    this.networkInfo = env.networkInfo
    this.animicaAddress = walletInfo.keys.publicKey
    this.chainParams = {
      chainId: this.networkInfo.chainId,
      genesisHash: base16.parse(
        this.networkInfo.genesisHash.replace(/^0x/i, '')
      ),
      forkId: this.networkInfo.forkId
    }
    this.getGasPrice = cache(
      this.queryGasPrice.bind(this),
      GAS_PRICE_CACHE_MILLISECONDS
    )
  }

  setOtherData(raw: any): void {
    this.otherData = asAnimicaWalletOtherData(raw)
  }

  // ****************************************************************************
  // Node queries
  // ****************************************************************************

  async fetchHeadHeight(): Promise<number> {
    const { height } = asAnimicaHead(await this.tools.fetchRpc('chain.getHead'))
    return height
  }

  /** `eth_gasPrice` in nANM per gas unit, floored at the configured default. */
  async queryGasPrice(): Promise<string> {
    const price = asAnimicaHexQuantity(
      await this.tools.fetchRpc('eth_gasPrice')
    )
    const { defaultGasPrice } = this.networkInfo
    return lt(price, defaultGasPrice) ? defaultGasPrice : price
  }

  /** The fee for a native transfer: a fixed gas limit times the gas price. */
  async getNetworkFee(): Promise<string> {
    return mul(this.networkInfo.gasLimit, await this.getGasPrice())
  }

  async queryBlockheight(): Promise<void> {
    try {
      this.updateBlockHeight(await this.fetchHeadHeight())
    } catch (e) {
      this.log.warn('queryBlockheight error:', e)
    }
  }

  async queryBalance(): Promise<void> {
    try {
      const balance = asAnimicaHexQuantity(
        await this.tools.fetchRpc('state.getBalance', [this.animicaAddress])
      )
      this.updateBalance(null, balance)
    } catch (e) {
      this.log.warn('queryBalance error:', e)
    }
  }

  // ****************************************************************************
  // Transaction history
  // ****************************************************************************

  /**
   * The node keeps no per-address index, so history comes from the explorer,
   * which scans blocks backwards from the tip in bounded windows. The engine
   * keeps one contiguous scanned range (`scanBottom`, `scanTop`] and extends
   * it at both ends: new blocks at the top every poll, and older blocks at
   * the bottom until the scan reaches genesis.
   */
  async queryTransactions(): Promise<void> {
    await this.queryTxMutex(async () => {
      // A pass queued behind the mutex can land here after `killEngine`, and
      // a resync wipes the scan range next; do not write into the fresh one.
      if (!this.engineOn) return
      try {
        await this.catchUpTransactions()
        await this.backfillTransactions()
      } catch (e) {
        this.log.warn('queryTransactions error:', e)
      }
      this.sendTransactionEvents()
      this.reportHistoryProgress()
    })
  }

  /**
   * Extends the range up to the chain tip, paging down from the tip until a
   * page meets the old top. When that cannot happen within one poll (the
   * wallet was away for a long time), the range restarts at the tip and the
   * backfill re-walks the old blocks. That costs time rather than
   * correctness: a transaction seen twice merges by txid.
   */
  private async catchUpTransactions(): Promise<void> {
    const { scanTop } = this.otherData
    let page = await this.fetchHistoryPage()
    const newTop = page.topHeight
    if (scanTop != null && newTop <= scanTop) return

    for (let pages = 1; ; ++pages) {
      this.addHistoryPage(page)
      if (page.nextCursor == null) {
        // The tip page reached genesis: the whole chain is scanned.
        this.setScanRange(newTop, undefined, true)
        return
      }
      if (scanTop != null && page.nextCursor <= scanTop) {
        // Joined the previously scanned range.
        this.setScanRange(
          newTop,
          this.otherData.scanBottom,
          this.otherData.historyComplete
        )
        return
      }
      if (scanTop == null || pages >= CATCH_UP_PAGES_PER_POLL) {
        // First sync, or too far behind: start a fresh range at the tip.
        this.setScanRange(newTop, page.nextCursor, false)
        return
      }
      if (!this.engineOn) return
      page = await this.fetchHistoryPage(page.nextCursor)
    }
  }

  /** Walks the bottom of the range towards genesis, a few pages per poll. */
  private async backfillTransactions(): Promise<void> {
    for (let pages = 0; pages < BACKFILL_PAGES_PER_POLL; ++pages) {
      const { scanBottom, scanTop, historyComplete } = this.otherData
      if (historyComplete || scanBottom == null || !this.engineOn) return

      const page = await this.fetchHistoryPage(scanBottom)
      this.addHistoryPage(page)
      this.setScanRange(scanTop, page.nextCursor, page.nextCursor == null)
      this.reportHistoryProgress()
    }
  }

  private setScanRange(
    scanTop: number | undefined,
    scanBottom: number | undefined,
    historyComplete: boolean
  ): void {
    this.otherData.scanTop = scanTop
    this.otherData.scanBottom = historyComplete ? undefined : scanBottom
    this.otherData.historyComplete = historyComplete
    this.walletLocalDataDirty = true
  }

  private reportHistoryProgress(): void {
    const { scanTop, scanBottom, historyComplete } = this.otherData
    let ratio = 0
    if (historyComplete) {
      ratio = 1
    } else if (scanTop != null && scanBottom != null) {
      ratio = (scanTop - scanBottom) / (scanTop + 1)
    }
    this.syncTracker.updateHistoryRatio(null, ratio)
  }

  /**
   * Fetches one explorer page, scanning down from `cursor` (the tip when
   * omitted). The explorer scans contiguous heights from its start down to
   * `nextCursor + 1`, so the page's top is recoverable from the response
   * even when the explorer picked the tip itself.
   */
  private async fetchHistoryPage(cursor?: number): Promise<HistoryPage> {
    const query = cursor == null ? '' : `?cursor=${cursor}`
    const raw = asAnimicaAddressHistory(
      await this.tools.fetchExplorer(`/address/${this.animicaAddress}${query}`)
    )

    const nextCursor =
      raw.nextCursor == null ? undefined : parseInt(raw.nextCursor)
    if (nextCursor != null && !Number.isSafeInteger(nextCursor)) {
      throw new Error(`Animica explorer returned cursor "${raw.nextCursor}"`)
    }
    if (raw.partial && nextCursor == null) {
      throw new Error('Animica explorer reported more history without a cursor')
    }
    if (raw.partial && raw.scannedBlocks === 0) {
      // The explorer could not read the block it was asked to start from
      // (its node may be a block behind ours). Nothing was scanned, so there
      // is nothing to record; the next poll tries again.
      throw new Error(
        `Animica explorer made no progress at cursor ${cursor ?? 'tip'}`
      )
    }

    const txs: AnimicaExplorerTx[] = []
    for (const rawTx of raw.txs) {
      try {
        txs.push(asAnimicaExplorerTx(rawTx))
      } catch (e) {
        this.log.warn('Skipping malformed explorer transaction:', e)
      }
    }

    return {
      txs,
      nextCursor,
      topHeight: (nextCursor ?? -1) + raw.scannedBlocks
    }
  }

  private addHistoryPage(page: HistoryPage): void {
    for (const tx of page.txs) this.processExplorerTx(tx)
  }

  processExplorerTx(tx: AnimicaExplorerTx): void {
    const isFrom = tx.from === this.animicaAddress
    const isTo = tx.to === this.animicaAddress
    if (!isFrom && !isTo) return

    const failed = tx.status === 'failed' || tx.classification?.failed === true
    const networkFee =
      tx.gasPrice != null && tx.gasLimit != null
        ? mul(tx.gasLimit, tx.gasPrice)
        : '0'
    // A failed transfer still burns its fee but moves no value:
    const value = failed ? '0' : tx.value

    let nativeAmount: string
    if (isFrom) {
      // A self-send only costs the fee.
      nativeAmount = sub('0', add(isTo ? '0' : value, networkFee))
    } else {
      if (failed) return
      nativeAmount = value
    }

    const blockHeight = tx.blockNumber ?? 0
    const confirmations: EdgeConfirmationState | undefined = failed
      ? 'failed'
      : undefined

    const edgeTransaction: EdgeTransaction = {
      blockHeight,
      confirmations,
      currencyCode: this.currencyInfo.currencyCode,
      date: tx.timestamp ?? (blockHeight === 0 ? Date.now() / 1000 : 0),
      isSend: isFrom,
      memos: [],
      nativeAmount,
      networkFee: isFrom ? networkFee : '0',
      networkFees: isFrom ? [{ tokenId: null, nativeAmount: networkFee }] : [],
      ourReceiveAddresses: isTo ? [this.animicaAddress] : [],
      signedTx: '',
      tokenId: null,
      txid: tx.hash.toLowerCase(),
      walletId: this.walletId
    }
    this.addTransaction(null, edgeTransaction)
  }

  // ****************************************************************************
  // Public methods
  // ****************************************************************************

  async startEngine(): Promise<void> {
    this.addToLoop('queryBlockheight', BLOCKCHAIN_POLL_MILLISECONDS)
    this.addToLoop('queryBalance', ADDRESS_POLL_MILLISECONDS)
    this.addToLoop('queryTransactions', TRANSACTION_POLL_MILLISECONDS)
    await super.startEngine()
  }

  async killEngine(): Promise<void> {
    await super.killEngine()
    // Wait out a history pass that is still paging the explorer before
    // `resyncBlockchain` resets the scan range, so its late writes cannot
    // clobber the reset. `super` already cleared `engineOn`, so a pass
    // queued behind the mutex exits immediately.
    await this.queryTxMutex(async () => {})
  }

  async resyncBlockchain(): Promise<void> {
    await this.killEngine()
    await this.clearBlockchainCache()
    await this.startEngine()
  }

  async getMaxSpendable(spendInfo: EdgeSpendInfo): Promise<string> {
    const balance = this.getBalance({ tokenId: null })
    const maxAmount = sub(balance, await this.getNetworkFee())
    if (lt(maxAmount, '0')) {
      throw new InsufficientFundsError({ tokenId: null })
    }

    spendInfo.spendTargets[0].nativeAmount = maxAmount
    // Use makeSpend to run the remaining checks:
    await this.makeSpend(spendInfo)
    return maxAmount
  }

  async makeSpend(edgeSpendInfoIn: EdgeSpendInfo): Promise<EdgeTransaction> {
    const { edgeSpendInfo, currencyCode } = this.makeSpendCheck(edgeSpendInfoIn)
    const { memos = [] } = edgeSpendInfo

    if (edgeSpendInfo.spendTargets.length !== 1) {
      throw new Error('Error: only one output allowed')
    }
    const { nativeAmount, publicAddress } = edgeSpendInfo.spendTargets[0]
    if (publicAddress == null) {
      throw new Error('makeSpend Missing publicAddress')
    }
    if (nativeAmount == null) throw new NoAmountSpecifiedError()

    let to: Uint8Array
    try {
      to = decodeAddress(publicAddress).digest
    } catch (e) {
      throw new Error('InvalidPublicAddressError')
    }

    const gasPrice = await this.getGasPrice()
    const { gasLimit, validityWindow } = this.networkInfo
    const networkFee = mul(gasLimit, gasPrice)
    const total = add(nativeAmount, networkFee)
    if (gt(total, this.getBalance({ tokenId: null }))) {
      throw new InsufficientFundsError({ tokenId: null, networkFee })
    }

    // Ask the node for the tip rather than using the last poll: the validity
    // window is only `validityWindow` blocks (a few hours), and a height that
    // went stale while the app was in the background would build a
    // transaction that is already expired.
    const head = await this.fetchHeadHeight()

    const otherParams: AnimicaTxOtherParams = {
      unsignedTx: {
        to: base16.stringify(to).toLowerCase(),
        amount: nativeAmount,
        data: '',
        gasPrice,
        gasLimit,
        validAfter: head,
        validUntil: head + validityWindow,
        salt: base16.stringify(this.tools.io.random(32)).toLowerCase()
      }
    }

    const edgeTransaction: EdgeTransaction = {
      blockHeight: 0,
      currencyCode,
      date: 0,
      isSend: true,
      memos,
      nativeAmount: `-${total}`,
      networkFee,
      networkFees: [{ tokenId: null, nativeAmount: networkFee }],
      otherParams,
      ourReceiveAddresses: [],
      signedTx: '',
      tokenId: null,
      txid: '',
      walletId: this.walletId
    }
    return edgeTransaction
  }

  async signTx(
    edgeTransaction: EdgeTransaction,
    privateKeys: JsonObject
  ): Promise<EdgeTransaction> {
    const { unsignedTx } = asAnimicaTxOtherParams(
      getOtherParams(edgeTransaction)
    )
    const keys = asAnimicaPrivateKeys(this.currencyInfo.pluginId)(privateKeys)
    const keypair = keypairFromSeed(await this.tools.seedFromKeys(keys))
    if (addressFromPublicKey(keypair.publicKey) !== this.animicaAddress) {
      throw new Error('Animica: private key does not match this wallet')
    }

    const { envelope, txid } = signTransfer(
      {
        chainId: this.networkInfo.chainId,
        from: decodeAddress(this.animicaAddress).digest,
        to: base16.parse(unsignedTx.to),
        amount: BigInt(unsignedTx.amount),
        data: base16.parse(unsignedTx.data),
        gasPrice: BigInt(unsignedTx.gasPrice),
        gasLimit: BigInt(unsignedTx.gasLimit),
        validAfter: unsignedTx.validAfter,
        validUntil: unsignedTx.validUntil,
        salt: base16.parse(unsignedTx.salt)
      },
      this.chainParams,
      keypair,
      this.tools.io.random(32)
    )

    edgeTransaction.signedTx = uint8ArrayToHex(envelope)
    edgeTransaction.txid = uint8ArrayToHex(txid)
    return edgeTransaction
  }

  async broadcastTx(
    edgeTransaction: EdgeTransaction
  ): Promise<EdgeTransaction> {
    const { signedTx } = edgeTransaction
    if (signedTx === '') throw new Error('Animica: transaction is not signed')

    try {
      // Pre-flight through the node's full admission path (decode, chain id,
      // ML-DSA verify, balance) without broadcasting, so a refusal arrives
      // with the node's reason code instead of a vague failure.
      await this.tools.fetchRpc('mempool.simulateAdmission', [signedTx])

      const txid = asString(
        await this.tools.fetchRpc('tx.sendRawTransaction', [signedTx])
      ).toLowerCase()
      if (txid !== edgeTransaction.txid) {
        this.warn(
          `broadcastTx: node txid ${txid} differs from local ${edgeTransaction.txid}`
        )
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

  async getAddresses(): Promise<EdgeAddress[]> {
    return [
      { addressType: 'publicAddress', publicAddress: this.animicaAddress }
    ]
  }
}

export async function makeCurrencyEngine(
  env: PluginEnvironment<AnimicaNetworkInfo>,
  tools: AnimicaTools,
  walletInfo: EdgeWalletInfo,
  opts: EdgeCurrencyEngineOptions
): Promise<EdgeCurrencyEngine> {
  const safeWalletInfo = asSafeAnimicaWalletInfo(walletInfo)

  const engine = new AnimicaEngine(env, tools, safeWalletInfo, opts)

  await engine.loadEngine()

  return engine
}
