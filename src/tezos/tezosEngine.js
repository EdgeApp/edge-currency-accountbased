// @flow
import { bns } from 'biggystring'
import {
  type EdgeCurrencyEngineOptions,
  type EdgeSpendInfo,
  type EdgeTransaction,
  type EdgeWalletInfo,
  InsufficientFundsError,
  NoAmountSpecifiedError
} from 'edge-core-js/types'
import { eztz } from 'eztz.js'

import { CurrencyEngine } from '../common/engine.js'
import { asyncWaterfall, promiseAny, validateObject } from '../common/utils.js'
import { TezosPlugin } from '../tezos/tezosPlugin.js'
import { currencyInfo } from './tezosInfo.js'
import { XtzTransactionSchema } from './tezosSchema.js'
import {
  type HeadInfo,
  type OperationsContainer,
  type TezosOperation,
  type XtzGetTransaction
} from './tezosTypes.js'

const ADDRESS_POLL_MILLISECONDS = 15000
const BLOCKCHAIN_POLL_MILLISECONDS = 30000
const TRANSACTION_POLL_MILLISECONDS = 5000

const PRIMARY_CURRENCY = currencyInfo.currencyCode
type TezosFunction =
  | 'getHead'
  | 'getBalance'
  | 'getNumberOfOperations'
  | 'getTransactions'
  | 'createTransaction'
  | 'injectOperation'
  | 'silentInjection'

export class TezosEngine extends CurrencyEngine {
  tezosPlugin: TezosPlugin

  constructor (
    currencyPlugin: TezosPlugin,
    walletInfo: EdgeWalletInfo,
    opts: EdgeCurrencyEngineOptions
  ) {
    super(currencyPlugin, walletInfo, opts)
    this.tezosPlugin = currencyPlugin
  }

