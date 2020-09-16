/**
 * Created by Austin Bonander <austin@launchbadge.com> on 9/30/19.
 */
// @flow

import * as hedera from '@hashgraph/sdk'
import baseX from 'base-x'
import { bns } from 'biggystring'
import { type EdgeFreshAddress } from 'edge-core-js'
import {
  type EdgeCurrencyEngineOptions,
  type EdgeIo,
  type EdgeSpendInfo,
  type EdgeTransaction,
  type EdgeWalletInfo,
  NoAmountSpecifiedError
} from 'edge-core-js/types'

import { CurrencyEngine } from '../common/engine.js'
import { hexToBuf } from '../common/utils'
import { useTestnet } from './hederaInfo'
import { HederaPlugin } from './hederaPlugin'

const base64Digits =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890+/'

const base64 = baseX(base64Digits)

export class HederaEngine extends CurrencyEngine {
  hederaPlugin: HederaPlugin
  client: hedera.Client
  accountId: ?hedera.AccountId
  latestTimestamp: ?Date
  otherMethods: Object
  io: EdgeIo
  creatorApiServer: string

  constructor(
    currencyPlugin: HederaPlugin,
    walletInfo: EdgeWalletInfo,
    opts: EdgeCurrencyEngineOptions,
    io: EdgeIo
  ) {
    super(currencyPlugin, walletInfo, opts)
    this.hederaPlugin = currencyPlugin

    this.io = io
    this.client = useTestnet
      ? hedera.Client.forTestnet()
      : hedera.Client.forMainnet()

    this.creatorApiServer = this.currencyInfo.defaultSettings.otherSettings.creatorApiServers[0]

    this.otherMethods = {
      getAccountActivationQuote: async (params: Object) => {
        const { currencyCode, activePublicKey } = params
        if (!currencyCode || !activePublicKey) {
          throw new Error('ErrorInvalidParams')
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

        const response = await io.fetch(
          `${this.creatorApiServer}/account`,
          options
        )

        if (response.ok) {
          const {
            request_id: requestId,
            address,
            amount
          } = await response.json()

          this.walletLocalData.otherData.activationRequestId = requestId
          this.walletLocalDataDirty = true

          return {
            paymentAddress: address,
            currencyCode,
            amount: bns.toFixed(amount, 3, 9),
            exchangeAmount: '0'
          }
        }

        this.log(
          'hederaEngine: error submitting account activation request',
          await response.text()
        )
        throw new Error('ErrorActivationRequest')
      },
      submitActivationPayment: async (txn: EdgeTransaction) => {
        const requestId = this.walletLocalData.otherData.activationRequestId
        if (!requestId) {
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

        const paymentUrl = `${this.creatorApiServer}/request/${requestId}/payment`

        this.log('hederaEngine submitActivationPayment url: ', paymentUrl)

        let response

        try {
          response = await this.io.fetch(paymentUrl, options)
        } catch (e) {
          this.log('hederaEngine failed to submit payment', e.toString())
          throw new Error('ErrorActivationPayment')
        }

        if (response.ok) {
          this.walletLocalData.otherData.paymentSubmitted = true
          this.walletLocalDataDirty = true
          this.addToLoop('checkAccountCreationStatus', 5000)
        } else {
          this.log('hederaEngine invalid activation payment', response.text())
          throw new Error('ErrorInvalidActivationPayment')
        }
      },
      // this is checked if `getFreshAddress()` returns a falsy public address
      // N.B. this will return `true` even after account activation
      getActivationPaymentSubmitted: (): boolean => {
        const {
          activationRequestId,
          paymentSubmitted
        } = this.walletLocalData.otherData
        return activationRequestId && paymentSubmitted
      }
    }
  }

  async checkAccountCreationStatus(): Promise<void> {
    const {
      activationRequestId,
      paymentSubmitted,
      hederaAccount
    } = this.walletLocalData.otherData

    if (!activationRequestId || !paymentSubmitted || hederaAccount) {
      if (hederaAccount) {
        delete this.timers.checkAccountCreationStatus
      }

      return
    }

    let response

    try {
      response = await this.io.fetch(
        `${this.creatorApiServer}/request/${activationRequestId}/status`
      )
      response = await response.json()
    } catch (e) {
      this.log(
        'error checking Hedera account creation status, ID:',
        activationRequestId,
        'error:',
        e
      )
      return
    }

    if (response.status === 'transaction_error') {
      delete this.timers.checkAccountCreationStatus
      this.log(
        'hederaEngine error from account activation status',
        response.message
      )
      throw new Error('ErrorAccountActivation')
    }

    if (response.status === 'success') {
      this.walletLocalData.otherData.hederaAccount = response.account_id
      this.walletLocalDataDirty = true
      this.accountId = new hedera.AccountId(response.account_id)
      await this.saveWalletLoop()
      delete this.timers.checkAccountCreationStatus
    }
  }

  // ****************************************************************************
  // Public methods
  // ****************************************************************************

  async startEngine() {
    this.engineOn = true

    this.addToLoop('getNewTransactions', 1000)
    this.addToLoop('updateBalance', 5000)
    // will remove itself from loop if not needed
    this.addToLoop('checkAccountCreationStatus', 5000)

    if (!this.walletLocalData.otherData.hederaAccount) {
      const accountId = await this.getAccountId()

      if (accountId) {
        this.accountId = accountId
        this.walletLocalData.otherData.hederaAccount = accountId.toString()
        this.walletLocalDataDirty = true
      }
    } else {
      this.accountId = new hedera.AccountId(
        this.walletLocalData.otherData.hederaAccount
      )
    }

    this.latestTimestamp = this.walletLocalData.otherData.latestTimestamp

    await super.startEngine()
  }

  async resyncBlockchain(): Promise<void> {
    this.latestTimestamp = null
    this.walletLocalData.otherData.latestTimestamp = null
    this.walletLocalDataDirty = true

    await this.killEngine()
    await this.startEngine()
  }

  async updateBalance(): Promise<void> {
    if (!this.accountId) {
      return
    }

    const balance = (
      await new hedera.AccountBalanceQuery()
        .setAccountId(this.accountId)
        .execute(this.client)
    )
      .asTinybar()
      .toString()

    this.log('got balance:', balance)
    this.walletLocalData.totalBalances.HBAR = balance
    this.currencyEngineCallbacks.onBalanceChanged('HBAR', balance)
  }

  async getNewTransactions() {
    if (!this.accountId) {
      return
    }
    try {
      for (;;) {
        // Kabuto returns latest transactions first
        const txs = await this.getTransactionsKabuto(this.latestTimestamp)

        if (txs.length > 0) {
          this.processTxs(txs)
        } else {
          break
        }
      }

      // tell the UI that we're done syncing
      this.currencyEngineCallbacks.onAddressesChecked(1)
    } catch (e) {
      this.log('error getting transactions:', e.toString(), e.stack)
    }
  }

  processTxs(txs: EdgeTransaction[]) {
    if (txs.length > 0) {
      console.log('processTxs', txs)

      const latestTx = txs[txs.length - 1]

      if (!latestTx.otherParams) {
        throw new Error('hederaEngine: EdgeTransaction must have otherParams')
      }

      const latestConsensusAt = new Date(latestTx.otherParams.consensusAt)

      if (!this.latestTimestamp || latestConsensusAt > this.latestTimestamp) {
        this.latestTimestamp = latestConsensusAt
        this.walletLocalData.otherData.latestTimestamp =
          latestTx.otherParams.consensusAt
        this.walletLocalDataDirty = true

        // update our sync progress as a function of our latest timestamp / now
        // $FlowFixMe: latestTimestamp was just assigned 3 lines up
        const progress = this.latestTimestamp.getTime() / Date.now()

        this.currencyEngineCallbacks.onAddressesChecked(progress)
      }

      txs.forEach(tx => this.addTransaction(this.currencyInfo.currencyCode, tx))

      this.currencyEngineCallbacks.onTransactionsChanged(txs)
    }
  }

  async getTransactionsKabuto(after: ?Date): Promise<EdgeTransaction[]> {
    if (!this.accountId) {
      throw new Error('no Hedera account ID')
    }

    const accountIdStr = this.walletLocalData.otherData.hederaAccount

    const q = {}

    if (after) {
      q.consensusAt = { $gt: { $date: after }, ...(q.consensusAt || {}) }
    }

    const kabutoServer = this.currencyInfo.defaultSettings.otherSettings
      .kabutoApiServers[0]

    // we request transactions in ascending order by consensus timestamp
    let url = `${kabutoServer}/v1/account/${accountIdStr}/transaction?order={"consensusAt": "asc"}`

    if (q.consensusAt) {
      url += `&q=${JSON.stringify(q)}`
    }

    const response = await this.io.fetch(url)

    if (!response.ok) {
      this.log('error fetching Kabuto transactions:', await response.text())

      return []
    }

    const json = await response.json()

    const txs: EdgeTransaction[] = []

    for (const tx of json.transactions) {
      const date = new Date(tx.validStartAt)

      const ourTransfer = tx.transfers.find(
        transfer => transfer.account === accountIdStr
      )

      // if we didn't spend or receive money in this transaction, we don't care about it
      if (!ourTransfer) {
        continue
      }

      txs.push({
        txid: tx.id,
        date: date.getTime(), // date
        currencyCode: this.currencyInfo.currencyCode, // currencyCode
        blockHeight: 1, // blockHeight
        nativeAmount: ourTransfer.amount.toString(),
        // UI shows the fee subtracted from the sent amount which doesn't make sense here
        networkFee: '0', // networkFee
        ourReceiveAddresses: [], // ourReceiveAddresses
        signedTx: '', // signedTx
        otherParams: {
          consensusAt: tx.consensusAt
        }
      })
    }

    return txs
  }

  async makeSpend(edgeSpendInfoIn: EdgeSpendInfo): Promise<EdgeTransaction> {
    if (!this.walletLocalData.otherData.hederaAccount) {
      throw Error('ErrorAccountNotActivated')
    }

    const { edgeSpendInfo, currencyCode } = super.makeSpend(edgeSpendInfoIn)

    if (edgeSpendInfo.spendTargets.length !== 1) {
      throw new Error('Error: only one output allowed')
    }
    const publicAddress = edgeSpendInfo.spendTargets[0].publicAddress

    let nativeAmount = '0'
    if (typeof edgeSpendInfo.spendTargets[0].nativeAmount === 'string') {
      nativeAmount = edgeSpendInfo.spendTargets[0].nativeAmount
    } else {
      throw new NoAmountSpecifiedError()
    }

    const hbar = hedera.Hbar.fromTinybar(nativeAmount)
    const txnFee = hedera.Hbar.fromTinybar(900000)

    if (!this.accountId) {
      throw new Error('creating a transfer without an account ID')
    }

    const txnId = new hedera.TransactionId(this.accountId)

    const transferTx = new hedera.CryptoTransferTransaction()
      .setTransactionId(txnId)
      .addSender(this.walletLocalData.otherData.hederaAccount, hbar)
      .addRecipient(publicAddress, hbar)
      .setMaxTransactionFee(txnFee)
      .build(this.client)

    const edgeTransaction: EdgeTransaction = {
      txid: txnId.toString(), // txid
      date: txnId.validStart.asDate().getTime(), // date
      currencyCode, // currencyCode
      blockHeight: 0, // blockHeight
      nativeAmount: hbar.negated().asTinybar().toString(),
      // UI shows the fee subtracted from the sent amount which doesn't make sense here
      networkFee: '0', // networkFee
      ourReceiveAddresses: [], // ourReceiveAddresses
      signedTx: '', // signedTx
      otherParams: {
        fromAddress: this.walletLocalData.publicKey,
        toAddress: publicAddress,
        transferTx: base64.encode(transferTx.toBytes())
      }
    }

    this.log(
      `${nativeAmount} ${this.walletLocalData.publicKey} -> ${publicAddress}`
    )
    return edgeTransaction
  }

  async signTx(edgeTransaction: EdgeTransaction): Promise<EdgeTransaction> {
    if (
      !edgeTransaction.otherParams ||
      !edgeTransaction.otherParams.transferTx
    ) {
      throw new Error('missing otherParam transferTx')
    }

    const { hederaPrivateKey } = this.walletInfo.keys

    if (!hederaPrivateKey) {
      throw new Error('missing hederaPrivateKey in walletInfo')
    }

    const transferTx = hedera.Transaction.fromBytes(
      base64.decode(edgeTransaction.otherParams.transferTx)
    )
    await transferTx.sign(hedera.Ed25519PrivateKey.fromString(hederaPrivateKey))

    return {
      ...edgeTransaction,
      signedTx: base64.encode(transferTx.toBytes()),
      otherParams: {
        ...edgeTransaction.otherParams
      }
    }
  }

  async broadcastTx(
    edgeTransaction: EdgeTransaction
  ): Promise<EdgeTransaction> {
    if (!edgeTransaction.signedTx) {
      throw new Error('InvalidTransactionParams')
    }

    try {
      const txn = hedera.Transaction.fromBytes(
        base64.decode(edgeTransaction.signedTx)
      )
      await txn.execute(this.client)
    } catch (e) {
      this.log(e)
      throw e
    }
    // must be > 0 to not show "Synchronizing"
    edgeTransaction.blockHeight = 1
    return edgeTransaction
  }

  async getAccountId(): Promise<?hedera.AccountId> {
    const apiServer = this.currencyInfo.defaultSettings.otherSettings
      .kabutoApiServers[0]

    const response = await (
      await this.io.fetch(
        `${apiServer}/v1/account?q={"key": "${this.walletInfo.keys.publicKey}" }`
      )
    ).json()

    if (response.accounts && response.accounts.length > 0) {
      this.log('returned accounts', response.accounts)
      return new hedera.AccountId(response.accounts[0].id)
    } else {
      return null
    }
  }

  getFreshAddress(options: Object): EdgeFreshAddress {
    // same as EOS, return account ID if we have one, otherwise return an empty string
    if (this.walletLocalData.otherData.hederaAccount) {
      return { publicAddress: this.walletLocalData.otherData.hederaAccount }
    } else {
      return {
        publicAddress: '',
        publicKey: this.walletInfo.keys.publicKey
      }
    }
  }

  getBlockHeight(): number {
    return 2
  }

  getDisplayPrivateSeed() {
    return (
      this.walletInfo.keys.hederaMnemonic ||
      this.walletInfo.keys.hederaPrivateKey ||
      ''
    )
  }

  getDisplayPublicSeed() {
    return this.walletInfo.keys.publicKey || ''
  }
}

export { CurrencyEngine }
