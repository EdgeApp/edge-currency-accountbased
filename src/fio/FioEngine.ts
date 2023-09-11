import { FIOSDK } from '@fioprotocol/fiosdk'
import { EndPoint } from '@fioprotocol/fiosdk/lib/entities/EndPoint'
import {
  GetObtData,
  PendingFioRequests,
  SentFioRequests
} from '@fioprotocol/fiosdk/lib/transactions/queries'
import { Query } from '@fioprotocol/fiosdk/lib/transactions/queries/Query'
import { Transactions } from '@fioprotocol/fiosdk/lib/transactions/Transactions'
import { add, div, gt, lt, max, mul, sub } from 'biggystring'
import { asMaybe } from 'cleaners'
import {
  EdgeCurrencyEngine,
  EdgeCurrencyEngineOptions,
  EdgeEnginePrivateKeyOptions,
  EdgeFetchFunction,
  EdgeFreshAddress,
  EdgeSpendInfo,
  EdgeStakingStatus,
  EdgeTransaction,
  EdgeWalletInfo,
  InsufficientFundsError,
  JsonObject,
  NoAmountSpecifiedError
} from 'edge-core-js/types'

import { CurrencyEngine } from '../common/CurrencyEngine'
import { PluginEnvironment } from '../common/innerPlugin'
import {
  asyncWaterfall,
  cleanTxLogs,
  getDenomination,
  getFetchCors,
  getOtherParams,
  promiseAny,
  promiseNy,
  safeErrorMessage,
  shuffleArray,
  timeout
} from '../common/utils'
import {
  ACTIONS,
  ACTIONS_TO_END_POINT_KEYS,
  ACTIONS_TO_TX_ACTION_NAME,
  asFioWalletOtherData,
  BROADCAST_ACTIONS,
  DAY_INTERVAL,
  DEFAULT_BUNDLED_TXS_AMOUNT,
  EncryptedFioRequest,
  FioAddress,
  FioDomain,
  FioRequest,
  FioWalletOtherData,
  HISTORY_NODE_ACTIONS,
  HISTORY_NODE_PAGE_SIZE,
  NO_FIO_NAMES,
  PUBLIC_KEY_NOT_FOUND,
  STAKING_LOCK_PERIOD,
  STAKING_REWARD_MEMO,
  TxOtherParams
} from './fioConst'
import { fioApiErrorCodes, FioError } from './fioError'
import {
  asFioHistoryNodeAction,
  asGetFioBalanceResponse,
  asGetFioName,
  asHistoryResponse,
  FioHistoryNodeAction
} from './fioSchema'
import { FioTools } from './FioTools'
import {
  asCancelFundsRequest,
  asFioAction,
  asFioAddBundledTransactions,
  asFioAddressParam,
  asFioBroadcastResult,
  asFioConnectAddressesParams,
  asFioDomainParam,
  asFioEmptyResponse,
  asFioFee,
  asFioNothingResponse,
  asFioPrivateKeys,
  asFioRecordObtData,
  asFioRequestFundsParams,
  asFioSignedTx,
  asFioTransferDomainParams,
  asFioTxParams,
  asGetFioRequestsResponse,
  asGetObtDataResponse,
  asRejectFundsRequest,
  asSafeFioWalletInfo,
  asSetFioDomainVisibility,
  comparisonFioBalanceString,
  comparisonFioNameString,
  FioActionFees,
  FioNetworkInfo,
  FioRefBlock,
  FioRequestTypes,
  FioTxParams,
  ObtData,
  SafeFioWalletInfo
} from './fioTypes'

const ADDRESS_POLL_MILLISECONDS = 10000
const BLOCKCHAIN_POLL_MILLISECONDS = 15000
const TRANSACTION_POLL_MILLISECONDS = 10000
const PROCESS_TX_NAME_LIST = [
  ACTIONS_TO_TX_ACTION_NAME[ACTIONS.transferTokens],
  ACTIONS_TO_TX_ACTION_NAME[ACTIONS.unStakeFioTokens],
  'regaddress'
]
const SYNC_NETWORK_INTERVAL = 10000

interface PreparedTrx {
  signatures: string[]
  compression: number
  packed_context_free_data: string
  packed_trx: string
}

export class FioEngine extends CurrencyEngine<FioTools, SafeFioWalletInfo> {
  fetchCors: EdgeFetchFunction
  otherMethods: Object
  tpid: string
  otherData!: FioWalletOtherData
  networkInfo: FioNetworkInfo
  refBlock: FioRefBlock
  fees: FioActionFees
  actor: string
  obtData: ObtData[]

  localDataDirty(): void {
    this.walletLocalDataDirty = true
  }

  constructor(
    env: PluginEnvironment<FioNetworkInfo>,
    tools: FioTools,
    walletInfo: SafeFioWalletInfo,
    opts: EdgeCurrencyEngineOptions,
    tpid: string
  ) {
    super(env, tools, walletInfo, opts)
    this.fetchCors = getFetchCors(env.io)
    this.tpid = tpid
    this.networkInfo = env.networkInfo
    this.refBlock = {
      expiration: '',
      ref_block_num: 0,
      ref_block_prefix: 0
    }
    this.fees = new Map()
    this.actor = FIOSDK.accountHash(this.walletInfo.keys.publicKey).accountnm
    this.obtData = []

    this.otherMethods = {
      fioAction: async (actionName: string, params: any): Promise<any> => {
        return await this.multicastServers(actionName, params)
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
        type: FioRequestTypes,
        page: number,
        itemsPerPage: number = 50
      ): Promise<FioRequest[]> => {
        const startIndex = itemsPerPage * (page - 1)
        const endIndex = itemsPerPage * page
        return this.otherData.fioRequests[type]
          .sort((a, b) => (a.time_stamp < b.time_stamp ? 1 : -1))
          .slice(startIndex, endIndex)
      },
      getObtData: async (): Promise<ObtData[]> => {
        return this.obtData
      }
    }
  }

  setOtherData(raw: any): void {
    this.otherData = asFioWalletOtherData(raw)
  }

  // Normalize date if not exists "Z" parameter
  getUTCDate(dateString: string): number {
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

  /*
  Unstaked FIO is locked until 7 days after the start of the GMT day for when
  the transaction occurred (block-time).
  */
  getUnlockDate(txDate: Date): Date {
    const blockTimeBeginingOfGmtDay =
      Math.floor(txDate.getTime() / DAY_INTERVAL) * DAY_INTERVAL
    return new Date(blockTimeBeginingOfGmtDay + STAKING_LOCK_PERIOD)
  }

  // Poll on the blockheight
  async checkBlockchainInnerLoop(): Promise<void> {
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

      const block = await this.multicastServers('getBlock', info)
      const expiration = new Date(`${info.head_block_time}Z`)
      expiration.setSeconds(expiration.getSeconds() + 180)
      const expirationStr = expiration.toISOString()

      this.refBlock = {
        expiration: expirationStr.substring(0, expirationStr.length - 1),
        ref_block_num: block.block_num & 0xffff,
        ref_block_prefix: block.ref_block_prefix
      }
    } catch (e: any) {
      this.error(`checkBlockchainInnerLoop Error fetching height: `, e)
    }
  }

