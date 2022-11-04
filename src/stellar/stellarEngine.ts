/**
 * Created by paul on 7/7/17.
 */

import { add, div, eq, gt, mul, sub } from 'biggystring'
// import { currencyInfo } from './stellarInfo'
import {
  EdgeCurrencyEngineOptions,
  EdgeSpendInfo,
  EdgeTransaction,
  EdgeWalletInfo,
  InsufficientFundsError,
  NoAmountSpecifiedError
} from 'edge-core-js/types'

import { CurrencyEngine } from '../common/engine'
import {
  asyncWaterfall,
  cleanTxLogs,
  getDenomInfo,
  getOtherParams,
  promiseAny
} from '../common/utils'
import { StellarPlugin } from '../stellar/stellarPlugin'
import {
  asFeeStats,
  StellarAccount,
  StellarOperation,
  StellarTransaction,
  StellarWalletOtherData
} from './stellarTypes'

const TX_QUERY_PAGING_LIMIT = 2
const ADDRESS_POLL_MILLISECONDS = 15000
const BLOCKCHAIN_POLL_MILLISECONDS = 30000
const TRANSACTION_POLL_MILLISECONDS = 5000

const BASE_FEE = 100 // Stroops

type StellarServerFunction =
  | 'feeStats'
  | 'payments'
  | 'loadAccount'
  | 'ledgers'
  | 'submitTransaction'

export class StellarEngine extends CurrencyEngine<StellarPlugin> {
  stellarPlugin: StellarPlugin
  stellarApi: Object
  activatedAccountsCache: { [publicAddress: string]: boolean }
  pendingTransactionsIndex: number
  pendingTransactionsMap: { [index: number]: Object }
  fees: { low: number; standard: number; high: number }
  // @ts-expect-error
  otherData: StellarWalletOtherData

