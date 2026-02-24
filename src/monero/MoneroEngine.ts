import { add, eq, gt, lt, mul, sub } from 'biggystring'
import { asMaybe } from 'cleaners'
import {
  EdgeCurrencyEngine,
  EdgeCurrencyEngineOptions,
  EdgeEnginePrivateKeyOptions,
  EdgeMemo,
  EdgeSpendInfo,
  EdgeTransaction,
  EdgeWalletInfo,
  InsufficientFundsError,
  JsonObject,
  NoAmountSpecifiedError,
  PendingFundsError
} from 'edge-core-js/types'
import type {
  TransactionDirection,
  WalletBackend
} from 'react-native-monero-lwsf'
import { base64, base64url } from 'rfc4648'

import { CurrencyEngine } from '../common/CurrencyEngine'
import { PluginEnvironment } from '../common/innerPlugin'
import {
  LifecycleManager,
  makeLifecycleManager
} from '../common/lifecycleManager'
import { cleanTxLogs, matchJson } from '../common/utils'
import {
  makeWeightedSyncTracker,
  WeightedSyncTracker
} from '../common/WeightedSyncTracker'
import { MoneroTools } from './MoneroTools'
import {
  AddressInfoResponse,
  asAddressInfoResponse,
  asLoginResponse,
  asMoneroInitOptions,
  asMoneroPrivateKeys,
  asMoneroUserSettings,
  asMoneroWalletOtherData,
  asMoneroWalletSettings,
  asSafeMoneroWalletInfo,
  EDGE_MONERO_LWS_SERVER,
  LoginResponse,
  MoneroInitOptions,
  MoneroNetworkInfo,
  MoneroPrivateKeys,
  MoneroUserSettings,
  MoneroWalletOtherData,
  MoneroWalletSettings,
  SafeMoneroWalletInfo,
  translateFee
} from './moneroTypes'

export class MoneroEngine extends CurrencyEngine<
  MoneroTools,
  SafeMoneroWalletInfo,
  WeightedSyncTracker