  getBalance(options: any): string {
    return super.getBalance(options)
  }

  doInitialBalanceCallback(): void {
    super.doInitialBalanceCallback()

    const balanceCurrencyCodes = this.networkInfo.balanceCurrencyCodes
    for (const currencyCodeKey of Object.values(balanceCurrencyCodes)) {
      try {
        this.currencyEngineCallbacks.onBalanceChanged(
          currencyCodeKey,
          this.walletLocalData.totalBalances[currencyCodeKey] ?? '0'
        )
      } catch (e: any) {
        this.log.error(
          'doInitialBalanceCallback Error for currencyCode',
          currencyCodeKey,
          e
        )
      }
    }

    try {
      this.currencyEngineCallbacks.onStakingStatusChanged({
        ...this.otherData.stakingStatus
      })
    } catch (e: any) {
      this.error(`doInitialBalanceCallback onStakingStatusChanged`, e)
    }
  }

  checkUnStakeTx(otherParams: TxOtherParams): boolean {
    return (
      otherParams.name ===
        ACTIONS_TO_TX_ACTION_NAME[ACTIONS.unStakeFioTokens] ||
      (otherParams.data != null &&
        otherParams.data.memo === STAKING_REWARD_MEMO)
    )
  }

  updateStakingStatus(
    nativeAmount: string,
    blockTime: string,
    txId: string,
    txName: string
  ): void {
    const unlockDate = this.getUnlockDate(new Date(this.getUTCDate(blockTime)))

    /*
    Compare each stakedAmount's unlockDate with the transaction's unlockDate to
    find the correct stakedAmount object to place where the transaction.
    */
    const stakedAmountIndex =
      this.otherData.stakingStatus.stakedAmounts.findIndex(stakedAmount => {
        return stakedAmount.unlockDate?.getTime() === unlockDate.getTime()
      })

    /*
    If no stakedAmount object was found, then insert a new object into the
    stakedAmounts array. Insert into the array at the correct index maintaining
    a sorting by unlockDate in descending order.
    */
    if (stakedAmountIndex < 0) {
      // Search for the correct index to insert the new stakedAmount object
      const needleIndex = this.otherData.stakingStatus.stakedAmounts.findIndex(
        stakedAmount =>
          unlockDate.getTime() >= (stakedAmount.unlockDate?.getTime() ?? 0)
      )
      // If needleIndex is -1 (not found), then insert into the end of the array
      const index =
        needleIndex < 0
          ? this.otherData.stakingStatus.stakedAmounts.length
          : needleIndex
      // Insert the new stakedAmount object
      this.otherData.stakingStatus.stakedAmounts.splice(index, 0, {
        nativeAmount,
        unlockDate,
        otherParams: {
          date: new Date(blockTime),
          txs: [{ txId, nativeAmount, blockTime, txName }]
        }
      })
    } else {
      const stakedAmount = {
        ...this.otherData.stakingStatus.stakedAmounts[stakedAmountIndex],
        nativeAmount: '0'
      }
      const addedTxIndex = stakedAmount.otherParams.txs.findIndex(
        // @ts-expect-error
        ({ txId: itemTxId, txName: itemTxName }) =>
          itemTxId === txId && itemTxName === txName
      )

      if (addedTxIndex < 0) {
        stakedAmount.otherParams.txs.push({
          txId,
          nativeAmount,
          blockTime,
          txName
        })
      } else {
        stakedAmount.otherParams.txs[addedTxIndex] = {
          txId,
          nativeAmount,
          blockTime,
          txName
        }
      }

      for (const tx of stakedAmount.otherParams.txs) {
        stakedAmount.nativeAmount = add(
          stakedAmount.nativeAmount,
          tx.nativeAmount
        )
      }

      this.otherData.stakingStatus.stakedAmounts[stakedAmountIndex] =
        stakedAmount
    }

    this.localDataDirty()
    try {
      this.currencyEngineCallbacks.onStakingStatusChanged({
        ...this.otherData.stakingStatus
      })
    } catch (e: any) {
      this.error('onStakingStatusChanged error')
    }
  }

  async getStakingStatus(): Promise<EdgeStakingStatus> {
    return { ...this.otherData.stakingStatus }
  }

  processTransaction(
    action: FioHistoryNodeAction,
    actor: string,
    currencyCode: string = this.currencyInfo.currencyCode
  ): number {
    const {
      act: { name: trxName, data, account, authorization }
    } = action.action_trace
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
    if (action.block_num <= this.otherData.highestTxHeight) {
      return action.block_num
    }

    // Transfer funds transaction
    if (PROCESS_TX_NAME_LIST.includes(trxName)) {
      nativeAmount = '0'

      if (trxName === 'regaddress') {
        // The action must have been authorized by the engine's actor in order
        // for use to consider this a spend transaction.
        // Otherwise, we should ignore regaddress actions which are received
        // address, until we have some metadata explaining the receive.
        if (
          action.action_trace.act.authorization.some(
            auth => auth.actor === this.actor
          )
        ) {
          networkFee = String(action.action_trace.act.data.max_fee ?? 0)
          nativeAmount = `-${networkFee}`
        }
      }

      if (
        trxName === ACTIONS_TO_TX_ACTION_NAME[ACTIONS.transferTokens] &&
        data.amount != null
      ) {
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
            ...(existingTrx.otherParams?.data ?? {}),
            ...otherParams.data
          },
          meta: {
            ...(existingTrx.otherParams?.meta ?? {}),
            ...otherParams.meta
          }
        }

        if (otherParams.meta.isTransferProcessed != null) {
          return action.block_num
        }
        if (otherParams.meta.isFeeProcessed != null) {
          if (trxName === ACTIONS_TO_TX_ACTION_NAME[ACTIONS.transferTokens]) {
            nativeAmount = sub(nativeAmount, existingTrx.networkFee)
            networkFee = existingTrx.networkFee
          } else {
            nativeAmount = existingTrx.nativeAmount
            networkFee = '0'
          }
        } else {
          this.error(
            'processTransaction error - existing spend transaction should have isTransferProcessed or isFeeProcessed set'
          )
        }
      }

