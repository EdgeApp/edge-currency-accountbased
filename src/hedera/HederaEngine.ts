import {
  AccountId,
  Client,
  Hbar,
  PrivateKey,
  Timestamp,
  Transaction,
  TransactionId,
  TransferTransaction
} from '@hashgraph/sdk'
import { add, eq, gt } from 'biggystring'
import {
  EdgeCurrencyEngine,
  EdgeCurrencyEngineOptions,
  EdgeFetchFunction,
  EdgeFreshAddress,
  EdgeMemo,
  EdgeSpendInfo,
  EdgeTransaction,
  EdgeWalletInfo,
  InsufficientFundsError,
  JsonObject,
  NoAmountSpecifiedError
} from 'edge-core-js/types'
import { base16, base64 } from 'rfc4648'

import { CurrencyEngine } from '../common/CurrencyEngine'
import { PluginEnvironment } from '../common/innerPlugin'
import { getRandomDelayMs } from '../common/network'
import { utf8 } from '../common/utf8'
import { getFetchCors } from '../common/utils'
import { HederaTools } from './HederaTools'
import {
  asGetHederaAccount,
  asHederaPrivateKeys,
  asHederaWalletOtherData,
  asMirrorNodeQueryBalance,
  asMirrorNodeTransactionResponse,
  asSafeHederaWalletInfo,
  HederaNetworkInfo,
  HederaWalletOtherData,
  SafeHederaWalletInfo
} from './hederaTypes'

const ACCOUNT_POLL_MILLISECONDS = getRandomDelayMs(20000)
const BALANCE_POLL_MILLISECONDS = getRandomDelayMs(20000)
const TRANSACTION_POLL_MILLISECONDS = getRandomDelayMs(20000)
const SIXTY_DAYS = 5184000 // seconds

export class HederaEngine extends CurrencyEngine<
  HederaTools,
  SafeHederaWalletInfo
