import { add, div, eq, gt } from 'biggystring'
import {
  EdgeCurrencyEngine,
  EdgeCurrencyEngineOptions,
  EdgeFetchFunction,
  EdgeSpendInfo,
  EdgeTransaction,
  EdgeWalletInfo,
  InsufficientFundsError,
  NoAmountSpecifiedError
} from 'edge-core-js/types'
import { eztz } from 'eztz.js'

import { CurrencyEngine } from '../common/engine'
import { PluginEnvironment } from '../common/innerPlugin'
import { PublicKeys } from '../common/types'
import {
  asyncWaterfall,
  cleanTxLogs,
  getFetchCors,
  getOtherParams,
  makeMutex,
  promiseAny
} from '../common/utils'
import { TezosTools } from '../tezos/tezosPlugin'
import { currencyInfo } from './tezosInfo'
import {
  asTezosWalletOtherData,
  asXtzGetTransaction,
  HeadInfo,
  OperationsContainer,
  TezosOperation,
  TezosWalletOtherData,
  XtzGetTransaction
} from './tezosTypes'

const ADDRESS_POLL_MILLISECONDS = 15000
const BLOCKCHAIN_POLL_MILLISECONDS = 30000
const TRANSACTION_POLL_MILLISECONDS = 5000

const makeSpendMutex = makeMutex()

const PRIMARY_CURRENCY = currencyInfo.currencyCode
type TezosFunction =
  | 'getHead'
  | 'getBalance'
  | 'getNumberOfOperations'
  | 'getTransactions'
  | 'createTransaction'
  | 'injectOperation'
  | 'silentInjection'

export class TezosEngine extends CurrencyEngine<TezosTools> {
  fetchCors: EdgeFetchFunction
  otherData!: TezosWalletOtherData

  constructor(
    env: PluginEnvironment<{}>,
    tools: TezosTools,
    publicKeys: PublicKeys,
    opts: EdgeCurrencyEngineOptions
  ) {
    super(env, tools, publicKeys, opts)
    const fetchCors = getFetchCors(env)
    this.fetchCors = fetchCors
  }

  setOtherData(raw: any): void {
    this.otherData = asTezosWalletOtherData(raw)
  }

