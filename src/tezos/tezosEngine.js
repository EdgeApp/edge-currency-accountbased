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
  type EdgeStakingSettings,
  type HeadInfo,
  type OperationsContainer,
  type TezosKeyPair,
  type TezosOperation,
  type TezosWalletOtherData,
  type XtzGetOperation
} from './tezosTypes.js'

const ADDRESS_POLL_MILLISECONDS = 5000
const BLOCKCHAIN_POLL_MILLISECONDS = 30000
const TRANSACTION_POLL_MILLISECONDS = 15000
const DELEGATE_POLL_MILLISECONDS = 30000
const PAGE_SIZE = 50
const PRIMARY_CURRENCY = currencyInfo.currencyCode
type TezosFunction =
  | 'getHead'
  | 'getBalance'
  | 'getNumberOfOperations'
  | 'getOperations'
  | 'getDelegate'
  | 'createTransaction'
  | 'createOrigination'
  | 'createDelegation'
  | 'injectOperation'
  | 'silentInjection'
export class TezosEngine extends CurrencyEngine {
  tezosPlugin: TezosPlugin
  otherData: TezosWalletOtherData
  stakingSettings: EdgeStakingSettings
  constructor (
    currencyPlugin: TezosPlugin,
    walletInfo: EdgeWalletInfo,
    opts: EdgeCurrencyEngineOptions
  ) {
    super(currencyPlugin, walletInfo, opts)
    this.tezosPlugin = currencyPlugin
    this.stakingSettings = { stakingEnabled: false }
  }
  setStakingSettings (delegate: string) {
    this.stakingSettings = { stakingEnabled: true, delegateAddress: delegate }
  }

