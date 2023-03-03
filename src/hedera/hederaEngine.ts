import * as hedera from '@hashgraph/sdk'
import { add, eq, gt, toFixed } from 'biggystring'
import {
  EdgeCurrencyEngine,
  EdgeCurrencyEngineOptions,
  EdgeFreshAddress,
  EdgeIo,
  EdgeLog,
  EdgeSpendInfo,
  EdgeTransaction,
  EdgeWalletInfo,
  InsufficientFundsError,
  NoAmountSpecifiedError
} from 'edge-core-js/types'
import { base64 } from 'rfc4648'

import { CurrencyEngine } from '../common/engine'
import { PluginEnvironment } from '../common/innerPlugin'
import { PublicKeys } from '../common/types'
import { bufToHex, hexToBuf, removeHexPrefix } from '../common/utils'
import { HederaTools } from './hederaPlugin'
import {
  asCheckAccountCreationStatus,
  asGetAccountActivationQuote,
  asGetHederaAccount,
  asHederaWalletOtherData,
  asMirrorNodeQueryBalance,
  asMirrorNodeTransactionResponse,
  HederaWalletOtherData
} from './hederaTypes'

const GENESIS = '1535068800' // '2018-08-24T00:00:00.000Z'

export class HederaEngine extends CurrencyEngine<HederaTools> {
  client: hedera.Client
  accountId: hedera.AccountId | undefined | null
  otherMethods: Object
  io: EdgeIo
  creatorApiServers: [string]
  mirrorNodes: [string]
  log: EdgeLog
  maxFee: number
  otherData!: HederaWalletOtherData