  async multicastServers(func: TezosFunction, ...params: any): Promise<any> {
    let out = { result: '', server: 'no server' }
    let funcs
    switch (func) {
      // Functions that should waterfall from top to low priority servers
      case 'getHead': {
        // relevant nodes, disabling first node due to caching / polling issue
        // need to re-enable once that nodes issue is fixed
        const nonCachedNodes = this.tools.tezosRpcNodes
        funcs = nonCachedNodes.map(server => async () => {
          const result = await this.io
            // eslint-disable-next-line @typescript-eslint/restrict-plus-operands, @typescript-eslint/no-base-to-string
            .fetch(server + '/chains/main/blocks/head/header')
            .then(async function (response) {
              return await response.json()
            })
            .then(function (json) {
              return json
            })
          return { server, result }
        })
        out = await asyncWaterfall(funcs)
        break
      }

      case 'getBalance': {
        const usableNodes = this.tools.tezosRpcNodes
        funcs = usableNodes.map(server => async () => {
          eztz.node.setProvider(server)
          const result = await eztz.rpc.getBalance(params[0])
          return { server, result }
        })
        out = await asyncWaterfall(funcs)
        break
      }

      case 'getNumberOfOperations':
        funcs = this.tools.tezosApiServers.map(server => async () => {
          const result = await this.fetchCors(
            // eslint-disable-next-line @typescript-eslint/no-base-to-string
            `${server}/v1/accounts/${params[0]}`
          )
            .then(async function (response) {
              return await response.json()
            })
            .then(function (json) {
              return json.numTransactions
            })
          return { server, result }
        })
        out = await asyncWaterfall(funcs)
        break

      case 'getTransactions':
        funcs = this.tools.tezosApiServers.map(server => async () => {
          // @ts-expect-error
          const pagination = /tzkt/.test(server)
            ? ''
            : `&p='${params[1]}&number=50`
          const result: XtzGetTransaction = await this.fetchCors(
            // eslint-disable-next-line @typescript-eslint/no-base-to-string
            `${server}/v1/accounts/${params[0]}/operations?type=transaction` +
              pagination
          ).then(async function (response) {
            return await response.json()
          })
          return { server, result }
        })
        out = await asyncWaterfall(funcs)
        break

      case 'createTransaction':
        funcs = this.tools.tezosRpcNodes.map(server => async () => {
          eztz.node.setProvider(server)
          const result = await eztz.rpc
            .transfer(
              params[0],
              params[1],
              params[2],
              params[3],
              params[4],
              null,
              this.currencyInfo.defaultSettings.limit.gas,
              this.currencyInfo.defaultSettings.limit.storage,
              this.currencyInfo.defaultSettings.fee.reveal
            )
            // @ts-expect-error
            .then(function (response) {
              return response
            })
          return { server, result }
        })
        out = await asyncWaterfall(funcs)
        break

      // Functions that should multicast to all servers
      case 'injectOperation': {
        let preApplyError = ''
        funcs = this.tools.tezosRpcNodes.map(server => async () => {
          eztz.node.setProvider(server)
          const result = await eztz.rpc
            .inject(params[0], params[1])
            .catch((e: Error) => {
              this.error('Error when injection operation: ', e)
              const errorMessage = this.formatError(e)
              // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
              if (!preApplyError && errorMessage !== '') {
                preApplyError = errorMessage
              }
              throw e
            })
          // Preapply passed -> Broadcast to all remaining nodes in the waterfall
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          this.multicastServers('silentInjection', server, params[1])
          return { server, result }
        })
        out = await asyncWaterfall(funcs).catch((e: Error) => {
          this.error('Error from waterfall: ', e)
          if (preApplyError !== '') {
            throw new Error(preApplyError)
          } else {
            throw e
          }
        })
        break
      }

      case 'silentInjection': {
        const index = this.tools.tezosRpcNodes.indexOf(params[0])
        const remainingRpcNodes = this.tools.tezosRpcNodes.slice(index + 1)
        out = await promiseAny(
          remainingRpcNodes.map(async server => {
            eztz.node.setProvider(server)
            const result = await eztz.rpc.silentInject(params[1])
            // eslint-disable-next-line @typescript-eslint/no-base-to-string
            this.warn(`Injected silently to: ${server}`)
            return { server, result }
          })
        )
        break
      }
    }
    this.log(
      `XTZ multicastServers ${func} ${out.server} won with result ${out.result}`
    )
    return out.result
  }

