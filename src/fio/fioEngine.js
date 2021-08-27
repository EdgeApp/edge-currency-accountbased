// @flow

import { FIOSDK } from '@fioprotocol/fiosdk'
import { EndPoint } from '@fioprotocol/fiosdk/lib/entities/EndPoint'
import { Transactions } from '@fioprotocol/fiosdk/lib/transactions/Transactions'
import { Constants as FioConstants } from '@fioprotocol/fiosdk/lib/utils/constants'
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
import {
  asyncWaterfall,
  cleanTxLogs,
  getDenomInfo,
  promiseAny,
  promiseNy,
  shuffleArray,
  timeout
} from '../common/utils'
import {
  type FioAddress,
  type FioDomain,
  type FioRequest,
  ACTIONS_TO_END_POINT_KEYS,
  BROADCAST_ACTIONS,
  FIO_REQUESTS_TYPES,
  HISTORY_NODE_ACTIONS,
  HISTORY_NODE_OFFSET
} from './fioConst.js'
import { fioApiErrorCodes, FioError } from './fioError'
import { FioPlugin } from './fioPlugin.js'
import {
  type FioHistoryNodeAction,
  type GetFioName,
  asFioHistoryNodeAction,
  asGetFioName,
  asHistoryResponse
} from './fioSchema.js'