  async multicastServers (func: TezosFunction, ...params: any): Promise<any> {
    let out = { result: '', server: 'no server' }
    let funcs
    switch (func) {
      // Functions that should waterfall from top to low priority servers
      case 'getHead':
        // relevant nodes, disabling first node due to caching / polling issue
        // need to re-enable once that nodes issue is fixed
        const nonCachedNodes = this.tezosPlugin.tezosRpcNodes.slice(1, 3)
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
      case 'getBalance':
        const usableNodes = this.tezosPlugin.tezosRpcNodes.slice(1, 3)
        funcs = usableNodes.map(server => async () => {
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
      case 'getOperations':
        funcs = this.tezosPlugin.tezosApiServers.map(server => async () => {
          const result: XtzGetOperation = await this.io
            .fetch(
              server +
                '/v3/operations/' +
                params[0] +
                '?type=' +
                params[1] +
                '&p=' +
                params[2] +
                '&number=' +
                PAGE_SIZE
            )
            .then(function (response) {
              return response.json()
            })
          return { server, result }
        })
        out = await asyncWaterfall(funcs)
        break
      case 'getDelegate':
        funcs = this.tezosPlugin.tezosRpcNodes.map(server => async () => {
          eztz.node.setProvider(server)
          const result = await eztz.rpc.getDelegate(params[0])
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
              this.currencyInfo.defaultSettings.transaction.gasLimit,
              this.currencyInfo.defaultSettings.transaction.storageLimit,
              this.currencyInfo.defaultSettings.reveal.defaultFee
            )
            .then(function (response) {
              return response
            })
          return { server, result }
        })
        out = await asyncWaterfall(funcs)
        break
      case 'createOrigination':
        funcs = this.tezosPlugin.tezosRpcNodes.map(server => async () => {
          eztz.node.setProvider(server)
          const result = await eztz.rpc
            .account(
              params[0],
              params[1],
              true,
              true,
              params[2],
              params[3],
              this.currencyInfo.defaultSettings.origination.gasLimit,
              this.currencyInfo.defaultSettings.origination.storageLimit
            )
            .then(function (response) {
              return response
            })
          return { server, result }
        })
        out = await asyncWaterfall(funcs)
        break
      case 'createDelegation':
        funcs = this.tezosPlugin.tezosRpcNodes.map(server => async () => {
          eztz.node.setProvider(server)
          const result = await eztz.rpc
            .setDelegate(
              params[0],
              params[1],
              params[2],
              params[3],
              this.currencyInfo.defaultSettings.delegation.gasLimit,
              this.currencyInfo.defaultSettings.delegation.storageLimit
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
  async processTezosOperation (tx: XtzGetOperation) {
    const valid = validateObject(tx, XtzTransactionSchema)
    if (!valid) {
      this.log('Invalid transaction!')
      throw new Error('InvalidTransactionError')
    }
    const kind = tx.type.operations[0].kind
    const address = this.walletLocalData.publicKey
    const ourReceiveAddresses: Array<string> = []
    const currencyCode = PRIMARY_CURRENCY
    const date = new Date(tx.type.operations[0].timestamp).getTime() / 1000
    const blockHeight = tx.type.operations[0].op_level
    let nativeAmount: string
    let networkFee = '0'
    let destination: string
    if (kind === 'transaction') {
      nativeAmount = tx.type.operations[0].amount.toString()
      destination = tx.type.operations[0].destination.tz
    } else if (kind === 'origination') {
      nativeAmount = tx.type.operations[0].balance.toString()
      networkFee = this.currencyInfo.defaultSettings.burnFee
      destination = tx.type.operations[0].tz1.tz
    } else if (kind === 'delegation') {
      nativeAmount = '0'
      destination = tx.type.operations[0].delegate.tz
    } else {
      throw new Error('Error: Invalid operation kind')
    }
    networkFee = bns.add(networkFee, tx.type.operations[0].fee.toString())
    const failedOperation = tx.type.operations[0].failed
    if (address === destination) {
      ourReceiveAddresses.push(address)
      if (tx.type.source.tz === address) {
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
      otherParams: { delegateAddress: null }
    }
    if (kind === 'origination' || kind === 'delegation') {
      edgeTransaction.otherParams.delegateAddress =
        tx.type.operations[0].delegate.tz
    }
    if (!failedOperation) {
      if (kind === 'origination' && address !== destination) {
        await this.loadStakingAccount(tx)
      } else {
        this.addTransaction(currencyCode, edgeTransaction)
      }
    }
  }

  async loadStakingAccount (tx: any) {
    const op = tx.type.operations[0]
    if (this.stakingSettings.stakingEnabled) {
      this.log('Staking already enabled')
      return
    }
    if (
      op.managerPubkey.tz &&
      op.managerPubkey.tz !== this.walletLocalData.publicKey
    ) {
      this.log('Error: Invalid manager')
      return
    }
    if (op.src.tz && op.src.tz !== this.walletLocalData.publicKey) {
      this.log('Error: Invalid source')
      return
    }
    if (
      !op.delegate.tz ||
      !this.tezosPlugin.checkAddress(op.delegate.tz) ||
      op.delegate.tz.slice(0, 2) !== 'tz'
    ) {
      throw new Error('Error: Invalid delegate address')
    }
    if (
      !op.tz1.tz ||
      !this.tezosPlugin.checkAddress(op.tz1.tz) ||
      op.tz1.tz.slice(0, 2) !== 'KT'
    ) {
      throw new Error('Error: Invalid contract address')
    }
    const delegate = op.delegate.tz
    const ktAddress: string = op.tz1.tz
    this.walletLocalData.publicKey = ktAddress
    this.setStakingSettings(delegate)
    this.checkAccountInnerLoop()
    this.checkDelegateInnerLoop()
    await this.clearBlockchainCache()
    this.transactionsChangedArray = []
    await this.processTezosOperation(tx)
  }

  async checkTransactionsInnerLoop () {
    this.log('Starting transaction loop')
    this.tokenCheckTransactionsStatus.XTZ = 0
    let address = this.walletLocalData.publicKey
    if (!this.otherData.numberTransactions) {
      this.otherData.numberTransactions = -1
    }
    const num = await this.multicastServers('getNumberOfOperations', address)
    if (num !== this.otherData.numberTransactions) {
      this.tokenCheckTransactionsStatus.XTZ = 0.2
      const operationType = ['Origination', 'Transaction', 'Delegation']
      for (let i = 0; i < operationType.length; i++) {
        address = this.walletLocalData.publicKey
        let page = 0
        let operations
        let txs: Array<XtzGetOperation> = []
        do {
          this.log('address: ' + address)
          operations = await this.multicastServers(
            'getOperations',
            address,
            operationType[i],
            page++
          )
          txs = txs.concat(operations)
        } while (operations.length === PAGE_SIZE && page < 10)
        for (const tx of txs) {
          await this.processTezosOperation(tx)
        }
        this.tokenCheckTransactionsStatus.XTZ += 0.2
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
    const address = this.walletLocalData.publicKey
    if (
      typeof this.walletLocalData.totalBalances[currencyCode] === 'undefined'
    ) {
      this.walletLocalData.totalBalances[currencyCode] = '0'
    }
    const balance = await this.multicastServers('getBalance', address)
    if (this.walletLocalData.totalBalances[currencyCode] !== balance) {
      this.walletLocalData.totalBalances[currencyCode] = balance
      this.currencyEngineCallbacks.onBalanceChanged(currencyCode, balance)
    }
    this.tokenCheckBalanceStatus.XTZ = 1
    this.updateOnAddressesChecked()
  }

  async checkDelegateInnerLoop () {
    if (!this.stakingSettings.stakingEnabled) {
      return
    }
    const address = this.walletLocalData.publicKey
    if (address && address.slice(0, 2) !== 'KT') {
      this.log('No contract address')
      return
    }
    const delegate = await this.multicastServers('getDelegate', address)
    this.setStakingSettings(delegate)
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
    this.otherData.numberTransactions = -1
    this.addToLoop('checkBlockchainInnerLoop', BLOCKCHAIN_POLL_MILLISECONDS)
    this.addToLoop('checkAccountInnerLoop', ADDRESS_POLL_MILLISECONDS)
    this.addToLoop('checkTransactionsInnerLoop', TRANSACTION_POLL_MILLISECONDS)
    this.addToLoop('checkDelegateInnerLoop', DELEGATE_POLL_MILLISECONDS)
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
    const pkh = this.walletLocalData.publicKey
    const keys: TezosKeyPair = {
      pk: this.walletInfo.keys.publicKeyEd,
      pkh: pkh,
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
          this.currencyInfo.defaultSettings.transaction.defaultFee
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
          this.currencyInfo.defaultSettings.burnFee
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

  async changeStakingSettings (stakingSettings: EdgeStakingSettings) {
    if (!stakingSettings.stakingEnabled) {
      throw new Error('Error: Invalid staking settings')
    }
    const delegateAddress = stakingSettings.delegateAddress
    const newStakingContract: boolean = !this.stakingSettings.stakingEnabled
    const currencyCode: string = PRIMARY_CURRENCY
    let fee: string
    let networkFee: string = '0'
    const fromAddress: string = this.walletLocalData.publicKey
    let nativeAmount: string = '0'
    if (
      typeof this.walletLocalData.totalBalances[currencyCode] === 'undefined' ||
      typeof this.walletLocalData.totalBalances[currencyCode] !== 'string'
    ) {
      throw new Error('Error: Invalid balance')
    }
    if (
      delegateAddress.slice(0, 2) !== 'tz' ||
      !this.tezosPlugin.checkAddress(delegateAddress)
    ) {
      throw new Error('Error: Invalid delegate address')
    }
    const nativeBalance = this.walletLocalData.totalBalances[currencyCode]
    const keys: TezosKeyPair = {
      pk: this.walletInfo.keys.publicKeyEd,
      pkh: this.walletInfo.keys.publicKey,
      sk: false
    }
    let ops: OperationsContainer
    let toAddress: string
    if (newStakingContract) {
      fee = this.currencyInfo.defaultSettings.origination.defaultFee
      networkFee = bns.add(this.currencyInfo.defaultSettings.burnFee, fee)
      nativeAmount = bns.sub(nativeBalance, bns.add(networkFee, '1'))
      ops = await this.multicastServers(
        'createOrigination',
        keys,
        bns.div(nativeAmount, '1000000', 6),
        delegateAddress,
        fee
      )
      let fees = '0'
      for (const op of ops.opOb.contents) {
        fees = bns.add(fees, op.fee)
      }
      if (bns.gt(fees, fee)) {
        networkFee = bns.add(this.currencyInfo.defaultSettings.burnFee, fees)
        nativeAmount = bns.sub(nativeBalance, bns.add(networkFee, '1'))
        ops = await this.multicastServers(
          'createOrigination',
          keys,
          bns.div(nativeAmount, '1000000', 6),
          delegateAddress,
          fee
        )
      }
      nativeAmount = bns.add(
        nativeAmount,
        this.currencyInfo.defaultSettings.burnFee
      )
      toAddress = 'KT'
    } else {
      fee = this.currencyInfo.defaultSettings.delegation.defaultFee
      ops = await this.multicastServers(
        'createDelegation',
        fromAddress,
        keys,
        delegateAddress,
        fee
      )
      for (const op of ops.opOb.contents) {
        nativeAmount = networkFee = bns.add(networkFee, op.fee)
      }
      toAddress = delegateAddress
    }
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
      ourReceiveAddresses: [toAddress],
      signedTx: '',
      otherParams: {
        idInternal: 0,
        fromAddress,
        toAddress,
        delegateAddress,
        fullOp: ops
      }
    }
    if (newStakingContract) {
      edgeTransaction.otherParams.newStakingContract = true
    }
    return edgeTransaction
  }

  async signTx (edgeTransaction: EdgeTransaction): Promise<EdgeTransaction> {
    if (edgeTransaction.signedTx === '') {
      const sk = this.walletInfo.keys.privateKey
      const signed = eztz.crypto.sign(
        edgeTransaction.otherParams.fullOp.opbytes,
        sk,
        eztz.watermark.generic
      )
      edgeTransaction.otherParams.fullOp.opbytes = signed.sbytes
      edgeTransaction.otherParams.fullOp.opOb.signature = signed.edsig
      edgeTransaction.signedTx = signed.sbytes
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
    if (edgeTransaction.otherParams.toAddress === 'KT') {
      edgeTransaction.ourReceiveAddresses = [
        result.operations[result.operations.length - 1].metadata
          .operation_result.originated_contracts[0]
      ]
      edgeTransaction.otherParams.toAddress =
        edgeTransaction.ourReceiveAddresses[0]
    }
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
    if (
      this.walletInfo.keys &&
      this.walletInfo.keys.publicKey &&
      !this.stakingSettings.stakingEnabled
    ) {
      return this.walletInfo.keys.publicKey
    } else if (
      this.stakingSettings.stakingEnabled &&
      this.walletLocalData.publicKey
    ) {
      return this.walletLocalData.publicKey
    } else {
      throw new Error('Error: No address found')
    }
  }
}

export { CurrencyEngine }
