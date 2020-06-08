// @flow

import { FIOSDK } from '@fioprotocol/fiosdk'
import { EndPoint } from '@fioprotocol/fiosdk/lib/entities/EndPoint'
import { bns } from 'biggystring'
import {
  type EdgeCurrencyEngineOptions,
  type EdgeCurrencyTools,
  type EdgeFetchFunction,
  type EdgeFreshAddress,
  type EdgeSpendInfo,
  type EdgeTransaction,
  type EdgeWalletInfo,
  InsufficientFundsError
} from 'edge-core-js/types'

import { CurrencyEngine } from '../common/engine.js'
import { asyncWaterfall, getDenomInfo } from '../common/utils'
import { FioPlugin } from './fioPlugin.js'

const ADDRESS_POLL_MILLISECONDS = 10000
const BLOCKCHAIN_POLL_MILLISECONDS = 15000
const TRANSACTION_POLL_MILLISECONDS = 10000
const fioApiErrorCodes = [400, 403, 404]

type FioTransactionSuperNode = {
  block_num: number,
  block_time: string,
  action_trace: {
    receiver: string,
    act: {
      account: string,
      name: string,
      authorization: [],
      data: {
        payee_public_key: string,
        amount: number,
        max_fee: number,
        actor: string,
        tpid: string,
        quantity: string,
        memo: string,
        to: string,
        from: string
      },
      hex_data: string
    },
    trx_id: string,
    block_num: number,
    block_time: string,
    producer_block_id: string
  }
}

class FioError extends Error {
  list: { field: string, message: string }[]
  errorCode: number
  json: any

  constructor(...params: any) {
    super(...params)

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, FioError)
    }

    this.name = 'FioError'
  }
}

export class FioEngine extends CurrencyEngine {
  fetchCors: EdgeFetchFunction
  fioPlugin: FioPlugin
  otherData: any
  otherMethods: Object
  tpid: string

  localDataDirty() {
    this.walletLocalDataDirty = true
  }

  constructor(
    currencyPlugin: FioPlugin,
    walletInfo: EdgeWalletInfo,
    opts: EdgeCurrencyEngineOptions,
    fetchCors: Function,
    tpid: string
  ) {
    super(currencyPlugin, walletInfo, opts)
    this.fetchCors = fetchCors
    this.fioPlugin = currencyPlugin
    this.tpid = tpid

    this.otherMethods = {
      fioAction: async (actionName: string, params: any): Promise<any> => {
        const feeActionMap = {
          addPublicAddress: {
            action: 'getFeeForAddPublicAddress',
            propName: 'fioAddress'
          },
          addPublicAddresses: {
            action: 'getFeeForAddPublicAddress',
            propName: 'fioAddress'
          },
          rejectFundsRequest: {
            action: 'getFeeForRejectFundsRequest',
            propName: 'payerFioAddress'
          },
          requestFunds: {
            action: 'getFeeForNewFundsRequest',
            propName: 'payeeFioAddress'
          },
          recordObtData: {
            action: 'getFeeForRecordObtData',
            propName: 'payerFioAddress'
          }
        }
        switch (actionName) {
          case 'addPublicAddresses':
          case 'addPublicAddress':
          case 'requestFunds':
          case 'rejectFundsRequest':
          case 'recordObtData': {
            const { fee } = await this.multicastServers(
              feeActionMap[actionName].action,
              {
                [feeActionMap[actionName].propName]:
                  params[feeActionMap[actionName].propName]
              }
            )
            params.maxFee = fee
            break
          }
          case 'renewFioAddress': {
            const { fee } = await this.multicastServers('getFee', {
              endPoint: EndPoint[actionName]
            })
            params.maxFee = fee
            const res = await this.multicastServers(actionName, params)
            const renewedAddress = this.walletLocalData.otherData.fioAddresses.find(
              ({ name }) => name === params.fioAddress
            )
            if (renewedAddress) {
              renewedAddress.expiration = res.expiration
              this.localDataDirty()
            }
            return res
          }
          case 'registerFioAddress': {
            const { fee } = await this.multicastServers('getFee', {
              endPoint: EndPoint[actionName]
            })
            params.maxFee = fee
            const res = await this.multicastServers(actionName, params)
            const addressAlreadyAdded = this.walletLocalData.otherData.fioAddresses.find(
              ({ name }) => name === params.fioAddress
            )
            if (!addressAlreadyAdded) {
              this.walletLocalData.otherData.fioAddresses.push({
                name: params.fioAddress,
                expiration: res.expiration
              })
              this.localDataDirty()
            }
            return {
              expiration: res.expiration,
              feeCollected: res.fee_collected
            }
          }
          case 'renewFioDomain': {
            const { fee } = await this.multicastServers('getFee', {
              endPoint: EndPoint[actionName]
            })
            params.maxFee = fee
            const res = await this.multicastServers(actionName, params)
            const renewedDomain = this.walletLocalData.otherData.fioDomains.find(
              ({ name }) => name === params.fioDomain
            )
            if (renewedDomain) {
              renewedDomain.expiration = res.expiration
              this.localDataDirty()
            }
            return {
              expiration: res.expiration,
              feeCollected: res.fee_collected
            }
          }
        }

        return this.multicastServers(actionName, params)
      },
      getFee: async (
        actionName: string,
        fioAddress: string = ''
      ): Promise<number> => {
        const { fee } = await this.multicastServers('getFee', {
          endPoint: EndPoint[actionName],
          fioAddress
        })
        return fee
      },
      getFioAddresses: async (): Promise<
        { name: string, expiration: string }[]
      > => {
        return this.walletLocalData.otherData.fioAddresses
      },
      getFioAddressNames: async (): Promise<string[]> => {
        return this.walletLocalData.otherData.fioAddresses.map(
          fioAddress => fioAddress.name
        )
      },
      getFioDomains: async (): Promise<
        { name: string, expiration: string, isPublic: boolean }[]
      > => {
        return this.walletLocalData.otherData.fioDomains
      }
    }
  }