> {
  client: Client
  fetchCors: EdgeFetchFunction
  mirrorNodes: [string]
  maxFee: number
  otherData!: HederaWalletOtherData

  constructor(
    env: PluginEnvironment<HederaNetworkInfo>,
    tools: HederaTools,
    walletInfo: SafeHederaWalletInfo,
    opts: EdgeCurrencyEngineOptions
  ) {
    super(env, tools, walletInfo, opts)

    const { client, mirrorNodes, maxFee } = env.networkInfo
    this.client = Client.forName(client)
    this.fetchCors = getFetchCors(env.io)
    this.mirrorNodes = mirrorNodes
    this.maxFee = maxFee
  }

  async checkAccountCreationStatus(): Promise<void> {
    // Use mirror node to see if there's an account associated with the public key
    try {
      const response = await this.fetchCors(
        `${this.mirrorNodes[0]}/api/v1/accounts?account.publickey=${this.walletInfo.keys.publicKey}`
      )
      const { accounts } = asGetHederaAccount(await response.json())
      for (const account of accounts) {
        if (this.walletInfo.keys.publicKey.includes(account.key.key)) {
          this.otherData.hederaAccount = account.account
        }
      }
      if (this.otherData.hederaAccount != null) {
        this.walletLocalDataDirty = true
        this.currencyEngineCallbacks.onAddressChanged()
        this.startActiveAccountLoops()
      } else {
        this.updateBalance(null, '0')
        this.tokenCheckTransactionsStatus.set(null, 1)
        this.tokenCheckBalanceStatus.set(null, 1)
        this.updateOnAddressesChecked()
      }
    } catch (e: any) {
      this.warn(`checkAccountCreationStatus ${this.mirrorNodes[0]} error`, e)
    }
  }

  setOtherData(raw: any): void {
    this.otherData = asHederaWalletOtherData(raw)
  }

  async queryBalance(): Promise<void> {
    const accountId = this.otherData.hederaAccount

    const url = `${this.mirrorNodes[0]}/api/v1/balances?account.id=${accountId}`

    try {
      const response = await this.fetchCors(url)

      if (!response.ok) {
        const text = await response.text()
        throw new Error(text)
      }

      const json = asMirrorNodeQueryBalance(await response.json())
      const balanceObj = json.balances.find(obj => obj.account === accountId)
      if (balanceObj == null)
        throw new Error('Unable to find matching balanceObj')

      this.updateBalance(null, balanceObj.balance.toString())
    } catch (e: any) {
      this.warn('queryBalance error checking balance:', e)
    }
  }

  async getNewTransactions(): Promise<void> {
    let timestamp = this.otherData.latestTimestamp
    const startingTimestamp = Math.floor(Date.now() / 1000)
    const startingProgressDiff = startingTimestamp - parseInt(timestamp)
    try {
      for (;;) {
        const { txs, nextTimestamp } = await this.getTransactionsMirrorNode(
          timestamp
        )
        this.processTxs(txs)

        if (nextTimestamp != null) {
          timestamp = nextTimestamp
          this.otherData.latestTimestamp = nextTimestamp
          this.walletLocalDataDirty = true

          // Report progress in 10% increments
          const currentProgress =
            this.tokenCheckTransactionsStatus.get(null) ?? 0
          const newProgress =
            1 - (startingTimestamp - parseInt(timestamp)) / startingProgressDiff
          if (newProgress - currentProgress > 0.1) {
            this.tokenCheckTransactionsStatus.set(null, newProgress)
            this.updateOnAddressesChecked()
          }
        } else {
          if (this.otherData.latestTimestamp !== timestamp) {
            this.otherData.latestTimestamp = timestamp
            this.walletLocalDataDirty = true
          }
          break
        }
      }
      this.tokenCheckTransactionsStatus.set(null, 1)
      this.updateOnAddressesChecked()
    } catch (e: any) {
      this.warn('getNewTransactions error getting transactions:', e)
    }
  }

  processTxs(txs: EdgeTransaction[]): void {
    if (txs.length > 0) {
      const latestTx = txs[txs.length - 1]

      if (latestTx.otherParams == null) {
        throw new Error('hederaEngine: EdgeTransaction must have otherParams')
      }

      if (this.otherData.latestTimestamp !== latestTx.otherParams.consensusAt) {
        this.otherData.latestTimestamp = latestTx.otherParams.consensusAt
        this.walletLocalDataDirty = true
      }

      for (const tx of txs) {
        this.addTransaction(this.currencyInfo.currencyCode, tx)
      }
      this.sendTransactionEvents()
    }
  }

  // The public mirror node will return up to 100 transactions in a 60 day range.
  async getTransactionsMirrorNode(
    startTimestampSeconds: string
  ): Promise<{ txs: EdgeTransaction[]; nextTimestamp: string | undefined }> {
    if (this.otherData.hederaAccount == null) {
      throw new Error('no Hedera account ID')
    }

    const accountIdStr = this.otherData.hederaAccount

    const startTimestamp = new Timestamp(parseInt(startTimestampSeconds), 0)
    const endTimestampSeconds = Math.min(
      parseInt(startTimestampSeconds) + SIXTY_DAYS,
      Date.now() / 1000
    )
    const endTimestamp = new Timestamp(endTimestampSeconds, 0)
    const LIMIT = 25

    // we request transactions in ascending order by consensus timestamp
    const url = `${
      this.mirrorNodes[0]
    }/api/v1/transactions?transactionType=CRYPTOTRANSFER&account.id=${accountIdStr}&order=asc&limit=${LIMIT}&timestamp=gt:${startTimestamp.toString()}&timestamp=lte:${endTimestamp.toString()}`

    const response = await this.fetchCors(url)

    if (!response.ok) {
      const text = await response.text()
      this.warn(`getTransactionsMirrorNode error: ${text} ${url}`)
      return { txs: [], nextTimestamp: startTimestampSeconds }
    }

    const json = asMirrorNodeTransactionResponse(await response.json())

    const txs: EdgeTransaction[] = []

    let latestTimestampFromTransaction = startTimestampSeconds
    for (const tx of json.transactions) {
      const date = parseInt(tx.valid_start_timestamp)
      latestTimestampFromTransaction = date.toString()

      const ourTransfer = tx.transfers.find(
        transfer => transfer.account === accountIdStr
      )

      // if we didn't spend or receive money in this transaction, we don't care about it
      if (ourTransfer == null) {
        continue
      }

      const nativeAmount = ourTransfer.amount.toString()
      const ourReceiveAddresses = []
      if (gt(nativeAmount, '0')) ourReceiveAddresses.push(accountIdStr)

      const memos: EdgeMemo[] = []
      if (tx.memo_base64 !== '') {
        memos.push({
          type: 'text',
          value: utf8.stringify(base64.parse(tx.memo_base64))
        })
      }

      txs.push({
        blockHeight: 1, // blockHeight
        currencyCode: this.currencyInfo.currencyCode, // currencyCode
        date,
        isSend: nativeAmount.startsWith('-'),
        memos,
        nativeAmount,
        networkFee: tx.charged_tx_fee.toString(), // networkFee
        networkFees: [],
        otherParams: {
          consensusAt: tx.consensus_timestamp
        },
        ourReceiveAddresses, // ourReceiveAddresses
        signedTx: '', // signedTx
        tokenId: null,
        txid: hashToTxid(base64.parse(tx.transaction_hash)),
        walletId: this.walletId
      })
    }

    // If there are 100 transactions in the response, start the next query with the timestamp from the latest transaction
    // Otherwise, use the calculated end timestamp
    const nextTimestamp =
      json.transactions.length === LIMIT
        ? latestTimestampFromTransaction
        : endTimestampSeconds - parseInt(startTimestampSeconds) === SIXTY_DAYS
        ? endTimestamp.toString()
        : undefined

    return { txs, nextTimestamp }
  }

  startActiveAccountLoops(): void {
    this.removeFromLoop('checkAccountCreationStatus')
    this.addToLoop('queryBalance', BALANCE_POLL_MILLISECONDS)
    this.addToLoop('getNewTransactions', TRANSACTION_POLL_MILLISECONDS)
  }

  // ****************************************************************************
  // Public methods
  // ****************************************************************************

  async startEngine(): Promise<void> {
    if (this.otherData.hederaAccount == null) {
      this.addToLoop('checkAccountCreationStatus', ACCOUNT_POLL_MILLISECONDS)
    } else {
      this.startActiveAccountLoops()
    }

    await super.startEngine()
  }

  async resyncBlockchain(): Promise<void> {
    await this.killEngine()
    await this.clearBlockchainCache()
    await this.startEngine()
  }

  async makeSpend(edgeSpendInfoIn: EdgeSpendInfo): Promise<EdgeTransaction> {
    const { edgeSpendInfo, currencyCode } = this.makeSpendCheck(edgeSpendInfoIn)
    const { memos = [], tokenId } = edgeSpendInfo

    if (this.otherData.hederaAccount == null) {
      throw Error('ErrorAccountNotActivated')
    }
    if (edgeSpendInfo.spendTargets.length !== 1) {
      throw new Error('Error: only one output allowed')
    }

    const memo = memos[0]?.type === 'text' ? memos[0].value : ''
    const { publicAddress } = edgeSpendInfo.spendTargets[0]
    let { nativeAmount } = edgeSpendInfo.spendTargets[0]

    if (publicAddress == null)
      throw new Error('makeSpend Missing publicAddress')
    if (nativeAmount == null) throw new NoAmountSpecifiedError()

    if (eq(nativeAmount, '0')) {
      throw new NoAmountSpecifiedError()
    }

    const hbar = Hbar.fromTinybars(nativeAmount)
    const txnFee = Hbar.fromTinybars(this.maxFee)
    const networkFee = txnFee.toTinybars().toString()
    nativeAmount = add(nativeAmount, networkFee)

    if (gt(nativeAmount, this.getBalance({ tokenId }))) {
      throw new InsufficientFundsError({ tokenId })
    }

    if (this.otherData.hederaAccount == null) {
      throw new Error('creating a transfer without an account ID')
    }

    const txnId = new TransactionId(
      AccountId.fromString(this.otherData.hederaAccount),
      Timestamp.fromDate(new Date())
    )

    const transferTx = new TransferTransaction()
      .setTransactionId(txnId)
      .addHbarTransfer(this.otherData.hederaAccount, hbar.negated())
      .addHbarTransfer(publicAddress, hbar)
      .setMaxTransactionFee(txnFee)
      .setTransactionMemo(memo)
      .freezeWith(this.client)

    const edgeTransaction: EdgeTransaction = {
      blockHeight: 0, // blockHeight
      currencyCode, // currencyCode
      date: 0,
      isSend: true,
      memos,
      nativeAmount: `-${nativeAmount}`,
      // UI shows the fee subtracted from the sent amount which doesn't make sense here
      networkFee, // networkFee
      networkFees: [],
      otherParams: {
        fromAddress: this.walletLocalData.publicKey,
        toAddress: publicAddress,
        transferTx: base64.stringify(transferTx.toBytes())
      },
      ourReceiveAddresses: [], // ourReceiveAddresses
      signedTx: '', // signedTx
      tokenId,
      txid: '',
      walletId: this.walletId
    }
    return edgeTransaction
  }

  async signTx(
    edgeTransaction: EdgeTransaction,
    privateKeys: JsonObject
  ): Promise<EdgeTransaction> {
    const hederaPrivateKeys = asHederaPrivateKeys(this.currencyInfo.pluginId)(
      privateKeys
    )
    if (
      edgeTransaction.otherParams == null ||
      edgeTransaction.otherParams.transferTx == null
    ) {
      throw new Error('missing otherParam transferTx')
    }

    const privateKey = hederaPrivateKeys.privateKey

    if (privateKey == null) {
      throw new Error('missing privateKey in walletInfo')
    }

    const transferTx = Transaction.fromBytes(
      base64.parse(edgeTransaction.otherParams.transferTx)
    )
    await transferTx.sign(PrivateKey.fromStringED25519(privateKey))
    const txid = transferTx.transactionId
    if (txid == null) {
      throw new Error('Error generating txid')
    }

    return {
      ...edgeTransaction,
      signedTx: base64.stringify(transferTx.toBytes()),
      txid: txid.toString(),
      date: Date.now() / 1000,
      otherParams: {
        ...edgeTransaction.otherParams
      }
    }
  }

  async broadcastTx(
    edgeTransaction: EdgeTransaction
  ): Promise<EdgeTransaction> {
    if (edgeTransaction.signedTx == null) {
      throw new Error('InvalidTransactionParams')
    }

    try {
      const txn = Transaction.fromBytes(base64.parse(edgeTransaction.signedTx))
      await txn.execute(this.client)
    } catch (e: any) {
      this.warn('broadcastTx error', e)
      throw e
    }
    // must be > 0 to not show "Synchronizing"
    edgeTransaction.blockHeight = 1
    return edgeTransaction
  }

  async getFreshAddress(): Promise<EdgeFreshAddress> {
    return {
      publicAddress:
        this.otherData.hederaAccount ?? `0.0.${this.walletInfo.keys.publicKey}`
    }
  }

  getBlockHeight(): number {
    return Math.floor(Date.now() / 1000)
  }
}

function hashToTxid(hash: Uint8Array): string {
  return base16.stringify(hash).toLowerCase()
}

export async function makeCurrencyEngine(
  env: PluginEnvironment<HederaNetworkInfo>,
  tools: HederaTools,
  walletInfo: EdgeWalletInfo,
  opts: EdgeCurrencyEngineOptions
): Promise<EdgeCurrencyEngine> {
  const safeWalletInfo = asSafeHederaWalletInfo(walletInfo)
  const engine = new HederaEngine(env, tools, safeWalletInfo, opts)

  await engine.loadEngine()

  return engine
}
