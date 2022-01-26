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
  type EdgeStakingStatus,
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
  safeErrorMessage,
  shuffleArray,
  timeout
} from '../common/utils'
import {
  type FioAddress,
  type FioDomain,
  type FioRequest,
  type TxOtherParams,
  ACTIONS,
  ACTIONS_TO_END_POINT_KEYS,
  ACTIONS_TO_FEE_END_POINT_KEYS,
  BROADCAST_ACTIONS,
  DEFAULT_BUNDLED_TXS_AMOUNT,
  FEE_ACTION_MAP,
  FIO_REQUESTS_TYPES,
  HISTORY_NODE_ACTIONS,
  HISTORY_NODE_OFFSET,
  STAKING_LOCK_PERIOD,
  STAKING_REWARD_MEMO
} from './fioConst'
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
    fioRequestsToApprove: { [requestId: string]: any },
    srps: number,
    stakingRoe: string,
    stakingStatus: EdgeStakingStatus
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
              this.otherData.fioRequestsToApprove[params.fioRequestId] = params
              this.localDataDirty()
              const res = await this.multicastServers(actionName, params)
              if (res && res.status === 'sent_to_blockchain') {
                delete this.otherData.fioRequestsToApprove[params.fioRequestId]
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
                feeCollected: res.fee_collected
              }
            }
            const addressAlreadyAdded = this.otherData.fioAddresses.find(
              ({ name }) => name === params.fioAddress
            )
            if (!addressAlreadyAdded) {
              this.otherData.fioAddresses.push({
                name: params.fioAddress
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
            const renewedDomain = this.otherData.fioDomains.find(
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
            // todo: why we use pushTransaction here?
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
            const transferredDomainIndex = this.otherData.fioDomains.findIndex(
              ({ name }) => name === params.fioDomain
            )
            if (transferredDomainIndex) {
              this.otherData.fioDomains.splice(transferredDomainIndex, 1)
              this.localDataDirty()
            }
            return res
          }
          case 'transferFioAddress': {
            const res = await this.multicastServers(actionName, params)
            const transferredAddressIndex =
              this.otherData.fioAddresses.findIndex(
                ({ name }) => name === params.fioAddress
              )
            if (transferredAddressIndex) {
              this.otherData.fioAddresses.splice(transferredAddressIndex, 1)
              this.localDataDirty()
            }
            return res
          }
          case 'addBundledTransactions': {
            const fioAddress = this.otherData.fioAddresses.find(
              ({ name }) => name === params.fioAddress
            )

            if (fioAddress == null)
              throw new FioError('Fio Address is not found in engine')

            const res = await this.multicastServers(actionName, params)

            fioAddress.bundledTxs += DEFAULT_BUNDLED_TXS_AMOUNT
            this.localDataDirty()
            return { bundledTxs: fioAddress.bundledTxs, ...res }
          }
        }

        return this.multicastServers(actionName, params)
      },
      getFee: async (
        actionName: string,
        fioAddress: string = ''
      ): Promise<number> => {
        const { fee } = await this.multicastServers('getFee', {
          endPoint: EndPoint[ACTIONS_TO_FEE_END_POINT_KEYS[actionName]],
          fioAddress
        })
        return fee
      },
      getFioAddresses: async (): Promise<FioAddress[]> => {
        return this.otherData.fioAddresses
      },
      getFioAddressNames: async (): Promise<string[]> => {
        return this.otherData.fioAddresses.map(fioAddress => fioAddress.name)
      },
      getFioDomains: async (): Promise<FioDomain[]> => {
        return this.otherData.fioDomains
      },
      getFioRequests: async (
        type: string,
        page: number,
        itemsPerPage: number = 50
      ): Promise<FioRequest[]> => {
        const startIndex = itemsPerPage * (page - 1)
        const endIndex = itemsPerPage * page
        return this.otherData.fioRequests[type]
          .sort((a, b) => (a.time_stamp < b.time_stamp ? 1 : -1))
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
      this.error(`checkBlockchainInnerLoop Error fetching height: `, e)
    }
  }

  getBalance(options: any): string {
    return super.getBalance(options)
  }

  doInitialBalanceCallback() {
    super.doInitialBalanceCallback()

    const balanceCurrencyCodes =
      this.currencyInfo.defaultSettings.balanceCurrencyCodes
    for (const currencyCodeKey in balanceCurrencyCodes) {
      try {
        this.currencyEngineCallbacks.onBalanceChanged(
          balanceCurrencyCodes[currencyCodeKey],
          this.walletLocalData.totalBalances[
            balanceCurrencyCodes[currencyCodeKey]
          ] ?? '0'
        )
      } catch (e) {
        this.log.error(
          'doInitialBalanceCallback Error for currencyCode',
          balanceCurrencyCodes[currencyCodeKey],
          e
        )
      }
    }
  }

  updateBalance(tk: string, balance: string) {
    if (typeof this.walletLocalData.totalBalances[tk] === 'undefined') {
      this.walletLocalData.totalBalances[tk] = '0'
    }
    if (!bns.eq(balance, this.walletLocalData.totalBalances[tk])) {
      this.walletLocalData.totalBalances[tk] = balance
      this.localDataDirty()
      this.warn(`${tk}: token Address balance: ${balance}`)
      this.currencyEngineCallbacks.onBalanceChanged(tk, balance)
    }
    this.tokenCheckBalanceStatus[tk] = 1
    this.updateOnAddressesChecked()
  }

  checkUnStakeTx(otherParams: TxOtherParams): boolean {
    return (
      otherParams.name === 'unstakefio' ||
      (otherParams.data != null &&
        otherParams.data.memo === STAKING_REWARD_MEMO)
    )
  }

  updateStakingStatus(
    nativeAmount: string,
    blockTime: string,
    txId: string
  ): void {
    const stakedAmountIndex =
      this.otherData.stakingStatus.stakedAmounts.findIndex(
        ({ otherParams }) => {
          if (otherParams.date == null) return false

          return (
            new Date(otherParams.date).toDateString() ===
            new Date(blockTime).toDateString()
          )
        }
      )

    if (stakedAmountIndex < 0) {
      this.otherData.stakingStatus.stakedAmounts.push({
        nativeAmount,
        unlockDate: new Date(
          new Date(blockTime).getTime() + STAKING_LOCK_PERIOD
        ),
        otherParams: {
          date: new Date(blockTime),
          txs: [{ txId, nativeAmount, blockTime }]
        }
      })
    } else {
      const stakedAmount = {
        ...this.otherData.stakingStatus.stakedAmounts[stakedAmountIndex],
        nativeAmount: '0'
      }
      const addedTxIndex = stakedAmount.otherParams.txs.findIndex(
        ({ txId: itemTxId }) => itemTxId === txId
      )

      if (addedTxIndex < 0) {
        stakedAmount.otherParams.txs.push({
          txId,
          nativeAmount,
          blockTime
        })
      } else {
        stakedAmount.otherParams.txs[addedTxIndex] = {
          txId,
          nativeAmount,
          blockTime
        }
      }

      for (const tx of stakedAmount.otherParams.txs) {
        stakedAmount.nativeAmount = bns.add(
          stakedAmount.nativeAmount,
          tx.nativeAmount
        )
      }

      this.otherData.stakingStatus.stakedAmounts[stakedAmountIndex] =
        stakedAmount
    }

    this.localDataDirty()
    try {
      this.currencyEngineCallbacks.onStakingStatusChanged(
        { ...this.otherData.stakingStatus }
      )
    } catch (e) {
      this.error('onStakingStatusChanged error')
    }
  }

  async getStakingStatus(): Promise<EdgeStakingStatus> {
    return this.otherData.stakingStatus
  }

  processTransaction(
    action: FioHistoryNodeAction,
    actor: string,
    currencyCode: string = this.currencyInfo.currencyCode
  ): number {
    const {
      act: { name: trxName, data, account, authorization }
    } = action.action_trace
    const lockedTokenCode =
      this.currencyInfo.defaultSettings.balanceCurrencyCodes.locked
    let nativeAmount
    let actorSender
    let networkFee = '0'
    let otherParams: TxOtherParams = {
      account,
      name: trxName,
      authorization,
      data,
      meta: {}
    }
    const ourReceiveAddresses = []
    if (action.block_num <= this.walletLocalData.otherData.highestTxHeight) {
      return action.block_num
    }

    // Transfer funds transaction
    if (trxName !== 'transfer') {
      nativeAmount = '0'
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
      }

      const index = this.findTransaction(
        currencyCode,
        action.action_trace.trx_id
      )
      // Check if fee transaction have already added
      if (index > -1) {
        const existingTrx = this.transactionList[currencyCode][index]
        otherParams = {
          ...existingTrx.otherParams,
          ...otherParams,
          data: {
            ...(existingTrx.otherParams != null &&
            existingTrx.otherParams.data != null
              ? existingTrx.otherParams.data
              : {}),
            ...otherParams.data
          },
          meta: {
            ...(existingTrx.otherParams != null &&
            existingTrx.otherParams.meta != null
              ? existingTrx.otherParams.meta
              : {}),
            ...otherParams.meta
          }
        }

        if (otherParams.meta.isTransferProcessed) {
          return action.block_num
        }
        if (otherParams.meta.isFeeProcessed) {
          if (trxName === 'trnsfiopubky') {
            nativeAmount = bns.sub(nativeAmount, existingTrx.networkFee)
            networkFee = existingTrx.networkFee
          } else {
            nativeAmount = existingTrx.nativeAmount
            networkFee = '0'

            if (currencyCode === lockedTokenCode) {
              nativeAmount = bns.add(
                nativeAmount,
                data.amount != null ? data.amount.toString() : '0'
              )
            }
          }
        } else {
          this.error(
            'processTransaction error - existing spend transaction should have isTransferProcessed or isFeeProcessed set'
          )
        }
      }
      otherParams.meta.isTransferProcessed = true

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
      let denom = getDenomInfo(this.currencyInfo, currencyCode)
      if (!denom) {
        denom = getDenomInfo(this.currencyInfo, this.currencyInfo.currencyCode)
        if (!denom) {
          this.error(`Received unsupported currencyCode: ${currencyCode}`)
          return 0
        }
      }

      const fioAmount = bns.mul(exchangeAmount, denom.multiplier)
      if (data.to === actor) {
        nativeAmount = `${fioAmount}`
        networkFee = `-${fioAmount}`
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
        otherParams = {
          ...otherParams,
          ...existingTrx.otherParams,
          data: {
            ...otherParams.data,
            ...(existingTrx.otherParams != null &&
            existingTrx.otherParams.data != null
              ? existingTrx.otherParams.data
              : {})
          },
          meta: {
            ...otherParams.meta,
            ...(existingTrx.otherParams != null &&
            existingTrx.otherParams.meta != null
              ? existingTrx.otherParams.meta
              : {})
          }
        }
        if (otherParams.meta.isFeeProcessed) {
          return action.block_num
        }
        if (otherParams.meta.isTransferProcessed) {
          if (data.to !== actor) {
            nativeAmount = bns.sub(existingTrx.nativeAmount, networkFee)
          } else {
            networkFee = '0'

            if (currencyCode === lockedTokenCode) {
              nativeAmount = bns.add(
                nativeAmount,
                existingTrx.otherParams != null &&
                  existingTrx.otherParams.data != null
                  ? existingTrx.otherParams.data.amount.toString()
                  : '0'
              )
            }
          }
        } else {
          this.error(
            'processTransaction error - existing spend transaction should have isTransferProcessed or isFeeProcessed set'
          )
        }
      }

      otherParams.meta.isFeeProcessed = true
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

    if (this.checkUnStakeTx(otherParams)) {
      if (currencyCode === this.currencyInfo.currencyCode)
        this.processTransaction(action, actor, lockedTokenCode)

      if (currencyCode === lockedTokenCode)
        this.updateStakingStatus(
          nativeAmount || '0',
          action.block_time,
          action.action_trace.trx_id
        )
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
      this.error('checkTransactionsInnerLoop fetches failed with error: ', e)
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
            message: e.message ?? safeErrorMessage(e),
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
          `fioApiRequest error. actionName: ${actionName} - apiUrl: ${apiUrl} - message: `,
          e
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

    this.warn(
      `executePreparedTrx. preparedTrx: ${JSON.stringify(
        preparedTrx
      )} - apiUrl: ${apiUrl}`
    )
    try {
      res = await this.fioSdk.executePreparedTrx(endpoint, preparedTrx)
      this.warn(
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
          )} - apiUrl: ${apiUrl} - endpoint: ${endpoint} - message: `,
          e
        )
        throw e
      }
    }

    return res
  }

  async multicastServers(actionName: string, params?: any): Promise<any> {
    let res
    if (BROADCAST_ACTIONS[actionName]) {
      this.warn(
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
      this.warn(
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
      this.warn(
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
            this.log(`getFioNames checkResult function returned error `, e)
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
    const balances: {
      available: string,
      staked: string,
      locked: string,
      accrued: string
    } = {}
    const currencyCode = this.currencyInfo.currencyCode
    const balanceCurrencyCodes =
      this.currencyInfo.defaultSettings.balanceCurrencyCodes

    let nativeAmount = '0'
    if (
      typeof this.walletLocalData.totalBalances[currencyCode] === 'undefined'
    ) {
      this.walletLocalData.totalBalances[currencyCode] = '0'
    }

    // Balance
    try {
      const { balance, available, staked, srps, roe } =
        await this.multicastServers('getFioBalance')
      nativeAmount = balance != null ? String(balance) : '0'
      balances.available = available != null ? String(available) : '0'
      balances.staked = staked != null ? String(staked) : '0'
      balances.locked = bns.sub(nativeAmount, balances.available)
      balances.accrued =
        srps != null && roe != null ? bns.mul(String(srps), roe) : '0'

      this.otherData.srps = srps
      this.otherData.stakingRoe = roe
    } catch (e) {
      this.log('checkAccountInnerLoop error: ', e)
      nativeAmount = '0'
    }
    this.updateBalance(currencyCode, nativeAmount)
    this.updateBalance(balanceCurrencyCodes.staked, balances.staked)
    this.updateBalance(balanceCurrencyCodes.available, balances.available)
    this.updateBalance(balanceCurrencyCodes.locked, balances.locked)
    this.updateBalance(balanceCurrencyCodes.accrued, balances.accrued)

    // Fio Addresses
    try {
      const result = await this.multicastServers('getFioNames', {
        fioPublicKey: this.walletInfo.keys.publicKey
      })

      let isChanged = false
      let areAddressesChanged = false
      let areDomainsChanged = false

      // check addresses
      if (result.fio_addresses.length !== this.otherData.fioAddresses.length) {
        areAddressesChanged = true
      } else {
        for (const fioAddress of result.fio_addresses) {
          const existedFioAddress = this.otherData.fioAddresses.find(
            existedFioAddress =>
              existedFioAddress.name === fioAddress.fio_address
          )
          if (existedFioAddress) {
            if (
              existedFioAddress.bundledTxs !== fioAddress.remaining_bundled_tx
            ) {
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
      if (result.fio_domains.length !== this.otherData.fioDomains.length) {
        areDomainsChanged = true
      } else {
        for (const fioDomain of result.fio_domains) {
          const existedFioDomain = this.otherData.fioDomains.find(
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
          for (const fioDomain of this.otherData.fioDomains) {
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
        this.otherData.fioAddresses = result.fio_addresses.map(fioAddress => ({
          name: fioAddress.fio_address,
          bundledTxs: fioAddress.remaining_bundled_tx
        }))
      }

      if (areDomainsChanged) {
        isChanged = true
        this.otherData.fioDomains = result.fio_domains.map(fioDomain => ({
          name: fioDomain.fio_domain,
          expiration: fioDomain.expiration,
          isPublic: !!fioDomain.is_public
        }))
      }

      if (isChanged) this.localDataDirty()
    } catch (e) {
      this.warn('checkAccountInnerLoop getFioNames error: ', e)
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

    if (this.otherData.fioRequests == null) {
      this.otherData.fioRequests = {
        [FIO_REQUESTS_TYPES.SENT]: [],
        [FIO_REQUESTS_TYPES.PENDING]: []
      }
    }

    let isChanged = false
    let lastPageAmount = ITEMS_PER_PAGE
    let requestsLastPage = 1
    const fioRequests: FioRequest[] = []
    while (lastPageAmount === ITEMS_PER_PAGE) {
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
          requestsLastPage++
          fioRequests.push(...requests)
          lastPageAmount = requests.length
        }
      } catch (e) {
        lastPageAmount = 0
        this.error('fetchFioRequests error: ', e)
      }
    }

    if (
      this.fioRequestsListChanged(this.otherData.fioRequests[type], fioRequests)
    ) {
      this.otherData.fioRequests[type] = [...fioRequests]
      isChanged = true
    }

    if (isChanged) this.localDataDirty()
  }

  fioRequestsListChanged = (
    existingList: FioRequest[],
    newList: FioRequest[]
  ): boolean => {
    function compareArray(arrA, arrB) {
      for (const fioRequest of arrA) {
        if (
          arrB.findIndex(
            (newFioRequest: FioRequest) =>
              newFioRequest.fio_request_id === fioRequest.fio_request_id
          ) < 0
        ) {
          return true
        }
      }
      return false
    }
    if (
      compareArray(existingList, newList) ||
      compareArray(newList, existingList)
    ) {
      return true
    }

    return false
  }

  removeFioRequest = (fioRequestId: string | number, type: string): void => {
    const fioRequestIndex = this.otherData.fioRequests[type].findIndex(
      (fioRequest: FioRequest) =>
        fioRequest.fio_request_id === `${fioRequestId}`
    )

    if (fioRequestIndex > -1) {
      this.otherData.fioRequests[type].splice(fioRequestIndex, 1)
    }
  }

  async approveErroredFioRequests(): Promise<void> {
    for (const fioRequestId in this.walletLocalData.otherData
      .fioRequestsToApprove) {
      try {
        await this.otherMethods.fioAction(
          'recordObtData',
          this.otherData.fioRequestsToApprove[fioRequestId]
        )
      } catch (e) {
        this.error(
          `approveErroredFioRequests recordObtData error: ${safeErrorMessage(
            e
          )} for ${this.otherData.fioRequestsToApprove[fioRequestId]}`
        )
      }
    }
  }

  async clearBlockchainCache(): Promise<void> {
    await super.clearBlockchainCache()
    this.otherData.highestTxHeight = 0
    this.otherData.fioAddresses = []
    this.otherData.fioDomains = []
    this.otherData.fioRequests = {
      [FIO_REQUESTS_TYPES.SENT]: [],
      [FIO_REQUESTS_TYPES.PENDING]: []
    }
    this.otherData.fioRequestsToApprove = {}
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

    // Set common vars
    const publicAddress = edgeSpendInfo.spendTargets[0].publicAddress
    const quantity = edgeSpendInfo.spendTargets[0].nativeAmount
    const { otherParams = {} }: { otherParams: TxOtherParams } = edgeSpendInfo

    // Set default action if not specified
    if (!otherParams.action) {
      otherParams.action = {
        name: ACTIONS.transferTokens,
        params: {
          payeeFioPublicKey: publicAddress,
          amount: quantity,
          maxFee: 0
        }
      }
    }
    otherParams.meta = { isTransferProcessed: true }

    const { name, params }: { name: string, params: any } = otherParams.action

    // Only query FIO fee if the public address is different from last makeSpend()
    let fee
    if (
      name === ACTIONS.transferTokens &&
      publicAddress === this.recentFioFee.publicAddress // todo: ask why such condition
    ) {
      fee = this.recentFioFee.fee
    } else {
      let feeFioAddress = ''
      if (FEE_ACTION_MAP[name] != null && params) {
        feeFioAddress = params[FEE_ACTION_MAP[name].propName]
      }
      fee = await this.otherMethods.getFee(name, feeFioAddress)
    }
    params.maxFee = fee

    // Set recent fee for transferTokens action
    if (name === ACTIONS.transferTokens) {
      this.recentFioFee = { publicAddress, fee }
    }

    if (bns.gt(bns.add(quantity, `${fee}`), nativeBalance)) {
      throw new InsufficientFundsError()
    }

    if (
      [ACTIONS.transferFioAddress, ACTIONS.transferFioDomain].indexOf(name) > -1
    ) {
      params.newOwnerKey = publicAddress // todo: move this to the gui
    }

    if (name === ACTIONS.stakeFioTokens) {
      params.amount = quantity
    }

    if (name === ACTIONS.unStakeFioTokens) {
      const stakedBalance =
        this.walletLocalData.totalBalances[
          this.currencyInfo.defaultSettings.balanceCurrencyCodes.staked
        ]
      if (bns.gt(quantity, stakedBalance)) {
        throw new InsufficientFundsError()
      }

      params.amount = quantity
      const accrued = bns.mul(
        bns.mul(bns.div(quantity, stakedBalance, 18), `${this.otherData.srps}`),
        this.otherData.stakingRoe
      )
      otherParams.ui = {
        accrued,
        estReward: bns.sub(accrued, quantity)
      }
    }

    const edgeTransaction: EdgeTransaction = {
      txid: '',
      date: 0,
      currencyCode,
      blockHeight: 0,
      nativeAmount: bns.sub(`-${quantity}`, `${fee}`),
      networkFee: `${fee}`,
      ourReceiveAddresses: [],
      signedTx: '',
      otherParams: {
        ...otherParams
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
    let trx
    const { otherParams } = edgeTransaction
    if (otherParams != null && otherParams.action && otherParams.action.name) {
      trx = await this.otherMethods.fioAction(
        otherParams.action.name,
        otherParams.action.params
      )
      edgeTransaction.metadata = {
        notes: trx.transaction_id
      }
    } else {
      throw new Error(
        'Action is not set, "action" prop of otherParams is required for FIO actions'
      )
    }

    edgeTransaction.txid = trx.transaction_id
    edgeTransaction.date = Date.now() / 1000
    edgeTransaction.blockHeight = trx.block_num
    this.warn(`SUCCESS broadcastTx\n${cleanTxLogs(edgeTransaction)}`)

    return edgeTransaction
  }

  async getFreshAddress(options: any): Promise<EdgeFreshAddress> {
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