  async loadEngine(
    plugin: EdgeCurrencyTools,
    walletInfo: EdgeWalletInfo,
    opts: EdgeCurrencyEngineOptions
  ): Promise<void> {
    await super.loadEngine(plugin, walletInfo, opts)
    if (typeof this.walletInfo.keys.ownerPublicKey !== 'string') {
      if (walletInfo.keys.ownerPublicKey) {
        this.walletInfo.keys.ownerPublicKey = walletInfo.keys.ownerPublicKey
      } else {
        const pubKeys = await plugin.derivePublicKey(this.walletInfo)
        this.walletInfo.keys.ownerPublicKey = pubKeys.ownerPublicKey
      }
    }
  }

  // Poll on the blockheight
  async checkBlockchainInnerLoop() {
    try {
      const info = await this.multicastServers('getChainInfo')
      const blockHeight = info.head_block_num
      if (this.walletLocalData.blockHeight !== blockHeight) {
        this.checkDroppedTransactionsThrottled()
        this.walletLocalData.blockHeight = blockHeight
        this.localDataDirty()
        this.currencyEngineCallbacks.onBlockHeightChanged(
          this.walletLocalData.blockHeight
        )
      }
    } catch (e) {
      this.log(`Error fetching height: ${JSON.stringify(e)}`)
      this.log(`e.code: ${JSON.stringify(e.code)}`)
      this.log(`e.message: ${JSON.stringify(e.message)}`)
      console.error('checkBlockchainInnerLoop error: ' + JSON.stringify(e))
    }
  }

  getBalance(options: any): string {
    return super.getBalance(options)
  }

  updateBalance(tk: string, balance: string) {
    if (typeof this.walletLocalData.totalBalances[tk] === 'undefined') {
      this.walletLocalData.totalBalances[tk] = '0'
    }
    if (!bns.eq(balance, this.walletLocalData.totalBalances[tk])) {
      this.walletLocalData.totalBalances[tk] = balance
      this.localDataDirty()
      this.log(tk + ': token Address balance: ' + balance)
      this.currencyEngineCallbacks.onBalanceChanged(tk, balance)
    }
    this.tokenCheckBalanceStatus[tk] = 1
    this.updateOnAddressesChecked()
  }

