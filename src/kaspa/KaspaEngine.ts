import { add, gt, gte, lt, mul, sub } from 'biggystring'
import {
  EdgeCurrencyEngine,
  EdgeCurrencyEngineOptions,
  EdgeFetchFunction,
  EdgeSpendInfo,
  EdgeTransaction,
  EdgeWalletInfo,
  InsufficientFundsError,
  JsonObject,
  NoAmountSpecifiedError
} from 'edge-core-js/types'

import { CurrencyEngine } from '../common/CurrencyEngine'
import { PluginEnvironment } from '../common/innerPlugin'
import { getRandomDelayMs } from '../common/network'
import { getFetchCors } from '../common/utils'
import { KaspaNetwork } from './KaspaNetwork'
import { KaspaTools } from './KaspaTools'
import {
  asKaspaWalletOtherData,
  asSafeKaspaWalletInfo,
  KaspaNetworkInfo,
  KaspaOtherMethods,
  KaspaTransaction,
  KaspaUtxo,
  KaspaWalletOtherData,
  SafeKaspaWalletInfo
} from './kaspaTypes'

const ACCOUNT_POLL_MILLISECONDS = getRandomDelayMs(20000)
const TRANSACTION_POLL_MILLISECONDS = getRandomDelayMs(20000)
const MATURITY_BLOCK_CONFIRMATIONS = 100 // Kaspa coinbase maturity

export class KaspaEngine extends CurrencyEngine<
  KaspaTools,
  SafeKaspaWalletInfo
