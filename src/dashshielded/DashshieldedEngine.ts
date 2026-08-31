import { add, eq, gt, gte, max, mul, sub } from 'biggystring'
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
  SpendFailure,
  SpendSuccess,
  StatusEvent
} from 'dash-shielded-native'
import { base16, base64 } from 'rfc4648'

import { CurrencyEngine } from '../common/CurrencyEngine'
import { PluginEnvironment } from '../common/innerPlugin'
import { cleanTxLogs, getOtherParams } from '../common/utils'
import type {
  DashshieldedIo,
  DashshieldedSynchronizer
} from './dashshieldedIo'
import {
  makeDashshieldedSyncTracker,
  DashshieldedSyncTracker
} from './DashshieldedSyncTracker'
import { DashshieldedTools } from './DashshieldedTools'
import {
  asDashshieldedPrivateKeys,
  asDashshieldedWalletOtherData,
  asSafeDashshieldedWalletInfo,
  DashshieldedNetworkInfo,
  DashshieldedWalletOtherData,
  SafeDashshieldedWalletInfo
} from './dashshieldedTypes'

export class DashshieldedEngine extends CurrencyEngine<
  DashshieldedTools,
  SafeDashshieldedWalletInfo,
  DashshieldedSyncTracker
> {
  pluginId: string
  networkInfo: DashshieldedNetworkInfo
  otherData!: DashshieldedWalletOtherData
  synchronizerStatus!: StatusEvent['name']
  availableCredits!: string

  makeSynchronizer: DashshieldedIo['makeSynchronizer']
  stopSyncing?: (value: number | PromiseLike<number>) => void
  synchronizer?: DashshieldedSynchronizer
  synchronizerPromise: Promise<DashshieldedSynchronizer>
  synchronizerResolver!: (synchronizer: DashshieldedSynchronizer) => void

  constructor(
    env: PluginEnvironment<DashshieldedNetworkInfo>,
    tools: DashshieldedTools,
    walletInfo: SafeDashshieldedWalletInfo,
    opts: EdgeCurrencyEngineOptions,
    makeSynchronizer: DashshieldedIo['makeSynchronizer']
  ) {
    super(env, tools, walletInfo, opts, makeDashshieldedSyncTracker)
    this.pluginId = this.currencyInfo.pluginId
    this.networkInfo = env.networkInfo
    this.makeSynchronizer = makeSynchronizer
    this.synchronizerPromise = new Promise<DashshieldedSynchronizer>(
      resolve => {
        this.synchronizerResolver = resolve
      }
    )
  }

  setOtherData(raw: any): void {
    this.otherData = asDashshieldedWalletOtherData(raw)
  }

  initData(): void {
    this.otherData.isSdkInitializedOnDisk = true
    this.walletLocalDataDirty = true
    this.synchronizerStatus = 'DISCONNECTED'
    this.availableCredits = '0'
  }

  initSubscriptions(): void {
    if (this.synchronizer == null) return
    this.synchronizer.on('update', async payload => {
      const { scanProgress, networkBlockHeight } = payload
      this.updateBlockHeight(networkBlockHeight)
      this.syncTracker.updateProgress(scanProgress)
    })
    this.synchronizer.on('statusChanged', async payload => {
      this.synchronizerStatus = payload.name
    })
    this.synchronizer.on('balanceChanged', async payload => {
      this.availableCredits = payload.availableCredits
      this.updateBalance(null, payload.totalCredits)
    })
    this.synchronizer.on('transactionsChanged', async payload => {
      payload.transactions.forEach(tx => {
        this.processTransaction(tx)
      })
      this.sendTransactionEvents()
    })
    this.synchronizer.on('error', async payload => {
      this.log.warn(`Synchronizer error: ${payload.message}`)
      if (payload.level === 'critical') {
        await this.killEngine()
        await this.startEngine()
      }
    })
  }

  isSynced(): boolean {
    return this.synchronizerStatus === 'SYNCED'
  }

  processTransaction(tx: {
    txid: string
    blockTimeInSeconds: number
    minedHeight: number
    value: string
    fee?: string
    toAddress?: string
    memos: string[]
  }): void {
    const {
      txid,
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
      netNativeAmount = `-${add(netNativeAmount, networkFee)}`
    }

    const edgeMemos: EdgeMemo[] = memos
      .filter(text => text !== '')
      .map(text => ({
        memoName: 'memo',
        type: 'text',
        value: text
      }))

    const date =
      minedHeight === 0
        ? Math.max(blockTimeInSeconds, Date.now() / 1000)
        : blockTimeInSeconds

    const spendTargets =
      toAddress != null
        ? [
            {
              currencyCode: this.currencyInfo.currencyCode,
              nativeAmount: value,
              publicAddress: toAddress,
              memo: undefined,
              uniqueIdentifier: undefined
            }
          ]
        : undefined

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
      ourReceiveAddresses: [],
      signedTx: '',
      spendTargets,
      tokenId: null,
      txid,
      walletId: this.walletId
    }
    this.addTransaction(null, edgeTransaction)
  }

  async syncNetwork(opts: EdgeEnginePrivateKeyOptions): Promise<number> {
    if (!this.engineOn) return 1000

    const privateKeys = asDashshieldedPrivateKeys(this.currencyInfo.pluginId)(
      opts?.privateKeys
    )

    if (this.synchronizer == null) {
      const { rpcNode } = this.networkInfo
      this.synchronizerPromise = this.makeSynchronizer({
        mnemonicSeed: privateKeys.mnemonic,
        account: 0,
        alias: base16.stringify(base64.parse(this.walletId)),
        network: rpcNode.networkName,
        dataDir: '',
        defaultHost: rpcNode.defaultHost,
        defaultPort: rpcNode.defaultPort
      })
      this.synchronizer = await this.synchronizerPromise
      this.synchronizerResolver(this.synchronizer)
      await this.synchronizer.startSync()
      this.initData()
      this.initSubscriptions()
    }

    return await new Promise(resolve => {
      this.stopSyncing = resolve
    })
  }

  async killEngine(): Promise<void> {
    this.synchronizerPromise = new Promise<DashshieldedSynchronizer>(
      resolve => {
        this.synchronizerResolver = resolve
      }
    )
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

  async resyncBlockchain(): Promise<void> {
    await super.killEngine()
    await this.clearBlockchainCache()
    await this.startEngine()
    this.initData()
    this.synchronizerStatus = 'SYNCING'
  }

  async getMaxSpendable(edgeSpendInfo: EdgeSpendInfo): Promise<string> {
    const { memos = [], spendTargets } = edgeSpendInfo
    const { publicAddress } = spendTargets[0]
    if (publicAddress == null) {
      throw new Error('makeSpend Missing publicAddress')
    }
    const fee = this.networkInfo.defaultNetworkFee
    return max(sub(this.availableCredits, fee), '0')
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
    if (gte(nativeAmount, this.availableCredits)) {
      throw new InsufficientFundsError({ tokenId })
    }

    const synchronizer = await this.synchronizerPromise
    const proposal = await synchronizer.proposeTransfer({
      toAddress: publicAddress,
      amountCredits: nativeAmount,
      memo: memos[0]?.value
    })

    const networkFee = proposal.feeCredits
    const totalTxAmount = add(nativeAmount, networkFee)
    if (gt(totalTxAmount, this.availableCredits)) {
      throw new InsufficientFundsError({ tokenId })
    }

    return {
      blockHeight: 0,
      currencyCode,
      date: 0,
      isSend: true,
      memos,
      nativeAmount: mul(totalTxAmount, '-1'),
      networkFee,
      networkFees: [],
      otherParams: {
        proposalId: proposal.proposalId
      },
      ourReceiveAddresses: [],
      signedTx: '',
      tokenId,
      txid: '',
      walletId: this.walletId
    }
  }

  async signTx(edgeTransaction: EdgeTransaction): Promise<EdgeTransaction> {
    return edgeTransaction
  }

  async broadcastTx(
    edgeTransaction: EdgeTransaction,
    opts?: EdgeEnginePrivateKeyOptions
  ): Promise<EdgeTransaction> {
    const { proposalId } = getOtherParams(edgeTransaction)
    if (proposalId == null) {
      throw new Error('Missing proposalId from makeSpend')
    }
    const privateKeys = asDashshieldedPrivateKeys(this.pluginId)(
      opts?.privateKeys
    )
    try {
      const synchronizer = await this.synchronizerPromise
      const result = requireSpendSuccess(
        await synchronizer.createTransfer({
          proposalId,
          mnemonicSeed: privateKeys.mnemonic
        })
      )
      edgeTransaction.txid = result.txid
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
      const { shieldedAddress } = await synchronizer.deriveShieldedAddress()
      const addresses: EdgeAddress[] = [
        {
          addressType: 'shieldedAddress',
          publicAddress: shieldedAddress
        }
      ]
      this.otherData.cachedAddresses = addresses
      this.walletLocalDataDirty = true
      return addresses
    }

    if (this.otherData.cachedAddresses == null) {
      return await getSynchronizerAddresses()
    }
    getSynchronizerAddresses().catch(e => {
      throw e
    })
    return this.otherData.cachedAddresses
  }
}

export async function makeCurrencyEngine(
  env: PluginEnvironment<DashshieldedNetworkInfo>,
  tools: DashshieldedTools,
  walletInfo: EdgeWalletInfo,
  opts: EdgeCurrencyEngineOptions
): Promise<EdgeCurrencyEngine> {
  const safeWalletInfo = asSafeDashshieldedWalletInfo(walletInfo)
  const dashshieldedIo =
    (env.nativeIo.dashshielded as DashshieldedIo) ??
    env.nativeIo['edge-currency-accountbased']?.dashshielded
  if (dashshieldedIo == null) {
    throw new Error('Need dashshielded native IO')
  }

  const engine = new DashshieldedEngine(
    env,
    tools,
    safeWalletInfo,
    opts,
    dashshieldedIo.makeSynchronizer
  )
  await engine.loadEngine()
  return engine
}

function requireSpendSuccess(
  result: SpendSuccess | SpendFailure
): SpendSuccess {
  if ('txid' in result && result.txid != null && result.txid !== '') {
    return result
  }
  const message =
    'errorMessage' in result && result.errorMessage != null
      ? result.errorMessage
      : 'createTransfer failed'
  throw new Error(message)
}
