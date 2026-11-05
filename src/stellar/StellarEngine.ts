import {
  Account,
  Asset,
  AssetType,
  Horizon,
  Keypair,
  Memo,
  Networks,
  Operation,
  TimeoutInfinite,
  TransactionBuilder
} from '@stellar/stellar-sdk'
import { abs, add, div, eq, gt, mul, sub } from 'biggystring'
import {
  EdgeCurrencyEngine,
  EdgeCurrencyEngineOptions,
  EdgeFetchFunction,
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
import {
  asyncWaterfall,
  formatAggregateError,
  promiseAny
} from '../common/promiseUtils'
import { makeTokenSyncTracker, TokenSyncTracker } from '../common/SyncTracker'
import { cleanTxLogs, getOtherParams, makeEngineFetch } from '../common/utils'
import { StellarTools } from './StellarTools'
import {
  asFeeStats,
  asSafeStellarWalletInfo,
  asStellarPrivateKeys,
  asStellarWalletOtherData,
  SafeStellarWalletInfo,
  StellarNetworkInfo,
  StellarPaymentRecord,
  StellarWalletOtherData
} from './stellarTypes'

const { OperationResponseType } = Horizon.HorizonApi

// Horizon's largest page:
const TX_QUERY_PAGING_LIMIT = 200
const ADDRESS_POLL_MILLISECONDS = getRandomDelayMs(20000)
const BLOCKCHAIN_POLL_MILLISECONDS = getRandomDelayMs(20000)
const TRANSACTION_POLL_MILLISECONDS = getRandomDelayMs(20000)

const BASE_FEE = 100 // Stroops
const NETWORK_PASSPHRASE = Networks.PUBLIC

type StellarServerFunction =
  | 'feeStats'
  | 'payments'
  | 'loadAccount'
  | 'ledgers'
  | 'submitTransaction'

export class StellarEngine extends CurrencyEngine<
  StellarTools,
  SafeStellarWalletInfo,
  TokenSyncTracker
> {
  networkInfo: StellarNetworkInfo
  engineFetch: EdgeFetchFunction
  activatedAccountsCache: { [publicAddress: string]: boolean }
  fees: { low: number; standard: number; high: number }
  otherData!: StellarWalletOtherData

  constructor(
    env: PluginEnvironment<StellarNetworkInfo>,
    tools: StellarTools,
    walletInfo: SafeStellarWalletInfo,
    opts: EdgeCurrencyEngineOptions
  ) {
    super(env, tools, walletInfo, opts, makeTokenSyncTracker)
    this.networkInfo = env.networkInfo
    this.engineFetch = makeEngineFetch(env.io)
    this.activatedAccountsCache = {}
    this.fees = { low: BASE_FEE, standard: BASE_FEE, high: BASE_FEE }
    this.minimumAddressBalance = this.networkInfo.baseReserve
  }

  setOtherData(raw: any): void {
    this.otherData = asStellarWalletOtherData(raw)
  }

  getRecipientBalance = async (recipient: string): Promise<string> => {
    try {
      const account: Horizon.AccountResponse = await this.multicastServers(
        'loadAccount',
        recipient
      )
      const balanceObj = account.balances.find(
        bal => bal.asset_type === AssetType.native
      )
      if (balanceObj == null) return '0'

      const denom = this.getDenomination(null)
      if (denom == null) throw new Error('Unknown denom')

      return mul(balanceObj.balance, denom.multiplier)
    } catch (e: any) {
      // API will throw if account doesn't exist
      if (e.response?.title === 'Resource Missing') {
        return '0'
      }
      // For other errors just assume the recipient's account is sufficient
      return this.minimumAddressBalance
    }
  }

  async multicastServers(
    func: StellarServerFunction,
    ...params: any
  ): Promise<any> {
    let out: { result: any; server: string } = { result: '', server: '' }
    let funcs
    switch (func) {
      // Functions that should waterfall from top to low priority servers
      case 'feeStats':
        funcs = this.networkInfo.stellarServers.map(
          (serverUrl: string) => async () => {
            const response = await this.engineFetch(`${serverUrl}/fee_stats`)
            const result = asFeeStats(await response.json())

            return { server: serverUrl, result }
          }
        )
        out = await asyncWaterfall(funcs)
        break

      case 'loadAccount':
        funcs = this.tools.stellarApiServers.map(api => async () => {
          // @ts-expect-error
          const result = await api[func](...params)
          return { server: api.serverURL.toString(), result }
        })
        out = await asyncWaterfall(funcs)
        break

      case 'ledgers':
        funcs = this.tools.stellarApiServers.map(serverApi => async () => {
          const result = await serverApi.ledgers().order('desc').limit(1).call()
          const blockHeight = result.records[0].sequence
          if (
            this.walletLocalData.blockHeight <= blockHeight &&
            this.tools.highestTxHeight <= blockHeight
          ) {
            return { server: serverApi.serverURL.toString(), result }
          } else {
            throw new Error('Height out of date')
          }
        })
        out = await asyncWaterfall(funcs)
        break

      case 'payments':
        funcs = this.tools.stellarApiServers.map(serverApi => async () => {
          const result = await serverApi
            .payments()
            // Embed each operation's transaction, so reading its fee and
            // memo doesn't need a request per operation:
            .join('transactions')
            .limit(TX_QUERY_PAGING_LIMIT)
            .cursor(this.otherData.lastPagingToken)
            .forAccount(params[0])
            .call()
          return { server: serverApi.serverURL.toString(), result }
        })
        out = await asyncWaterfall(funcs)
        break

      // Functions that should multicast to all servers
      case 'submitTransaction':
        out = await formatAggregateError(
          promiseAny(
            this.tools.stellarApiServers.map(async serverApi => {
              // @ts-expect-error
              const result = await serverApi[func](...params)
              return { server: serverApi.serverURL.toString(), result }
            })
          ),
          'Broadcast failed:'
        )
        break
    }
    this.log(`multicastServers ${func} ${out.server} won`)
    return out.result
  }

  async processTransaction(tx: StellarPaymentRecord): Promise<string> {
    const ourAddress = this.walletLocalData.publicKey
    const ourReceiveAddresses: string[] = []

    // The XLM this wallet gets and pays, before fees:
    let received = '0'
    let sent = '0'
    let fromAddress: string
    let toAddress: string
    switch (tx.type) {
      // Account creations are always XLM, so Horizon gives them no asset_type:
      case OperationResponseType.createAccount:
        fromAddress = tx.source_account
        toAddress = tx.account
        if (toAddress === ourAddress) received = tx.starting_balance
        if (fromAddress === ourAddress) sent = tx.starting_balance
        break
      case OperationResponseType.payment:
        // Skip token payments:
        if (tx.asset_type !== AssetType.native) return tx.paging_token
        fromAddress = tx.from
        toAddress = tx.to
        if (toAddress === ourAddress) received = tx.amount
        if (fromAddress === ourAddress) sent = tx.amount
        break
      // Path payments can deliver a different asset than they spend:
      case OperationResponseType.pathPayment:
      case OperationResponseType.pathPaymentStrictSend:
        fromAddress = tx.from
        toAddress = tx.to
        if (toAddress === ourAddress && tx.asset_type === AssetType.native) {
          received = tx.amount
        }
        if (
          fromAddress === ourAddress &&
          tx.source_asset_type === AssetType.native
        ) {
          sent = tx.source_amount
        }
        // Skip path payments that only move tokens:
        if (received === '0' && sent === '0') return tx.paging_token
        break
      default:
        return tx.paging_token
    }

    const date: number = Date.parse(tx.created_at) / 1000
    const denom = this.getDenomination(null)

    let rawTx: Horizon.ServerApi.TransactionRecord
    try {
      rawTx = await tx.transaction()
    } catch (e: any) {
      this.error(`processTransaction rawTx Error `, e)
      throw e
    }
    const networkFee = rawTx.fee_charged.toString()

    // Parse memos from the raw transaction if available
    const edgeMemos: EdgeMemo[] = []
    try {
      const memoType: string | undefined = rawTx.memo_type
      const memo: string | undefined = rawTx.memo
      const memoBytesB64: string | undefined = rawTx.memo_bytes

      switch (memoType) {
        case 'text': {
          if (memo != null && memo !== '') {
            edgeMemos.push({
              type: 'text',
              memoName: 'memo_text',
              value: memo
            })
          }
          break
        }
        case 'id': {
          if (memo != null && memo !== '') {
            edgeMemos.push({
              type: 'number',
              memoName: 'memo_id',
              value: memo
            })
          }
          break
        }
        case 'hash':
        case 'return': {
          // Horizon provides memo_bytes as base64 for hash/return types
          let hexValue: string | undefined
          try {
            if (memoBytesB64 != null) {
              const bytes = base64.parse(memoBytesB64)
              hexValue = base16.stringify(bytes).toLowerCase()
            } else if (memo != null && memo !== '') {
              const bytes = base64.parse(memo)
              hexValue = base16.stringify(bytes).toLowerCase()
            }
          } catch (e) {}
          if (hexValue != null && hexValue !== '') {
            // Align to defined memoOptions: only 'memo_hash' exists; store 'return' as memo_hash too
            edgeMemos.push({
              type: 'hex',
              memoName: 'memo_hash', // TODO: `memoName` needs to be passed to the GUI as an enum instead, so we can localize the memo name
              value: hexValue,
              hidden: true
            })
          }
          break
        }
      }
    } catch (e) {
      this.log.warn('XLM: processTransaction memo parsing error', e)
    }

    if (toAddress === ourAddress) ourReceiveAddresses.push(fromAddress)

    // The sender pays the fee:
    let nativeAmount = sub(
      mul(received, denom.multiplier),
      mul(sent, denom.multiplier)
    )
    if (fromAddress === ourAddress) nativeAmount = sub(nativeAmount, networkFee)

    const edgeTransaction: EdgeTransaction = {
      blockHeight: rawTx.ledger_attr > 0 ? rawTx.ledger_attr : 0, // API shows no ledger number ??
      currencyCode: this.currencyInfo.currencyCode,
      date,
      isSend: nativeAmount.startsWith('-'),
      memos: edgeMemos,
      nativeAmount,
      networkFee,
      networkFees: [],
      otherParams: {
        fromAddress,
        toAddress
      },
      ourReceiveAddresses,
      parentNetworkFee: '0',
      signedTx: '',
      tokenId: null,
      txid: tx.transaction_hash,
      walletId: this.walletId
    }

    if (edgeTransaction.blockHeight > this.tools.highestTxHeight) {
      this.tools.highestTxHeight = edgeTransaction.blockHeight
    }
    this.addTransaction(null, edgeTransaction)
    return tx.paging_token
  }

  // Streaming version. Doesn't work in RN
  // async checkTransactionsInnerLoop () {
  //   const address = this.walletLocalData.publicKey
  //   const txHandler = (tx) => {
  //     this.log('Got something:')
  //     this.processTransaction(tx)
  //   }
  //   let close
  //   const errorHandler = (e) => {
  //     if (close) {
  //       close()
  //       close = null
  //       this.checkTransactionsInnerLoop()
  //     }
  //   }
  //   close = this.stellarServer.payments()
  //     .forAccount(address)
  //     .limit(TX_QUERY_PAGING_LIMIT)
  //     .cursor(this.otherData.lastPagingToken)
  //     .stream({
  //       onmessage: txHandler,
  //       onerror: errorHandler
  //     })
  // }

  // Polling version
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  async checkTransactionsInnerLoop() {
    const blockHeight = this.walletLocalData.blockHeight

    const address = this.walletLocalData.publicKey
    let page
    let pagingToken
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    while (1) {
      try {
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
        if (!page) {
          page = await this.multicastServers('payments', address)
        } else {
          page = await page.next()
        }
        if (page.records.length === 0) {
          break
        }
        for (const tx of page.records) {
          pagingToken = await this.processTransaction(tx)
        }
      } catch (e: any) {
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
        if (e.response && e.response.title === 'Resource Missing') {
          this.log('Account not found. Probably not activated w/minimum XLM')
          this.syncTracker.updateHistoryRatio(null, 1)
        } else {
          this.error(
            'checkTransactionsInnerLoop Error fetching transaction info: ',
            e
          )
        }
        return
      }
    }
    this.sendTransactionEvents()
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (pagingToken) {
      this.otherData.lastPagingToken = pagingToken
      this.walletLocalDataDirty = true
    }
    this.walletLocalData.lastAddressQueryHeight = blockHeight
    this.syncTracker.updateHistoryRatio(null, 1)
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  async checkUnconfirmedTransactionsFetch() {}

  // Check all account balance and other relevant info
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  async checkAccountInnerLoop() {
    const address = this.walletLocalData.publicKey
    try {
      const account: Horizon.AccountResponse = await this.multicastServers(
        'loadAccount',
        address
      )
      if (account.sequence !== this.otherData.accountSequence) {
        this.otherData.accountSequence = account.sequence
      }
      for (const bal of account.balances) {
        if (bal.asset_type === AssetType.native) {
          this.log('--Got balances--')
        } else {
          // No token support yet
          continue
        }
        const denom = this.getDenomination(null)
        const nativeAmount = mul(bal.balance, denom.multiplier)
        this.updateBalance(null, nativeAmount)
      }
    } catch (e: any) {
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      if (e.response && e.response.title === 'Resource Missing') {
        this.log('Account not found. Probably not activated w/minimum XLM')
        this.syncTracker.updateBalanceRatio(null, 1)
      } else {
        this.error(`checkAccountInnerLoop Error fetching address info: `, e)
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  checkBlockchainInnerLoop() {
    this.multicastServers('ledgers')
      .then(r => {
        const blockHeight = r.records[0].sequence
        this.updateBlockHeight(blockHeight)
      })
      .catch(e => {
        this.error(`checkBlockchainInnerLoop Error `, e)
      })
  }

  async queryFee(): Promise<void> {
    try {
      const response: ReturnType<typeof asFeeStats> =
        await this.multicastServers('feeStats')
      const { p50, p70, p95 } = response.fee_charged
      this.fees = {
        low: parseInt(p50),
        standard: parseInt(p70),
        high: parseInt(p95)
      }
    } catch (e: any) {
      this.error(`queryFee Error `, e)
    }
  }

  async clearBlockchainCache(): Promise<void> {
    this.activatedAccountsCache = {}
    await super.clearBlockchainCache()
    this.otherData.accountSequence = '0'
  }

  // ****************************************************************************
  // Public methods
  // ****************************************************************************

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  async startEngine() {
    this.addToLoop('queryFee', BLOCKCHAIN_POLL_MILLISECONDS)
    this.addToLoop('checkBlockchainInnerLoop', BLOCKCHAIN_POLL_MILLISECONDS)
    this.addToLoop('checkAccountInnerLoop', ADDRESS_POLL_MILLISECONDS)
    this.addToLoop('checkTransactionsInnerLoop', TRANSACTION_POLL_MILLISECONDS)
    await super.startEngine()
  }

  async resyncBlockchain(): Promise<void> {
    await this.killEngine()
    await this.clearBlockchainCache()
    await this.startEngine()
  }

  async makeSpend(edgeSpendInfoIn: EdgeSpendInfo): Promise<EdgeTransaction> {
    const { edgeSpendInfo, currencyCode, nativeBalance, denom } =
      this.makeSpendCheck(edgeSpendInfoIn)
    const { memos = [], tokenId } = edgeSpendInfo

    if (edgeSpendInfo.spendTargets.length !== 1) {
      throw new Error('Error: only one output allowed')
    }
    const { publicAddress } = edgeSpendInfo.spendTargets[0]
    let { nativeAmount } = edgeSpendInfo.spendTargets[0]

    if (publicAddress == null)
      throw new Error('makeSpend Missing publicAddress')
    if (nativeAmount == null) throw new NoAmountSpecifiedError()

    // Check if destination address is activated
    let mustCreateAccount = false
    const activated = this.activatedAccountsCache[publicAddress]
    if (activated === undefined) {
      try {
        await this.multicastServers('loadAccount', publicAddress)
        this.activatedAccountsCache[publicAddress] = true
      } catch (e: any) {
        this.activatedAccountsCache[publicAddress] = false
        mustCreateAccount = true
      }
    } else if (!activated) {
      mustCreateAccount = true
    }

    if (eq(nativeAmount, '0')) {
      throw new NoAmountSpecifiedError()
    }

    const exchangeAmount = div(nativeAmount, denom.multiplier, 7)

    const account = new Account(
      this.walletLocalData.publicKey,
      this.otherData.accountSequence
    )

    const feeSetting =
      edgeSpendInfo.networkFeeOption !== undefined &&
      edgeSpendInfo.networkFeeOption !== 'custom'
        ? this.fees[edgeSpendInfo.networkFeeOption]
        : this.fees.standard

    // Transactions take the network passphrase and must declare timebounds;
    // TimeoutInfinite means no bounds:
    let txBuilder = new TransactionBuilder(account, {
      fee: String(feeSetting),
      networkPassphrase: NETWORK_PASSPHRASE
    }).setTimeout(TimeoutInfinite)

    if (mustCreateAccount) {
      txBuilder = txBuilder.addOperation(
        Operation.createAccount({
          destination: publicAddress,
          startingBalance: exchangeAmount
        })
      )
    } else {
      txBuilder = txBuilder.addOperation(
        Operation.payment({
          destination: publicAddress,
          asset: Asset.native(),
          amount: exchangeAmount
        })
      )
    }
    for (const memo of memos) {
      switch (memo.type) {
        case 'hex':
          txBuilder = txBuilder.addMemo(Memo.hash(memo.value))
          break
        case 'number':
          txBuilder = txBuilder.addMemo(Memo.id(memo.value))
          break
        case 'text':
          txBuilder = txBuilder.addMemo(Memo.text(memo.value))
          break
      }
    }
    const transaction = txBuilder.build()

    const networkFee = transaction.fee.toString()
    nativeAmount = add(networkFee, nativeAmount) // Add fee to total
    const nativeBalance2 = sub(nativeBalance, this.networkInfo.baseReserve) // Subtract the 1 min XLM
    if (gt(nativeAmount, nativeBalance2)) {
      throw new InsufficientFundsError({ tokenId })
    }

    nativeAmount = `-${nativeAmount}`
    const edgeTransaction: EdgeTransaction = {
      blockHeight: 0, // blockHeight
      currencyCode, // currencyCode
      date: 0, // date
      isSend: nativeAmount.startsWith('-'),
      memos,
      nativeAmount, // nativeAmount
      networkFee, // networkFee
      networkFees: [],
      otherParams: {
        fromAddress: this.walletLocalData.publicKey,
        toAddress: publicAddress,
        unsignedTx: transaction.toXdr()
      },
      ourReceiveAddresses: [], // ourReceiveAddresses
      signedTx: '', // signedTx
      tokenId,
      txid: '', // txid
      walletId: this.walletId
    }

    this.warn('Stellar transaction prepared')
    this.warn(
      `${nativeAmount} ${this.walletLocalData.publicKey} -> ${publicAddress}`
    )
    return edgeTransaction
  }

  async signTx(
    edgeTransaction: EdgeTransaction,
    privateKeys: JsonObject
  ): Promise<EdgeTransaction> {
    const stellarPrivateKeys = asStellarPrivateKeys(privateKeys)
    const otherParams = getOtherParams(edgeTransaction)

    const sendAmount = abs(
      add(edgeTransaction.nativeAmount, edgeTransaction.networkFee)
    )
    await this.checkRecipientMinimumBalance(
      this.getRecipientBalance,
      sendAmount,
      otherParams.toAddress
    )

    // Do signing
    try {
      const transaction = TransactionBuilder.fromXdr(
        otherParams.unsignedTx,
        NETWORK_PASSPHRASE
      )
      this.warn('Signing...')
      transaction.sign(Keypair.fromSecret(stellarPrivateKeys.stellarKey))
      edgeTransaction.signedTx = transaction.toXdr()
    } catch (e: any) {
      this.error(
        `FAILURE signTx\n${JSON.stringify(cleanTxLogs(edgeTransaction))} `,
        e
      )
      throw e
    }
    this.warn(`signTx\n${cleanTxLogs(edgeTransaction)}`)
    return edgeTransaction
  }

  async broadcastTx(
    edgeTransaction: EdgeTransaction
  ): Promise<EdgeTransaction> {
    const otherParams = getOtherParams(edgeTransaction)

    try {
      if (edgeTransaction.signedTx === '') {
        throw new Error('ErrorInvalidTransaction')
      }
      const transaction = TransactionBuilder.fromXdr(
        edgeTransaction.signedTx,
        NETWORK_PASSPHRASE
      )
      this.warn(`Broadcasting...\n${cleanTxLogs(edgeTransaction)}`)
      const result = await this.multicastServers(
        'submitTransaction',
        transaction
      )
      edgeTransaction.txid = result.hash
      edgeTransaction.date = Date.now() / 1000
      this.activatedAccountsCache[otherParams.toAddress] = true
      this.otherData.accountSequence = add(this.otherData.accountSequence, '1')
      this.walletLocalDataDirty = true
      this.warn(`SUCCESS broadcastTx\n${cleanTxLogs(edgeTransaction)}`)
    } catch (e: any) {
      this.error(
        `FAILURE broadcastTx\n${JSON.stringify(cleanTxLogs(edgeTransaction))} `,
        e
      )
      throw e
    }
    return edgeTransaction
  }
}

export async function makeCurrencyEngine(
  env: PluginEnvironment<StellarNetworkInfo>,
  tools: StellarTools,
  walletInfo: EdgeWalletInfo,
  opts: EdgeCurrencyEngineOptions
): Promise<EdgeCurrencyEngine> {
  const safeWalletInfo = asSafeStellarWalletInfo(walletInfo)
  const engine = new StellarEngine(env, tools, safeWalletInfo, opts)

  await engine.loadEngine()

  return engine
}