  constructor(
    env: PluginEnvironment<{}>,
    tools: HederaTools,
    publicKeys: PublicKeys,
    opts: EdgeCurrencyEngineOptions,
    io: EdgeIo
  ) {
    super(env, tools, publicKeys, opts)
    this.log = opts.log

    this.io = io
    const { client, creatorApiServers, mirrorNodes, maxFee } =
      this.currencyInfo.defaultSettings.otherSettings
    // @ts-expect-error
    this.client = hedera.Client[`for${client}`]()
    this.creatorApiServers = creatorApiServers
    this.mirrorNodes = mirrorNodes
    this.maxFee = maxFee

    this.otherMethods = {
      getAccountActivationQuote: async (params: Object) => {
        // @ts-expect-error
        const { currencyCode, activePublicKey } = params
        if (currencyCode == null || activePublicKey == null) {
          throw new Error('ErrorInvalidParams')
        }

        // Activation requests don't expire (currently) so just return the address and amount if we already have it instead of overwriting the previous request
        const { accountActivationQuoteAmount, accountActivationQuoteAddress } =
          this.otherData
        if (
          accountActivationQuoteAmount != null &&
          accountActivationQuoteAddress != null
        ) {
          return {
            paymentAddress: accountActivationQuoteAddress,
            currencyCode,
            amount: toFixed(accountActivationQuoteAmount, 3, 9),
            exchangeAmount: '0'
          }
        }

        const options = {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            currency: currencyCode,
            public_key: activePublicKey
          })
        }

        try {
          const response = await io.fetch(
            `${this.creatorApiServers[0]}/account`,
            options
          )

          if (!response.ok) {
            throw new Error(await response.text())
          }

          const json = asGetAccountActivationQuote(await response.json())

          const { request_id: requestId, address, amount } = json
          this.warn(`activationRequestId: ${requestId}`)

          this.otherData.activationRequestId = requestId
          this.otherData.accountActivationQuoteAddress = address
          this.otherData.accountActivationQuoteAmount = amount
          this.walletLocalDataDirty = true

          return {
            paymentAddress: address,
            currencyCode,
            amount: toFixed(amount, 3, 18),
            exchangeAmount: '0'
          }
        } catch (e: any) {
          this.warn(
            'getAccountActivationQuote: error submitting account activation request',
            e
          )
          throw new Error('ErrorActivationRequest')
        }
      },
      submitActivationPayment: async (txn: EdgeTransaction) => {
        const requestId = this.otherData.activationRequestId
        if (requestId == null) {
          // @ts-expect-error
          throw new Error({
            message: 'ErrorNoActivationPending'
          })
        }

        const options = {
          method: 'PUT',
          headers: {
            Accept: 'application/octet-stream',
            'Content-Type': 'application/octet-stream'
          },
          body: hexToBuf(txn.signedTx)
        }

        const paymentUrl = `${this.creatorApiServers[0]}/request/${requestId}/payment`

        try {
          const response = await this.io.fetch(paymentUrl, options)
          if (!response.ok) {
            this.warn(
              `submitActivationPayment failed to submit payment
                ${await response.text()}`
            )
            throw new Error('ErrorActivationPayment')
          }
        } catch (e: any) {
          this.warn('submitActivationPayment error: ', e)
          throw e
        }

        this.otherData.paymentSubmitted = true
        this.walletLocalDataDirty = true
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.addToLoop('checkAccountCreationStatus', 5000)

        return txn
      }
    }
  }

  async checkAccountCreationStatus(): Promise<void> {
    const { activationRequestId, paymentSubmitted, hederaAccount } =
      this.otherData

    if (hederaAccount != null && this.accountId != null) {
      clearTimeout(this.timers.checkAccountCreationStatus)
      return
    }

    let accountId

    // Use mirror node to see if there's an account associated with the public key
    try {
      const response = await this.io.fetch(
        `${this.mirrorNodes[0]}/api/v1/accounts?account.publickey=${this.publicKeys.keys.publicKey}`
      )
      const { accounts } = asGetHederaAccount(await response.json())
      for (const account of accounts) {
        if (this.publicKeys.keys.publicKey.includes(account.key.key)) {
          accountId = account.account
        }
      }
    } catch (e: any) {
      this.warn(`checkAccountCreationStatus ${this.mirrorNodes[0]} error`, e)
    }

    // Double check with activation server
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (accountId == null && paymentSubmitted && activationRequestId != null) {
      try {
        const response = await this.io.fetch(
          `${this.creatorApiServers[0]}/request/${activationRequestId}/status`
        )
        const json = asCheckAccountCreationStatus(await response.json())

        if (json.status === 'transaction_error') {
          this.otherData.activationRequestId = undefined
          this.otherData.accountActivationQuoteAddress = undefined
          this.otherData.accountActivationQuoteAmount = undefined
          this.walletLocalDataDirty = true
          clearTimeout(this.timers.checkAccountCreationStatus)
          this.warn(
            `hederaEngine error from account activation status ${JSON.stringify(
              json
            )}`
          )
          throw new Error('ErrorAccountActivation')
        }

        if (json.status === 'success' && json.account_id != null) {
          accountId = json.account_id
        }
      } catch (e: any) {
        this.warn(
          `error checking Hedera account creation status, ID: ${activationRequestId} error `,
          e
        )
        if (e?.message === 'ErrorAccountActivation') throw e
      }
    }

    if (accountId != null) {
      this.otherData.hederaAccount = accountId
      this.walletLocalDataDirty = true
      this.currencyEngineCallbacks.onAddressChanged()
      this.accountId = new hedera.AccountId(accountId)
      clearTimeout(this.timers.checkAccountCreationStatus)
    }
  }

  setOtherData(raw: any): void {
    this.otherData = asHederaWalletOtherData(raw)
  }

  async queryBalance(): Promise<void> {
    if (this.accountId == null) {
      return
    }

    const accountId = this.accountId.toString()
    const url = `${this.mirrorNodes[0]}/api/v1/balances?account.id=${accountId}`

    try {
      const response = await this.io.fetch(url)

      if (!response.ok) {
        const text = await response.text()
        throw new Error(text)
      }

      const json = asMirrorNodeQueryBalance(await response.json())
      const balanceObj = json.balances.find(obj => obj.account === accountId)
      if (balanceObj == null)
        throw new Error('Unable to find matching balanceObj')

      this.updateBalance(
        this.currencyInfo.currencyCode,
        balanceObj.balance.toString()
      )
    } catch (e: any) {
      this.warn('queryBalance error checking balance:', e)
    }
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  async getNewTransactions() {
    if (this.accountId == null) {
      return
    }
    try {
      for (;;) {
        const txs = await this.getTransactionsMirrorNode(
          this.otherData.latestTimestamp ?? GENESIS
        )

        if (txs.length > 0) {
          this.processTxs(txs)
        } else {
          break
        }
      }
      this.tokenCheckTransactionsStatus[this.currencyInfo.currencyCode] = 1
      this.updateOnAddressesChecked()
    } catch (e: any) {
      this.warn('getNewTransactions error getting transactions:', e)
    }
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  processTxs(txs: EdgeTransaction[]) {
    if (txs.length > 0) {
      const latestTx = txs[txs.length - 1]

      if (latestTx.otherParams == null) {
        throw new Error('hederaEngine: EdgeTransaction must have otherParams')
      }

      if (this.otherData.latestTimestamp !== latestTx.otherParams.consensusAt) {
        this.otherData.latestTimestamp = latestTx.otherParams.consensusAt
        this.walletLocalDataDirty = true
      }

      txs.forEach(tx => this.addTransaction(this.currencyInfo.currencyCode, tx))

      this.currencyEngineCallbacks.onTransactionsChanged(txs)
    }
  }

  async getTransactionsMirrorNode(
    timestamp: string
  ): Promise<EdgeTransaction[]> {
    if (this.accountId == null) {
      throw new Error('no Hedera account ID')
    }

    const accountIdStr = this.otherData.hederaAccount ?? ''

    // we request transactions in ascending order by consensus timestamp
    const url = `${this.mirrorNodes[0]}/api/v1/transactions?transactionType=CRYPTOTRANSFER&account.id=${accountIdStr}&order=asc&timestamp=gt:${timestamp}`

    const response = await this.io.fetch(url)

    if (!response.ok) {
      this.warn(
        `getTransactionsMirrorNode error fetching MirrorNode transactions: ${url}`
      )

      return []
    }

    const json = asMirrorNodeTransactionResponse(await response.json())

    const txs: EdgeTransaction[] = []

    for (const tx of json.transactions) {
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

      txs.push({
        // @ts-expect-error
        txid: removeHexPrefix(bufToHex(base64.parse(tx.transaction_hash))),
        date: parseInt(tx.valid_start_timestamp),
        currencyCode: this.currencyInfo.currencyCode, // currencyCode
        blockHeight: 1, // blockHeight
        nativeAmount,
        networkFee: tx.charged_tx_fee.toString(), // networkFee
        ourReceiveAddresses, // ourReceiveAddresses
        signedTx: '', // signedTx
        otherParams: {
          consensusAt: tx.consensus_timestamp
        },
        walletId: this.walletId
      })
    }

    return txs
  }

  // ****************************************************************************
  // Public methods
  // ****************************************************************************

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  async startEngine() {
    this.engineOn = true

    if (this.otherData.latestTimestamp == null) {
      this.otherData.latestTimestamp = GENESIS
    }
    if (this.otherData.hederaAccount == null) {
      this.otherData.hederaAccount = ''
    }

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.addToLoop('getNewTransactions', 1000)
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.addToLoop('queryBalance', 5000)
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.addToLoop('checkAccountCreationStatus', 5000)

    await super.startEngine()
  }

  async clearBlockchainCache(): Promise<void> {
    this.accountId = null
    await super.clearBlockchainCache()
  }

  async resyncBlockchain(): Promise<void> {
    await this.killEngine()
    await this.clearBlockchainCache()
    await this.startEngine()
  }

  async makeSpend(edgeSpendInfoIn: EdgeSpendInfo): Promise<EdgeTransaction> {
    if (this.otherData.hederaAccount == null) {
      throw Error('ErrorAccountNotActivated')
    }

    const { edgeSpendInfo, currencyCode } = this.makeSpendCheck(edgeSpendInfoIn)

    if (edgeSpendInfo.spendTargets.length !== 1) {
      throw new Error('Error: only one output allowed')
    }

    const { publicAddress, uniqueIdentifier = '' } =
      edgeSpendInfo.spendTargets[0]
    let { nativeAmount } = edgeSpendInfo.spendTargets[0]

    if (publicAddress == null)
      throw new Error('makeSpend Missing publicAddress')
    if (nativeAmount == null) throw new NoAmountSpecifiedError()

    if (eq(nativeAmount, '0')) {
      throw new NoAmountSpecifiedError()
    }

    const hbar = hedera.Hbar.fromTinybar(nativeAmount)
    const txnFee = hedera.Hbar.fromTinybar(this.maxFee)
    const networkFee = txnFee.asTinybar().toString()
    nativeAmount = add(nativeAmount, networkFee)

    if (
      gt(nativeAmount, this.walletLocalData.totalBalances[currencyCode] ?? '0')
    ) {
      throw new InsufficientFundsError()
    }

    if (this.accountId == null) {
      throw new Error('creating a transfer without an account ID')
    }

    const txnId = new hedera.TransactionId(this.accountId)

    const transferTx = new hedera.TransferTransaction()
      .setTransactionId(txnId)
      .addHbarTransfer(this.otherData.hederaAccount, hbar.negated())
      .addHbarTransfer(publicAddress, hbar)
      .setMaxTransactionFee(txnFee)
      .setTransactionMemo(uniqueIdentifier)
      .build(this.client)

    const edgeTransaction: EdgeTransaction = {
      txid: '',
      date: 0,
      currencyCode, // currencyCode
      blockHeight: 0, // blockHeight
      nativeAmount: `-${nativeAmount}`,
      // UI shows the fee subtracted from the sent amount which doesn't make sense here
      networkFee, // networkFee
      ourReceiveAddresses: [], // ourReceiveAddresses
      signedTx: '', // signedTx
      otherParams: {
        fromAddress: this.walletLocalData.publicKey,
        toAddress: publicAddress,
        transferTx: base64.stringify(transferTx.toBytes())
      },
      walletId: this.walletId
    }
    return edgeTransaction
  }

  async signTx(
    edgeTransaction: EdgeTransaction,
    walletInfo: EdgeWalletInfo
  ): Promise<EdgeTransaction> {
    if (
      edgeTransaction.otherParams == null ||
      edgeTransaction.otherParams.transferTx == null
    ) {
      throw new Error('missing otherParam transferTx')
    }

    const privateKey = walletInfo.keys[`${this.currencyInfo.pluginId}Key`]

    if (privateKey == null) {
      throw new Error('missing privateKey in walletInfo')
    }

    const transferTx = hedera.Transaction.fromBytes(
      base64.parse(edgeTransaction.otherParams.transferTx)
    )
    await transferTx.sign(hedera.Ed25519PrivateKey.fromString(privateKey))

    return {
      ...edgeTransaction,
      signedTx: base64.stringify(transferTx.toBytes()),
      // @ts-expect-error
      txid: removeHexPrefix(bufToHex(transferTx.hash())),
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
      const txn = hedera.Transaction.fromBytes(
        base64.parse(edgeTransaction.signedTx)
      )
      await txn.execute(this.client)
    } catch (e: any) {
      this.warn('broadcastTx error', e)
      throw e
    }
    // must be > 0 to not show "Synchronizing"
    edgeTransaction.blockHeight = 1
    return edgeTransaction
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getFreshAddress(options: Object): Promise<EdgeFreshAddress> {
    return { publicAddress: this.otherData.hederaAccount ?? '' }
  }

  getBlockHeight(): number {
    return Math.floor(Date.now() / 1000)
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  getDisplayPrivateSeed(walletInfo: EdgeWalletInfo) {
    return (
      walletInfo.keys[`${this.currencyInfo.pluginId}Mnemonic`] ??
      walletInfo.keys[`${this.currencyInfo.pluginId}Key`] ??
      ''
    )
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  getDisplayPublicSeed() {
    if (
      // eslint-disable-next-line @typescript-eslint/prefer-optional-chain
      this.publicKeys.keys != null &&
      this.publicKeys.keys.publicKey != null
    ) {
      return this.publicKeys.keys.publicKey
    }
    return ''
  }
}

export async function makeCurrencyEngine(
  env: PluginEnvironment<{}>,
  tools: HederaTools,
  publicKeys: PublicKeys,
  opts: EdgeCurrencyEngineOptions
): Promise<EdgeCurrencyEngine> {
  const { io } = env
  const engine = new HederaEngine(env, tools, publicKeys, opts, io)

  await engine.loadEngine(tools, publicKeys, opts)

  return engine
}
