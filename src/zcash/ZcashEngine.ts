import { add, eq, gt, mul, sub } from 'biggystring'
import {
  EdgeAddress,
  EdgeCurrencyEngine,
  EdgeCurrencyEngineOptions,
  EdgeEnginePrivateKeyOptions,
  EdgeMemo,
  EdgeSpendInfo,
  EdgeTransaction,
  EdgeWalletInfo,
  InsufficientFundsError,
  NoAmountSpecifiedError
} from 'edge-core-js/types'
import type {
  CreateTransferOpts,
  InitializerConfig,
  StatusEvent,
  Transaction
} from 'react-native-zcash'
import { base16, base64 } from 'rfc4648'

import { CurrencyEngine } from '../common/CurrencyEngine'
import { PluginEnvironment } from '../common/innerPlugin'
import { cleanTxLogs, getOtherParams } from '../common/utils'
import { ZcashTools } from './ZcashTools'
import {
  asSafeZcashWalletInfo,
  asZcashPrivateKeys,
  asZcashWalletOtherData,
  SafeZcashWalletInfo,
  ZcashBalances,
  ZcashNetworkInfo,
  ZcashSynchronizer,
  ZcashWalletOtherData
} from './zcashTypes'

const AUTOSHIELD_MEMO = 'autoshield'

export class ZcashEngine extends CurrencyEngine<
  ZcashTools,
  SafeZcashWalletInfo
