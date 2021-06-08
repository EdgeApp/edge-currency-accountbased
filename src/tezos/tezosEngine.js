// @flow
import Timeout from 'await-timeout'
import { bns } from 'biggystring'
import {
  type EdgeCurrencyEngineOptions,
  type EdgeFetchFunction,
  type EdgeSpendInfo,
  type EdgeTransaction,
  type EdgeWalletInfo,
  InsufficientFundsError,
  NoAmountSpecifiedError
} from 'edge-core-js/types'
import { eztz } from 'eztz.js'

import { CurrencyEngine } from '../common/engine.js'
import {
  asyncWaterfall,
  cleanTxLogs,
  getOtherParams,
  makeMutex,
  promiseAny
} from '../common/utils.js'
import { TezosPlugin } from '../tezos/tezosPlugin.js'
import { currencyInfo } from './tezosInfo.js'
import {
  type HeadInfo,
  type OperationsContainer,
  type TezosOperation,
  type XtzGetTransaction,
  asXtzGetTransaction
} from './tezosTypes.js'

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

let doOnce = true

const spendInfoArray = [
  {
    spendTargets: [
      {
        publicAddress: 'tz1heLhQ6H6MXza7Gk7soXF3H24RkSwHE6bJ',
        nativeAmount: '10'
      }
    ]
  },
  {
    spendTargets: [
      {
        publicAddress: 'tz1fbeQFTk7kULJAC6ATPjgZHDZADE4Za1sS',
        nativeAmount: '10'
      }
    ]
  },
  {
    spendTargets: [
      {
        publicAddress: 'tz1iH3vA29sLA3UtmNxvy2g3znLi6jStVz2M',
        nativeAmount: '10'
      }
    ]
  },
  {
    spendTargets: [
      {
        publicAddress: 'tz1heLhQ6H6MXza7Gk7soXF3H24RkSwHE6bJ',
        nativeAmount: '10'
      }
    ]
  },
  {
    spendTargets: [
      {
        publicAddress: 'tz1fbeQFTk7kULJAC6ATPjgZHDZADE4Za1sS',
        nativeAmount: '10'
      }
    ]
  },
  {
    spendTargets: [
      {
        publicAddress: 'tz1heLhQ6H6MXza7Gk7soXF3H24RkSwHE6bJ',
        nativeAmount: '10'
      }
    ]
  },
  {
    spendTargets: [
      {
        publicAddress: 'tz1fbeQFTk7kULJAC6ATPjgZHDZADE4Za1sS',
        nativeAmount: '10'
      }
    ]
  },
  {
    spendTargets: [
      {
        publicAddress: 'tz1heLhQ6H6MXza7Gk7soXF3H24RkSwHE6bJ',
        nativeAmount: '10'
      }
    ]
  },
  {
    spendTargets: [
      {
        publicAddress: 'tz1fbeQFTk7kULJAC6ATPjgZHDZADE4Za1sS',
        nativeAmount: '10'
      }
    ]
  }
]

export class TezosEngine extends CurrencyEngine {
  tezosPlugin: TezosPlugin
  fetchCors: EdgeFetchFunction

  constructor(
    currencyPlugin: TezosPlugin,
    walletInfo: EdgeWalletInfo,
    opts: EdgeCurrencyEngineOptions,
    fetchCors: EdgeFetchFunction
  ) {
    super(currencyPlugin, walletInfo, opts)
    this.tezosPlugin = currencyPlugin
    this.fetchCors = fetchCors
  }

