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
import stellarApi, { Transaction } from 'stellar-sdk'

import { CurrencyEngine } from '../common/CurrencyEngine'
import { PluginEnvironment } from '../common/innerPlugin'
import { getRandomDelayMs } from '../common/network'
import {
  asyncWaterfall,
  formatAggregateError,
  promiseAny
} from '../common/promiseUtils'
import { cleanTxLogs, getFetchCors, getOtherParams } from '../common/utils'
import { StellarTools } from './StellarTools'
import {
  asFeeStats,
  asSafeStellarWalletInfo,
  asStellarPrivateKeys,
  asStellarWalletOtherData,
  SafeStellarWalletInfo,
  StellarAccount,
  StellarNetworkInfo,
  StellarOperation,
  StellarTransaction,
  StellarWalletOtherData
} from './stellarTypes'

const TX_QUERY_PAGING_LIMIT = 2
const ADDRESS_POLL_MILLISECONDS = getRandomDelayMs(20000)
const BLOCKCHAIN_POLL_MILLISECONDS = getRandomDelayMs(20000)
const TRANSACTION_POLL_MILLISECONDS = getRandomDelayMs(20000)

const BASE_FEE = 100 // Stroops

type StellarServerFunction =
  | 'feeStats'
  | 'payments'
  | 'loadAccount'
  | 'ledgers'
  | 'submitTransaction'

export class StellarEngine extends CurrencyEngine<
  StellarTools,
  SafeStellarWalletInfo