> {
  otherData!: KaspaWalletOtherData
  networkInfo: KaspaNetworkInfo
  kaspaNetwork: KaspaNetwork
  otherMethods: KaspaOtherMethods
  fetchCors: EdgeFetchFunction

  // UTXO management
  availableUtxos: KaspaUtxo[]
  pendingUtxos: KaspaUtxo[]

  constructor(
    env: PluginEnvironment<KaspaNetworkInfo>,
    tools: KaspaTools,
    walletInfo: SafeKaspaWalletInfo,
    opts: EdgeCurrencyEngineOptions
  ) {
    super(env, tools, walletInfo, opts)
    this.networkInfo = env.networkInfo
    this.fetchCors = getFetchCors(env.io)
    this.kaspaNetwork = new KaspaNetwork(this)
    this.availableUtxos = []
    this.pendingUtxos = []

    this.otherMethods = {
      // Future methods for WalletConnect or other features
    }
  }

  setOtherData(raw: any): void {
    this.otherData = asKaspaWalletOtherData(raw)
  }

  // Balance and UTXO Management
  async queryBalance(): Promise<void> {
    try {
      const address = this.walletLocalData.publicKey

      // Fetch UTXOs and balance from network
      const networkUpdate = await this.kaspaNetwork.fetchUtxos(address)

      if (networkUpdate.utxos != null) {
        // Process UTXOs
        this.processUtxos(networkUpdate.utxos)
      }

      if (networkUpdate.balances?.[address] != null) {
        const balance = networkUpdate.balances[address]
        this.updateBalance(this.currencyInfo.currencyCode, balance)
      }

      if (
        networkUpdate.blockHeight != null &&
        networkUpdate.blockHeight > this.walletLocalData.blockHeight
      ) {
        this.walletLocalData.blockHeight = networkUpdate.blockHeight
        this.walletLocalDataDirty = true
        this.currencyEngineCallbacks.onBlockHeightChanged(
          this.walletLocalData.blockHeight
        )
      }
    } catch (e: any) {
      this.log.warn('queryBalance error:', e)
    }
  }

  processUtxos(utxos: KaspaUtxo[]): void {
    // Separate mature and pending UTXOs
    this.availableUtxos = []
    this.pendingUtxos = []

    const currentDaaScore = this.otherData.virtualDaaScore ?? 0

    for (const utxo of utxos) {
      const confirmations = currentDaaScore - utxo.blockDaaScore

      if (confirmations >= MATURITY_BLOCK_CONFIRMATIONS) {
        this.availableUtxos.push(utxo)
      } else {
        this.pendingUtxos.push(utxo)
      }
    }

    // Calculate total balances
    const availableBalance = this.availableUtxos.reduce(
      (sum, utxo) => add(sum, utxo.amount),
      '0'
    )
    const pendingBalance = this.pendingUtxos.reduce(
      (sum, utxo) => add(sum, utxo.amount),
      '0'
    )
    const totalBalance = add(availableBalance, pendingBalance)

    this.updateBalance(this.currencyInfo.currencyCode, totalBalance)
  }

  // Transaction History
  async queryTransactions(): Promise<void> {
    try {
      const address = this.walletLocalData.publicKey
      const networkUpdate = await this.kaspaNetwork.fetchTransactions(address)

      if (networkUpdate.transactions != null) {
        for (const tx of networkUpdate.transactions) {
          this.processKaspaTransaction(tx)
        }
      }

      this.updateOnAddressesChecked()
    } catch (e: any) {
      this.log.warn('queryTransactions error:', e)
    }
  }

  processKaspaTransaction(tx: KaspaTransaction): void {
    const { transactionId } = tx
    const ourAddress = this.walletLocalData.publicKey

    let nativeAmount = '0'
    const networkFee = tx.mass ?? '0'
    let isSend = false
    const ourReceiveAddresses: string[] = []

    // Calculate input amount from our address
    const inputAmount = '0'
    // for (const input of tx.inputs) {
    //   // Check if this input is from our address
    //   // Note: This would need proper implementation to decode script
    //   // For now, we'll need to track this from UTXOs
    // }

    // Calculate output amounts
    let outputToUs = '0'
    let outputFromUs = '0'

    for (const output of tx.outputs) {
      // Check if output is to our address
      // This needs proper script decoding
      const isOurOutput = false // Placeholder

      if (isOurOutput) {
        outputToUs = add(outputToUs, output.amount)
        ourReceiveAddresses.push(ourAddress)
      } else if (inputAmount !== '0') {
        outputFromUs = add(outputFromUs, output.amount)
      }
    }

    // Determine transaction type and amount
    if (gt(inputAmount, '0')) {
      // We sent this transaction
      isSend = true
      nativeAmount = sub('0', add(outputFromUs, networkFee))
    } else if (gt(outputToUs, '0')) {
      // We received this transaction
      nativeAmount = outputToUs
    }

    const edgeTransaction: EdgeTransaction = {
      blockHeight: 0, // Will be set from verboseData if available
      currencyCode: this.currencyInfo.currencyCode,
      date: Date.now() / 1000, // Will be updated from block time
      isSend,
      memos: [],
      nativeAmount,
      networkFee,
      networkFees: [],
      ourReceiveAddresses,
      signedTx: '',
      tokenId: null,
      txid: transactionId,
      walletId: this.walletId
    }

    // Update with verbose data if available
    if (tx.verboseData != null) {
      const blockTime = parseInt(tx.verboseData.blockTime) / 1000
      edgeTransaction.date = blockTime
      // Note: blockHeight would need to be fetched from block data
    }

    this.addTransaction(this.currencyInfo.currencyCode, edgeTransaction)
  }

  // Public methods
  async startEngine(): Promise<void> {
    this.addToLoop('queryBalance', ACCOUNT_POLL_MILLISECONDS)
    this.addToLoop('queryTransactions', TRANSACTION_POLL_MILLISECONDS)
    await super.startEngine()
  }

  async resyncBlockchain(): Promise<void> {
    await this.killEngine()
    await this.clearBlockchainCache()
    await this.startEngine()
  }

  async getMaxSpendable(spendInfo: EdgeSpendInfo): Promise<string> {
    const { tokenId } = spendInfo

    if (tokenId != null) {
      throw new Error('Kaspa does not support tokens')
    }

    // Get available balance minus fees
    const availableBalance = this.availableUtxos.reduce(
      (sum, utxo) => add(sum, utxo.amount),
      '0'
    )

    // Estimate fee for spending all UTXOs
    const estimatedFee = mul(
      this.networkInfo.defaultFee,
      this.availableUtxos.length.toString()
    )

    const maxSpendable = sub(availableBalance, estimatedFee)
    return gt(maxSpendable, '0') ? maxSpendable : '0'
  }

  async makeSpend(edgeSpendInfoIn: EdgeSpendInfo): Promise<EdgeTransaction> {
    const { edgeSpendInfo, currencyCode } = this.makeSpendCheck(edgeSpendInfoIn)

    if (edgeSpendInfo.spendTargets.length !== 1) {
      throw new Error('Kaspa only supports one spend target')
    }

    const spendTarget = edgeSpendInfo.spendTargets[0]
    const { nativeAmount } = spendTarget

    if (nativeAmount == null) {
      throw new NoAmountSpecifiedError()
    }

    // Select UTXOs for spending
    const selectedUtxos: KaspaUtxo[] = []
    let totalInput = '0'
    const targetAmount = add(
      nativeAmount,
      edgeSpendInfo.networkFeeOption ?? this.networkInfo.defaultFee
    )

    // Sort UTXOs by amount (ascending) for optimal selection
    const sortedUtxos = [...this.availableUtxos].sort(
      (a, b) => parseInt(a.amount) - parseInt(b.amount)
    )

    for (const utxo of sortedUtxos) {
      selectedUtxos.push(utxo)
      totalInput = add(totalInput, utxo.amount)

      if (gte(totalInput, targetAmount)) {
        break
      }
    }

    if (lt(totalInput, targetAmount)) {
      throw new InsufficientFundsError({ tokenId: null })
    }

    // Calculate change
    const change = sub(totalInput, targetAmount)

    // Build transaction
    const edgeTransaction: EdgeTransaction = {
      blockHeight: 0,
      currencyCode,
      date: Date.now() / 1000,
      isSend: true,
      memos: [],
      nativeAmount: `-${nativeAmount}`,
      networkFee: edgeSpendInfo.networkFeeOption ?? this.networkInfo.defaultFee,
      networkFees: [],
      ourReceiveAddresses: [],
      signedTx: '',
      tokenId: null,
      txid: '',
      walletId: this.walletId,
      otherParams: {
        unsignedTx: {
          inputs: selectedUtxos,
          outputs: [
            {
              address: spendTarget.publicAddress,
              amount: nativeAmount
            }
          ],
          change: change,
          changeAddress: this.walletLocalData.publicKey
        }
      }
    }

    return edgeTransaction
  }

  async signTx(
    edgeTransaction: EdgeTransaction,
    privateKeys: JsonObject
  ): Promise<EdgeTransaction> {
    // const { pluginId } = this.currencyInfo
    // const keys = asKaspaPrivateKeys(pluginId)(privateKeys)

    // TODO: Implement actual Kaspa transaction signing
    // This will require proper Kaspa cryptography implementation

    edgeTransaction.signedTx = 'signed_transaction_placeholder'
    edgeTransaction.txid = 'transaction_id_placeholder'

    return edgeTransaction
  }

  async broadcastTx(
    edgeTransaction: EdgeTransaction
  ): Promise<EdgeTransaction> {
    try {
      const result = await this.kaspaNetwork.broadcastTx(
        edgeTransaction.signedTx
      )

      if (result.txid != null) {
        edgeTransaction.txid = result.txid
        this.log(`Transaction broadcasted: ${result.txid}`)
      }

      return edgeTransaction
    } catch (e: any) {
      this.error(`Broadcast failed: ${e.message}`)
      throw e
    }
  }
}

export async function makeCurrencyEngine(
  env: PluginEnvironment<KaspaNetworkInfo>,
  tools: KaspaTools,
  walletInfo: EdgeWalletInfo,
  opts: EdgeCurrencyEngineOptions
): Promise<EdgeCurrencyEngine> {
  const safeWalletInfo = asSafeKaspaWalletInfo(walletInfo)
  const engine = new KaspaEngine(env, tools, safeWalletInfo, opts)

  await engine.loadEngine()

  return engine
}
