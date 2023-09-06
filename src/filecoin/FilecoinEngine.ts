import {
  Address,
  RPC,
  Signature,
  SignatureType,
  Token,
  Transaction,
  Wallet
} from '@zondax/izari-filecoin'
import { add, lte, mul, sub } from 'biggystring'
import {
  EdgeCurrencyEngine,
  EdgeCurrencyEngineOptions,
  EdgeEnginePrivateKeyOptions,
  EdgeFreshAddress,
  EdgeSpendInfo,
  EdgeTransaction,
  EdgeWalletInfo,
  InsufficientFundsError,
  JsonObject,
  NoAmountSpecifiedError
} from 'edge-core-js/types'

import { CurrencyEngine } from '../common/CurrencyEngine'
import { PluginEnvironment } from '../common/innerPlugin'
import { FilecoinTools } from './FilecoinTools'
import {
  asFilecoinPrivateKeys,
  asFilecoinTxOtherParams,
  asFilecoinWalletOtherData,
  asSafeFilecoinWalletInfo,
  FilecoinNetworkInfo,
  FilecoinTxOtherParams,
  FilecoinWalletOtherData,
  SafeFilecoinWalletInfo
} from './filecoinTypes'
import { Filscan, FilscanMessage } from './Filscan'
import { RpcExtra } from './RpcExtra'

const CHECK_BALANCE_INTERVAL = 15000
const CHECK_BLOCKHEIGHT_INTERVAL = 30000
const CHECK_TRANSACTION_INTERVAL = 15000

export class FilecoinEngine extends CurrencyEngine<
  FilecoinTools,
  SafeFilecoinWalletInfo