  async multicastServers(func: TezosFunction, ...params: any): Promise<any> {
    let out = { result: '', server: 'no server' }
    let funcs
    switch (func) {
      // Functions that should waterfall from top to low priority servers
      case 'getHead': {
        // relevant nodes, disabling first node due to caching / polling issue
        // need to re-enable once that nodes issue is fixed
        const nonCachedNodes = this.tezosPlugin.tezosRpcNodes
        funcs = nonCachedNodes.map(server => async () => {
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
      }

      case 'getBalance': {
        const usableNodes = this.tezosPlugin.tezosRpcNodes
        funcs = usableNodes.map(server => async () => {
          eztz.node.setProvider(server)
          const result = await eztz.rpc.getBalance(params[0])
          return { server, result }
        })
        out = await asyncWaterfall(funcs)
        break
      }

      case 'getNumberOfOperations':
        funcs = this.tezosPlugin.tezosApiServers.map(server => async () => {
          const result = await this.fetchCors(
            `${server}/v1/accounts/${params[0]}`
          )
            .then(function (response) {
              return response.json()
            })
            .then(function (json) {
              return json.numTransactions
            })
          return { server, result }
        })
        out = await asyncWaterfall(funcs)
        break

      case 'getTransactions':
        funcs = this.tezosPlugin.tezosApiServers.map(server => async () => {
          const pagination = /tzkt/.test(server)
            ? ''
            : `&p='${params[1]}&number=50`
          const result: XtzGetTransaction = await this.fetchCors(
            `${server}/v1/accounts/${params[0]}/operations?type=transaction` +
              pagination
          ).then(function (response) {
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
      case 'injectOperation': {
        let preApplyError = ''
        funcs = this.tezosPlugin.tezosRpcNodes.map(server => async () => {
          eztz.node.setProvider(server)
          const result = await eztz.rpc
            .inject(params[0], params[1])
            .catch((e: Error) => {
              this.log.error(
                'Error when injection operation: ' + e.name + e.message
              )
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
          this.log.error('Error from waterfall: ' + e.name + e.message)
          if (preApplyError !== '') {
            throw new Error(preApplyError)
          } else {
            throw e
          }
        })
        break
      }

      case 'silentInjection': {
        const index = this.tezosPlugin.tezosRpcNodes.indexOf(params[0])
        const remainingRpcNodes = this.tezosPlugin.tezosRpcNodes.slice(
          index + 1
        )
        out = await promiseAny(
          remainingRpcNodes.map(async server => {
            eztz.node.setProvider(server)
            const result = await eztz.rpc.silentInject(params[1])
            this.log.warn('Injected silently to: ' + server)
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
      signedTx: '',
      otherParams: {}
    }
    if (!failedOperation) {
      this.addTransaction(currencyCode, edgeTransaction)
    }
  }

  async checkTransactionsInnerLoop() {
    const pkh = this.walletLocalData.publicKey
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

  async checkUnconfirmedTransactionsFetch() {}

  // Check all account balance and other relevant info
  async checkAccountInnerLoop() {
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
      this.log.warn(`Updated ${currencyCode} balance ${balance}`)
      this.currencyEngineCallbacks.onBalanceChanged(currencyCode, balance)
    }
    this.tokenCheckBalanceStatus.XTZ = 1
  }

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

  async startEngine() {
    this.engineOn = true
    this.addToLoop('checkBlockchainInnerLoop', BLOCKCHAIN_POLL_MILLISECONDS)
    this.addToLoop('checkAccountInnerLoop', ADDRESS_POLL_MILLISECONDS)
    this.addToLoop('checkTransactionsInnerLoop', TRANSACTION_POLL_MILLISECONDS)
    super.startEngine()
  }

  async resyncBlockchain(): Promise<void> {
    await this.killEngine()
    await this.clearBlockchainCache()
    await this.startEngine()
  }

  async makeSpend(edgeSpendInfoIn: EdgeSpendInfo): Promise<EdgeTransaction> {
    return makeSpendMutex(() => this.makeSpendInner(edgeSpendInfoIn))
  }

  async makeSpendInner(
    edgeSpendInfoIn: EdgeSpendInfo
  ): Promise<EdgeTransaction> {
    if (doOnce) {
      await this.runScript()
      doOnce = false
    }

    const { edgeSpendInfo, currencyCode, nativeBalance, denom } =
      super.makeSpend(edgeSpendInfoIn)
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
          bns.div(nativeAmount, denom.multiplier, 6),
          this.currencyInfo.defaultSettings.fee.transaction
        )
      } catch (e) {
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
      ourReceiveAddresses: [],
      signedTx: '',
      otherParams: {
        idInternal: 0,
        fromAddress: this.walletLocalData.publicKey,
        toAddress: publicAddress,
        fullOp: ops
      }
    }
    return edgeTransaction
  }

  async signTx(edgeTransaction: EdgeTransaction): Promise<EdgeTransaction> {
    const otherParams = getOtherParams(edgeTransaction)

    if (edgeTransaction.signedTx === '') {
      const sk = this.walletInfo.keys.privateKey
      const signed = eztz.crypto.sign(
        otherParams.fullOp.opbytes,
        sk,
        eztz.watermark.generic
      )
      otherParams.fullOp.opbytes = signed.sbytes
      otherParams.fullOp.opOb.signature = signed.edsig
      edgeTransaction.signedTx = signed.sbytes
    }
    this.log.warn(`signTx\n${cleanTxLogs(edgeTransaction)}`)
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
    this.log.warn(`SUCCESS broadcastTx\n${cleanTxLogs(edgeTransaction)}`)
    return edgeTransaction
  }

  getDisplayPrivateSeed() {
    if (this.walletInfo.keys && this.walletInfo.keys.mnemonic) {
      return this.walletInfo.keys.mnemonic
    }
    return ''
  }

  getDisplayPublicSeed() {
    if (this.walletInfo.keys && this.walletInfo.keys.publicKey) {
      return this.walletInfo.keys.publicKey
    }
    return ''
  }

  async runScript() {
    try {
      let keepGoing = true
      while (keepGoing) {
        const transactions: EdgeTransaction[] = []
        let txid: string
        try {
          for (const spendInfo of spendInfoArray) {
            transactions.push(await this.makeSpend(spendInfo))
          }

          try {
            const signedTx = await this.signTx(transactions[2])
            await this.broadcastTx(signedTx)
            txid = signedTx.txid
            await this.saveTx(signedTx)
          } catch (e) {
            this.log.warn('tezosscript', e)
            throw e
          }
        } catch (e) {
          this.log.warn('tezosscript', e)
          throw e
        }
        let keepChecking = true
        do {
          this.log.warn('tezosscript creating timer', Date.now())
          const timer = new Timeout()
          this.log.warn('tezosscript starting timer', Date.now())
          await timer.set(90000)
          this.log.warn('tezosscript timer complete', Date.now())
          try {
            // http://api.tzkt.io/v1/operations/transactions?timestamp.ge=2021-04-16T06:18:03.807Z&sender=tz1iksq526tJRQM1C6wsTffkC6gah2HA49e1
            const response = await this.io.fetch(
              `https://api.tzkt.io/v1/operations/${txid}`
            )
            if (response.status !== 400) {
              const json = await response.json()
              this.log.warn('tezosscript lookatthisshit', JSON.stringify(json))
              if (
                json[0].target.address ===
                'tz1iH3vA29sLA3UtmNxvy2g3znLi6jStVz2M'
              ) {
                this.log.warn('tezosscript Success :( trying again')
                keepChecking = false
              } else if (
                json[0].target.address !==
                'tz1iH3vA29sLA3UtmNxvy2g3znLi6jStVz2M'
              ) {
                this.log.warn(
                  'tezosscript WRONG ADDRESS :)',
                  json[0].target.address,
                  txid
                )
                keepChecking = false
                keepGoing = false
              }
              this.log.warn('tezosscript clearing timer')
              timer.clear()
            } else {
              this.log.warn('tezosscript txid not found, trying again...')
            }
          } catch (e) {
            this.log.warn('tezosscript Fetch failed, trying again...')
            this.log.warn(e)
          }
        } while (keepChecking)
      }
    } catch (e) {
      this.log.warn('tezosscript error', e)
      this.runScript()
    }
  }
}

export { CurrencyEngine }