  processTransaction(action: FioTransactionSuperNode, actor: string): number {
    const {
      act: { name: trxName, data }
    } = action.action_trace
    let nativeAmount
    let actorSender
    let name
    let notes = ''
    let networkFee = '0'
    const currencyCode = this.currencyInfo.currencyCode
    const ourReceiveAddresses = []
    if (action.block_num <= this.walletLocalData.otherData.highestTxHeight) {
      return action.block_num
    }
    if (trxName !== 'trnsfiopubky' && trxName !== 'transfer') {
      return action.block_num
    }
    if (trxName === 'trnsfiopubky') {
      nativeAmount = data.amount.toString()
      actorSender = data.actor
      notes = `Recipient Address: ${data.payee_public_key}`
      if (data.payee_public_key === this.walletInfo.keys.publicKey) {
        name = ''
        ourReceiveAddresses.push(this.walletInfo.keys.publicKey)
        if (actorSender === actor) {
          nativeAmount = '0'
        }
      } else {
        name = ''
        nativeAmount = `-${nativeAmount}`
      }

      const index = this.findTransaction(
        currencyCode,
        action.action_trace.trx_id
      )
      if (index > -1) {
        const existingTrx = this.transactionList[currencyCode][index]
        if (existingTrx.networkFee === '0' && bns.lt(nativeAmount, '0')) {
          networkFee = bns.abs(existingTrx.nativeAmount)
          nativeAmount = bns.sub(nativeAmount, networkFee)
        } else {
          return action.block_num
        }
      }

      const edgeTransaction: EdgeTransaction = {
        txid: action.action_trace.trx_id,
        date: Date.parse(action.block_time) / 1000,
        currencyCode,
        blockHeight: action.block_num > 0 ? action.block_num : 0,
        nativeAmount,
        networkFee,
        parentNetworkFee: '0',
        ourReceiveAddresses,
        signedTx: '',
        otherParams: {},
        metadata: {
          name,
          notes
        }
      }
      this.addTransaction(currencyCode, edgeTransaction)
    }

    if (trxName === 'transfer') {
      const [amount] = data.quantity.split(' ')
      const exchangeAmount = amount.toString()
      const denom = getDenomInfo(this.currencyInfo, currencyCode)
      if (!denom) {
        this.log(`Received unsupported currencyCode: ${currencyCode}`)
        return 0
      }
      networkFee = bns.mul(exchangeAmount, denom.multiplier)
      notes = data.memo
      name = data.to
      const edgeTransaction: EdgeTransaction = {
        txid: action.action_trace.trx_id,
        date: Date.parse(action.block_time) / 1000,
        currencyCode,
        blockHeight: action.block_num > 0 ? action.block_num : 0,
        nativeAmount: `-${networkFee}`,
        networkFee: '0',
        signedTx: '',
        ourReceiveAddresses: [],
        otherParams: {},
        metadata: {
          name,
          notes
        }
      }
      this.addTransaction(currencyCode, edgeTransaction)
    }

    return action.block_num
  }

  async checkTransactions(historyNodeIndex: number = 0): Promise<boolean> {
    let newHighestTxHeight = this.walletLocalData.otherData.highestTxHeight
    let lastActionSeqNumber = 0
    const fioSDK = new FIOSDK(
      '',
      '',
      this.currencyInfo.defaultSettings.historyNodeUrls[historyNodeIndex],
      this.fetchCors,
      undefined,
      this.tpid
    )
    const actor = fioSDK.transactions.getActor(this.walletInfo.keys.publicKey)
    try {
      const lastActionObject = await this.requestHistory(
        historyNodeIndex,
        {
          account_name: actor,
          pos: -1,
          offset: -1
        },
        this.currencyInfo.defaultSettings.historyNodeActions.getActions
      )

      if (lastActionObject.actions && lastActionObject.actions.length) {
        lastActionSeqNumber = lastActionObject.actions[0].account_action_seq
      }
      if (lastActionObject.error && lastActionObject.error.noNodeForIndex) {
        return true
      }
    } catch (e) {
      console.log(e)
      this.log(e)
    }

    if (!lastActionSeqNumber) {
      return this.checkTransactions(++historyNodeIndex)
    }

    const offset = 20
    let pos = lastActionSeqNumber
    let finish = false

    while (!finish) {
      this.log('looping through checkTransactions')
      if (pos < 0) {
        break
      }
      let actionsObject
      try {
        actionsObject = await this.requestHistory(
          historyNodeIndex,
          {
            account_name: actor,
            pos,
            offset: -offset
          },
          this.currencyInfo.defaultSettings.historyNodeActions.getActions
        )
        if (actionsObject.error && actionsObject.error.noNodeForIndex) {
          return true
        }
      } catch (e) {
        return this.checkTransactions(++historyNodeIndex)
      }
      let actions = []
      actionsObject.actions.sort(
        (a, b) => b.account_action_seq - a.account_action_seq
      )

      if (actionsObject.actions && actionsObject.actions.length > 0) {
        actions = actionsObject.actions
      } else {
        break
      }

      for (let i = 0; i < actions.length; i++) {
        const action = actions[i]
        const blockNum = this.processTransaction(action, actor)

        if (blockNum > newHighestTxHeight) {
          newHighestTxHeight = blockNum
        } else if (
          (blockNum === newHighestTxHeight && i === 0) ||
          blockNum < this.walletLocalData.otherData.highestTxHeight
        ) {
          finish = true
          break
        }
      }

      if (!actions.length || actions.length < offset) {
        break
      }
      pos -= offset
    }
    if (newHighestTxHeight > this.walletLocalData.otherData.highestTxHeight) {
      this.walletLocalData.otherData.highestTxHeight = newHighestTxHeight
      this.localDataDirty()
    }
    return true
  }