> {
  networkInfo: MoneroNetworkInfo
  currentSettings: MoneroUserSettings
  currentWalletSettings: MoneroWalletSettings
  otherData!: MoneroWalletOtherData
  initOptions: MoneroInitOptions
  unlockedBalance: string
  private readonly nativeWalletId: LifecycleManager<string>
  private sendKeysToNative?: (keys: MoneroPrivateKeys) => void
  private syncStartHeight: number | undefined
  private txSortOrder: 'asc' | 'desc' = 'asc'
  private unsubscribeWalletEvent?: () => void

  constructor(
    env: PluginEnvironment<MoneroNetworkInfo>,
    tools: MoneroTools,
    walletInfo: SafeMoneroWalletInfo,
    initOptions: JsonObject,
    opts: EdgeCurrencyEngineOptions
  ) {
    super(env, tools, walletInfo, opts, makeWeightedSyncTracker)
    this.networkInfo = env.networkInfo
    this.initOptions = asMoneroInitOptions(initOptions)

    this.unlockedBalance = '0'

    // Shared across all wallets using this engine:
    this.currentSettings = asMoneroUserSettings(opts.userSettings)
    // Unique to this particular wallet instance:
    this.currentWalletSettings = asMoneroWalletSettings(
      opts.walletSettings ?? {}
    )

    const keysPromise = new Promise<MoneroPrivateKeys>(resolve => {
      this.sendKeysToNative = resolve
    })

    this.nativeWalletId = makeLifecycleManager({
      onStart: async () => {
        const keys = await keysPromise
        const base64UrlWalletId = base64url.stringify(
          base64.parse(this.walletId)
        )

        const { backend } = this.currentWalletSettings
        this.log.warn('Using backend:', backend)
        const defaults = asMoneroUserSettings({})
        const daemonAddress =
          backend === 'lws'
            ? this.currentSettings.enableCustomServers
              ? this.currentSettings.moneroLightwalletServer
              : defaults.moneroLightwalletServer
            : this.currentSettings.enableCustomMonerod
            ? this.currentSettings.monerodServer
            : defaults.monerodServer

        try {
          // LWS-specific setup: API key and login
          let loginResult: LoginResponse | undefined
          if (backend === 'lws') {
            const isEdgeLws = daemonAddress === EDGE_MONERO_LWS_SERVER
            await this.tools.cppBridge.setLwsApiKey(
              isEdgeLws ? this.initOptions.edgeApiKey : ''
            )
            if (isEdgeLws) {
              loginResult = await this.loginToLwsServer(
                daemonAddress,
                this.walletInfo.keys.moneroAddress,
                this.walletInfo.keys.moneroViewKeyPrivate
              )
            }
          }

          // Resolve birthday height (never open a wallet with height 0)
          const birthdayHeight = await this.resolveBirthdayHeight(
            keys.birthdayHeight,
            backend,
            daemonAddress,
            defaults.moneroLightwalletServer,
            loginResult
          )

          await this.tools.cppBridge.openWallet(
            base64UrlWalletId,
            backend,
            keys.moneroKey,
            base64url.stringify(base64.parse(keys.dataKey)),
            this.networkInfo.networkType,
            birthdayHeight,
            daemonAddress
          )

          // Subscribe to native wallet events for immediate tx detection
          const unsubscribeWalletEvent = this.tools.moneroIo.on(
            'walletEvent',
            event => {
              if (event.walletId !== base64UrlWalletId) return
              this.log(`Wallet event: ${event.eventName} data=${event.data}`)
              this.queryTransactions(base64UrlWalletId).catch(err =>
                this.log.error(
                  `Event-triggered queryTransactions error: ${String(err)}`
                )
              )
            }
          )
          this.unsubscribeWalletEvent = unsubscribeWalletEvent

          return base64UrlWalletId
        } catch (error: unknown) {
          if (!(error instanceof Error)) throw error
          this.log.error(`Failed to open wallet: ${error.message}`)
          throw error
        }
      },

      onStop: async (nativeWalletId: string) => {
        if (this.unsubscribeWalletEvent != null) {
          this.unsubscribeWalletEvent()
          this.unsubscribeWalletEvent = undefined
        }
        try {
          await this.tools.cppBridge.closeWallet(nativeWalletId)
          this.log(`Wallet closed: ${nativeWalletId}`)
        } catch (error: unknown) {
          this.log.error(`Error closing wallet: ${String(error)}`)
        }
      },

      onError: error => {
        this.log.error('Wallet lifecycle error:', String(error))
      }
    })
  }

  setOtherData(raw: unknown): void {
    this.otherData = asMoneroWalletOtherData(raw)
  }

  /**
   * Determine the wallet's creation height. For LWS wallets the login
   * response or getAddressInfo endpoint is used as a fallback.
   */
  private async resolveBirthdayHeight(
    height: number,
    backend: WalletBackend,
    daemonAddress: string,
    edgeLwsServer: string,
    loginResult?: LoginResponse
  ): Promise<number> {
    if (height !== 0) return height

    // For Edge LWS, the login response may already have it
    if (loginResult?.start_height != null) {
      return loginResult.start_height
    }

    // For monerod wallets, fall back to the Edge LWS server
    const serverUrl = backend === 'lws' ? daemonAddress : edgeLwsServer
    const addressInfo = await this.getAddressInfo(
      serverUrl,
      this.walletInfo.keys.moneroAddress,
      this.walletInfo.keys.moneroViewKeyPrivate
    )

    if (addressInfo.start_height === 0) {
      throw new Error(
        'Cannot open wallet: birthdayHeight is 0. ' +
          'The wallet creation height could not be determined.'
      )
    }
    return addressInfo.start_height
  }

  async loginToLwsServer(
    serverUrl: string,
    address: string,
    viewKey: string
  ): Promise<LoginResponse> {
    const url = `${serverUrl}/login`
    const response = await this.tools.io.fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({
        address,
        api_key: this.initOptions.edgeApiKey,
        create_account: true,
        generated_locally: true,
        view_key: viewKey
      })
    })
    if (!response.ok) {
      const text = await response.text()
      throw new Error(`LWS login failed with ${response.status}: ${text}`)
    }
    const json = await response.json()
    return asLoginResponse(json)
  }

  async getAddressInfo(
    serverUrl: string,
    address: string,
    viewKey: string
  ): Promise<AddressInfoResponse> {
    const url = `${serverUrl}/get_address_info`
    const response = await this.tools.io.fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({
        address,
        api_key: this.initOptions.edgeApiKey,
        view_key: viewKey
      })
    })
    if (!response.ok) {
      const text = await response.text()
      throw new Error(
        `LWS get_address_info failed with ${response.status}: ${text}`
      )
    }
    const json = await response.json()
    return asAddressInfoResponse(json)
  }

  async syncNetwork(opts: EdgeEnginePrivateKeyOptions): Promise<number> {
    if (!this.engineOn) return 1000

    if (this.sendKeysToNative != null) {
      this.sendKeysToNative(
        asMoneroPrivateKeys(this.currencyInfo.pluginId)(opts.privateKeys)
      )
      this.sendKeysToNative = undefined
    }

    const nativeWalletId = await this.nativeWalletId.get()
    if (nativeWalletId == null) {
      return 1000
    }

    try {
      const status = await this.tools.cppBridge.getWalletStatus(nativeWalletId)
      if (status.networkHeight === 0) {
        return 1000
      }

      this.updateBlockHeight(status.networkHeight)

      // Capture the first reported synced height as our baseline for
      // progress tracking. This is reset when the wallet restarts
      // (settings change, resync, daemon change).
      if (this.syncStartHeight == null) {
        this.syncStartHeight = status.syncedHeight
      }

      const isSynced = status.syncedHeight >= status.networkHeight - 1

      if (isSynced) {
        this.syncTracker.updateBlockRatio(
          1,
          status.syncedHeight,
          status.networkHeight
        )

        const balance = status.balance.toString()
        this.unlockedBalance = status.unlockedBalance.toString()
        this.updateBalance(null, balance)
        this.syncTracker.updateBalanceRatio(1)

        await this.queryTransactions(nativeWalletId)
        this.syncTracker.updateHistoryRatio(1)

        return 20000
      } else {
        const range = status.networkHeight - this.syncStartHeight
        const ratio =
          range > 0 ? (status.syncedHeight - this.syncStartHeight) / range : 0

        this.syncTracker.updateBlockRatio(
          ratio,
          status.syncedHeight,
          status.networkHeight
        )
        return 1000
      }
    } catch (error: unknown) {
      this.log.error(`syncNetwork error: ${String(error)}`)
      return 5000
    }
  }

  private async queryTransactions(nativeWalletId: string): Promise<void> {
    const PAGE_SIZE = 50

    try {
      if (this.txSortOrder === 'asc') {
        const shouldSendEvents = await this.queryTransactionsAsc(
          nativeWalletId,
          PAGE_SIZE
        )
        if (!shouldSendEvents) {
          return
        }
        this.sendTransactionEvents()
        return
      }

      await this.queryTransactionsDesc(nativeWalletId, PAGE_SIZE)

      this.sendTransactionEvents()
    } catch (error: unknown) {
      this.log.error(`queryTransactions error: ${String(error)}`)
    }
  }

  private async queryTransactionsAsc(
    nativeWalletId: string,
    pageSize: number
  ): Promise<boolean> {
    const startPage = Math.floor(
      this.otherData.processedTransactionCount / pageSize
    )

    const txPage = await this.tools.cppBridge.getAllTransactions(
      nativeWalletId,
      startPage,
      pageSize,
      'asc'
    )

    if (txPage.totalCount === 0) {
      return false
    }

    const onPageBoundary =
      this.otherData.processedTransactionCount % pageSize === 0
    let foundKnown = this.otherData.mostRecentTxid == null || onPageBoundary
    for (const tx of txPage.transactions) {
      if (!foundKnown) {
        if (tx.hash === this.otherData.mostRecentTxid) {
          foundKnown = true
        }
        continue
      }
      this.processTransaction(tx)
      this.otherData.mostRecentTxid = tx.hash
    }

    this.otherData.processedTransactionCount =
      startPage * pageSize + txPage.transactions.length
    this.walletLocalDataDirty = true

    this.syncTracker.updateHistoryRatio(
      this.otherData.processedTransactionCount / txPage.totalCount
    )

    if (this.otherData.processedTransactionCount >= txPage.totalCount) {
      this.txSortOrder = 'desc'
    }

    return true
  }

  private async queryTransactionsDesc(
    nativeWalletId: string,
    pageSize: number
  ): Promise<void> {
    let page = 0
    let foundKnownTx = false
    let newestTxid: string | undefined

    while (!foundKnownTx) {
      const txPage = await this.tools.cppBridge.getAllTransactions(
        nativeWalletId,
        page,
        pageSize,
        'desc'
      )

      if (page === 0 && txPage.transactions.length > 0) {
        newestTxid = txPage.transactions[0].hash
      }

      for (const tx of txPage.transactions) {
        if (tx.hash === this.otherData.mostRecentTxid) {
          foundKnownTx = true
          break
        }
        this.processTransaction(tx)
      }

      if (
        foundKnownTx ||
        txPage.transactions.length < pageSize ||
        (page + 1) * pageSize >= txPage.totalCount
      ) {
        if (
          newestTxid != null &&
          newestTxid !== this.otherData.mostRecentTxid
        ) {
          this.otherData.mostRecentTxid = newestTxid
          this.otherData.processedTransactionCount = txPage.totalCount
          this.walletLocalDataDirty = true
        }
        break
      }

      page++
    }
  }

  private processTransaction(tx: {
    hash: string
    direction: TransactionDirection
    isPending: boolean
    isFailed: boolean
    amount: number
    fee: number
    blockHeight: number
    timestamp: number
    paymentId: string
    txKey?: string
  }): void {
    const memos: EdgeMemo[] = []

    if (
      tx.paymentId != null &&
      tx.paymentId !== '' &&
      tx.paymentId !== '0000000000000000' // returned when there is no payment id
    ) {
      memos.push({
        memoName: 'payment id',
        type: 'hex',
        value: tx.paymentId
      })
    }

    const isReceive = tx.direction === 0
    const ourReceiveAddresses: string[] = isReceive
      ? [this.walletInfo.keys.moneroAddress]
      : []

    let nativeAmount: string
    const networkFee = tx.fee.toString()

    if (isReceive) {
      nativeAmount = tx.amount.toString()
    } else {
      nativeAmount = `-${tx.amount.toString()}`
    }

    const blockHeight = tx.isPending ? 0 : tx.blockHeight

    const edgeTransaction: EdgeTransaction = {
      blockHeight,
      currencyCode: 'XMR',
      date: tx.timestamp,
      isSend: !isReceive,
      memos,
      nativeAmount,
      networkFee,
      networkFees: [{ tokenId: null, nativeAmount: networkFee }],
      otherParams: {},
      ourReceiveAddresses,
      signedTx: '',
      tokenId: null,
      txid: tx.hash,
      txSecret: tx.txKey,
      walletId: this.walletId
    }

    if (tx.isFailed) {
      edgeTransaction.confirmations = 'failed'
    }

    this.addTransaction(null, edgeTransaction)
  }

  async killEngine(): Promise<void> {
    this.nativeWalletId.stop()
    this.syncStartHeight = undefined
    this.unlockedBalance = '0'
    this.txSortOrder = 'asc'
    this.syncTracker.resetSync()
    await super.killEngine()
  }

  async resyncBlockchain(): Promise<void> {
    await this.killEngine()
    await this.clearBlockchainCache()
    await this.tools.cppBridge.deleteWallet(
      base64url.stringify(base64.parse(this.walletId)),
      this.currentWalletSettings.backend
    )
    await this.startEngine()
  }

  async changeUserSettings(userSettings: JsonObject): Promise<void> {
    const newSettings = asMaybe(asMoneroUserSettings)(userSettings)
    if (newSettings == null || matchJson(this.currentSettings, newSettings)) {
      return
    }

    this.currentSettings = newSettings
    await this.killEngine()
    await this.startEngine()
  }

  async changeWalletSettings(walletSettings: JsonObject): Promise<void> {
    const newSettings = asMaybe(asMoneroWalletSettings)(walletSettings)
    if (
      newSettings == null ||
      matchJson(this.currentWalletSettings, newSettings)
    ) {
      return
    }

    this.currentWalletSettings = newSettings
    await this.killEngine()
    await this.clearBlockchainCache()
    await this.startEngine()
  }

  async getMaxSpendable(edgeSpendInfo: EdgeSpendInfo): Promise<string> {
    const { tokenId } = edgeSpendInfo

    if (tokenId != null) {
      throw new Error('Monero does not support tokens')
    }

    const nativeWalletId = await this.nativeWalletId.get()
    if (nativeWalletId == null) {
      throw new Error('Wallet not ready')
    }

    const [spendTarget] = edgeSpendInfo.spendTargets
    if (spendTarget?.publicAddress == null) {
      throw new Error('Missing destination address')
    }

    try {
      const result = await this.tools.cppBridge.createTransaction(
        nativeWalletId,
        [{ address: spendTarget.publicAddress, amount: '0' }],
        translateFee(edgeSpendInfo.networkFeeOption)
      )

      const maxSpendable = sub(this.unlockedBalance, result.fee)
      if (lt(maxSpendable, '0')) {
        return '0'
      }
      return maxSpendable
    } catch (error: unknown) {
      this.log.error(`getMaxSpendable error: ${String(error)}`)
      return this.unlockedBalance
    }
  }

  async makeSpend(edgeSpendInfoIn: EdgeSpendInfo): Promise<EdgeTransaction> {
    const { edgeSpendInfo, currencyCode } = this.makeSpendCheck(edgeSpendInfoIn)
    const { memos = [], tokenId, networkFeeOption } = edgeSpendInfo

    if (tokenId != null) {
      throw new Error('Monero does not support tokens')
    }

    const nativeWalletId = await this.nativeWalletId.get()
    if (nativeWalletId == null) {
      throw new Error('Wallet not ready')
    }

    const recipients: Array<{ address: string; amount: string }> = []
    let totalAmount = '0'

    for (const spendTarget of edgeSpendInfo.spendTargets) {
      const { publicAddress, nativeAmount } = spendTarget

      if (publicAddress == null) {
        throw new Error('Missing destination address')
      }
      if (nativeAmount == null || eq(nativeAmount, '0')) {
        throw new NoAmountSpecifiedError()
      }

      recipients.push({
        address: publicAddress,
        amount: nativeAmount
      })
      totalAmount = add(totalAmount, nativeAmount)
    }

    const balance = this.getBalance({ tokenId: null })
    if (gt(totalAmount, balance)) {
      throw new InsufficientFundsError({ tokenId: null })
    }
    if (gt(totalAmount, this.unlockedBalance)) {
      throw new PendingFundsError()
    }

    const priority = translateFee(networkFeeOption)

    let txid: string
    let signedTxHex: string
    let networkFee: string

    try {
      const result = await this.tools.cppBridge.createTransaction(
        nativeWalletId,
        recipients,
        priority
      )
      txid = result.txid
      signedTxHex = result.signedTxHex
      networkFee = result.fee
    } catch (error: unknown) {
      this.warn(`FAILURE makeSpend createTransaction: ${String(error)}`)
      if (error instanceof Error) {
        if (error.message.includes('not enough money')) {
          throw new InsufficientFundsError({ tokenId: null })
        }
        if (error.message.includes('pending')) {
          throw new PendingFundsError()
        }
      }
      throw error
    }

    const totalWithFee = add(totalAmount, networkFee)
    const txNativeAmount = mul(totalWithFee, '-1')

    const edgeTransaction: EdgeTransaction = {
      blockHeight: 0,
      currencyCode,
      date: 0,
      isSend: true,
      memos,
      nativeAmount: txNativeAmount,
      networkFee,
      networkFees: [{ tokenId: null, nativeAmount: networkFee }],
      otherParams: {
        recipients,
        priority
      },
      ourReceiveAddresses: [],
      signedTx: signedTxHex,
      tokenId: null,
      txid,
      walletId: this.walletId
    }

    return edgeTransaction
  }

  async signTx(
    edgeTransaction: EdgeTransaction,
    _privateKeys: JsonObject
  ): Promise<EdgeTransaction> {
    if (edgeTransaction.txid.length !== 64) {
      throw new Error('Invalid transaction: missing or malformed txid')
    }
    if (edgeTransaction.signedTx.length === 0) {
      throw new Error('Invalid transaction: missing signed transaction data')
    }
    return edgeTransaction
  }

  async broadcastTx(
    edgeTransaction: EdgeTransaction
  ): Promise<EdgeTransaction> {
    const nativeWalletId = await this.nativeWalletId.get()
    if (nativeWalletId == null) {
      throw new Error('Wallet not ready')
    }

    try {
      await this.tools.cppBridge.broadcastTransaction(
        nativeWalletId,
        edgeTransaction.signedTx
      )

      edgeTransaction.date = Date.now() / 1000

      this.warn(`SUCCESS broadcastTx\n${cleanTxLogs(edgeTransaction)}`)
      return edgeTransaction
    } catch (error: unknown) {
      this.warn(`FAILURE broadcastTx: ${String(error)}`)
      throw error
    }
  }
}

export async function makeCurrencyEngine(
  env: PluginEnvironment<MoneroNetworkInfo>,
  tools: MoneroTools,
  walletInfo: EdgeWalletInfo,
  opts: EdgeCurrencyEngineOptions
): Promise<EdgeCurrencyEngine> {
  const { initOptions } = env

  const safeWalletInfo = asSafeMoneroWalletInfo(walletInfo)
  const engine = new MoneroEngine(env, tools, safeWalletInfo, initOptions, opts)

  await engine.loadEngine()

  return engine
}