      if (this.checkUnStakeTx(otherParams)) {
        this.updateStakingStatus(
          data.amount != null ? data.amount.toString() : '0',
          action.block_time,
          action.action_trace.trx_id,
          trxName
        )
      }

      otherParams.meta.isTransferProcessed = true

      const edgeTransaction: EdgeTransaction = {
        blockHeight: action.block_num > 0 ? action.block_num : 0,
        currencyCode,
        date: this.getUTCDate(action.block_time) / 1000,
        isSend: nativeAmount.startsWith('-'),
        memos: [],
        nativeAmount,
        networkFee,
        otherParams,
        ourReceiveAddresses,
        signedTx: '',
        txid: action.action_trace.trx_id,
        walletId: this.walletId
      }
      this.addTransaction(currencyCode, edgeTransaction)
    }

    // Fee / Reward transaction
    if (
      trxName === ACTIONS_TO_TX_ACTION_NAME.transfer &&
      data.quantity != null
    ) {
      const [amount] = data.quantity.split(' ')
      const exchangeAmount = amount.toString()
      const denom = getDenomination(
        currencyCode,
        this.currencyInfo,
        this.allTokensMap
      )
      if (denom == null) {
        this.error(`Received unsupported currencyCode: ${currencyCode}`)
        return 0
      }

      const fioAmount = mul(exchangeAmount, denom.multiplier)
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
            ...(existingTrx.otherParams?.data ?? {})
          },
          meta: {
            ...otherParams.meta,
            ...(existingTrx.otherParams?.meta ?? {})
          }
        }
        if (otherParams.meta.isFeeProcessed != null) {
          return action.block_num
        }
        if (otherParams.meta.isTransferProcessed != null) {
          if (data.to !== actor) {
            nativeAmount = sub(existingTrx.nativeAmount, networkFee)
          } else {
            networkFee = '0'
          }
        } else {
          this.error(
            'processTransaction error - existing spend transaction should have isTransferProcessed or isFeeProcessed set'
          )
        }
      }

      if (this.checkUnStakeTx(otherParams)) {
        this.updateStakingStatus(
          fioAmount,
          action.block_time,
          action.action_trace.trx_id,
          trxName
        )
      }

      otherParams.meta.isFeeProcessed = true
      const edgeTransaction: EdgeTransaction = {
        blockHeight: action.block_num > 0 ? action.block_num : 0,
        currencyCode,
        date: this.getUTCDate(action.block_time) / 1000,
        isSend: nativeAmount.startsWith('-'),
        memos: [],
        nativeAmount,
        networkFee,
        otherParams,
        ourReceiveAddresses: [],
        signedTx: '',
        txid: action.action_trace.trx_id,
        walletId: this.walletId
      }
      this.addTransaction(currencyCode, edgeTransaction)
    }

    return action.block_num
  }

  async getSortedHistoryNodesLastActionSeqNumbers(): Promise<
    Array<{ nodeIndex: number; seqNumber: number }>
  > {
    const promises: Array<Promise<{ nodeIndex: number; seqNumber: number }>> =
      this.networkInfo.historyNodeUrls.map(async (_, nodeIndex) => {
        try {
          const lastActionObject = await this.requestHistory(
            nodeIndex,
            {
              account_name: this.actor,
              pos: -1
            },
            HISTORY_NODE_ACTIONS.getActions
          )

          // I don't fully understand what this error check is for, but it's
          // carried over from a refactoring. I believe it's identical to saying
          // that the node has no actions for the account.
          if (lastActionObject?.error?.noNodeForIndex != null) {
            // no more history nodes left; return no sequence number
            return { nodeIndex, seqNumber: -1 }
          }

          asHistoryResponse(lastActionObject)
          if (lastActionObject.actions.length === 0) {
            // if no transactions at all
            return { nodeIndex, seqNumber: -1 }
          }

          // Return last action's sequence number
          return {
            nodeIndex,
            seqNumber:
              lastActionObject.actions[lastActionObject.actions.length - 1]
                .account_action_seq
          }
        } catch (error) {
          // Node failed, so it return's no sequence number
          return { nodeIndex, seqNumber: -1 }
        }
      })

    const historyNodesSeqNumbers = await Promise.all(promises)
    historyNodesSeqNumbers.sort((a, b) => b.seqNumber - a.seqNumber)
    return historyNodesSeqNumbers
  }

  async checkTransactions(
    historyNodesSeqNumbers?: Array<{
      nodeIndex: number
      seqNumber: number
    }>
  ): Promise<boolean> {
    if (historyNodesSeqNumbers?.length === 0) {
      // We've checked all history nodes, so return a fail
      return false
    }

    historyNodesSeqNumbers =
      historyNodesSeqNumbers ??
      (await this.getSortedHistoryNodesLastActionSeqNumbers())

    if (
      historyNodesSeqNumbers.reduce((sum, node) => sum + node.seqNumber, 0) ===
      -historyNodesSeqNumbers.length
    ) {
      // All nodes agree there are no actions for the account
      return true
    }

    let newHighestTxHeight = this.otherData.highestTxHeight

    const lastActionSeqNumber = historyNodesSeqNumbers[0].seqNumber
    const historyNodeIndex = historyNodesSeqNumbers[0].nodeIndex

    let pos = Math.max(0, lastActionSeqNumber - HISTORY_NODE_PAGE_SIZE + 1)
    let finish = false

    while (!finish) {
      let actionsObject
      try {
        actionsObject = await this.requestHistory(
          historyNodeIndex,
          {
            account_name: this.actor,
            pos,
            offset: HISTORY_NODE_PAGE_SIZE - 1
          },
          HISTORY_NODE_ACTIONS.getActions
        )
        if (actionsObject.error?.noNodeForIndex != null) {
          return false
        }

        let actions = []

        if (actionsObject.actions?.length > 0) {
          actions = actionsObject.actions
        } else {
          break
        }

        for (let i = actions.length - 1; i > -1; i--) {
          const action = actions[i]
          asFioHistoryNodeAction(action)
          const blockNum = this.processTransaction(action, this.actor)

          if (blockNum > newHighestTxHeight) {
            newHighestTxHeight = blockNum
          } else if (
            (blockNum === newHighestTxHeight &&
              i === HISTORY_NODE_PAGE_SIZE - 1) ||
            blockNum < this.otherData.highestTxHeight
          ) {
            finish = true
            break
          }
        }

        // If this was the last page, break out of the paging loop.
        // Otherwise, adjust the position and continue.
        if (pos === 0) {
          break
        } else {
          // We're paging backwards, so subtract the offset but prevent negative
          // overflow because that changes the query mode in the FIO History API
          pos = Math.max(0, pos - HISTORY_NODE_PAGE_SIZE)
          continue
        }
      } catch (e: any) {
        // Failing to page through all actions with the first node mean's we
        // should retry with the next node in the list.
        return await this.checkTransactions(historyNodesSeqNumbers.slice(1))
      }
    }
    if (newHighestTxHeight > this.otherData.highestTxHeight) {
      this.otherData.highestTxHeight = newHighestTxHeight
      this.localDataDirty()
    }
    return true
  }

  async checkTransactionsInnerLoop(): Promise<void> {
    let transactions
    try {
      transactions = await this.checkTransactions()
    } catch (e: any) {
      this.error('checkTransactionsInnerLoop fetches failed with error: ', e)
      return
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
      account_name: string
      pos: number
      offset?: number
    },
    uri: string
  ): Promise<any> {
    if (this.networkInfo.historyNodeUrls[nodeIndex] == null)
      return { error: { noNodeForIndex: true } }
    const apiUrl = this.networkInfo.historyNodeUrls[nodeIndex]
    const body = JSON.stringify(params)
    const result = await fetch(`${apiUrl}history/${uri}`, {
      method: 'POST',
      headers: {
        // Explicit content length is needed to make the FIO server return
        // the correct action's length for some reason.
        'Content-Length': (body.length * 2).toString(),
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body
    })
    return await result.json()
  }

  async fioApiRequest(
    apiUrl: string,
    actionName: string,
    params?: any,
    returnPreparedTrx: boolean = false
  ): Promise<any | PreparedTrx> {
    const fioSdk = new FIOSDK(
      '',
      this.walletInfo.keys.publicKey,
      apiUrl,
      this.fetchCors,
      undefined,
      this.tpid,
      returnPreparedTrx
    )

    let res

    try {
      switch (actionName) {
        case 'getChainInfo':
          res = await fioSdk.transactions.getChainInfo()
          break
        case 'getBlock':
          res = await fioSdk.transactions.getBlock(params)
          break
        case 'getObtData':
        case 'getPendingFioRequests':
        case 'getSentFioRequests': {
          const { endpoint, body } = params
          res = await fioSdk.transactions.executeCall(
            endpoint,
            JSON.stringify(body)
          )
          break
        }
        default:
          res = await fioSdk.genericAction(actionName, params)
      }
    } catch (e: any) {
      // handle FIO API error
      if (e.errorCode != null && fioApiErrorCodes.includes(e.errorCode)) {
        if (e.json?.fields?.[0]?.error != null) {
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
  ): Promise<any> {
    const fioSdk = new FIOSDK(
      '',
      this.walletInfo.keys.publicKey,
      apiUrl,
      this.fetchCors,
      undefined,
      this.tpid,
      true
    )

    let res

    this.warn(
      `executePreparedTrx. preparedTrx: ${JSON.stringify(
        preparedTrx
      )} - apiUrl: ${apiUrl}`
    )
    try {
      res = await fioSdk.executePreparedTrx(endpoint, preparedTrx)
      this.warn(
        `executePreparedTrx. res: ${JSON.stringify(
          res
        )} - apiUrl: ${apiUrl} - endpoint: ${endpoint}`
      )
    } catch (e: any) {
      // handle FIO API error
      if (e.errorCode != null && fioApiErrorCodes.includes(e.errorCode)) {
        this.log(
          `executePreparedTrx error. requestParams: ${JSON.stringify(
            preparedTrx
          )} - apiUrl: ${apiUrl} - endpoint: ${endpoint} - message: ${JSON.stringify(
            e.json
          )}`
        )
        if (e.json?.fields?.[0]?.error != null) {
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
      const preparedTrx = asFioSignedTx(params)
      this.warn(
        `multicastServers executePreparedTrx. actionName: ${actionName} - res: ${JSON.stringify(
          preparedTrx
        )}`
      )
      res = await promiseAny(
        shuffleArray(
          this.networkInfo.apiUrls.map(
            async apiUrl =>
              await timeout(
                this.executePreparedTrx(
                  apiUrl,
                  EndPoint[ACTIONS_TO_END_POINT_KEYS[actionName]],
                  preparedTrx
                ),
                10000
              )
          )
        )
      )
      this.warn(
        `multicastServers res. actionName: ${actionName} - res: ${JSON.stringify(
          res
        )}`
      )
      if (res == null) {
        throw new Error('Service is unavailable')
      }
    } else if (actionName === 'getFioNames') {
      res = await promiseNy(
        this.networkInfo.apiUrls.map(
          async apiUrl =>
            await timeout(this.fioApiRequest(apiUrl, actionName, params), 10000)
        ),
        (result: any) => {
          const errorResponse = asFioNothingResponse(NO_FIO_NAMES)(result)
          if (errorResponse != null) return errorResponse.data.json.message
          return comparisonFioNameString(result)
        },
        2
      )
      if (res?.data?.json?.message === NO_FIO_NAMES) {
        res = { fio_domains: [], fio_addresses: [] }
      }
    } else if (actionName === 'getFioBalance') {
      res = await promiseNy(
        this.networkInfo.apiUrls.map(
          async apiUrl =>
            await timeout(this.fioApiRequest(apiUrl, actionName, params), 10000)
        ),
        (result: any) => {
          const errorResponse =
            asFioNothingResponse(PUBLIC_KEY_NOT_FOUND)(result)
          if (errorResponse != null) return errorResponse.data.json.message
          return comparisonFioBalanceString(result)
        },
        2
      )
      if (res?.data?.json?.message === PUBLIC_KEY_NOT_FOUND) {
        res = { balance: 0, available: 0, staked: 0, srps: 0, roe: '' }
      }
    } else if (actionName === 'getFees') {
      res = await asyncWaterfall(
        shuffleArray(
          this.networkInfo.apiUrls.map(apiUrl => async () => {
            const fioSdk = new FIOSDK(
              '',
              this.walletInfo.keys.publicKey,
              apiUrl,
              this.fetchCors,
              undefined,
              this.tpid
            )
            const { endpoint, param } = params

            const res = await fioSdk.getFee(endpoint, param)
            const fee = asFioFee(res).fee

            return fee.toString()
          })
        )
      )
    } else {
      res = await asyncWaterfall(
        shuffleArray(
          this.networkInfo.apiUrls.map(
            apiUrl => async () =>
              await this.fioApiRequest(apiUrl, actionName, params)
          )
        )
      )
    }

    if (res.isError != null) {
      const error = new FioError(res.errorMessage ?? res.data.message)
      error.json = res.data.json
      error.list = res.data.list
      error.errorCode = res.data.code

      throw error
    }

    return res
  }

  // Check all account balance and other relevant info
  async checkAccountInnerLoop(): Promise<void> {
    const currencyCode = this.currencyInfo.currencyCode
    const balanceCurrencyCodes = this.networkInfo.balanceCurrencyCodes

    // Initialize balance
    if (
      typeof this.walletLocalData.totalBalances[currencyCode] === 'undefined'
    ) {
      this.updateBalance(currencyCode, '0')
    }

    // Balance
    try {
      const balances = { staked: '0', locked: '0' }
      const { balance, available, staked, srps, roe } = asGetFioBalanceResponse(
        await this.multicastServers('getFioBalance')
      )
      const nativeAmount = String(balance)
      balances.staked = String(staked)
      balances.locked = sub(nativeAmount, String(available))

      this.otherData.srps = srps
      this.otherData.stakingRoe = roe

      this.updateBalance(currencyCode, nativeAmount)
      this.updateBalance(balanceCurrencyCodes.staked, balances.staked)
      this.updateBalance(balanceCurrencyCodes.locked, balances.locked)
    } catch (e: any) {
      this.log.warn('checkAccountInnerLoop getFioBalance error: ', e)
    }

    // Fio Addresses
    try {
      const result = asGetFioName(
        await this.multicastServers('getFioNames', {
          fioPublicKey: this.walletInfo.keys.publicKey
        })
      )

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
          if (existedFioAddress != null) {
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
          for (const fioAddress of this.otherData.fioAddresses) {
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
          if (existedFioDomain != null) {
            if (existedFioDomain.expiration !== fioDomain.expiration) {
              areDomainsChanged = true
              break
            }
            if (existedFioDomain.isPublic !== (fioDomain.is_public === 1)) {
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
          isPublic: fioDomain.is_public === 1
        }))
      }

      if (isChanged) this.localDataDirty()
    } catch (e: any) {
      this.warn('checkAccountInnerLoop getFioNames error: ', e)
    }
  }

  async fetchEncryptedFioRequests(
    type: string,
    decoder: Query<PendingFioRequests | SentFioRequests>
  ): Promise<EncryptedFioRequest[]> {
    const ITEMS_PER_PAGE = 100
    const action =
      type === 'PENDING' ? 'getPendingFioRequests' : 'getSentFioRequests'

    let lastPageAmount = ITEMS_PER_PAGE
    let requestsLastPage = 1
    const encryptedFioRequests: EncryptedFioRequest[] = []
    while (lastPageAmount === ITEMS_PER_PAGE) {
      try {
        const response = await this.multicastServers(action, {
          endpoint: decoder.getEndPoint(),
          body: {
            fio_public_key: this.walletInfo.keys.publicKey,
            limit: ITEMS_PER_PAGE,
            offset: (requestsLastPage - 1) * ITEMS_PER_PAGE
          }
        })
        const cleanResponse = asGetFioRequestsResponse(response)

        const { requests, more } = cleanResponse
        encryptedFioRequests.push(...requests)
        if (more === 0) break

        requestsLastPage++
        lastPageAmount = requests.length
      } catch (e: any) {
        const errorJson = asMaybe(asFioEmptyResponse)(e.json)
        if (errorJson?.message !== 'No FIO Requests') {
          this.error('fetchEncryptedFioRequests error: ', e)
        }
        break
      }
    }

    return encryptedFioRequests
  }

  async fetchEncryptedObtData(
    type: string,
    decoder: Query<GetObtData>
  ): Promise<ObtData[]> {
    const ITEMS_PER_PAGE = 100

    let lastPageAmount = ITEMS_PER_PAGE
    let requestsLastPage = 1
    const encryptedObtDataRecords: ObtData[] = []
    while (lastPageAmount === ITEMS_PER_PAGE) {
      let response
      try {
        response = await this.multicastServers(type, {
          endpoint: decoder.getEndPoint(),
          body: {
            fio_public_key: this.walletInfo.keys.publicKey,
            limit: ITEMS_PER_PAGE,
            offset: (requestsLastPage - 1) * ITEMS_PER_PAGE
          }
        })
        const cleanResponse = asGetObtDataResponse(response)

        const { obt_data_records: obtDataRecords, more } = cleanResponse
        encryptedObtDataRecords.push(...obtDataRecords)
        if (more === 0) break

        requestsLastPage++
        lastPageAmount = obtDataRecords.length
      } catch (e: any) {
        const errorJson = asMaybe(asFioEmptyResponse)(e.json)
        if (errorJson?.message !== 'No FIO Requests') {
          this.error('fetchEncryptedObtData error: ', e)
        }
        break
      }
    }

    return encryptedObtDataRecords
  }

  fioRequestsListChanged = (
    existingList: FioRequest[],
    newList: FioRequest[]
  ): boolean => {
    function compareArray(arrA: FioRequest[], arrB: FioRequest[]): boolean {
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

  removeFioRequest = (
    fioRequestId: string | number,
    type: FioRequestTypes
  ): void => {
    const fioRequestIndex = this.otherData.fioRequests[type].findIndex(
      (fioRequest: FioRequest) =>
        fioRequest.fio_request_id === `${fioRequestId}`
    )

    if (fioRequestIndex > -1) {
      this.otherData.fioRequests[type].splice(fioRequestIndex, 1)
    }
  }

  // Placeholder function for network activity that requires private keys
  async syncNetwork(opts: EdgeEnginePrivateKeyOptions): Promise<number> {
    const fioPrivateKeys = asFioPrivateKeys(opts?.privateKeys)
    let isChanged = false

    const checkFioRequests = async (
      type: FioRequestTypes,
      decoder: Query<PendingFioRequests | SentFioRequests>
    ): Promise<void> => {
      const encryptedReqs = await this.fetchEncryptedFioRequests(type, decoder)
      decoder.privateKey = fioPrivateKeys.fioKey
      decoder.publicKey = this.walletInfo.keys.publicKey
      const decryptedReqs: { requests: FioRequest[] } = decoder.decrypt({
        requests: encryptedReqs
      }) ?? { requests: [] }

      if (
        this.fioRequestsListChanged(
          this.otherData.fioRequests[type],
          decryptedReqs.requests
        )
      ) {
        this.otherData.fioRequests[type] = [...decryptedReqs.requests]
        isChanged = true
      }
    }

    await checkFioRequests(
      'PENDING',
      new PendingFioRequests(this.walletInfo.keys.publicKey)
    )
    await checkFioRequests(
      'SENT',
      new SentFioRequests(this.walletInfo.keys.publicKey)
    )

    if (isChanged) this.localDataDirty()

    const obtDecoder = new GetObtData(this.walletInfo.keys.publicKey)
    const encryptedObtData = await this.fetchEncryptedObtData(
      'getObtData',
      obtDecoder
    )
    obtDecoder.privateKey = fioPrivateKeys.fioKey
    obtDecoder.publicKey = this.walletInfo.keys.publicKey
    const decryptedObtData: { obt_data_records: ObtData[] } =
      obtDecoder.decrypt({
        obt_data_records: encryptedObtData
      }) ?? { obt_data_records: [] }

    this.obtData = decryptedObtData.obt_data_records

    return SYNC_NETWORK_INTERVAL
  }

  // https://developers.fioprotocol.io/docs/fio-protocol/fio-fees
  async getFee(endpoint: EndPoint, param?: string): Promise<string> {
    let cachedFee = this.fees.get(endpoint)
    if (cachedFee == null || cachedFee.expiration + 30 * 1000 < Date.now()) {
      const fee = await this.multicastServers('getFees', { endpoint, param })
      const newFee = { fee: fee, expiration: Date.now() }

      this.fees.set(endpoint, newFee)
      cachedFee = newFee
    }
    return cachedFee.fee
  }

  // ****************************************************************************
  // Public methods
  // ****************************************************************************

  // This routine is called once a wallet needs to start querying the network
  async startEngine(): Promise<void> {
    this.engineOn = true
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

  async getMaxSpendable(spendInfo: EdgeSpendInfo): Promise<string> {
    const balance = this.getBalance({
      currencyCode: spendInfo.currencyCode
    })

    const lockedAmount =
      this.walletLocalData.totalBalances[
        this.networkInfo.balanceCurrencyCodes.locked
      ] ?? '0'

    spendInfo.spendTargets[0].nativeAmount = '1'
    const edgeTx = await this.makeSpend(spendInfo)
    const spendableAmount = sub(sub(balance, edgeTx.networkFee), lockedAmount)

    if (lt(spendableAmount, '0')) {
      throw new InsufficientFundsError({ networkFee: edgeTx.networkFee })
    }

    return spendableAmount
  }

  async makeSpend(edgeSpendInfoIn: EdgeSpendInfo): Promise<EdgeTransaction> {
    const { edgeSpendInfo, nativeBalance, currencyCode } =
      this.makeSpendCheck(edgeSpendInfoIn)
    const lockedBalance =
      this.walletLocalData.totalBalances[
        this.networkInfo.balanceCurrencyCodes.locked
      ] ?? '0'
    const availableBalance = sub(nativeBalance, lockedBalance)

    // Set common vars
    const spendTarget = edgeSpendInfo.spendTargets[0]
    const { publicAddress } = spendTarget
    const { nativeAmount: quantity } = spendTarget

    if (publicAddress == null)
      throw new Error('makeSpend Missing publicAddress')
    if (quantity == null) throw new NoAmountSpecifiedError()

    let { otherParams } = edgeSpendInfo
    if (otherParams == null || Object.keys(otherParams).length === 0) {
      otherParams = {
        action: {
          name: ACTIONS.transferTokens,
          params: {
            payeeFioPublicKey: publicAddress,
            amount: quantity,
            maxFee: 0
          }
        }
      }
    }

    const { name, params } = asFioAction(otherParams.action)

    let fee: string
    let txParams: FioTxParams | undefined
    switch (name) {
      case ACTIONS.transferTokens: {
        fee = await this.getFee(EndPoint.transferTokens)
        txParams = {
          account: 'fio.token',
          action: ACTIONS_TO_TX_ACTION_NAME[ACTIONS.transferTokens],
          data: {
            payee_public_key: publicAddress,
            amount: quantity,
            max_fee: fee
          }
        }
        break
      }
      case ACTIONS.stakeFioTokens: {
        const { fioAddress } = asFioAddressParam(params)
        fee = await this.getFee(EndPoint.stakeFioTokens, fioAddress)
        txParams = {
          account: 'fio.staking',
          action: ACTIONS_TO_TX_ACTION_NAME[name],
          data: {
            amount: quantity,
            fio_address: fioAddress,
            actor: this.actor,
            max_fee: fee
          }
        }
        break
      }
      case ACTIONS.unStakeFioTokens: {
        const { fioAddress } = asFioAddressParam(params)
        fee = await this.getFee(EndPoint.unStakeFioTokens, fioAddress)
        txParams = {
          account: 'fio.staking',
          action: ACTIONS_TO_TX_ACTION_NAME[name],
          data: {
            amount: quantity,
            fio_address: fioAddress,
            actor: this.actor,
            max_fee: fee
          }
        }

        const unlockDate = this.getUnlockDate(new Date())
        const stakedBalance =
          this.walletLocalData.totalBalances[
            this.networkInfo.balanceCurrencyCodes.staked
          ] ?? '0'
        if (gt(quantity, stakedBalance) || gt(`${fee}`, availableBalance)) {
          throw new InsufficientFundsError()
        }

        const accrued = mul(
          mul(div(quantity, stakedBalance, 18), `${this.otherData.srps}`),
          this.otherData.stakingRoe
        )
        const estReward = max(sub(accrued, quantity), '0')
        otherParams.ui = {
          accrued,
          estReward,
          unlockDate
        }
        break
      }
      case ACTIONS.transferFioAddress: {
        const { fioAddress } = asFioAddressParam(params)
        fee = await this.getFee(EndPoint.transferFioAddress, fioAddress)
        txParams = {
          account: 'fio.address',
          action: 'xferaddress',
          data: {
            fio_address: fioAddress,
            new_owner_fio_public_key: publicAddress,
            actor: this.actor,
            max_fee: fee
          }
        }
        break
      }
      case ACTIONS.transferFioDomain: {
        const { fioDomain } = asFioTransferDomainParams(params)
        fee = await this.getFee(EndPoint.transferFioDomain)
        txParams = {
          account: 'fio.address',
          action: 'xferdomain',
          data: {
            fio_domain: fioDomain,
            new_owner_fio_public_key: publicAddress,
            actor: this.actor,
            max_fee: fee
          }
        }
        break
      }
      case ACTIONS.addPublicAddresses: {
        const { fioAddress, publicAddresses } =
          asFioConnectAddressesParams(params)
        fee = await this.getFee(EndPoint.addPubAddress, fioAddress)
        txParams = {
          account: 'fio.address',
          action: 'addaddress',
          data: {
            fio_address: fioAddress,
            public_addresses: publicAddresses,
            actor: this.actor,
            max_fee: fee
          }
        }
        break
      }
      case ACTIONS.removePublicAddresses: {
        const { fioAddress, publicAddresses } =
          asFioConnectAddressesParams(params)
        fee = await this.getFee(EndPoint.removePubAddress, fioAddress)
        txParams = {
          account: 'fio.address',
          action: 'remaddress',
          data: {
            fio_address: fioAddress,
            public_addresses: publicAddresses,
            actor: this.actor,
            max_fee: fee
          }
        }
        break
      }
      case ACTIONS.registerFioAddress: {
        const { fioAddress } = asFioAddressParam(params)
        fee = await this.getFee(EndPoint.registerFioAddress)
        txParams = {
          account: 'fio.address',
          action: 'regaddress',
          data: {
            fio_address: fioAddress,
            owner_fio_public_key: this.walletInfo.keys.publicKey,
            max_fee: fee,
            actor: this.actor
          }
        }
        break
      }
      case ACTIONS.registerFioDomain: {
        const { fioDomain } = asFioDomainParam(params)
        fee = await this.getFee(EndPoint.registerFioDomain)
        txParams = {
          account: 'fio.address',
          action: 'regdomain',
          data: {
            fio_domain: fioDomain,
            owner_fio_public_key: this.walletInfo.keys.publicKey,
            max_fee: fee,
            actor: this.actor
          }
        }
        break
      }
      case ACTIONS.renewFioDomain: {
        const { fioDomain } = asFioDomainParam(params)
        fee = await this.getFee(EndPoint.renewFioDomain)
        txParams = {
          account: 'fio.address',
          action: 'renewdomain',
          data: {
            fio_domain: fioDomain,
            max_fee: fee,
            actor: this.actor
          }
        }
        break
      }
      case ACTIONS.addBundledTransactions: {
        const { bundleSets, fioAddress } = asFioAddBundledTransactions(params)
        fee = await this.getFee(EndPoint.addBundledTransactions, fioAddress)
        txParams = {
          account: 'fio.address',
          action: 'addbundles',
          data: {
            fio_address: fioAddress,
            bundle_sets: bundleSets,
            actor: this.actor,
            max_fee: fee
          }
        }
        break
      }
      case ACTIONS.setFioDomainPublic: {
        const { fioDomain, isPublic } = asSetFioDomainVisibility(params)
        fee = await this.getFee(EndPoint.setFioDomainPublic)
        txParams = {
          account: 'fio.address',
          action: 'setdomainpub',
          data: {
            fio_domain: fioDomain,
            is_public: isPublic ? 1 : 0,
            max_fee: fee,
            actor: this.actor
          }
        }
        break
      }
      case ACTIONS.rejectFundsRequest: {
        const { fioRequestId, payerFioAddress } = asRejectFundsRequest(params)
        fee = await this.getFee(EndPoint.rejectFundsRequest, payerFioAddress)
        txParams = {
          account: 'fio.reqobt',
          action: 'rejectfndreq',
          data: {
            fio_request_id: fioRequestId,
            max_fee: fee,
            actor: this.actor
          }
        }
        break
      }
      case ACTIONS.cancelFundsRequest: {
        const { fioAddress, fioRequestId } = asCancelFundsRequest(params)
        fee = await this.getFee(EndPoint.cancelFundsRequest, fioAddress)
        txParams = {
          account: 'fio.reqobt',
          action: 'cancelfndreq',
          data: {
            fio_request_id: fioRequestId,
            max_fee: fee,
            actor: this.actor
          }
        }
        break
      }
      case ACTIONS.recordObtData: {
        const { payerFioAddress } = asFioRecordObtData(params)
        fee = await this.getFee(EndPoint.recordObtData, payerFioAddress)
        // Need private key to craft transaction
        break
      }
      case ACTIONS.requestFunds: {
        const { payeeFioAddress } = asFioRequestFundsParams(params)
        fee = await this.getFee(EndPoint.newFundsRequest, payeeFioAddress)
        // Need private key to craft transaction
        break
      }
      default: {
        throw new Error('Unrecognized FIO action')
      }
    }

    const edgeTransaction: EdgeTransaction = {
      blockHeight: 0,
      currencyCode,
      date: 0,
      isSend: true,
      memos: [],
      nativeAmount: sub(`-${quantity}`, `${fee}`),
      networkFee: `${fee}`,
      otherParams: {
        ...otherParams,
        txParams
      },
      ourReceiveAddresses: [],
      signedTx: '',
      txid: '',
      walletId: this.walletId
    }

    return edgeTransaction
  }

  async signTx(
    edgeTransaction: EdgeTransaction,
    privateKeys: JsonObject
  ): Promise<EdgeTransaction> {
    const fioPrivateKeys = asFioPrivateKeys(privateKeys)
    const otherParams = getOtherParams(edgeTransaction)
    let txParams = asMaybe(asFioTxParams)(otherParams.txParams)
    const transactions = new Transactions()

    if (txParams == null) {
      const { name, params } = asFioAction(otherParams.action)
      const { networkFee } = edgeTransaction

      // let txParams: FioTxParams | undefined
      switch (name) {
        case ACTIONS.recordObtData: {
          const {
            payerFioAddress,
            payeeFioAddress,
            payerPublicAddress,
            payeePublicAddress,
            amount,
            tokenCode,
            chainCode,
            obtId,
            memo,
            status,
            fioRequestId
          } = asFioRecordObtData(params)
          const content = {
            payer_public_address: payerPublicAddress,
            payee_public_address: payeePublicAddress,
            amount,
            chain_code: chainCode,
            token_code: tokenCode,
            status,
            obt_id: obtId,
            memo,
            hash: undefined,
            offline_url: undefined
          }
          const cipherContent = transactions.getCipherContent(
            'record_obt_data_content',
            content,
            fioPrivateKeys.fioKey,
            payerPublicAddress
          )
          txParams = {
            account: 'fio.reqobt',
            action: 'recordobt',
            data: {
              payer_fio_address: payerFioAddress,
              payee_fio_address: payeeFioAddress,
              content: cipherContent,
              fio_request_id: fioRequestId,
              max_fee: networkFee,
              actor: this.actor
            }
          }
          break
        }
        case ACTIONS.requestFunds: {
          const {
            payerFioAddress,
            payerFioPublicKey,
            payeeFioAddress,
            payeeTokenPublicAddress,
            amount,
            chainCode,
            tokenCode,
            memo
          } = asFioRequestFundsParams(params)
          const content = {
            payee_public_address: payeeTokenPublicAddress,
            amount,
            chain_code: chainCode,
            token_code: tokenCode,
            memo,
            hash: undefined,
            offline_url: undefined
          }
          const cipherContent = transactions.getCipherContent(
            'new_funds_content',
            content,
            fioPrivateKeys.fioKey,
            payerFioPublicKey
          )
          txParams = {
            account: 'fio.reqobt',
            action: 'newfundsreq',
            data: {
              payer_fio_address: payerFioAddress,
              payee_fio_address: payeeFioAddress,
              content: cipherContent,
              max_fee: networkFee,
              actor: this.actor
            }
          }
          break
        }
        default: {
          throw new Error('Unknown FIO action')
        }
      }
    }

    const rawTx = await transactions.createRawTransaction({
      action: txParams.action,
      account: txParams.account,
      data: { ...txParams.data, tpid: this.tpid },
      publicKey: this.walletInfo.keys.publicKey,
      chainData: this.refBlock
    })
    const { serializedContextFreeData, serializedTransaction } =
      await transactions.serialize({
        chainId: this.networkInfo.chainId,
        transaction: rawTx
      })
    const signedTx = await transactions.sign({
      chainId: this.networkInfo.chainId,
      privateKeys: [fioPrivateKeys.fioKey],
      transaction: rawTx,
      serializedTransaction,
      serializedContextFreeData
    })

    edgeTransaction.otherParams = { ...edgeTransaction.otherParams, signedTx }
    return edgeTransaction
  }

  async broadcastTx(
    edgeTransaction: EdgeTransaction
  ): Promise<EdgeTransaction> {
    const otherParams = getOtherParams(edgeTransaction)

    if (otherParams.action?.name == null) {
      throw new Error(
        'Action is not set, "action" prop of otherParams is required for FIO actions'
      )
    }

    const signedTx = asFioSignedTx(otherParams.signedTx)
    const trx = asFioBroadcastResult(
      await this.multicastServers(otherParams.action.name, signedTx)
    )

    edgeTransaction.metadata = {
      notes: trx.transaction_id
    }
    edgeTransaction.txid = trx.transaction_id
    edgeTransaction.date = Date.now() / 1000
    edgeTransaction.blockHeight = trx.block_num
    this.warn(`SUCCESS broadcastTx\n${cleanTxLogs(edgeTransaction)}`)

    // Save additional return values to otherParams
    // eslint-disable-next-line
    const { block_num, block_time, transaction_id, ...broadcastResult } = trx
    edgeTransaction.otherParams = { ...otherParams, broadcastResult }

    return edgeTransaction
  }

  async saveTx(edgeTransaction: EdgeTransaction): Promise<void> {
    const otherParams = getOtherParams(edgeTransaction)
    const { broadcastResult = {}, action } = otherParams
    const { name, params } = asFioAction(action)

    // Attempt post-broadcast actions
    try {
      switch (name) {
        case ACTIONS.transferFioDomain: {
          const transferredDomainIndex = this.otherData.fioDomains.findIndex(
            ({ name }) => name === params.fioDomain
          )
          if (transferredDomainIndex >= 0) {
            this.otherData.fioDomains.splice(transferredDomainIndex, 1)
            this.localDataDirty()
          }
          break
        }
        case ACTIONS.transferFioAddress: {
          const transferredAddressIndex = this.otherData.fioAddresses.findIndex(
            ({ name }) => name === params.fioAddress
          )
          if (transferredAddressIndex >= 0) {
            this.otherData.fioAddresses.splice(transferredAddressIndex, 1)
            this.localDataDirty()
          }
          break
        }
        case ACTIONS.registerFioAddress: {
          const { fioAddress } = asFioAddressParam(params)
          const addressAlreadyAdded = this.otherData.fioAddresses.find(
            ({ name }) => name === fioAddress
          )
          if (addressAlreadyAdded == null) {
            this.otherData.fioAddresses.push({
              name: fioAddress,
              bundledTxs: undefined
            })
            this.localDataDirty()
          }
          break
        }
        case ACTIONS.registerFioDomain: {
          const { fioDomain } = asFioDomainParam(params)
          if (broadcastResult.expiration == null)
            throw new Error('expiration not present')

          const renewedDomain = this.otherData.fioDomains.find(
            ({ name }) => name === fioDomain
          )
          if (renewedDomain != null) {
            renewedDomain.expiration = broadcastResult.expiration
            this.localDataDirty()
          }
          break
        }
        case ACTIONS.renewFioDomain: {
          const { fioDomain } = asFioDomainParam(params)
          if (broadcastResult.expiration == null)
            throw new Error('expiration not present')

          const renewedDomain = this.otherData.fioDomains.find(
            ({ name }) => name === fioDomain
          )
          if (renewedDomain != null) {
            renewedDomain.expiration = broadcastResult.expiration
            this.localDataDirty()
          }
          break
        }
        case ACTIONS.addBundledTransactions: {
          const { fioAddress: fioAddressParam } =
            asFioAddBundledTransactions(params)
          const fioAddress = this.otherData.fioAddresses.find(
            ({ name }) => name === fioAddressParam
          )

          if (fioAddress == null)
            throw new FioError('Fio Address is not found in engine')

          fioAddress.bundledTxs =
            (fioAddress.bundledTxs ?? 0) + DEFAULT_BUNDLED_TXS_AMOUNT

          this.localDataDirty()
          break
        }
        case ACTIONS.rejectFundsRequest: {
          const { fioRequestId } = asRejectFundsRequest(params)
          if (typeof fioRequestId === 'string') {
            this.removeFioRequest(fioRequestId, 'PENDING')
            this.localDataDirty()
          }
          break
        }
        case ACTIONS.cancelFundsRequest: {
          const { fioRequestId } = asCancelFundsRequest(params)
          if (typeof fioRequestId === 'string') {
            this.removeFioRequest(fioRequestId, 'SENT')
            this.localDataDirty()
          }
          break
        }
        case ACTIONS.recordObtData: {
          const { fioRequestId } = asFioRecordObtData(params)
          if (
            fioRequestId != null &&
            broadcastResult.status === 'sent_to_blockchain'
          ) {
            this.removeFioRequest(fioRequestId, 'PENDING')
            this.localDataDirty()
          }
          break
        }
      }
    } catch (e) {
      this.log.warn(`Error attempting post-broadcast action ${name}:`, e)
    }

    await super.saveTx(edgeTransaction)
  }

  async getFreshAddress(options: any): Promise<EdgeFreshAddress> {
    return { publicAddress: this.walletInfo.keys.publicKey }
  }
}

export async function makeCurrencyEngine(
  env: PluginEnvironment<FioNetworkInfo>,
  tools: FioTools,
  walletInfo: EdgeWalletInfo,
  opts: EdgeCurrencyEngineOptions
): Promise<EdgeCurrencyEngine> {
  const { tpid = 'finance@edge' } = env.initOptions
  const safeWalletInfo = asSafeFioWalletInfo(walletInfo)
  const engine = new FioEngine(env, tools, safeWalletInfo, opts, tpid)
  await engine.loadEngine()

  return engine
}