> {
  address: Address
  availableAttoFil: string
  networkInfo: FilecoinNetworkInfo
  otherData!: FilecoinWalletOtherData
  pluginId: string

  // Backends:
  filRpc: RPC
  filscanApi: Filscan
  rpcExtra: RpcExtra

  constructor(
    env: PluginEnvironment<FilecoinNetworkInfo>,
    tools: FilecoinTools,
    walletInfo: SafeFilecoinWalletInfo,
    opts: EdgeCurrencyEngineOptions
  ) {
    super(env, tools, walletInfo, opts)
    const { networkInfo } = env
    this.address = Address.fromString(walletInfo.keys.address)
    this.availableAttoFil = '0'
    this.filRpc = new RPC(env.networkInfo.rpcNode.networkName, {
      url: env.networkInfo.rpcNode.url,
      token: env.currencyInfo.currencyCode
    })
    this.filscanApi = new Filscan(env.networkInfo.filscanUrl, env.io.fetchCors)
    this.rpcExtra = new RpcExtra(env.networkInfo.rpcNode.url, env.io.fetchCors)

    this.networkInfo = networkInfo
    this.pluginId = this.currencyInfo.pluginId
  }

  setOtherData(raw: any): void {
    this.otherData = asFilecoinWalletOtherData(raw)
  }

  initData(): void {
    // Initialize walletLocalData:
    // ...

    // Engine variables
    this.availableAttoFil = '0'
  }

  initSubscriptions(): void {
    this.addToLoop('checkBalance', CHECK_BALANCE_INTERVAL).catch(error =>
      this.log(error)
    )
    this.addToLoop('checkBlockHeight', CHECK_BLOCKHEIGHT_INTERVAL).catch(
      error => this.log(error)
    )
    this.addToLoop('checkTransactions', CHECK_TRANSACTION_INTERVAL).catch(
      error => this.log(error)
    )
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

  async startEngine(): Promise<void> {
    this.initData()
    this.initSubscriptions()
    await super.startEngine()
  }

  async killEngine(): Promise<void> {
    await super.killEngine()
  }

  async clearBlockchainCache(): Promise<void> {
    await super.clearBlockchainCache()
  }

  async resyncBlockchain(): Promise<void> {
    await super.killEngine()
    await this.clearBlockchainCache()
    await this.startEngine()
  }

  async getFreshAddress(): Promise<EdgeFreshAddress> {
    const { address: publicAddress } = this.walletInfo.keys
    return {
      publicAddress
    }
  }

  async getMaxSpendable(spendInfo: EdgeSpendInfo): Promise<string> {
    const tx = await this.makeSpend(spendInfo)
    const networkFee = tx.networkFee
    const spendableBalance = sub(this.availableAttoFil, networkFee)

    if (lte(spendableBalance, '0')) throw new InsufficientFundsError()

    return spendableBalance
  }

  async makeSpend(edgeSpendInfoIn: EdgeSpendInfo): Promise<EdgeTransaction> {
    const { edgeSpendInfo, currencyCode } = this.makeSpendCheck(edgeSpendInfoIn)
    const spendTarget = edgeSpendInfo.spendTargets[0]
    const { publicAddress, nativeAmount } = spendTarget

    if (publicAddress == null)
      throw new Error('Missing publicAddress in EdgeSpendInfo')
    if (nativeAmount == null) throw new NoAmountSpecifiedError()

    const toAddress = Address.fromString(publicAddress)

    // Great new blank transaction:
    const transaction = Transaction.getNew(
      toAddress,
      this.address, // from
      Token.fromAtto(nativeAmount), // value
      0 // method
    )
    // Add nonce and gas fields:
    await transaction.prepareToSend(this.filRpc)

    const txJson = transaction.toJSON()

    const otherParams: FilecoinTxOtherParams = {
      sigJson: undefined,
      txJson
    }

    const networkFee = mul(txJson.GasLimit.toString(), txJson.GasPremium) // TODO: Include base fee and burn fee somehow?
    const totalTxAmount = add(nativeAmount, networkFee)

    const edgeTransaction: EdgeTransaction = {
      txid: '',
      date: 0,
      currencyCode,
      blockHeight: 0,
      nativeAmount: `-${totalTxAmount}`,
      isSend: nativeAmount.startsWith('-'),
      networkFee,
      ourReceiveAddresses: [],
      otherParams,
      signedTx: '',
      walletId: this.walletId
    }

    return edgeTransaction
  }

  async signTx(
    edgeTransaction: EdgeTransaction,
    privateKeys: JsonObject
  ): Promise<EdgeTransaction> {
    const otherParams = asFilecoinTxOtherParams(edgeTransaction.otherParams)
    const transaction = Transaction.fromJSON(otherParams.txJson)

    // Add signature JSON to otherParams:
    const filecoinPrivateKeys = asFilecoinPrivateKeys(this.pluginId)(
      privateKeys
    )
    const accountData = Wallet.deriveAccount(
      filecoinPrivateKeys.mnemonic,
      SignatureType.SECP256K1,
      this.tools.derivationPath
    )
    const signature = await Wallet.signTransaction(accountData, transaction)
    edgeTransaction.otherParams = {
      ...edgeTransaction.otherParams,
      sigJson: signature.toJSON()
    }

    return edgeTransaction
  }

  async broadcastTx(
    edgeTransaction: EdgeTransaction,
    opts?: EdgeEnginePrivateKeyOptions
  ): Promise<EdgeTransaction> {
    const otherParams = asFilecoinTxOtherParams(edgeTransaction.otherParams)

    if (otherParams.sigJson == null)
      throw new Error('Cannot broadcast unsigned transaction')

    const signature: Signature = Signature.fromJSON(otherParams.sigJson)
    const transaction: Transaction = Transaction.fromJSON(otherParams.txJson)

    const response = await this.filRpc.broadcastTransaction(
      transaction,
      signature
    )
    if ('error' in response) throw new Error(response.error.message)

    // Save CID as the txid
    edgeTransaction.txid = response.result['/']

    return edgeTransaction
  }

  getDisplayPrivateSeed(privateKeys: JsonObject): string {
    const filecoinPrivateKeys = asFilecoinPrivateKeys(this.pluginId)(
      privateKeys
    )
    return filecoinPrivateKeys.mnemonic
  }

  getDisplayPublicSeed(): string {
    return this.walletInfo.keys.publicKey
  }

  async loadEngine(): Promise<void> {
    await super.loadEngine()
    this.engineOn = true
  }

  //
  // Filecoin Engine Specific
  //

  async checkBalance(): Promise<void> {
    const response = await this.filRpc.walletBalance(this.address)
    if ('error' in response) throw new Error(response.error.message)

    const { result: balance } = response
    this.availableAttoFil = balance
    this.updateBalance(this.currencyInfo.currencyCode, balance)
    this.tokenCheckBalanceStatus[this.currencyInfo.currencyCode] = 1
    this.updateOnAddressesChecked()
    this.walletLocalDataDirty = true
  }

  async checkBlockHeight(): Promise<void> {
    const response = await this.rpcExtra.getChainHead()
    const blockHeight = response.result.Height

    this.onUpdateBlockHeight(blockHeight)
  }

  async checkTransactions(): Promise<void> {
    const addressString = this.address.toString()

    const messagesPerPage = 20
    let index = 0
    let messagesChecked = 0
    let messageCount = 0
    do {
      const messagesResponse = await this.filscanApi.getAccountMessages(
        addressString,
        index++,
        messagesPerPage
      )
      const messages = messagesResponse.messages_by_account_id_list

      for (const message of messages) {
        const txid = message.cid
        const idx = this.findTransaction(this.currencyInfo.currencyCode, txid)

        if (idx >= 0) {
          // Exit early because we reached transaction history from previous
          // check
          return
        }

        // Process message into a transaction
        this.processMessage(message)
      }

      messageCount = messagesResponse.total_count
      messagesChecked += messages.length
      this.tokenCheckTransactionsStatus[this.currencyInfo.currencyCode] =
        messageCount === 0 ? 1 : messagesChecked / messageCount
      this.updateOnAddressesChecked()
    } while (messagesChecked < messageCount)
  }

  processMessage(message: FilscanMessage): void {
    const addressString = this.address.toString()
    let netNativeAmount = message.value
    const ourReceiveAddresses = []

    const networkFee = '0' // TODO: calculate transaction fee from onchain gas fields
    if (message.to !== addressString) {
      // check if tx is a spend
      netNativeAmount = `-${add(netNativeAmount, networkFee)}`
    } else {
      ourReceiveAddresses.push(addressString)
    }

    const edgeTransaction: EdgeTransaction = {
      txid: message.cid,
      date: message.block_time,
      currencyCode: this.currencyInfo.currencyCode,
      blockHeight: message.height,
      nativeAmount: netNativeAmount,
      isSend: netNativeAmount.startsWith('-'),
      networkFee,
      ourReceiveAddresses, // blank if you sent money otherwise array of addresses that are yours in this transaction
      signedTx: '',
      otherParams: {},
      walletId: this.walletId
    }
    this.addTransaction(this.currencyInfo.currencyCode, edgeTransaction)
    this.onUpdateTransactions()

    // Progress the block-height if the message's height is greater than
    // last poll for block-height.
    if (this.walletLocalData.blockHeight < message.height) {
      this.onUpdateBlockHeight(message.height)
    }
  }
}
export async function makeCurrencyEngine(
  env: PluginEnvironment<FilecoinNetworkInfo>,
  tools: FilecoinTools,
  walletInfo: EdgeWalletInfo,
  opts: EdgeCurrencyEngineOptions
): Promise<EdgeCurrencyEngine> {
  const safeWalletInfo = asSafeFilecoinWalletInfo(walletInfo)

  const engine = new FilecoinEngine(env, tools, safeWalletInfo, opts)

  // Do any async initialization necessary for the engine
  await engine.loadEngine()

  return engine
}