> {
  pluginId: string
  networkInfo: ZcashNetworkInfo
  otherData!: ZcashWalletOtherData
  synchronizerStatus!: StatusEvent['name']
  availableZatoshi!: string
  balances: ZcashBalances
  progressRatio!: {
    seenFirstUpdate: boolean
    percent: number
    lastUpdate: number
  }

  makeSynchronizer: (config: InitializerConfig) => Promise<ZcashSynchronizer>

  // Synchronizer management
  stopSyncing?: (value: number | PromiseLike<number>) => void
  synchronizer?: ZcashSynchronizer
  synchronizerPromise: Promise<ZcashSynchronizer>
  synchronizerResolver!: (synchronizer: ZcashSynchronizer) => void
  autoshielding: {
    createAutoshieldTx: boolean
    threshold: string
    txid?: string
  }

  constructor(
    env: PluginEnvironment<ZcashNetworkInfo>,
    tools: ZcashTools,
    walletInfo: SafeZcashWalletInfo,
    opts: EdgeCurrencyEngineOptions,
    makeSynchronizer: any
  ) {
    super(env, tools, walletInfo, opts)
    const { networkInfo } = env
    this.pluginId = this.currencyInfo.pluginId
    this.networkInfo = networkInfo
    this.makeSynchronizer = makeSynchronizer
    this.synchronizerPromise = new Promise<ZcashSynchronizer>(resolve => {
      this.synchronizerResolver = resolve
    })
    this.balances = {
      transparentAvailableZatoshi: '0',
      transparentTotalZatoshi: '0',
      saplingAvailableZatoshi: '0',
      saplingTotalZatoshi: '0',
      orchardAvailableZatoshi: '0',
      orchardTotalZatoshi: '0'
    }
    this.autoshielding = {
      createAutoshieldTx: false,
      threshold: mul(this.networkInfo.defaultNetworkFee, '2') // Only autoshield if received shielded balance is greater than the default fee
    }
  }

  setOtherData(raw: any): void {
    this.otherData = asZcashWalletOtherData(raw)
  }

  initData(): void {
    // walletLocalData
    this.otherData.isSdkInitializedOnDisk = true
    this.walletLocalDataDirty = true

    // Engine variables
    this.synchronizerStatus = 'DISCONNECTED'
    this.availableZatoshi = '0'
    this.progressRatio = {
      seenFirstUpdate: false,
      percent: 0,
      lastUpdate: 0
    }
  }

  initSubscriptions(): void {
    if (this.synchronizer == null) return
    this.synchronizer.on('update', async payload => {
      const { scanProgress, networkBlockHeight } = payload
      this.onUpdateBlockHeight(networkBlockHeight)
      this.onUpdateProgress(scanProgress)
      await this.checkAutoshielding()
    })
    this.synchronizer.on('statusChanged', async payload => {
      this.synchronizerStatus = payload.name
    })
    this.synchronizer.on('balanceChanged', async payload => {
      const {
        transparentAvailableZatoshi,
        transparentTotalZatoshi,
        saplingAvailableZatoshi,
        saplingTotalZatoshi,
        orchardAvailableZatoshi,
        orchardTotalZatoshi
      } = payload

      // Transparent funds will be autoshielded so the available balance should only reflect the shielded balances
      this.availableZatoshi = add(
        saplingAvailableZatoshi,
        orchardAvailableZatoshi
      )
      this.balances = {
        transparentAvailableZatoshi,
        transparentTotalZatoshi,
        saplingAvailableZatoshi,
        saplingTotalZatoshi,
        orchardAvailableZatoshi,
        orchardTotalZatoshi
      }

      const total = add(
        add(transparentTotalZatoshi, saplingTotalZatoshi),
        orchardTotalZatoshi
      )

      this.updateBalance(this.currencyInfo.currencyCode, total)
      await this.checkAutoshielding()
    })
    this.synchronizer.on('transactionsChanged', async payload => {
      const { transactions } = payload
      transactions.forEach(tx => {
        // Check if the autoshielding transaction has confirmed
        if (
          tx.rawTransactionId === this.autoshielding.txid &&
          tx.minedHeight > 0
        ) {
          this.autoshielding.txid = undefined
          this.autoshielding.createAutoshieldTx = false
        }

        this.processTransaction(tx)
      })
      this.onUpdateTransactions()
    })
    this.synchronizer.on('error', async payload => {
      this.log.warn(`Synchronizer error: ${payload.message}`)
      if (payload.level === 'critical') {
        await this.killEngine()
        await this.startEngine()
      }
    })
  }

  onUpdateBlockHeight(networkBlockHeight: number): void {
    if (this.walletLocalData.blockHeight !== networkBlockHeight) {
      this.walletLocalData.blockHeight = networkBlockHeight
      this.walletLocalDataDirty = true
      this.currencyEngineCallbacks.onBlockHeightChanged(
        this.walletLocalData.blockHeight
      )
    }
  }

  onUpdateTransactions(): void {
    if (this.transactionsChangedArray.length > 0) {
      this.currencyEngineCallbacks.onTransactionsChanged(
        this.transactionsChangedArray
      )
      this.transactionsChangedArray = []
    }
  }

  onUpdateProgress(scanProgress: number): void {
    // We can't trust the first progress report from the sdks. We'll take it if its 100 but otherwise we should toss it.
    if (!this.progressRatio.seenFirstUpdate) {
      this.progressRatio.seenFirstUpdate = true
      if (scanProgress !== 100) return
    }

    // Balance and transaction querying is handled during the sync therefore we can treat them the same.

    this.tokenCheckBalanceStatus[this.currencyInfo.currencyCode] =
      scanProgress / 100
    this.tokenCheckTransactionsStatus[this.currencyInfo.currencyCode] =
      scanProgress / 100

    if (
      scanProgress > this.progressRatio.percent &&
      (scanProgress === 100 ||
        Date.now() - this.progressRatio.lastUpdate > 1000) // throttle updates to one second
    ) {
      this.progressRatio.percent = scanProgress
      this.progressRatio.lastUpdate = Date.now()
      this.log.warn(`Scan and download progress: ${Math.floor(scanProgress)}%`)
      this.updateOnAddressesChecked()
    }
  }

  // super.updateBalance calls updateOnAddressesChecked() but we want to limit that method to onUpdateProgress
  updateBalance(currencyCode: string, balance: string): void {
    const currentBalance = this.walletLocalData.totalBalances[currencyCode]
    if (this.walletLocalData.totalBalances[currencyCode] == null) {
      this.walletLocalData.totalBalances[currencyCode] = '0'
    }
    if (currentBalance == null || !eq(balance, currentBalance)) {
      this.walletLocalData.totalBalances[currencyCode] = balance
      this.walletLocalDataDirty = true
      this.warn(`${currencyCode}: token Address balance: ${balance}`)
      this.currencyEngineCallbacks.onBalanceChanged(currencyCode, balance)
    }
  }

  async startEngine(): Promise<void> {
    this.engineOn = true
    await super.startEngine()
  }

  isSynced(): boolean {
    // Synchronizer status is updated regularly and should be checked before accessing the db to avoid errors
    return this.synchronizerStatus === 'SYNCED'
  }

  processTransaction(tx: Transaction): void {
    const {
      rawTransactionId,
      raw,
      blockTimeInSeconds,
      minedHeight,
      value,
      fee,
      toAddress,
      memos
    } = tx
    let netNativeAmount = value
    const networkFee = fee ?? this.networkInfo.defaultNetworkFee
    if (toAddress != null) {
      // check if tx is a spend
      netNativeAmount = `-${add(netNativeAmount, networkFee)}`
    }

    const edgeMemos: EdgeMemo[] = memos
      .filter(text => text !== '')
      .map(text => ({
        memoName: 'memo',
        type: 'text',
        value: text
      }))

    // Hack for missing memos on android
    if (
      this.otherData.missingAndroidShieldedMemosHack.includes(
        rawTransactionId
      ) &&
      edgeMemos.length === 0
    ) {
      edgeMemos.push({
        memoName: 'memo',
        type: 'text',
        value: AUTOSHIELD_MEMO
      })
    }

    // Special case for autoshield txs
    if (edgeMemos[0]?.value === AUTOSHIELD_MEMO) {
      netNativeAmount = `-${networkFee}`
    }

    // The only pending transactions emitted from the sdk are the ones we create and it's possible
    // to see them through the 'transactionsChanged' listener before the synchronizer's sendToAddress
    // or shieldFunds resolves. In this case, we'll add the current time as the transaction date.
    const date =
      minedHeight === 0
        ? Math.max(blockTimeInSeconds, Date.now() / 1000)
        : blockTimeInSeconds

    const edgeTransaction: EdgeTransaction = {
      blockHeight: minedHeight,
      currencyCode: this.currencyInfo.currencyCode,
      date,
      isSend: netNativeAmount.startsWith('-'),
      memos: edgeMemos,
      nativeAmount: netNativeAmount,
      networkFee,
      networkFees: [],
      otherParams: {},
      ourReceiveAddresses: [], // Not accessible from SDK and unified addresses are deterministic
      signedTx: raw ?? '',
      tokenId: null,
      txid: rawTransactionId,
      walletId: this.walletId
    }
    this.addTransaction(this.currencyInfo.currencyCode, edgeTransaction)
  }

  async checkAutoshielding(): Promise<void> {
    if (
      this.isSynced() &&
      !this.autoshielding.createAutoshieldTx &&
      gt(
        this.balances.transparentAvailableZatoshi,
        this.autoshielding.threshold
      )
    ) {
      this.autoshielding.createAutoshieldTx = true
      await this.restartSyncNetwork()
    }
  }

  async syncNetwork(opts: EdgeEnginePrivateKeyOptions): Promise<number> {
    if (!this.engineOn) return 1000

    const zcashPrivateKeys = asZcashPrivateKeys(this.currencyInfo.pluginId)(
      opts?.privateKeys
    )

    if (this.synchronizer == null) {
      const { rpcNode } = this.networkInfo

      // Replace this.synchronizerPromise with a fresh promise. The old promise might have already been resolved
      this.synchronizerPromise = this.makeSynchronizer({
        mnemonicSeed: zcashPrivateKeys.mnemonic,
        birthdayHeight: zcashPrivateKeys.birthdayHeight,
        alias: base16.stringify(base64.parse(this.walletId)),
        newWallet: !this.otherData.isSdkInitializedOnDisk,
        ...rpcNode
      })
      this.synchronizer = await this.synchronizerPromise
      // People might be waiting on the old promise, so resolve that
      this.synchronizerResolver(this.synchronizer)
      this.initData()
      this.initSubscriptions()
    }

    if (this.synchronizer != null && this.autoshielding.createAutoshieldTx) {
      return await new Promise(resolve => {
        this.log.warn('Autoshield transaction broadcasting...')
        this.synchronizer
          ?.shieldFunds({
            seed: zcashPrivateKeys.mnemonic,
            memo: AUTOSHIELD_MEMO,
            threshold: this.autoshielding.threshold
          })
          .then(tx => {
            this.log.warn('Autoshield success', tx.rawTransactionId)
            tx.blockTimeInSeconds = Date.now() / 1000
            this.autoshielding.txid = tx.rawTransactionId

            // The Android SDK can't find shielding transactions memos so we can save it locally for a slightly nicer UX
            this.otherData.missingAndroidShieldedMemosHack.push(
              tx.rawTransactionId
            )
            this.walletLocalDataDirty = true

            this.processTransaction(tx)
            this.onUpdateTransactions()
          })
          .catch(e => {
            this.autoshielding.createAutoshieldTx = false
            this.log.error('Autoshield failed: ', e)
          })
          .finally(() => {
            this.stopSyncing = resolve
          })
      })
    }

    return await new Promise(resolve => {
      this.stopSyncing = resolve
    })
  }

  async killEngine(): Promise<void> {
    this.synchronizerPromise = new Promise<ZcashSynchronizer>(resolve => {
      this.synchronizerResolver = resolve
    })
    await super.killEngine()
    await this.restartSyncNetwork()
    await this.synchronizer?.stop()
    this.synchronizer = undefined
  }

  async restartSyncNetwork(): Promise<void> {
    if (this.stopSyncing != null) {
      await this.stopSyncing(1000)
      this.stopSyncing = undefined
    }
  }

  async clearBlockchainCache(): Promise<void> {
    await super.clearBlockchainCache()
  }

  async resyncBlockchain(): Promise<void> {
    // Don't bother stopping and restarting the synchronizer for a resync
    await super.killEngine()
    await this.clearBlockchainCache()
    await this.startEngine()
    await this.synchronizer
      ?.rescan()
      .catch((e: any) => this.warn('resyncBlockchain failed: ', e))
    this.initData()
    this.synchronizerStatus = 'SYNCING'
  }

  async getMaxSpendable(edgeSpendInfo: EdgeSpendInfo): Promise<string> {
    const { memos = [], spendTargets } = edgeSpendInfo
    const { publicAddress } = spendTargets[0]

    if (publicAddress == null) {
      throw new Error('makeSpend Missing publicAddress')
    }
    const synchronizer = await this.synchronizerPromise
    try {
      // We anticipate this to fail and return an error message we cna parse the spendable amount from
      await synchronizer.proposeTransfer({
        toAddress: publicAddress,
        zatoshi: this.availableZatoshi,
        memo: memos[0]?.value ?? ''
      })
    } catch (e) {
      const networkFee = extractFeeFromProposeTransferErrorString(String(e))
      return sub(this.availableZatoshi, networkFee)
    }
    return this.availableZatoshi
  }

  async makeSpend(edgeSpendInfoIn: EdgeSpendInfo): Promise<EdgeTransaction> {
    const { edgeSpendInfo, currencyCode } = this.makeSpendCheck(edgeSpendInfoIn)
    const { memos = [], tokenId } = edgeSpendInfo
    const spendTarget = edgeSpendInfo.spendTargets[0]
    const { publicAddress, nativeAmount } = spendTarget

    if (publicAddress == null)
      throw new Error('makeSpend Missing publicAddress')
    if (nativeAmount == null) throw new NoAmountSpecifiedError()

    if (eq(nativeAmount, '0')) throw new NoAmountSpecifiedError()

    if (gt(nativeAmount, this.availableZatoshi)) {
      throw new InsufficientFundsError({ tokenId })
    }

    const synchronizer = await this.synchronizerPromise
    const proposal = await synchronizer.proposeTransfer({
      toAddress: publicAddress,
      zatoshi: nativeAmount,
      memo: memos[0]?.value ?? ''
    })

    const networkFee = proposal.totalFee

    const totalTxAmount = add(nativeAmount, networkFee)

    if (
      gt(
        totalTxAmount,
        this.walletLocalData.totalBalances[this.currencyInfo.currencyCode] ??
          '0'
      )
    ) {
      throw new InsufficientFundsError({ tokenId })
    }

    if (gt(totalTxAmount, this.availableZatoshi)) {
      throw new InsufficientFundsError({ tokenId })
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
      networkFees: [],
      otherParams: {
        proposalBase64: proposal.proposalBase64
      },
      ourReceiveAddresses: [],
      signedTx: '',
      tokenId,
      txid: '',
      walletId: this.walletId
    }

    return edgeTransaction
  }

  async signTx(edgeTransaction: EdgeTransaction): Promise<EdgeTransaction> {
    // Transaction is signed and broadcast at the same time
    return edgeTransaction
  }

  async broadcastTx(
    edgeTransaction: EdgeTransaction,
    opts?: EdgeEnginePrivateKeyOptions
  ): Promise<EdgeTransaction> {
    const { proposalBase64 } = getOtherParams(edgeTransaction)
    if (proposalBase64 == null) {
      throw new Error('Missing proposalBase64 from makeSpend')
    }
    const zcashPrivateKeys = asZcashPrivateKeys(this.pluginId)(
      opts?.privateKeys
    )

    const txParams: CreateTransferOpts = {
      proposalBase64,
      mnemonicSeed: zcashPrivateKeys.mnemonic
    }

    try {
      const synchronizer = await this.synchronizerPromise
      const txid = await synchronizer.createTransfer(txParams)
      edgeTransaction.txid = txid
      edgeTransaction.date = Date.now() / 1000
      this.warn(`SUCCESS broadcastTx\n${cleanTxLogs(edgeTransaction)}`)
    } catch (e: any) {
      this.warn('FAILURE broadcastTx failed: ', e)
      throw e
    }
    return edgeTransaction
  }

  async getAddresses(): Promise<EdgeAddress[]> {
    const getSynchronizerAddresses = async (): Promise<EdgeAddress[]> => {
      const synchronizer = await this.synchronizerPromise
      const { saplingAddress, transparentAddress, unifiedAddress } =
        await synchronizer.deriveUnifiedAddress()
      const addresses: EdgeAddress[] = [
        {
          addressType: 'unifiedAddress',
          publicAddress: unifiedAddress
        },
        {
          addressType: 'saplingAddress',
          publicAddress: saplingAddress
        },
        {
          addressType: 'transparentAddress',
          publicAddress: transparentAddress
        }
      ]

      this.otherData.cachedAddresses = addresses
      this.walletLocalDataDirty = true

      return addresses
    }

    if (this.otherData.cachedAddresses == null) {
      return await getSynchronizerAddresses()
    } else {
      getSynchronizerAddresses().catch(e => {
        throw e
      })
      return this.otherData.cachedAddresses
    }
  }
}

export async function makeCurrencyEngine(
  env: PluginEnvironment<ZcashNetworkInfo>,
  tools: ZcashTools,
  walletInfo: EdgeWalletInfo,
  opts: EdgeCurrencyEngineOptions
): Promise<EdgeCurrencyEngine> {
  const safeWalletInfo = asSafeZcashWalletInfo(walletInfo)
  const { makeSynchronizer } = env.nativeIo['edge-currency-accountbased'].zcash

  const engine = new ZcashEngine(
    env,
    tools,
    safeWalletInfo,
    opts,
    makeSynchronizer
  )

  // Do any async initialization necessary for the engine
  await engine.loadEngine()

  return engine
}

/**
 * Parses error thrown from proposeTransfer and extracts spendable amount and fee
 * Example:	"Error while sending funds: Insufficient balance (have 780000, need 790000 including fee)"
 */
const extractFeeFromProposeTransferErrorString = (str: string): string => {
  const regex = /(\d+)/g
  const matches = str.match(regex)

  if (matches == null || matches.length !== 2) {
    throw new Error('Error parsing proposeTransfer error string')
  }
  const balance = parseInt(matches[0]).toString()
  const fee = sub(parseInt(matches[1]).toString(), balance)
  return fee
}