  formatError(e: any): string {
    if (typeof e === 'string') {
      return e
    }
    try {
      if (
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
        e.error &&
        e.error === 'Operation Failed' &&
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
        e.errors &&
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
        e.errors[0].id
      ) {
        // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
        return 'Failed in preapply with an error code (' + e.errors[0].id + ')'
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-optional-chain
      } else if (e[0] && e[0].kind && e[0].kind === 'branch' && e[0].id) {
        // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
        return 'Failed in preapply with an error code (' + e[0].id + ')'
      }
    } catch (e: any) {}
    return ''
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  processTezosTransaction(tx: XtzGetTransaction) {
    const transaction = asXtzGetTransaction(tx)
    const pkh = this.walletLocalData.publicKey
    const ourReceiveAddresses: string[] = []
    const currencyCode = PRIMARY_CURRENCY
    const date = new Date(transaction.timestamp).getTime() / 1000
    const blockHeight = transaction.level
    let nativeAmount = transaction.amount.toString()
    const networkFee = (
      transaction.bakerFee + transaction.allocationFee
    ).toString()
    const failedOperation = transaction.status === 'failed'
    if (pkh === transaction.target.address) {
      ourReceiveAddresses.push(pkh)
      if (transaction.sender.address === pkh) {
        nativeAmount = '-' + networkFee
      }
    } else {
      nativeAmount = '-' + add(nativeAmount, networkFee)
    }
    const edgeTransaction: EdgeTransaction = {
      txid: tx.hash,
      date,
      currencyCode,
      blockHeight,
      nativeAmount,
      networkFee,
      ourReceiveAddresses,
      signedTx: '',
      otherParams: {},
      walletId: this.walletId
    }
    if (!failedOperation) {
      this.addTransaction(currencyCode, edgeTransaction)
    }
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  async checkTransactionsInnerLoop() {
    const pkh = this.walletLocalData.publicKey
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (!this.otherData.numberTransactions) {
      this.otherData.numberTransactions = 0
    }
    const num = await this.multicastServers('getNumberOfOperations', pkh)
    if (num !== this.otherData.numberTransactions) {
      let txs: XtzGetTransaction[] = []
      let page = 0
      let transactions
      this.tokenCheckTransactionsStatus.XTZ = 0.5
      do {
        transactions = await this.multicastServers(
          'getTransactions',
          pkh,
          page++
        )
        txs = txs.concat(transactions)
      } while (transactions.length > 0 && page < 10)
      for (const tx of txs) {
        this.processTezosTransaction(tx)
      }
      if (this.transactionsChangedArray.length > 0) {
        this.currencyEngineCallbacks.onTransactionsChanged(
          this.transactionsChangedArray
        )
        this.transactionsChangedArray = []
      }
      this.otherData.numberTransactions = num
      this.walletLocalDataDirty = true
    }
    this.tokenCheckTransactionsStatus.XTZ = 1
    this.updateOnAddressesChecked()
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  async checkUnconfirmedTransactionsFetch() {}

  // Check all account balance and other relevant info
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  async checkAccountInnerLoop() {
    const currencyCode = PRIMARY_CURRENCY
    const pkh = this.walletLocalData.publicKey
    if (
      typeof this.walletLocalData.totalBalances[currencyCode] === 'undefined'
    ) {
      this.walletLocalData.totalBalances[currencyCode] = '0'
    }
    const balance = await this.multicastServers('getBalance', pkh)
    this.updateBalance(currencyCode, balance)
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  async checkBlockchainInnerLoop() {
    const head: HeadInfo = await this.multicastServers('getHead')
    const blockHeight = head.level
    if (this.walletLocalData.blockHeight !== blockHeight) {
      this.walletLocalData.blockHeight = blockHeight
      this.walletLocalDataDirty = true
      this.currencyEngineCallbacks.onBlockHeightChanged(
        this.walletLocalData.blockHeight
      )
    }
  }

  async clearBlockchainCache(): Promise<void> {
    await super.clearBlockchainCache()
  }

  async isBurn(op: TezosOperation): Promise<boolean> {
    if (op.kind === 'origination') {
      return true
    }
    if (op.kind === 'transaction' && op.destination.slice(0, 2) === 'tz') {
      const balance = await this.multicastServers('getBalance', op.destination)
      if (balance === '0') {
        return true
      }
    }
    return false
  }
  // ****************************************************************************
  // Public methods
  // ****************************************************************************

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  async startEngine() {
    this.engineOn = true
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.addToLoop('checkBlockchainInnerLoop', BLOCKCHAIN_POLL_MILLISECONDS)
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.addToLoop('checkAccountInnerLoop', ADDRESS_POLL_MILLISECONDS)
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.addToLoop('checkTransactionsInnerLoop', TRANSACTION_POLL_MILLISECONDS)
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    super.startEngine()
  }

  async resyncBlockchain(): Promise<void> {
    await this.killEngine()
    await this.clearBlockchainCache()
    await this.startEngine()
  }

  async makeSpend(edgeSpendInfoIn: EdgeSpendInfo): Promise<EdgeTransaction> {
    return await makeSpendMutex(
      async () => await this.makeSpendInner(edgeSpendInfoIn)
    )
  }

  async makeSpendInner(
    edgeSpendInfoIn: EdgeSpendInfo
  ): Promise<EdgeTransaction> {
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

    if (eq(nativeAmount, '0')) {
      throw new NoAmountSpecifiedError()
    }
    const keys = {
      pk: this.publicKeys.keys.publicKeyEd,
      pkh: this.publicKeys.keys.publicKey,
      sk: false
    }
    let ops: OperationsContainer | typeof undefined
    let resendCounter = 0
    let error
    do {
      try {
        ops = await this.multicastServers(
          'createTransaction',
          keys.pkh,
          keys,
          publicAddress,
          div(nativeAmount, denom.multiplier, 6),
          this.currencyInfo.defaultSettings.fee.transaction
        )
      } catch (e: any) {
        error = e
      }
    } while (
      (typeof ops === 'undefined' || ops.opOb.contents.length > 2) &&
      resendCounter++ < 5
    )
    if (typeof ops === 'undefined') {
      throw error
    }
    let networkFee = '0'
    for (const operation of ops.opOb.contents) {
      networkFee = add(networkFee, operation.fee)
      const burn = await this.isBurn(operation)
      if (burn) {
        networkFee = add(networkFee, this.currencyInfo.defaultSettings.fee.burn)
      }
    }
    nativeAmount = add(nativeAmount, networkFee)
    if (gt(nativeAmount, nativeBalance)) {
      throw new InsufficientFundsError()
    }
    nativeAmount = '-' + nativeAmount

    const edgeTransaction: EdgeTransaction = {
      txid: '',
      date: 0,
      currencyCode,
      blockHeight: 0,
      nativeAmount,
      networkFee,
      ourReceiveAddresses: [],
      signedTx: '',
      otherParams: {
        idInternal: 0,
        fromAddress: this.walletLocalData.publicKey,
        toAddress: publicAddress,
        fullOp: ops
      },
      walletId: this.walletId
    }
    return edgeTransaction
  }

  async signTx(
    edgeTransaction: EdgeTransaction,
    walletInfo: EdgeWalletInfo
  ): Promise<EdgeTransaction> {
    const otherParams = getOtherParams(edgeTransaction)

    if (edgeTransaction.signedTx === '') {
      const sk = walletInfo.keys.privateKey
      const signed = eztz.crypto.sign(
        otherParams.fullOp.opbytes,
        sk,
        eztz.watermark.generic
      )
      otherParams.fullOp.opbytes = signed.sbytes
      otherParams.fullOp.opOb.signature = signed.edsig
      edgeTransaction.signedTx = signed.sbytes
    }
    this.warn(`signTx\n${cleanTxLogs(edgeTransaction)}`)
    return edgeTransaction
  }

  async broadcastTx(
    edgeTransaction: EdgeTransaction
  ): Promise<EdgeTransaction> {
    const otherParams = getOtherParams(edgeTransaction)

    const opBytes = otherParams.fullOp.opbytes
    const opOb = otherParams.fullOp.opOb
    const result = await this.multicastServers('injectOperation', opOb, opBytes)
    edgeTransaction.txid = result.hash
    edgeTransaction.date = Date.now() / 1000
    this.warn(`SUCCESS broadcastTx\n${cleanTxLogs(edgeTransaction)}`)
    return edgeTransaction
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  getDisplayPrivateSeed(walletInfo: EdgeWalletInfo) {
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-optional-chain
    if (walletInfo.keys && walletInfo.keys.mnemonic) {
      return walletInfo.keys.mnemonic
    }
    return ''
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  getDisplayPublicSeed() {
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-optional-chain
    if (this.publicKeys.keys && this.publicKeys.keys.publicKey) {
      return this.publicKeys.keys.publicKey
    }
    return ''
  }
}

export async function makeCurrencyEngine(
  env: PluginEnvironment<{}>,
  tools: TezosTools,
  publicKeys: PublicKeys,
  opts: EdgeCurrencyEngineOptions
): Promise<EdgeCurrencyEngine> {
  const engine = new TezosEngine(env, tools, publicKeys, opts)

  await engine.loadEngine(tools, publicKeys, opts)

  return engine
}