  async checkTransactionsInnerLoop() {
    let transactions
    try {
      transactions = await this.checkTransactions()
    } catch (e) {
      console.log(e)
      this.log('checkTransactionsInnerLoop fetches failed with error: ')
      this.log(e)
      return false
    }

    if (transactions) {
      this.tokenCheckTransactionsStatus.FIO = 1
      this.updateOnAddressesChecked()
    }
    if (this.transactionsChangedArray.length > 0) {
      this.currencyEngineCallbacks.onTransactionsChanged(
        this.transactionsChangedArray
      )
      this.transactionsChangedArray = []
    }
  }

  async requestHistory(nodeIndex, params, uri): Promise<any> {
    if (!this.currencyInfo.defaultSettings.historyNodeUrls[nodeIndex])
      return { error: { noNodeForIndex: true } }
    const apiUrl = this.currencyInfo.defaultSettings.historyNodeUrls[nodeIndex]
    const result = await this.fetchCors(`${apiUrl}history/${uri || ''}`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    })
    return result.json()
  }

  async multicastServers(
    actionName: string,
    params?: any,
    uri?: string
  ): Promise<any> {
    const res = await asyncWaterfall(
      this.currencyInfo.defaultSettings.apiUrls.map(apiUrl => async () => {
        const fioSDK = new FIOSDK(
          this.walletInfo.keys.fioKey,
          this.walletInfo.keys.publicKey,
          apiUrl,
          this.fetchCors,
          undefined,
          this.tpid
        )

        let res

        try {
          switch (actionName) {
            case 'getChainInfo':
              res = await fioSDK.transactions.getChainInfo()
              break
            default:
              res = await fioSDK.genericAction(actionName, params)
          }
        } catch (e) {
          // handle FIO API error
          if (e.errorCode && fioApiErrorCodes.indexOf(e.errorCode) > -1) {
            res = {
              isError: true,
              data: {
                code: e.errorCode,
                message: e.message,
                json: e.json,
                list: e.list
              }
            }
          } else {
            throw e
          }
        }

        return res
      })
    )

    if (res.isError) {
      const error = new FioError(res.errorMessage)
      error.json = res.data.json
      error.list = res.data.list
      error.errorCode = res.data.code

      throw error
    }

    return res
  }

  // Check all account balance and other relevant info
  async checkAccountInnerLoop() {
    const currencyCode = this.currencyInfo.currencyCode
    let nativeAmount = '0'
    if (
      typeof this.walletLocalData.totalBalances[currencyCode] === 'undefined'
    ) {
      this.walletLocalData.totalBalances[currencyCode] = '0'
    }

    // Balance
    try {
      const { balance } = await this.multicastServers('getFioBalance')
      nativeAmount = balance + ''
    } catch (e) {
      this.log('checkAccountInnerLoop error: ' + JSON.stringify(e))
      nativeAmount = '0'
    }
    this.updateBalance(currencyCode, nativeAmount)

    // Fio Addresses
    try {
      const result = await this.multicastServers('getFioNames', {
        fioPublicKey: this.walletInfo.keys.publicKey
      })

      let isChanged = false

      for (const fioAddress of result.fio_addresses) {
        const existedFioAddress = this.walletLocalData.otherData.fioAddresses.find(
          existedFioAddress => existedFioAddress.name === fioAddress.fio_address
        )
        if (existedFioAddress) {
          if (existedFioAddress.expiration !== fioAddress.expiration) {
            existedFioAddress.expiration = fioAddress.expiration
            isChanged = true
          }
        } else {
          this.walletLocalData.otherData.fioAddresses.push({
            name: fioAddress.fio_address,
            expiration: fioAddress.expiration
          })
          isChanged = true
        }
      }

      for (const fioDomain of result.fio_domains) {
        const existedFioDomain = this.walletLocalData.otherData.fioDomains.find(
          existedFioDomain => existedFioDomain.name === fioDomain.fio_domain
        )
        if (existedFioDomain) {
          if (existedFioDomain.expiration !== fioDomain.expiration) {
            existedFioDomain.expiration = fioDomain.expiration
            isChanged = true
          }
          if (existedFioDomain.isPublic !== !!fioDomain.is_public) {
            existedFioDomain.isPublic = !!fioDomain.is_public
            isChanged = true
          }
        } else {
          this.walletLocalData.otherData.fioDomains.push({
            name: fioDomain.fio_domain,
            expiration: fioDomain.expiration,
            isPublic: !!fioDomain.is_public
          })
          isChanged = true
        }
      }
      if (isChanged) this.localDataDirty()
    } catch (e) {
      this.log('checkAccountInnerLoop getFioNames error: ' + JSON.stringify(e))
    }
  }

  async clearBlockchainCache(): Promise<void> {
    await super.clearBlockchainCache()
    this.walletLocalData.otherData.highestTxHeight = 0
    this.walletLocalData.otherData.feeTransactions = []
    this.walletLocalData.otherData.fioAddresses = []
  }

  // ****************************************************************************
  // Public methods
  // ****************************************************************************

  // This routine is called once a wallet needs to start querying the network
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

  async makeSpend(edgeSpendInfoIn: EdgeSpendInfo) {
    const { edgeSpendInfo, nativeBalance, currencyCode } = super.makeSpend(
      edgeSpendInfoIn
    )

    const feeResponse = await this.multicastServers('getFee', {
      endPoint: EndPoint.transferTokens
    })
    const fee = feeResponse.fee
    const publicAddress = edgeSpendInfo.spendTargets[0].publicAddress
    const quantity = edgeSpendInfo.spendTargets[0].nativeAmount
    if (bns.gt(bns.add(quantity, `${fee}`), nativeBalance)) {
      throw new InsufficientFundsError()
    }
    const memo = ''
    const actor = ''
    const transactionJson = {
      actions: [
        {
          account: 'fio.token',
          name: 'trnsfiopubky',
          authorization: [
            {
              actor: actor,
              permission: 'active'
            }
          ],
          data: {
            from: this.walletInfo.keys.publicKey,
            to: publicAddress,
            quantity,
            memo
          }
        }
      ]
    }

    const edgeTransaction: EdgeTransaction = {
      txid: '', // txid
      date: 0, // date
      currencyCode, // currencyCode
      blockHeight: 0, // blockHeight
      nativeAmount: bns.sub(`-${quantity}`, `${fee}`), // nativeAmount
      networkFee: `${fee}`, // networkFee
      ourReceiveAddresses: [], // ourReceiveAddresses
      signedTx: '0', // signedTx
      otherParams: {
        transactionJson
      }
    }
    return edgeTransaction
  }

  async signTx(edgeTransaction: EdgeTransaction): Promise<EdgeTransaction> {
    // Do nothing
    return edgeTransaction
  }

  async broadcastTx(
    edgeTransaction: EdgeTransaction
  ): Promise<EdgeTransaction> {
    if (
      !edgeTransaction.otherParams ||
      !edgeTransaction.otherParams.transactionJson
    )
      throw new Error(
        'transactionJson not set. FIO transferTokens requires publicAddress'
      )
    const publicAddress =
      edgeTransaction.otherParams.transactionJson.actions[0].data.to
    const amount = bns.abs(
      bns.add(edgeTransaction.nativeAmount, edgeTransaction.networkFee)
    )
    const transfer = await this.multicastServers('transferTokens', {
      payeeFioPublicKey: publicAddress,
      amount,
      maxFee: edgeTransaction.networkFee
    })

    edgeTransaction.txid = transfer.transaction_id
    edgeTransaction.date = Date.now() / 1000
    edgeTransaction.blockHeight = transfer.block_num
    return edgeTransaction
  }

  getFreshAddress(options: any): EdgeFreshAddress {
    return { publicAddress: this.walletInfo.keys.publicKey }
  }

  getDisplayPrivateSeed() {
    let out = ''
    if (this.walletInfo.keys && this.walletInfo.keys.fioKey) {
      out += this.walletInfo.keys.fioKey
    }
    return out
  }

  getDisplayPublicSeed() {
    let out = ''
    if (this.walletInfo.keys && this.walletInfo.keys.publicKey) {
      out += this.walletInfo.keys.publicKey
    }
    return out
  }
}

export { CurrencyEngine }