> {
  networkInfo: StellarNetworkInfo
  fetchCors: EdgeFetchFunction
  activatedAccountsCache: { [publicAddress: string]: boolean }
  pendingTransactionsIndex: number
  pendingTransactionsMap: { [index: number]: Transaction }
  fees: { low: number; standard: number; high: number }
  otherData!: StellarWalletOtherData

  constructor(
    env: PluginEnvironment<StellarNetworkInfo>,
    tools: StellarTools,
    walletInfo: SafeStellarWalletInfo,
    opts: EdgeCurrencyEngineOptions
  ) {
    super(env, tools, walletInfo, opts)
    this.networkInfo = env.networkInfo
    this.fetchCors = getFetchCors(env.io)
    this.activatedAccountsCache = {}
    this.pendingTransactionsIndex = 0
    this.pendingTransactionsMap = {}
    this.fees = { low: BASE_FEE, standard: BASE_FEE, high: BASE_FEE }
    this.minimumAddressBalance = this.networkInfo.baseReserve
  }

  setOtherData(raw: any): void {
    this.otherData = asStellarWalletOtherData(raw)
  }

  getRecipientBalance = async (recipient: string): Promise<string> => {
    try {
      const account: StellarAccount = await this.multicastServers(
        'loadAccount',
        recipient
      )
      const balanceObj = account.balances.find(
        bal => bal.asset_type === 'native'
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
    let out = { result: '', server: '' }
    let funcs
    switch (func) {
      // Functions that should waterfall from top to low priority servers
      case 'feeStats':
        funcs = this.networkInfo.stellarServers.map(
          (serverUrl: string) => async () => {
            const response = await this.fetchCors(`${serverUrl}/fee_stats`)
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
          return { server: api.serverName, result }
        })
        out = await asyncWaterfall(funcs)
        break

      case 'ledgers':
        funcs = this.tools.stellarApiServers.map(serverApi => async () => {
          const result = await serverApi
            // @ts-expect-error
            .ledgers()
            .order('desc')
            .limit(1)
            .call()
          const blockHeight = result.records[0].sequence
          if (
            this.walletLocalData.blockHeight <= blockHeight &&
            this.tools.highestTxHeight <= blockHeight
          ) {
            return { server: serverApi.serverName, result }
          } else {
            throw new Error('Height out of date')
          }
        })
        out = await asyncWaterfall(funcs)
        break

      case 'payments':
        funcs = this.tools.stellarApiServers.map(serverApi => async () => {
          const result = await serverApi
            // @ts-expect-error
            .payments()
            .limit(TX_QUERY_PAGING_LIMIT)
            .cursor(this.otherData.lastPagingToken)
            .forAccount(...params)
            .call()
          return { server: serverApi.serverName, result }
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
              return { server: serverApi.serverName, result }
            })
          ),
          'Broadcast failed:'
        )
        break
    }
    this.log(`multicastServers ${func} ${out.server} won`)
    return out.result
  }

  async processTransaction(tx: StellarOperation): Promise<string> {
    if (tx.asset_type !== 'native') {
      return tx.paging_token
    }

    const ourReceiveAddresses: string[] = []

    let exchangeAmount = ''
    let fromAddress = ''
    let toAddress, networkFee
    if (tx.type === 'create_account') {
      fromAddress = tx.source_account
      toAddress = tx.account
      exchangeAmount = tx.starting_balance
    } else if (tx.type === 'payment') {
      fromAddress = tx.from
      toAddress = tx.to
      exchangeAmount = tx.amount
    }

    const date: number = Date.parse(tx.created_at) / 1000
    const denom = this.getDenomination(null)
    let nativeAmount = mul(exchangeAmount, denom.multiplier)

    let rawTx: StellarTransaction & {
      memo_type?: string
      memo?: string
      memo_bytes?: string
    }
    try {
      rawTx = await tx.transaction()
      // @ts-expect-error
      networkFee = rawTx.fee_charged.toString()
    } catch (e: any) {
      this.error(`processTransaction rawTx Error `, e)
      throw e
    }

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

    if (toAddress === this.walletLocalData.publicKey) {
      ourReceiveAddresses.push(fromAddress)
      if (fromAddress === this.walletLocalData.publicKey) {
        // This is a spend to self. Make fee the only amount
        // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
        nativeAmount = '-' + networkFee
      }
    } else {
      // This is a spend. Include fee in amount and make amount negative
      nativeAmount = add(nativeAmount, networkFee)
      nativeAmount = '-' + nativeAmount
    }
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
          this.tokenCheckTransactionsStatus.set(null, 1)
          this.updateOnAddressesChecked()
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
    this.tokenCheckTransactionsStatus.set(null, 1)
    this.updateOnAddressesChecked()
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  async checkUnconfirmedTransactionsFetch() {}

  // Check all account balance and other relevant info
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  async checkAccountInnerLoop() {
    const address = this.walletLocalData.publicKey
    try {
      const account: StellarAccount = await this.multicastServers(
        'loadAccount',
        address
      )
      if (account.sequence !== this.otherData.accountSequence) {
        this.otherData.accountSequence = account.sequence
      }
      for (const bal of account.balances) {
        if (bal.asset_type === 'native') {
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
        this.tokenCheckBalanceStatus.set(null, 1)
        this.updateOnAddressesChecked()
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
    this.pendingTransactionsIndex = 0
    this.pendingTransactionsMap = {}
    await super.clearBlockchainCache()
    this.otherData.accountSequence = 0
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

    const account = new stellarApi.Account(
      this.walletLocalData.publicKey,
      this.otherData.accountSequence
    )

    const feeSetting =
      edgeSpendInfo.networkFeeOption !== undefined &&
      edgeSpendInfo.networkFeeOption !== 'custom'
        ? this.fees[edgeSpendInfo.networkFeeOption]
        : this.fees.standard

    let txBuilder = new stellarApi.TransactionBuilder(account, {
      fee: feeSetting
    })

    if (mustCreateAccount) {
      txBuilder = txBuilder.addOperation(
        stellarApi.Operation.createAccount({
          destination: publicAddress,
          startingBalance: exchangeAmount
        })
      )
    } else {
      txBuilder = txBuilder.addOperation(
        stellarApi.Operation.payment({
          destination: publicAddress,
          asset: stellarApi.Asset.native(),
          amount: exchangeAmount
        })
      )
    }
    for (const memo of memos) {
      switch (memo.type) {
        case 'hex':
          txBuilder = txBuilder.addMemo(stellarApi.Memo.hash(memo.value))
          break
        case 'number':
          txBuilder = txBuilder.addMemo(stellarApi.Memo.id(memo.value))
          break
        case 'text':
          txBuilder = txBuilder.addMemo(stellarApi.Memo.text(memo.value))
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
    const idInternal = this.pendingTransactionsIndex
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
        idInternal,
        fromAddress: this.walletLocalData.publicKey,
        toAddress: publicAddress
      },
      ourReceiveAddresses: [], // ourReceiveAddresses
      signedTx: '', // signedTx
      tokenId,
      txid: '', // txid
      walletId: this.walletId
    }
    this.pendingTransactionsMap[idInternal] = transaction
    this.pendingTransactionsIndex++

    // Clean up old pendingTransactions
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (this.pendingTransactionsMap[this.pendingTransactionsIndex - 20]) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete this.pendingTransactionsMap[this.pendingTransactionsIndex - 20]
    }

    this.warn('Stellar transaction prepared')
    this.warn(`idInternal: ${idInternal}`)
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
      const { idInternal } = otherParams
      const transaction = this.pendingTransactionsMap[idInternal]
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      if (!transaction) {
        throw new Error('ErrorInvalidTransaction')
      }
      this.warn('Signing...')
      const keypair = stellarApi.Keypair.fromSecret(
        stellarPrivateKeys.stellarKey
      )
      await transaction.sign(keypair)
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
      const { idInternal } = otherParams
      const transaction = this.pendingTransactionsMap[idInternal]
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      if (!transaction) {
        throw new Error('ErrorInvalidTransaction')
      }
      this.warn(`Broadcasting...\n${cleanTxLogs(edgeTransaction)}`)
      const result = await this.multicastServers(
        'submitTransaction',
        transaction
      )
      edgeTransaction.txid = result.hash
      edgeTransaction.date = Date.now() / 1000
      this.activatedAccountsCache[otherParams.toAddress] = true
      this.otherData.accountSequence++
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