const ADDRESS_POLL_MILLISECONDS = 10000
const BLOCKCHAIN_POLL_MILLISECONDS = 15000
const TRANSACTION_POLL_MILLISECONDS = 10000
const REQUEST_POLL_MILLISECONDS = 10000
const FEE_ACTION_MAP = {
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

type RecentFioFee = {
  publicAddress: string,
  fee: number
}

type PreparedTrx = {
  signatures: string[],
  compression: number,
  packed_context_free_data: string,
  packed_trx: string
}

export class FioEngine extends CurrencyEngine {
  fetchCors: EdgeFetchFunction
  fioPlugin: FioPlugin
  otherMethods: Object
  tpid: string
  recentFioFee: RecentFioFee
  fioSdk: FIOSDK
  fioSdkPreparedTrx: FIOSDK
  otherData: {
    highestTxHeight: number,
    fioAddresses: FioAddress[],
    fioDomains: FioDomain[],
    fioRequests: {
      PENDING: FioRequest[],
      SENT: FioRequest[]
    },
    fioRequestsToApprove: { [requestId: string]: any }
  }

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
    this.recentFioFee = { publicAddress: '', fee: 0 }

    this.fioSdkInit()

    this.otherMethods = {
      fioAction: async (actionName: string, params: any): Promise<any> => {
        switch (actionName) {
          case 'addPublicAddresses':
          case 'addPublicAddress':
          case 'requestFunds': {
            const { fee } = await this.multicastServers(
              FEE_ACTION_MAP[actionName].action,
              {
                [FEE_ACTION_MAP[actionName].propName]:
                  params[FEE_ACTION_MAP[actionName].propName]
              }
            )
            params.maxFee = fee

            break
          }
          case 'rejectFundsRequest': {
            const { fee } = await this.multicastServers(
              FEE_ACTION_MAP[actionName].action,
              {
                [FEE_ACTION_MAP[actionName].propName]:
                  params[FEE_ACTION_MAP[actionName].propName]
              }
            )
            params.maxFee = fee
            const res = await this.multicastServers(actionName, params)
            this.removeFioRequest(
              params.fioRequestId,
              FIO_REQUESTS_TYPES.PENDING
            )
            this.localDataDirty()

            return res
          }
          case 'cancelFundsRequest': {
            const res = await this.multicastServers(actionName, params)
            this.removeFioRequest(params.fioRequestId, FIO_REQUESTS_TYPES.SENT)
            this.localDataDirty()

            return res
          }
          case 'recordObtData': {
            const { fee } = await this.multicastServers(
              FEE_ACTION_MAP[actionName].action,
              {
                [FEE_ACTION_MAP[actionName].propName]:
                  params[FEE_ACTION_MAP[actionName].propName]
              }
            )
            params.maxFee = fee

            if (params.fioRequestId) {
              this.walletLocalData.otherData.fioRequestsToApprove[
                params.fioRequestId
              ] = params
              this.localDataDirty()
              const res = await this.multicastServers(actionName, params)
              if (res && res.status === 'sent_to_blockchain') {
                delete this.walletLocalData.otherData.fioRequestsToApprove[
                  params.fioRequestId
                ]
                this.removeFioRequest(
                  params.fioRequestId,
                  FIO_REQUESTS_TYPES.PENDING
                )
                this.localDataDirty()
              }
              return res
            }
            break
          }
          case 'renewFioAddress': {
            const { fee } = await this.multicastServers('getFee', {
              endPoint: EndPoint[actionName]
            })
            params.maxFee = fee
            const res = await this.multicastServers(actionName, params)
            const renewedAddress =
              this.walletLocalData.otherData.fioAddresses.find(
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
            if (
              params.ownerPublicKey &&
              params.ownerPublicKey !== this.walletInfo.keys.publicKey
            ) {
              return {
                expiration: res.expiration,
                feeCollected: res.fee_collected
              }
            }
            const addressAlreadyAdded =
              this.walletLocalData.otherData.fioAddresses.find(
                ({ name }) => name === params.fioAddress
              )
            if (!addressAlreadyAdded) {
              this.walletLocalData.otherData.fioAddresses.push({
                name: params.fioAddress,
                expiration: res.expiration
              })
              this.localDataDirty()
            }
            return res
          }
          case 'renewFioDomain': {
            const { fee } = await this.multicastServers('getFee', {
              endPoint: EndPoint[actionName]
            })
            params.maxFee = fee
            const res = await this.multicastServers(actionName, params)
            const renewedDomain =
              this.walletLocalData.otherData.fioDomains.find(
                ({ name }) => name === params.fioDomain
              )
            if (renewedDomain) {
              renewedDomain.expiration = res.expiration
              this.localDataDirty()
            }
            return res
          }
          case 'registerFioDomain': {
            const { fee } = await this.multicastServers('getFee', {
              endPoint: EndPoint.registerFioDomain
            })
            params.max_fee = fee
            const res = await this.multicastServers('pushTransaction', {
              action: 'regdomain',
              account: '',
              data: {
                ...params,
                tpid
              }
            })
            return res
          }
          case 'transferFioDomain': {
            const res = await this.multicastServers(actionName, params)
            const transferredDomainIndex =
              this.walletLocalData.otherData.fioDomains.findIndex(
                ({ name }) => name === params.fioDomain
              )
            if (transferredDomainIndex) {
              this.walletLocalData.otherData.fioDomains.splice(
                transferredDomainIndex,
                1
              )
              this.localDataDirty()
            }
            return res
          }
          case 'transferFioAddress': {
            const res = await this.multicastServers(actionName, params)
            const transferredAddressIndex =
              this.walletLocalData.otherData.fioAddresses.findIndex(
                ({ name }) => name === params.fioAddress
              )
            if (transferredAddressIndex) {
              this.walletLocalData.otherData.fioAddresses.splice(
                transferredAddressIndex,
                1
              )
              this.localDataDirty()
            }
            return res
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
      getFioAddresses: async (): Promise<FioAddress[]> => {
        return this.walletLocalData.otherData.fioAddresses
      },
      getFioAddressNames: async (): Promise<string[]> => {
        return this.walletLocalData.otherData.fioAddresses.map(
          fioAddress => fioAddress.name
        )
      },
      getFioDomains: async (): Promise<FioDomain[]> => {
        return this.walletLocalData.otherData.fioDomains
      },
      getFioRequests: async (
        type: string,
        page: number,
        itemsPerPage: number = 50,
        newFirst: boolean = false
      ): Promise<FioRequest[]> => {
        const startIndex = itemsPerPage * (page - 1)
        const endIndex = itemsPerPage * page - 1
        if (newFirst) {
          return this.walletLocalData.otherData.fioRequests[type]
            .sort((a, b) => (a.time_stamp < b.time_stamp ? 1 : -1))
            .slice(startIndex, endIndex)
        }
        return this.walletLocalData.otherData.fioRequests[type]
          .sort((a, b) => (a.time_stamp < b.time_stamp ? -1 : 1))
          .slice(startIndex, endIndex)
      }
    }
  }

  // Normalize date if not exists "Z" parameter
  getUTCDate(dateString: string) {
    const date = new Date(dateString)

    return Date.UTC(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      date.getHours(),
      date.getMinutes(),
      date.getSeconds()
    )
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

    await this.checkAbiAccounts()
  }

  fioSdkInit() {
    const baseUrl = shuffleArray(
      this.currencyInfo.defaultSettings.apiUrls.map(apiUrl => apiUrl)
    )[0]

    this.fioSdk = new FIOSDK(
      this.walletInfo.keys.fioKey,
      this.walletInfo.keys.publicKey,
      baseUrl,
      this.fetchCors,
      undefined,
      this.tpid
    )
    this.fioSdkPreparedTrx = new FIOSDK(
      this.walletInfo.keys.fioKey,
      this.walletInfo.keys.publicKey,
      '',
      this.fetchCors,
      undefined,
      this.tpid,
      true
    )
  }

  async checkAbiAccounts(): Promise<void> {
    if (Transactions.abiMap.size === FioConstants.rawAbiAccountName.length)
      return
    await asyncWaterfall(
      shuffleArray(
        this.currencyInfo.defaultSettings.apiUrls.map(
          apiUrl => () => this.loadAbiAccounts(apiUrl)
        )
      )
    )
  }

  async loadAbiAccounts(apiUrl: string) {
    this.setFioSdkBaseUrl(apiUrl)
    for (const accountName of FioConstants.rawAbiAccountName) {
      if (Transactions.abiMap.get(accountName)) continue
      const response = await this.fioSdk.getAbi(accountName)
      Transactions.abiMap.set(response.account_name, response)
    }
  }

  setFioSdkBaseUrl(apiUrl: string) {
    Transactions.baseUrl = apiUrl
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
      this.log.error(`checkBlockchainInnerLoop Error fetching height: ${e}`)
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
      this.log.warn(tk + ': token Address balance: ' + balance)
      this.currencyEngineCallbacks.onBalanceChanged(tk, balance)
    }
    this.tokenCheckBalanceStatus[tk] = 1
    this.updateOnAddressesChecked()
  }

  processTransaction(action: FioHistoryNodeAction, actor: string): number {
    const {
      act: { name: trxName, data }
    } = action.action_trace
    let nativeAmount
    let actorSender
    let networkFee = '0'
    let otherParams: {
      isTransferProcessed?: boolean,
      isFeeProcessed?: boolean
    } = {}
    const currencyCode = this.currencyInfo.currencyCode
    const ourReceiveAddresses = []
    if (action.block_num <= this.walletLocalData.otherData.highestTxHeight) {
      return action.block_num
    }
    if (trxName !== 'trnsfiopubky' && trxName !== 'transfer') {
      return action.block_num
    }

    // Transfer funds transaction
    if (trxName === 'trnsfiopubky' && data.amount != null) {
      nativeAmount = data.amount.toString()
      actorSender = data.actor
      if (data.payee_public_key === this.walletInfo.keys.publicKey) {
        ourReceiveAddresses.push(this.walletInfo.keys.publicKey)
        if (actorSender === actor) {
          nativeAmount = '0'
        }
      } else {
        nativeAmount = `-${nativeAmount}`
      }

      const index = this.findTransaction(
        currencyCode,
        action.action_trace.trx_id
      )
      // Check if fee transaction have already added
      if (index > -1) {
        const existingTrx = this.transactionList[currencyCode][index]
        otherParams = { ...existingTrx.otherParams }
        if (bns.gte(nativeAmount, '0')) {
          return action.block_num
        }
        if (otherParams.isTransferProcessed) {
          return action.block_num
        }
        if (otherParams.isFeeProcessed) {
          nativeAmount = bns.sub(nativeAmount, existingTrx.networkFee)
          networkFee = existingTrx.networkFee
        } else {
          this.log.error(
            'processTransaction error - existing spend transaction should have isTransferProcessed or isFeeProcessed set'
          )
        }
      }
      otherParams.isTransferProcessed = true

      const edgeTransaction: EdgeTransaction = {
        txid: action.action_trace.trx_id,
        date: this.getUTCDate(action.block_time) / 1000,
        currencyCode,
        blockHeight: action.block_num > 0 ? action.block_num : 0,
        nativeAmount,
        networkFee,
        parentNetworkFee: '0',
        ourReceiveAddresses,
        signedTx: '',
        otherParams
      }
      this.addTransaction(currencyCode, edgeTransaction)
    }

    // Fee transaction
    if (trxName === 'transfer' && data.quantity != null) {
      const [amount] = data.quantity.split(' ')
      const exchangeAmount = amount.toString()
      const denom = getDenomInfo(this.currencyInfo, currencyCode)
      if (!denom) {
        this.log.error(`Received unsupported currencyCode: ${currencyCode}`)
        return 0
      }
      const fioAmount = bns.mul(exchangeAmount, denom.multiplier)
      if (data.to === actor) {
        nativeAmount = `${fioAmount}`
      } else {
        nativeAmount = `-${fioAmount}`
        networkFee = fioAmount
      }

      const index = this.findTransaction(
        currencyCode,
        action.action_trace.trx_id
      )
      // Check if transfer transaction have already added
      if (index > -1) {
        const existingTrx = this.transactionList[currencyCode][index]
        otherParams = { ...existingTrx.otherParams }
        if (bns.gte(existingTrx.nativeAmount, '0')) {
          return action.block_num
        }
        if (otherParams.isFeeProcessed) {
          return action.block_num
        }
        if (otherParams.isTransferProcessed) {
          nativeAmount = bns.sub(existingTrx.nativeAmount, networkFee)
        } else {
          this.log.error(
            'processTransaction error - existing spend transaction should have isTransferProcessed or isFeeProcessed set'
          )
        }
      }

      otherParams.isFeeProcessed = true
      const edgeTransaction: EdgeTransaction = {
        txid: action.action_trace.trx_id,
        date: this.getUTCDate(action.block_time) / 1000,
        currencyCode,
        blockHeight: action.block_num > 0 ? action.block_num : 0,
        nativeAmount,
        networkFee,
        signedTx: '',
        ourReceiveAddresses: [],
        otherParams
      }
      this.addTransaction(currencyCode, edgeTransaction)
    }

    return action.block_num
  }

  async checkTransactions(historyNodeIndex: number = 0): Promise<boolean> {
    if (!this.currencyInfo.defaultSettings.historyNodeUrls[historyNodeIndex])
      return false
    let newHighestTxHeight = this.walletLocalData.otherData.highestTxHeight
    let lastActionSeqNumber = 0
    const actor = this.fioSdk.transactions.getActor(
      this.walletInfo.keys.publicKey
    )
    try {
      const lastActionObject = await this.requestHistory(
        historyNodeIndex,
        {
          account_name: actor,
          pos: -1,
          offset: -1
        },
        HISTORY_NODE_ACTIONS.getActions
      )

      if (lastActionObject.error && lastActionObject.error.noNodeForIndex) {
        // no more history nodes left
        return false
      }

      asHistoryResponse(lastActionObject)
      if (lastActionObject.actions.length) {
        lastActionSeqNumber = lastActionObject.actions[0].account_action_seq
      } else {
        // if no transactions at all
        return true
      }
    } catch (e) {
      return this.checkTransactions(++historyNodeIndex)
    }

    let pos = lastActionSeqNumber
    let finish = false

    while (!finish) {
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
            offset: -HISTORY_NODE_OFFSET + 1
          },
          HISTORY_NODE_ACTIONS.getActions
        )
        if (actionsObject.error && actionsObject.error.noNodeForIndex) {
          return false
        }

        let actions = []

        if (actionsObject.actions && actionsObject.actions.length > 0) {
          actions = actionsObject.actions
        } else {
          break
        }

        for (let i = actions.length - 1; i > -1; i--) {
          const action = actions[i]
          asFioHistoryNodeAction(action)
          const blockNum = this.processTransaction(action, actor)

          if (blockNum > newHighestTxHeight) {
            newHighestTxHeight = blockNum
          } else if (
            (blockNum === newHighestTxHeight &&
              i === HISTORY_NODE_OFFSET - 1) ||
            blockNum < this.walletLocalData.otherData.highestTxHeight
          ) {
            finish = true
            break
          }
        }

        if (!actions.length || actions.length < HISTORY_NODE_OFFSET) {
          break
        }
        pos -= HISTORY_NODE_OFFSET
      } catch (e) {
        return this.checkTransactions(++historyNodeIndex)
      }
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
      this.log.error('checkTransactionsInnerLoop fetches failed with error: ')
      this.log.error(e)
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

  async requestHistory(
    nodeIndex: number,
    params: {
      account_name: string,
      pos: number,
      offset: number
    },
    uri: string
  ): Promise<any> {
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

  async fioApiRequest(
    apiUrl: string,
    actionName: string,
    params?: any,
    returnPreparedTrx: boolean = false
  ): Promise<any | PreparedTrx> {
    const fioSdk = returnPreparedTrx ? this.fioSdkPreparedTrx : this.fioSdk
    this.setFioSdkBaseUrl(apiUrl)

    let res

    try {
      switch (actionName) {
        case 'getChainInfo':
          res = await fioSdk.transactions.getChainInfo()
          break
        default:
          res = await fioSdk.genericAction(actionName, params)
      }
    } catch (e) {
      // handle FIO API error
      if (e.errorCode && fioApiErrorCodes.indexOf(e.errorCode) > -1) {
        if (
          e.json &&
          e.json.fields &&
          e.json.fields[0] &&
          e.json.fields[0].error
        ) {
          e.message = e.json.fields[0].error
        }
        res = {
          isError: true,
          data: {
            code: e.errorCode,
            message: e.message,
            json: e.json,
            list: e.list
          }
        }
        if (e.errorCode !== 404)
          this.log(
            `fioApiRequest error. actionName: ${actionName} - apiUrl: ${apiUrl} - message: ${JSON.stringify(
              e.json
            )}`
          )
      } else {
        this.log(
          `fioApiRequest error. actionName: ${actionName} - apiUrl: ${apiUrl} - message: ${e.message}`
        )
        throw e
      }
    }

    return res
  }

  async executePreparedTrx(
    apiUrl: string,
    endpoint: string,
    preparedTrx: PreparedTrx
  ) {
    this.setFioSdkBaseUrl(apiUrl)
    let res

    this.log.warn(
      `executePreparedTrx. preparedTrx: ${JSON.stringify(
        preparedTrx
      )} - apiUrl: ${apiUrl}`
    )
    try {
      res = await this.fioSdk.executePreparedTrx(endpoint, preparedTrx)
      this.log.warn(
        `executePreparedTrx. res: ${JSON.stringify(
          res
        )} - apiUrl: ${apiUrl} - endpoint: ${endpoint}`
      )
    } catch (e) {
      // handle FIO API error
      if (e.errorCode && fioApiErrorCodes.indexOf(e.errorCode) > -1) {
        this.log(
          `executePreparedTrx error. requestParams: ${JSON.stringify(
            preparedTrx
          )} - apiUrl: ${apiUrl} - endpoint: ${endpoint} - message: ${JSON.stringify(
            e.json
          )}`
        )
        if (
          e.json &&
          e.json.fields &&
          e.json.fields[0] &&
          e.json.fields[0].error
        ) {
          e.message = e.json.fields[0].error
        }
        throw e
      } else {
        this.log(
          `executePreparedTrx error. requestParams: ${JSON.stringify(
            preparedTrx
          )} - apiUrl: ${apiUrl} - endpoint: ${endpoint} - message: ${
            e.message
          }`
        )
        throw e
      }
    }

    return res
  }

  async multicastServers(actionName: string, params?: any): Promise<any> {
    let res
    if (BROADCAST_ACTIONS[actionName]) {
      this.log.warn(
        `multicastServers prepare trx. actionName: ${actionName} - res: ${JSON.stringify(
          params
        )}`
      )
      const preparedTrx = await asyncWaterfall(
        shuffleArray(
          this.currencyInfo.defaultSettings.apiUrls.map(
            apiUrl => () => this.fioApiRequest(apiUrl, actionName, params, true)
          )
        )
      )
      this.log.warn(
        `multicastServers executePreparedTrx. actionName: ${actionName} - res: ${JSON.stringify(
          preparedTrx
        )}`
      )
      res = await promiseAny(
        shuffleArray(
          this.currencyInfo.defaultSettings.apiUrls.map(apiUrl =>
            this.executePreparedTrx(
              apiUrl,
              EndPoint[ACTIONS_TO_END_POINT_KEYS[actionName]],
              preparedTrx
            )
          )
        )
      )
      this.log.warn(
        `multicastServers res. actionName: ${actionName} - res: ${JSON.stringify(
          res
        )}`
      )
      if (!res) {
        throw new Error('Service is unavailable')
      }
    } else if (actionName === 'getFioNames') {
      res = await promiseNy(
        this.currencyInfo.defaultSettings.apiUrls.map(apiUrl =>
          timeout(this.fioApiRequest(apiUrl, actionName, params), 10000)
        ),
        (result: GetFioName) => {
          try {
            return JSON.stringify(asGetFioName(result))
          } catch (e) {
            this.log(
              `getFioNames checkResult function returned error ${e.name} ${e.message}`
            )
          }
        },
        2
      )
    } else {
      res = await asyncWaterfall(
        shuffleArray(
          this.currencyInfo.defaultSettings.apiUrls.map(
            apiUrl => () => this.fioApiRequest(apiUrl, actionName, params)
          )
        )
      )
    }

    if (res.isError) {
      const error = new FioError(res.errorMessage || res.data.message)
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
      this.log('checkAccountInnerLoop error: ' + e)
      nativeAmount = '0'
    }
    this.updateBalance(currencyCode, nativeAmount)

    // Fio Addresses
    try {
      const result = await this.multicastServers('getFioNames', {
        fioPublicKey: this.walletInfo.keys.publicKey
      })

      let isChanged = false
      let areAddressesChanged = false
      let areDomainsChanged = false

      // check addresses
      if (
        result.fio_addresses.length !==
        this.walletLocalData.otherData.fioAddresses.length
      ) {
        areAddressesChanged = true
      } else {
        for (const fioAddress of result.fio_addresses) {
          const existedFioAddress =
            this.walletLocalData.otherData.fioAddresses.find(
              existedFioAddress =>
                existedFioAddress.name === fioAddress.fio_address
            )
          if (existedFioAddress) {
            if (existedFioAddress.expiration !== fioAddress.expiration) {
              areAddressesChanged = true
              break
            }
          } else {
            areAddressesChanged = true
            break
          }
        }

        // check for removed / transferred addresses
        if (!areAddressesChanged) {
          for (const fioAddress of this.walletLocalData.otherData
            .fioAddresses) {
            if (
              result.fio_addresses.findIndex(
                item => item.fio_address === fioAddress.name
              ) < 0
            ) {
              areAddressesChanged = true
              break
            }
          }
        }
      }

      // check domains
      if (
        result.fio_domains.length !==
        this.walletLocalData.otherData.fioDomains.length
      ) {
        areDomainsChanged = true
      } else {
        for (const fioDomain of result.fio_domains) {
          const existedFioDomain =
            this.walletLocalData.otherData.fioDomains.find(
              existedFioDomain => existedFioDomain.name === fioDomain.fio_domain
            )
          if (existedFioDomain) {
            if (existedFioDomain.expiration !== fioDomain.expiration) {
              areDomainsChanged = true
              break
            }
            if (existedFioDomain.isPublic !== !!fioDomain.is_public) {
              areDomainsChanged = true
              break
            }
          } else {
            areDomainsChanged = true
            break
          }
        }

        // check for removed / transferred domains
        if (!areDomainsChanged) {
          for (const fioDomain of this.walletLocalData.otherData.fioDomains) {
            if (
              result.fio_domains.findIndex(
                item => item.fio_domain === fioDomain.name
              ) < 0
            ) {
              areDomainsChanged = true
              break
            }
          }
        }
      }

      if (areAddressesChanged) {
        isChanged = true
        this.walletLocalData.otherData.fioAddresses = result.fio_addresses.map(
          fioAddress => ({
            name: fioAddress.fio_address,
            expiration: fioAddress.expiration
          })
        )
      }

      if (areDomainsChanged) {
        isChanged = true
        this.walletLocalData.otherData.fioDomains = result.fio_domains.map(
          fioDomain => ({
            name: fioDomain.fio_domain,
            expiration: fioDomain.expiration,
            isPublic: !!fioDomain.is_public
          })
        )
      }

      if (isChanged) this.localDataDirty()
    } catch (e) {
      this.log.warn('checkAccountInnerLoop getFioNames error: ' + e)
    }
  }

  async checkFioRequests(): Promise<void> {
    await this.fetchFioRequests(FIO_REQUESTS_TYPES.PENDING)
    await this.fetchFioRequests(FIO_REQUESTS_TYPES.SENT)
  }

  async fetchFioRequests(type: string): Promise<void> {
    const ITEMS_PER_PAGE = 100
    const ACTION_TYPE_MAP = {
      [FIO_REQUESTS_TYPES.PENDING]: 'getPendingFioRequests',
      [FIO_REQUESTS_TYPES.SENT]: 'getSentFioRequests'
    }
    const IS_PENDING = type === FIO_REQUESTS_TYPES.PENDING

    if (this.walletLocalData.otherData.fioRequests == null) {
      this.walletLocalData.otherData.fioRequests = {
        [FIO_REQUESTS_TYPES.SENT]: [],
        [FIO_REQUESTS_TYPES.PENDING]: []
      }
    }

    let isChanged = false
    let lastPageAmount = ITEMS_PER_PAGE
    let requestsLastPage = 1
    const fioRequests = []
    while (lastPageAmount === ITEMS_PER_PAGE) {
      const nextFioRequests: FioRequest[] = []

      try {
        const { requests } = await this.multicastServers(
          ACTION_TYPE_MAP[type],
          {
            fioPublicKey: this.walletInfo.keys.publicKey,
            limit: ITEMS_PER_PAGE,
            offset: (requestsLastPage - 1) * ITEMS_PER_PAGE
          }
        )

        if (requests) {
          for (const fioRequest: FioRequest of requests) {
            if (
              IS_PENDING &&
              this.walletLocalData.otherData.fioRequestsToApprove[
                fioRequest.fio_request_id
              ]
            )
              continue
            if (
              this.walletLocalData.otherData.fioRequests[type].findIndex(
                (exFioRequest: FioRequest) =>
                  exFioRequest.fio_request_id === fioRequest.fio_request_id
              ) < 0 &&
              nextFioRequests.findIndex(
                (exFioRequest: FioRequest) =>
                  exFioRequest.fio_request_id === fioRequest.fio_request_id
              ) < 0
            ) {
              nextFioRequests.push(fioRequest)
              isChanged = true
            }
          }
          requestsLastPage++
          fioRequests.push(...nextFioRequests)
          lastPageAmount = requests.length
        }
      } catch (e) {
        lastPageAmount = 0
        this.log.error(e.message)
      }
    }

    if (
      this.fioRequestsListChanged(
        this.walletLocalData.otherData.fioRequests[type],
        fioRequests
      )
    ) {
      this.walletLocalData.otherData.fioRequests[type] = [...fioRequests]
      isChanged = true
    }

    if (isChanged) this.localDataDirty()
  }

  fioRequestsListChanged = (
    existingList: FioRequest[],
    newList: FioRequest[]
  ): boolean => {
    if (existingList.length !== newList.length) return true
    for (const fioRequest of existingList) {
      if (
        newList.findIndex(
          (newFioRequest: FioRequest) =>
            newFioRequest.fio_request_id === fioRequest.fio_request_id
        ) < 0
      ) {
        return true
      }
    }

    return false
  }

  removeFioRequest = (fioRequestId: string | number, type: string): void => {
    const fioRequestIndex = this.walletLocalData.otherData.fioRequests[
      type
    ].findIndex(
      (fioRequest: FioRequest) =>
        fioRequest.fio_request_id === `${fioRequestId}`
    )

    if (fioRequestIndex > -1) {
      this.walletLocalData.otherData.fioRequests[type].splice(
        fioRequestIndex,
        1
      )
    }
  }

  async approveErroredFioRequests(): Promise<void> {
    for (const fioRequestId in this.walletLocalData.otherData
      .fioRequestsToApprove) {
      try {
        await this.otherMethods.fioAction(
          'recordObtData',
          this.walletLocalData.otherData.fioRequestsToApprove[fioRequestId]
        )
      } catch (e) {
        this.log.error(
          `approveErroredFioRequests recordObtData error: ${JSON.stringify(
            e
          )} for ${
            this.walletLocalData.otherData.fioRequestsToApprove[fioRequestId]
          }`
        )
      }
    }
  }

  async clearBlockchainCache(): Promise<void> {
    await super.clearBlockchainCache()
    this.walletLocalData.otherData.highestTxHeight = 0
    this.walletLocalData.otherData.fioAddresses = []
    this.walletLocalData.otherData.fioDomains = []
    this.walletLocalData.otherData.fioRequests = {
      [FIO_REQUESTS_TYPES.SENT]: [],
      [FIO_REQUESTS_TYPES.PENDING]: []
    }
    this.walletLocalData.otherData.fioRequestsToApprove = {}
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
    this.addToLoop('approveErroredFioRequests', ADDRESS_POLL_MILLISECONDS)
    this.addToLoop('checkFioRequests', REQUEST_POLL_MILLISECONDS)
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

    const { otherParams } = edgeSpendInfo
    let fee
    if (otherParams?.fioAction) {
      let feeFioAddress = ''
      if (FEE_ACTION_MAP[otherParams.fioAction] && otherParams.fioParams) {
        feeFioAddress =
          otherParams.fioParams[FEE_ACTION_MAP[otherParams.fioAction].propName]
      }
      const feeResponse = await this.multicastServers('getFee', {
        endPoint: EndPoint[otherParams.fioAction],
        fioAddress: feeFioAddress
      })
      fee = feeResponse.fee
    } else {
      // Only query FIO fee if the public address is different from last makeSpend()
      if (
        edgeSpendInfo.spendTargets[0].publicAddress ===
        this.recentFioFee.publicAddress
      ) {
        fee = this.recentFioFee.fee
      } else {
        const feeResponse = await this.multicastServers('getFee', {
          endPoint: EndPoint.transferTokens
        })
        fee = feeResponse.fee
      }
    }

    const publicAddress = edgeSpendInfo.spendTargets[0].publicAddress
    const quantity = edgeSpendInfo.spendTargets[0].nativeAmount
    if (bns.gt(bns.add(quantity, `${fee}`), nativeBalance)) {
      throw new InsufficientFundsError()
    }

    if (otherParams?.fioAction) {
      if (
        ['transferFioAddress', 'transferFioDomain'].indexOf(
          otherParams.fioAction
        ) > -1
      ) {
        otherParams.fioParams.newOwnerKey = publicAddress
      }
      const edgeTransaction: EdgeTransaction = {
        txid: '',
        date: 0,
        currencyCode: this.currencyInfo.currencyCode,
        blockHeight: 0,
        nativeAmount: `-${fee}`,
        networkFee: `${fee}`,
        parentNetworkFee: '0',
        signedTx: '',
        ourReceiveAddresses: [],
        otherParams: {
          transactionJson: otherParams
        },
        metadata: {
          notes: ''
        }
      }

      return edgeTransaction
    } else {
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

      this.recentFioFee = { publicAddress, fee }

      return edgeTransaction
    }
  }

  async signTx(edgeTransaction: EdgeTransaction): Promise<EdgeTransaction> {
    // Do nothing
    return edgeTransaction
  }

  async broadcastTx(
    edgeTransaction: EdgeTransaction
  ): Promise<EdgeTransaction> {
    let trx
    if (
      edgeTransaction.otherParams &&
      edgeTransaction.otherParams.transactionJson &&
      edgeTransaction.otherParams.transactionJson.fioAction
    ) {
      trx = await this.otherMethods.fioAction(
        edgeTransaction.otherParams.transactionJson.fioAction,
        edgeTransaction.otherParams.transactionJson.fioParams
      )
      edgeTransaction.metadata = {
        notes: trx.transaction_id
      }
    } else if (edgeTransaction.spendTargets) {
      // do transfer
      const publicAddress = edgeTransaction.spendTargets[0].publicAddress
      const amount = bns.abs(
        bns.add(edgeTransaction.nativeAmount, edgeTransaction.networkFee)
      )
      trx = await this.multicastServers('transferTokens', {
        payeeFioPublicKey: publicAddress,
        amount,
        maxFee: edgeTransaction.networkFee
      })
    } else {
      throw new Error(
        'transactionJson not set. FIO transferTokens requires publicAddress'
      )
    }

    edgeTransaction.txid = trx.transaction_id
    edgeTransaction.date = Date.now() / 1000
    edgeTransaction.blockHeight = trx.block_num
    this.log.warn(`SUCCESS broadcastTx\n${cleanTxLogs(edgeTransaction)}`)

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
