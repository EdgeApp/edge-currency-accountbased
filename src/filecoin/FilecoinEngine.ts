import {
  Address,
  Network,
  RPC,
  Signature,
  SignatureType,
  Token,
  Transaction,
  Wallet
} from '@zondax/izari-filecoin'
import { add, eq, gt, mul, sub } from 'biggystring'
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
import { getRandomDelayMs } from '../common/network'
import { FilecoinTools } from './FilecoinTools'
import {
  asFilecoinInitOptions,
  asFilecoinPrivateKeys,
  asFilecoinTxOtherParams,
  asFilecoinWalletOtherData,
  asSafeFilecoinWalletInfo,
  FilecoinNetworkInfo,
  FilecoinTxOtherParams,
  FilecoinWalletOtherData,
  SafeFilecoinWalletInfo
} from './filecoinTypes'
import { Filfox, FilfoxMessageDetails } from './Filfox'
import { Filscan, FilscanMessage } from './Filscan'
import { RpcExtra } from './RpcExtra'

const ACCOUNT_POLL_MILLISECONDS = getRandomDelayMs(20000)
const BLOCKCHAIN_POLL_MILLISECONDS = getRandomDelayMs(30000)
const TRANSACTION_POLL_MILLISECONDS = getRandomDelayMs(20000)

export class FilecoinEngine extends CurrencyEngine<
  FilecoinTools,
  SafeFilecoinWalletInfo