  constructor(
    currencyPlugin: StellarPlugin,
    walletInfo: EdgeWalletInfo,
    opts: EdgeCurrencyEngineOptions
  ) {
    super(currencyPlugin, walletInfo, opts)
    this.stellarPlugin = currencyPlugin
    this.stellarApi = {}
    this.activatedAccountsCache = {}
    this.pendingTransactionsIndex = 0
    this.pendingTransactionsMap = {}
    this.fees = { low: BASE_FEE, standard: BASE_FEE, high: BASE_FEE }
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
        funcs =
          this.currencyInfo.defaultSettings.otherSettings.stellarServers.map(
            (serverUrl: string) => async () => {
              const response = await fetch(`${serverUrl}/fee_stats`)
              const result = asFeeStats(await response.json())

              return { server: serverUrl, result }
            }
          )
        out = await asyncWaterfall(funcs)
        break

      case 'loadAccount':
        funcs = this.stellarPlugin.stellarApiServers.map(api => async () => {
          // @ts-expect-error
          const result = await api[func](...params)
          // @ts-expect-error
          return { server: api.serverName, result }
        })
        out = await asyncWaterfall(funcs)
        break

      case 'ledgers':
        funcs = this.stellarPlugin.stellarApiServers.map(
          serverApi => async () => {
            const result = await serverApi
              // @ts-expect-error
              .ledgers()
              .order('desc')
              .limit(1)
              .call()
            const blockHeight = result.records[0].sequence
            if (
              this.walletLocalData.blockHeight <= blockHeight &&
              blockHeight >= this.currencyPlugin.highestTxHeight
            ) {
              // @ts-expect-error
              return { server: serverApi.serverName, result }
            } else {
              throw new Error('Height out of date')
            }
          }
        )
        out = await asyncWaterfall(funcs)
        break

      case 'payments':
        funcs = this.stellarPlugin.stellarApiServers.map(
          serverApi => async () => {
            const result = await serverApi
              // @ts-expect-error
              .payments()
              .limit(TX_QUERY_PAGING_LIMIT)
              .cursor(this.otherData.lastPagingToken)
              .forAccount(...params)
              .call()
            // @ts-expect-error
            return { server: serverApi.serverName, result }
          }
        )
        out = await asyncWaterfall(funcs)
        break

      // Functions that should multicast to all servers
      case 'submitTransaction':
        out = await promiseAny(
          this.stellarPlugin.stellarApiServers.map(async serverApi => {
            // @ts-expect-error
            const result = await serverApi[func](...params)
            // @ts-expect-error
            return { server: serverApi.serverName, result }
          })
        )
        break
    }
    this.log(`multicastServers ${func} ${out.server} won`)
    return out.result
  }

  async processTransaction(tx: StellarOperation): Promise<string> {
    const ourReceiveAddresses: string[] = []

    let currencyCode = ''
    let exchangeAmount = ''
    let fromAddress = ''
    let toAddress, nativeAmount, networkFee
    if (tx.type === 'create_account') {
      fromAddress = tx.source_account
      toAddress = tx.account
      exchangeAmount = tx.starting_balance
      currencyCode = this.currencyInfo.currencyCode
    } else if (tx.type === 'payment') {
      fromAddress = tx.from
      toAddress = tx.to
      exchangeAmount = tx.amount
      if (tx.asset_type === 'native') {
        currencyCode = this.currencyInfo.currencyCode
      } else {
        currencyCode = tx.asset_type
      }
    }

    const date: number = Date.parse(tx.created_at) / 1000
    const denom = getDenomInfo(this.currencyInfo, currencyCode)
    // eslint-disable-next-line @typescript-eslint/prefer-optional-chain, @typescript-eslint/strict-boolean-expressions
    if (denom != null && denom.multiplier) {
      nativeAmount = mul(exchangeAmount, denom.multiplier)
    } else {
      throw new Error('ErrorDenomNotFound')
    }

    let rawTx: StellarTransaction
    try {
      rawTx = await tx.transaction()
      // @ts-expect-error
      networkFee = rawTx.fee_charged.toString()
    } catch (e: any) {
      this.error(`processTransaction rawTx Error `, e)
      throw e
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
      txid: tx.transaction_hash,
      date,
      currencyCode,
      blockHeight: rawTx.ledger_attr > 0 ? rawTx.ledger_attr : 0, // API shows no ledger number ??
      nativeAmount,
      networkFee,
      parentNetworkFee: '0',
      ourReceiveAddresses,
      signedTx: '',
      otherParams: {
        fromAddress,
        toAddress
      }
    }

    this.addTransaction(currencyCode, edgeTransaction)
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
          this.tokenCheckTransactionsStatus.XLM = 1
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
    if (this.transactionsChangedArray.length > 0) {
      this.currencyEngineCallbacks.onTransactionsChanged(
        this.transactionsChangedArray
      )
      this.transactionsChangedArray = []
    }
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (pagingToken) {
      this.otherData.lastPagingToken = pagingToken
      this.walletLocalDataDirty = true
    }
    this.walletLocalData.lastAddressQueryHeight = blockHeight
    this.tokenCheckTransactionsStatus.XLM = 1
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
        let currencyCode
        if (bal.asset_type === 'native') {
          currencyCode = this.currencyInfo.currencyCode
          this.log('--Got balances--')
        } else {
          currencyCode = bal.asset_type
        }
        const denom = getDenomInfo(this.currencyInfo, currencyCode)
        // eslint-disable-next-line @typescript-eslint/prefer-optional-chain, @typescript-eslint/strict-boolean-expressions
        if (denom != null && denom.multiplier) {
          const nativeAmount = mul(bal.balance, denom.multiplier)
          this.updateBalance(currencyCode, nativeAmount)
        }
      }
    } catch (e: any) {
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      if (e.response && e.response.title === 'Resource Missing') {
        this.log('Account not found. Probably not activated w/minimum XLM')
        this.tokenCheckBalanceStatus.XLM = 1
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
        if (this.walletLocalData.blockHeight !== blockHeight) {
          this.checkDroppedTransactionsThrottled()
          this.walletLocalData.blockHeight = blockHeight
          this.walletLocalDataDirty = true
          this.currencyEngineCallbacks.onBlockHeightChanged(
            this.walletLocalData.blockHeight
          )
        }
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
    this.engineOn = true
    this.addToLoop('queryFee', BLOCKCHAIN_POLL_MILLISECONDS).catch(() => {})
    this.addToLoop(
      'checkBlockchainInnerLoop',
      BLOCKCHAIN_POLL_MILLISECONDS
    ).catch(() => {})
    this.addToLoop('checkAccountInnerLoop', ADDRESS_POLL_MILLISECONDS).catch(
      () => {}
    )
    this.addToLoop(
      'checkTransactionsInnerLoop',
      TRANSACTION_POLL_MILLISECONDS
    ).catch(() => {})
    await super.startEngine()
  }

  async resyncBlockchain(): Promise<void> {
    await this.killEngine()
    await this.clearBlockchainCache()
    await this.startEngine()
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  async makeSpend(edgeSpendInfoIn: EdgeSpendInfo) {
    const { edgeSpendInfo, currencyCode, nativeBalance, denom } =
      this.makeSpendCheck(edgeSpendInfoIn)

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

    // @ts-expect-error
    const account = new this.stellarApi.Account(
      this.walletLocalData.publicKey,
      this.otherData.accountSequence
    )
    let memoId: string
    if (
      // eslint-disable-next-line @typescript-eslint/prefer-optional-chain
      edgeSpendInfo.spendTargets[0].otherParams != null &&
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      edgeSpendInfo.spendTargets[0].otherParams.uniqueIdentifier
    ) {
      memoId = edgeSpendInfo.spendTargets[0].otherParams.uniqueIdentifier
    }

    const feeSetting =
      edgeSpendInfo.networkFeeOption !== undefined &&
      edgeSpendInfo.networkFeeOption !== 'custom'
        ? this.fees[edgeSpendInfo.networkFeeOption]
        : BASE_FEE

    // @ts-expect-error
    const txBuilder = new this.stellarApi.TransactionBuilder(account, {
      fee: feeSetting
    })
    let transaction

    if (mustCreateAccount) {
      transaction = txBuilder.addOperation(
        // @ts-expect-error
        this.stellarApi.Operation.createAccount({
          destination: publicAddress,
          startingBalance: exchangeAmount
        })
      )
    } else {
      transaction = txBuilder.addOperation(
        // @ts-expect-error
        this.stellarApi.Operation.payment({
          destination: publicAddress,
          // @ts-expect-error
          asset: this.stellarApi.Asset.native(),
          amount: exchangeAmount
        })
      )
    }
    // @ts-expect-error
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (memoId) {
      // @ts-expect-error
      const memo = this.stellarApi.Memo.id(memoId)
      transaction = transaction.addMemo(memo)
    }
    transaction = transaction.build()

    const networkFee = transaction.fee.toString()
    nativeAmount = add(networkFee, nativeAmount) // Add fee to total
    const nativeBalance2 = sub(nativeBalance, '10000000') // Subtract the 1 min XLM
    if (gt(nativeAmount, nativeBalance2)) {
      throw new InsufficientFundsError()
    }

    nativeAmount = `-${nativeAmount}`
    const idInternal = this.pendingTransactionsIndex
    const edgeTransaction: EdgeTransaction = {
      txid: '', // txid
      date: 0, // date
      currencyCode, // currencyCode
      blockHeight: 0, // blockHeight
      nativeAmount, // nativeAmount
      networkFee, // networkFee
      ourReceiveAddresses: [], // ourReceiveAddresses
      signedTx: '', // signedTx
      otherParams: {
        idInternal,
        fromAddress: this.walletLocalData.publicKey,
        toAddress: publicAddress
      }
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

  async signTx(edgeTransaction: EdgeTransaction): Promise<EdgeTransaction> {
    const otherParams = getOtherParams(edgeTransaction)

    // Do signing
    try {
      const { idInternal } = otherParams
      const transaction = this.pendingTransactionsMap[idInternal]
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      if (!transaction) {
        throw new Error('ErrorInvalidTransaction')
      }
      this.warn('Signing...')
      // @ts-expect-error
      const keypair = this.stellarApi.Keypair.fromSecret(
        this.walletInfo.keys.stellarKey
      )
      // @ts-expect-error
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

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  getDisplayPrivateSeed() {
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-optional-chain
    if (this.walletInfo.keys && this.walletInfo.keys.stellarKey) {
      return this.walletInfo.keys.stellarKey
    }
    return ''
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  getDisplayPublicSeed() {
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-optional-chain
    if (this.walletInfo.keys && this.walletInfo.keys.publicKey) {
      return this.walletInfo.keys.publicKey
    }
    return ''
  }
}

export { CurrencyEngine }