  async multicastServers (func: TezosFunction, ...params: any): Promise<any> {
    let out = { result: '', server: 'no server' }
    let funcs
    switch (func) {
      // Functions that should waterfall from top to low priority servers
      case 'getHead':
        funcs = this.tezosPlugin.tezosRpcNodes.map(server => async () => {
          const result = await this.io
            .fetch(server + '/chains/main/blocks/head/header')
            .then(function (response) {
              return response.json()
            })
            .then(function (json) {
              return json
            })
          return { server, result }
        })
        out = await asyncWaterfall(funcs)
        break
      case 'getBalance':
        funcs = this.tezosPlugin.tezosRpcNodes.map(server => async () => {
          eztz.node.setProvider(server)
          const result = await eztz.rpc.getBalance(params[0])
          return { server, result }
        })
        out = await asyncWaterfall(funcs)
        break
      case 'getNumberOfOperations':
        funcs = this.tezosPlugin.tezosApiServers.map(server => async () => {
          const result = await this.io
            .fetch(server + '/v3/number_operations/' + params[0])
            .then(function (response) {
              return response.json()
            })
            .then(function (json) {
              return json[0]
            })
          return { server, result }
        })
        out = await asyncWaterfall(funcs)
        break
      case 'getTransactions':
        funcs = this.tezosPlugin.tezosApiServers.map(server => async () => {
          const result: XtzGetTransaction = await this.io
            .fetch(
              server +
                '/v3/operations/' +
                params[0] +
                '?type=Transaction&p=' +
                params[1] +
                '&number=50'
            )
            .then(function (response) {
              return response.json()
            })
          return { server, result }
        })
        out = await asyncWaterfall(funcs)
        break
      case 'createTransaction':
        funcs = this.tezosPlugin.tezosRpcNodes.map(server => async () => {
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
            .then(function (response) {
              return response
            })
          return { server, result }
        })
        out = await asyncWaterfall(funcs)
        break
      // Functions that should multicast to all servers
      case 'injectOperation':
        let preApplyError = ''
        funcs = this.tezosPlugin.tezosRpcNodes.map(server => async () => {
          eztz.node.setProvider(server)
          const result = await eztz.rpc
            .inject(params[0], params[1])
            .catch((e: Error) => {
              this.log('Error when injection operation: ' + JSON.stringify(e))
              const errorMessage = this.formatError(e)
              if (!preApplyError && errorMessage !== '') {
                preApplyError = errorMessage
              }
              throw e
            })
          // Preapply passed -> Broadcast to all remaining nodes in the waterfall
          this.multicastServers('silentInjection', server, params[1])
          return { server, result }
        })
        out = await asyncWaterfall(funcs).catch((e: Error) => {
          this.log('Error from waterfall: ' + JSON.stringify(e))
          if (preApplyError !== '') {
            throw new Error(preApplyError)
          } else {
            throw e
          }
        })
        break
      case 'silentInjection':
        const index = this.tezosPlugin.tezosRpcNodes.indexOf(params[0])
        const remainingRpcNodes = this.tezosPlugin.tezosRpcNodes.slice(
          index + 1
        )
        out = await promiseAny(
          remainingRpcNodes.map(async server => {
            eztz.node.setProvider(server)
            const result = await eztz.rpc.silentInject(params[1])
            this.log('Injected silently to: ' + server)
            return { server, result }
          })
        )
        break
    }
    this.log(
      `XTZ multicastServers ${func} ${out.server} won with result ${out.result}`
    )
    return out.result
  }
  formatError (e: any): string {
    if (typeof e === 'string') {
      return e
    }
    try {
      if (
        e.error &&
        e.error === 'Operation Failed' &&
        e.errors &&
        e.errors[0].id
      ) {
        return 'Failed in preapply with an error code (' + e.errors[0].id + ')'
      } else if (e[0] && e[0].kind && e[0].kind === 'branch' && e[0].id) {
        return 'Failed in preapply with an error code (' + e[0].id + ')'
      }
    } catch (e) {}
    return ''
  }
  processTezosTransaction (tx: XtzGetTransaction) {
    const valid = validateObject(tx, XtzTransactionSchema)
    if (!valid) {
      this.log('Invalid transaction!')
      throw new Error('InvalidTransactionError')
    }
    const pkh = this.walletLocalData.publicKey
    const ourReceiveAddresses: Array<string> = []
    const currencyCode = PRIMARY_CURRENCY
    const date = new Date(tx.type.operations[0].timestamp).getTime() / 1000
    const blockHeight = tx.type.operations[0].op_level
    let nativeAmount = tx.type.operations[0].amount.toString()
    const networkFee = tx.type.operations[0].fee.toString()
    const failedOperation = tx.type.operations[0].failed
    if (pkh === tx.type.operations[0].destination.tz) {
      ourReceiveAddresses.push(pkh)
      if (tx.type.source.tz === pkh) {
        nativeAmount = '-' + networkFee
      }
    } else {
      nativeAmount = '-' + bns.add(nativeAmount, networkFee)
    }
    const edgeTransaction: EdgeTransaction = {
      txid: tx.hash,
      date,
      currencyCode,
      blockHeight,
      nativeAmount,
      networkFee,
      ourReceiveAddresses,
      signedTx: 'has_been_signed',
      otherParams: {}
    }
    if (!failedOperation) {
      this.addTransaction(currencyCode, edgeTransaction)
    }
  }