> {
  address: Address
  availableAttoFil: string
  isScanning: boolean
  networkInfo: FilecoinNetworkInfo
  otherData!: FilecoinWalletOtherData
  pluginId: string

  // Backends:
  filRpc: RPC
  filfoxApi: Filfox
  filscanApi: Filscan
  rpcExtra: RpcExtra

  // Engine State:
  lastMaxSpendable?: {
    nativeAmount: string
    params: {
      GasLimit: number
      GasFeeCap: string
      GasPremium: string
    }
  }

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
    this.isScanning = false
    this.networkInfo = networkInfo
    this.pluginId = this.currencyInfo.pluginId

    const initOptions = asFilecoinInitOptions(env.initOptions)

    this.filRpc = new RPC(Network[env.networkInfo.rpcNode.networkName], {
      url: env.networkInfo.rpcNode.url,
      token: initOptions.glifApiKey
    })
    this.filfoxApi = new Filfox(env.networkInfo.filfoxUrl, env.io.fetchCors)
    this.filscanApi = new Filscan(env.networkInfo.filscanUrl, env.io.fetchCors)
    this.rpcExtra = new RpcExtra(env.networkInfo.rpcNode.url, env.io.fetchCors)
  }

  setOtherData(raw: any): void {
    this.otherData = asFilecoinWalletOtherData(raw)
  }

  initData(): void {
    this.tokenCheckTransactionsStatus.set(null, 0)
    // Engine variables
    this.availableAttoFil = '0'
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

  async startEngine(): Promise<void> {
    this.initData()
    this.addToLoop('checkBalance', ACCOUNT_POLL_MILLISECONDS)
    this.addToLoop('checkBlockHeight', BLOCKCHAIN_POLL_MILLISECONDS)
    this.addToLoop('checkTransactions', TRANSACTION_POLL_MILLISECONDS)
    await super.startEngine()
  }

  async killEngine(): Promise<void> {
    await super.killEngine()

    // Wait for any transaction scanning to finish before killing engine
    await new Promise<void>(resolve => {
      const id = setInterval(() => {
        if (!this.isScanning) {
          clearInterval(id)
          resolve()
        }
      }, 300)
    })
  }

  async clearBlockchainCache(): Promise<void> {
    await super.clearBlockchainCache()
  }

  async resyncBlockchain(): Promise<void> {
    await this.killEngine()
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
    const publicAddress = spendInfo.spendTargets[0].publicAddress

    if (publicAddress == null) throw new Error('Missing publicAddress')

    // Enable skip checks because we don't want insufficient funds errors
    spendInfo.skipChecks = true
    const spendTarget = spendInfo.spendTargets[0]
    if (spendTarget == null) throw new Error('missing spendTargets')
    spendTarget.nativeAmount = spendTarget.nativeAmount ?? '0'

    // Probe for an amount to use in our transaction:
    const txForAmount = await this.makeSpend(spendInfo)
    const probeAmount = sub(this.availableAttoFil, txForAmount.networkFee)

    // Probe for fee params:
    const transaction = Transaction.getNew(
      Address.fromString(publicAddress),
      this.address,
      Token.fromAtto(probeAmount),
      0
    )
    await transaction.prepareToSend(this.filRpc)
    const { GasLimit, GasPremium, GasFeeCap } = transaction.toJSON()

    // Calculate actual values:
    const networkFee = mul(GasLimit.toString(), GasFeeCap)
    const nativeAmount = sub(this.availableAttoFil, networkFee)
    this.lastMaxSpendable = {
      nativeAmount,
      params: {
        GasLimit,
        GasPremium,
        GasFeeCap
      }
    }

    return nativeAmount
  }

  async makeSpend(edgeSpendInfoIn: EdgeSpendInfo): Promise<EdgeTransaction> {
    const { edgeSpendInfo, currencyCode, skipChecks } =
      this.makeSpendCheck(edgeSpendInfoIn)
    const { memos = [], tokenId } = edgeSpendInfo
    const spendTarget = edgeSpendInfo.spendTargets[0]
    if (spendTarget == null) throw new Error('missing spendTargets')
    const { publicAddress, nativeAmount } = spendTarget

    if (publicAddress == null)
      throw new Error('Missing publicAddress in EdgeSpendInfo')
    if (nativeAmount == null) throw new NoAmountSpecifiedError()

    const toAddress = this.tools.normalizeAddress(publicAddress)

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

    // Override fee parameters if this is a max-spend:
    if (this.lastMaxSpendable != null) {
      const { nativeAmount, params } = this.lastMaxSpendable
      if (eq(nativeAmount, nativeAmount)) {
        Object.assign(txJson, params)
        delete this.lastMaxSpendable
      }
    }

    const otherParams: FilecoinTxOtherParams = {
      sigJson: undefined,
      txJson
    }

    const networkFee = mul(txJson.GasLimit.toString(), txJson.GasFeeCap)
    const totalTxAmount = add(nativeAmount, networkFee)
    const txNativeAmount = mul(totalTxAmount, '-1')

    // Make sure we have enough of a balance to complete the transaction
    const nativeBalance = this.availableAttoFil
    if (!skipChecks && gt(totalTxAmount, nativeBalance)) {
      throw new InsufficientFundsError({ tokenId })
    }

    const edgeTransaction: EdgeTransaction = {
      blockHeight: 0,
      currencyCode,
      date: 0,
      isSend: true,
      memos,
      nativeAmount: txNativeAmount,
      networkFee,
      networkFees: [],
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

    edgeTransaction.date = Date.now() / 1000

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

  //
  // Filecoin Engine Specific
  //

  async checkBalance(): Promise<void> {
    const addressString = this.address.toString()
    const response = await this.filfoxApi.getAccount(addressString)
    this.availableAttoFil = response.balance
    this.updateBalance(this.currencyInfo.currencyCode, response.balance)
    this.tokenCheckBalanceStatus.set(null, 1)
    this.updateOnAddressesChecked()
    this.walletLocalDataDirty = true
  }

  async checkBlockHeight(): Promise<void> {
    const response = await this.rpcExtra.getChainHead()
    const blockHeight = response.result.Height

    this.onUpdateBlockHeight(blockHeight)
  }

  async checkTransactions(): Promise<void> {
    // We shouldn't start scanning if scanning is already happening:
    if (this.isScanning) return
    try {
      this.isScanning = true

      const addressString = this.address.toString()

      const handleScanProgress = (progress: number): void => {
        const currentProgress = this.tokenCheckTransactionsStatus.get(null) ?? 0
        const newProgress = progress

        if (
          // Only send event if we haven't completed sync
          currentProgress < 1 &&
          // Avoid thrashing
          (newProgress >= 1 || newProgress > currentProgress * 1.1)
        ) {
          this.tokenCheckTransactionsStatus.set(null, newProgress)
          this.updateOnAddressesChecked()
        }
      }

      const handleScan = ({
        tx,
        progress
      }: {
        tx: EdgeTransaction | undefined
        progress: number
      }): void => {
        if (tx != null) {
          this.addTransaction(this.currencyInfo.currencyCode, tx)
          this.sendTransactionEvents()

          // Progress the block-height if the message's height is greater than
          // last poll for block-height.
          if (this.walletLocalData.blockHeight < tx.blockHeight) {
            this.onUpdateBlockHeight(tx.blockHeight)
          }
        }

        handleScanProgress(progress)
      }

      const scanners = [
        // this.scanTransactionsFromFilscan(addressString, handleScan),
        this.scanTransactionsFromFilfox(addressString, handleScan)
      ]

      // Run scanners:
      await Promise.all(scanners)

      // Save the network height to be leveraged in the next scan
      this.walletLocalData.lastAddressQueryHeight =
        this.walletLocalData.blockHeight
      this.walletLocalDataDirty = true

      // Make sure the sync progress is 100%
      handleScanProgress(1)
    } catch (error) {
      console.error(error)
      throw error
    } finally {
      this.isScanning = false
    }
  }

  async scanTransactionsFromFilfox(
    address: string,
    onScan: (event: {
      tx: EdgeTransaction | undefined
      progress: number
    }) => void
  ): Promise<void> {
    const processedMessageCids = new Set<string>()

    // Initial request to get the totalCount
    const initialResponse = await this.filfoxApi.getAccountTransfers(
      address,
      0,
      1
    )
    let transferCount = initialResponse.totalCount

    // Calculate total pages and set a reasonable transfersPerPage
    const transfersPerPage = 20
    let totalPages = Math.ceil(transferCount / transfersPerPage)

    let transfersChecked = 0
    for (
      let currentPageIndex = totalPages - 1;
      currentPageIndex >= 0;
      currentPageIndex--
    ) {
      const transfersResponse = await this.filfoxApi.getAccountTransfers(
        address,
        currentPageIndex,
        transfersPerPage
      )

      let transfers = transfersResponse.transfers

      // If totalCount has changed, make an additional call to get the missed transfers
      if (transfersResponse.totalCount !== transferCount) {
        // How many transfers were missed
        const missedTransfersCount =
          transfersResponse.totalCount - transferCount

        // Calculate the transfer page index to query for the missing transfers
        const previousPageIndex = currentPageIndex + 1 // Add because we're querying in reverse
        const missedTransfersPageIndex =
          previousPageIndex * (transfersPerPage / missedTransfersCount)

        const missedTransfersResponse =
          await this.filfoxApi.getAccountTransfers(
            address,
            missedTransfersPageIndex,
            missedTransfersCount
          )
        transfers = [...transfers, ...missedTransfersResponse.transfers]

        // Update the totalCount
        transferCount = transfersResponse.totalCount
        // Recalculate total pages
        totalPages = Math.ceil(transferCount / transfersPerPage)
      }

      // Loop through transfers in reverse
      for (let i = transfers.length - 1; i >= 0; i--) {
        // Exit early if the engine has been stopped
        if (!this.engineOn) return

        const transfer = transfers[i]

        // Avoid over-processing:
        let tx: EdgeTransaction | undefined
        if (
          // Skip transfers prior to the last sync height
          transfer.height >= this.walletLocalData.lastAddressQueryHeight &&
          // Skip processed message (there can be many transfers per message)
          !processedMessageCids.has(transfer.message)
        ) {
          // Progress the last query height to optimize the next scan
          if (transfer.height > this.walletLocalData.lastAddressQueryHeight) {
            this.walletLocalData.lastAddressQueryHeight = transfer.height
            this.walletLocalDataDirty = true
          }
          // Process message into a transaction
          const messageDetails = await this.filfoxApi.getMessageDetails(
            transfer.message
          )
          tx = this.filfoxMessageToEdgeTransaction(messageDetails)
        }

        // Calculate the progress
        const progress =
          transferCount === 0 ? 1 : ++transfersChecked / transferCount

        // Trigger scan progress event
        onScan({ tx, progress })

        // Keep track of messages to avoid over-processing:
        processedMessageCids.add(transfer.message)
      }
    }
  }

  /**
   * @deprecated - Use scanTransactionsFromFilfox
   *
   * In order to support multiple scan sources, we'll need to resolve issues
   * caused by updating lastQueryAddressHeight across multiple scanners.
   */
  async scanTransactionsFromFilscan(
    address: string,
    onScan: (event: { tx: EdgeTransaction; progress: number }) => void
  ): Promise<void> {
    const messagesPerPage = 20
    let index = 0
    let messagesChecked = 0
    let messageCount = -1
    do {
      const messagesResponse = await this.filscanApi.getAccountMessages(
        address,
        index++,
        messagesPerPage
      )

      // Only update the message count on the first query because mutating this
      // in-between pagination may cause infinite loops.
      messageCount =
        messageCount === -1 ? messagesResponse.total_count : messageCount

      const messages = messagesResponse.messages_by_account_id_list
      for (const message of messages) {
        // Exit when we reach a transaction we may already have saved
        if (message.height < this.walletLocalData.lastAddressQueryHeight) return

        // Process message into a transaction
        const tx = this.filscanMessageToEdgeTransaction(message)

        // Calculate the progress
        const progress =
          messageCount === 0 ? 1 : ++messagesChecked / messageCount

        onScan({ tx, progress })
      }
    } while (messagesChecked < messageCount)
  }

  filfoxMessageToEdgeTransaction = (
    messageDetails: FilfoxMessageDetails
  ): EdgeTransaction => {
    const addressString = this.address.toString()
    const ourReceiveAddresses = []

    // Handle network fees:
    const networkFee = messageDetails.transfers
      .filter(
        transfer =>
          transfer.type === 'miner-fee' || transfer.type === 'burner-fee'
      )
      .reduce((sum, transfer) => add(sum, transfer.value), '0')

    // Handle native amount:
    let nativeAmount: string
    if (messageDetails.from === addressString) {
      // For spends, always include network fee
      nativeAmount = `-${networkFee}`
      if (messageDetails.to !== addressString) {
        // For spends not to self, subtract tx value
        nativeAmount = sub(nativeAmount, messageDetails.value)
      }
    } else {
      // For receives nativeAMount is always positively the value
      nativeAmount = messageDetails.value
      ourReceiveAddresses.push(addressString)
    }

    const edgeTransaction: EdgeTransaction = {
      blockHeight: messageDetails.height,
      currencyCode: this.currencyInfo.currencyCode,
      date: messageDetails.timestamp,
      isSend: nativeAmount.startsWith('-'),
      memos: [],
      nativeAmount,
      networkFee,
      networkFees: [],
      otherParams: {},
      ourReceiveAddresses, // blank if you sent money otherwise array of addresses that are yours in this transaction
      signedTx: '',
      tokenId: null,
      txid: messageDetails.cid,
      walletId: this.walletId
    }

    return edgeTransaction
  }

  filscanMessageToEdgeTransaction(message: FilscanMessage): EdgeTransaction {
    const addressString = this.address.toString()
    const ourReceiveAddresses = []

    const networkFee = '0' // TODO: calculate transaction fee from onchain gas fields
    let nativeAmount: string
    if (message.from === addressString) {
      // For spends, always include network fee
      nativeAmount = `-${networkFee}`
      if (message.to !== addressString) {
        // For spends not to self, subtract tx value
        nativeAmount = sub(nativeAmount, message.value)
      }
    } else {
      // For receives nativeAMount is always positively the value
      nativeAmount = message.value
      ourReceiveAddresses.push(addressString)
    }

    const edgeTransaction: EdgeTransaction = {
      blockHeight: message.height,
      currencyCode: this.currencyInfo.currencyCode,
      date: message.block_time,
      isSend: nativeAmount.startsWith('-'),
      memos: [],
      nativeAmount,
      networkFee,
      networkFees: [],
      otherParams: {},
      ourReceiveAddresses, // blank if you sent money otherwise array of addresses that are yours in this transaction
      signedTx: '',
      tokenId: null,
      txid: message.cid,
      walletId: this.walletId
    }

    return edgeTransaction
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