  async checkTransactionsInnerLoop () {
    const pkh = this.walletLocalData.publicKey
    if (!this.otherData.numberTransactions) {
      this.otherData.numberTransactions = 0
    }
    const num = await this.multicastServers('getNumberOfOperations', pkh)
    if (num !== this.otherData.numberTransactions) {
      let txs: Array<XtzGetTransaction> = []
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

  async checkUnconfirmedTransactionsFetch () {}

  // Check all account balance and other relevant info
  async checkAccountInnerLoop () {
    this.tokenCheckBalanceStatus.XTZ = 0
    const currencyCode = PRIMARY_CURRENCY
    const pkh = this.walletLocalData.publicKey
    if (
      typeof this.walletLocalData.totalBalances[currencyCode] === 'undefined'
    ) {
      this.walletLocalData.totalBalances[currencyCode] = '0'
    }
    const balance = await this.multicastServers('getBalance', pkh)
    if (this.walletLocalData.totalBalances[currencyCode] !== balance) {
      this.walletLocalData.totalBalances[currencyCode] = balance
      this.currencyEngineCallbacks.onBalanceChanged(currencyCode, balance)
    }
    this.tokenCheckBalanceStatus.XTZ = 1
  }
  async checkBlockchainInnerLoop () {
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

  async clearBlockchainCache (): Promise<void> {
    await super.clearBlockchainCache()
  }
  async isBurn (op: TezosOperation): Promise<boolean> {
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

  async startEngine () {
    this.engineOn = true
    this.addToLoop('checkBlockchainInnerLoop', BLOCKCHAIN_POLL_MILLISECONDS)
    this.addToLoop('checkAccountInnerLoop', ADDRESS_POLL_MILLISECONDS)
    this.addToLoop('checkTransactionsInnerLoop', TRANSACTION_POLL_MILLISECONDS)
    super.startEngine()
  }

  async resyncBlockchain (): Promise<void> {
    await this.killEngine()
    await this.clearBlockchainCache()
    await this.startEngine()
  }

  async makeSpend (edgeSpendInfoIn: EdgeSpendInfo) {
    const {
      edgeSpendInfo,
      currencyCode,
      nativeBalance,
      denom
    } = super.makeSpend(edgeSpendInfoIn)
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
    if (bns.eq(nativeAmount, '0')) {
      throw new NoAmountSpecifiedError()
    }
    const keys = {
      pk: this.walletInfo.keys.publicKeyEd,
      pkh: this.walletInfo.keys.publicKey,
      sk: false
    }
    const ops: OperationsContainer = await this.multicastServers(
      'createTransaction',
      keys.pkh,
      keys,
      publicAddress,
      bns.div(nativeAmount, denom.multiplier, 6),
      this.currencyInfo.defaultSettings.fee.transaction
    )
    let networkFee = '0'
    for (const operation of ops.opOb.contents) {
      networkFee = bns.add(networkFee, operation.fee)
      const burn = await this.isBurn(operation)
      if (burn) {
        networkFee = bns.add(
          networkFee,
          this.currencyInfo.defaultSettings.fee.burn
        )
      }
    }
    nativeAmount = bns.add(nativeAmount, networkFee)
    if (bns.gt(nativeAmount, nativeBalance)) {
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
      ourReceiveAddresses: [publicAddress],
      signedTx: '0',
      otherParams: {
        idInternal: 0,
        fromAddress: this.walletLocalData.publicKey,
        toAddress: publicAddress,
        fullOp: ops
      }
    }
    return edgeTransaction
  }

  async signTx (edgeTransaction: EdgeTransaction): Promise<EdgeTransaction> {
    if (edgeTransaction.signedTx === '0') {
      const sk = eztz.crypto.generateKeys(this.walletInfo.keys.mnemonic, '').sk
      const signed = eztz.crypto.sign(
        edgeTransaction.otherParams.fullOp.opbytes,
        sk,
        eztz.watermark.generic
      )
      edgeTransaction.otherParams.fullOp.opbytes = signed.sbytes
      edgeTransaction.otherParams.fullOp.opOb.signature = signed.edsig
      edgeTransaction.signedTx = '1'
    }
    return edgeTransaction
  }

  async broadcastTx (
    edgeTransaction: EdgeTransaction
  ): Promise<EdgeTransaction> {
    const opBytes = edgeTransaction.otherParams.fullOp.opbytes
    const opOb = edgeTransaction.otherParams.fullOp.opOb
    const result = await this.multicastServers('injectOperation', opOb, opBytes)
    edgeTransaction.txid = result.hash
    edgeTransaction.date = Date.now() / 1000
    return edgeTransaction
  }

  getDisplayPrivateSeed () {
    if (this.walletInfo.keys && this.walletInfo.keys.mnemonic) {
      return this.walletInfo.keys.mnemonic
    }
    return ''
  }

  getDisplayPublicSeed () {
    if (this.walletInfo.keys && this.walletInfo.keys.publicKey) {
      return this.walletInfo.keys.publicKey
    }
    return ''
  }
}

export { CurrencyEngine }
