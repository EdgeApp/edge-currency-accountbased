/* eslint camelcase: 0 */

import { FIOSDK } from '@fioprotocol/fiosdk'
import { EndPoint } from '@fioprotocol/fiosdk/lib/entities/EndPoint'
import { Transactions } from '@fioprotocol/fiosdk/lib/transactions/Transactions'
import { add, div, gt, max, mul, sub } from 'biggystring'
import { asMaybe } from 'cleaners'
import {
  EdgeCurrencyEngine,
  EdgeCurrencyEngineOptions,
  EdgeCurrencyTools,
  EdgeFetchFunction,
  EdgeFreshAddress,
  EdgeSpendInfo,
  EdgeStakingStatus,
  EdgeTransaction,
  EdgeWalletInfo,
  InsufficientFundsError,
  NoAmountSpecifiedError
} from 'edge-core-js/types'

import { CurrencyEngine } from '../common/engine'
import { PluginEnvironment } from '../common/innerPlugin'
import {
  asyncWaterfall,
  cleanTxLogs,
  getDenomInfo,
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
  ACTIONS_TO_FEE_END_POINT_KEYS,
  ACTIONS_TO_TX_ACTION_NAME,
  asFioWalletOtherData,
  BROADCAST_ACTIONS,
  DAY_INTERVAL,
  DEFAULT_BUNDLED_TXS_AMOUNT,
  FEE_ACTION_MAP,
  FIO_REQUESTS_TYPES,
  FioAddress,
  FioDomain,
  FioRequest,
  FioWalletOtherData,
  HISTORY_NODE_ACTIONS,
  HISTORY_NODE_OFFSET,
  STAKING_LOCK_PERIOD,
  STAKING_REWARD_MEMO,
  TxOtherParams
} from './fioConst'
import { fioApiErrorCodes, FioError } from './fioError'
import { FioTools } from './fioPlugin'
import {
  asFioHistoryNodeAction,
  asGetFioBalanceResponse,
  asGetFioName,
  asHistoryResponse,
  FioHistoryNodeAction,
  GetFioName
} from './fioSchema'
import {
  asFioAction,
  asFioAddressParam,
  asFioBroadcastResult,
  asFioConnectAddressesParams,
  asFioDomainParam,
  asFioFee,
  asFioSignedTx,
  asFioTransferDomainParams,
  asFioTxParams,
  FioActionFees,
  FioBroadcastResult,
  FioNetworkInfo,
  FioRefBlock,
  FioSignedTx,
  FioTxParams
} from './fioTypes'

const ADDRESS_POLL_MILLISECONDS = 10000
const BLOCKCHAIN_POLL_MILLISECONDS = 15000
const TRANSACTION_POLL_MILLISECONDS = 10000
const REQUEST_POLL_MILLISECONDS = 10000
const PROCESS_TX_NAME_LIST = [
  ACTIONS_TO_TX_ACTION_NAME[ACTIONS.transferTokens],
  ACTIONS_TO_TX_ACTION_NAME[ACTIONS.unStakeFioTokens]
]

interface PreparedTrx {
  signatures: string[]
  compression: number
  packed_context_free_data: string
  packed_trx: string
}

export class FioEngine extends CurrencyEngine<FioTools> {
  fetchCors: EdgeFetchFunction
  otherMethods: Object
  tpid: string
  fioSdk!: FIOSDK
  otherData!: FioWalletOtherData
  networkInfo: FioNetworkInfo
  refBlock: FioRefBlock
  fees: FioActionFees
  actor: string

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  localDataDirty() {
    this.walletLocalDataDirty = true
  }

  constructor(
    env: PluginEnvironment<FioNetworkInfo>,
    tools: FioTools,
    walletInfo: EdgeWalletInfo,
    opts: EdgeCurrencyEngineOptions,
    tpid: string
  ) {
    super(env, tools, walletInfo, opts)
    const fetchCors = getFetchCors(env)
    this.fetchCors = fetchCors
    this.tpid = tpid
    this.networkInfo = env.networkInfo
    this.refBlock = {
      expiration: '',
      ref_block_num: 0,
      ref_block_prefix: 0
    }
    this.fees = new Map()
    this.actor = FIOSDK.accountHash(this.walletInfo.keys.publicKey).accountnm

    this.fioSdkInit()

    this.otherMethods = {
      fioAction: async (actionName: string, params: any): Promise<any> => {
        switch (actionName) {
          case 'requestFunds': {
            const { fee } = await this.multicastServers(
              // @ts-expect-error
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
              // @ts-expect-error
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
              // @ts-expect-error
              FEE_ACTION_MAP[actionName].action,
              {
                [FEE_ACTION_MAP[actionName].propName]:
                  params[FEE_ACTION_MAP[actionName].propName]
              }
            )
            params.maxFee = fee

            // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
            if (params.fioRequestId) {
              this.otherData.fioRequestsToApprove[params.fioRequestId] = params
              this.localDataDirty()
              const res = await this.multicastServers(actionName, params)
              // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
              if (res && res.status === 'sent_to_blockchain') {
                // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
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
          case 'addBundledTransactions': {
            const fioAddress = this.otherData.fioAddresses.find(
              ({ name }) => name === params.fioAddress
            )

            if (fioAddress == null)
              throw new FioError('Fio Address is not found in engine')

            const res = await this.multicastServers(actionName, params)

            // @ts-expect-error
            // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
            fioAddress.bundledTxs += DEFAULT_BUNDLED_TXS_AMOUNT
            this.localDataDirty()
            return { bundledTxs: fioAddress.bundledTxs, ...res }
          }
        }

        return await this.multicastServers(actionName, params)
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
        return (
          // @ts-expect-error
          this.otherData.fioRequests[type]
            // @ts-expect-error
            .sort((a, b) => (a.time_stamp < b.time_stamp ? 1 : -1))
            .slice(startIndex, endIndex)
        )
      }
    }
  }

  setOtherData(raw: any): void {
    this.otherData = asFioWalletOtherData(raw)
  }

  // Normalize date if not exists "Z" parameter
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
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

  /*
  Unstaked FIO is locked until 7 days after the start of the GMT day for when
  the transaction occurred (block-time).
  */
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  getUnlockDate(txDate: Date) {
    const blockTimeBeginingOfGmtDay =
      Math.floor(txDate.getTime() / DAY_INTERVAL) * DAY_INTERVAL
    return new Date(blockTimeBeginingOfGmtDay + STAKING_LOCK_PERIOD)
  }

  async loadEngine(
    plugin: EdgeCurrencyTools,
    walletInfo: EdgeWalletInfo,
    opts: EdgeCurrencyEngineOptions
  ): Promise<void> {
    await super.loadEngine(plugin, walletInfo, opts)
    if (typeof this.walletInfo.keys.ownerPublicKey !== 'string') {
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      if (walletInfo.keys.ownerPublicKey) {
        this.walletInfo.keys.ownerPublicKey = walletInfo.keys.ownerPublicKey
      } else {
        const pubKeys = await plugin.derivePublicKey(this.walletInfo)
        this.walletInfo.keys.ownerPublicKey = pubKeys.ownerPublicKey
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  fioSdkInit() {
    const baseUrl = shuffleArray(
      this.networkInfo.apiUrls.map(apiUrl => apiUrl)
    )[0]

    this.fioSdk = new FIOSDK(
      this.walletInfo.keys.fioKey,
      this.walletInfo.keys.publicKey,
      baseUrl,
      this.fetchCors,
      undefined,
      this.tpid
    )
  }

  // Poll on the blockheight
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
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

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  doInitialBalanceCallback() {
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
        // @ts-expect-error
        stakedAmounts: [],
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
    // Might not be necessary, but better to be safe than sorry
    if (
      this.otherData.stakingStatus == null ||
      this.otherData.stakingStatus.stakedAmounts == null
    ) {
      this.otherData.stakingStatus = {
        stakedAmounts: []
      }
    }

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
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        (stakedAmount, index) =>
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
            // eslint-disable-next-line @typescript-eslint/prefer-optional-chain
            ...(existingTrx.otherParams != null &&
            existingTrx.otherParams.data != null
              ? existingTrx.otherParams.data
              : {}),
            ...otherParams.data
          },
          meta: {
            // eslint-disable-next-line @typescript-eslint/prefer-optional-chain
            ...(existingTrx.otherParams != null &&
            existingTrx.otherParams.meta != null
              ? existingTrx.otherParams.meta
              : {}),
            ...otherParams.meta
          }
        }

        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
        if (otherParams.meta.isTransferProcessed) {
          return action.block_num
        }
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
        if (otherParams.meta.isFeeProcessed) {
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
        txid: action.action_trace.trx_id,
        date: this.getUTCDate(action.block_time) / 1000,
        currencyCode,
        blockHeight: action.block_num > 0 ? action.block_num : 0,
        nativeAmount,
        networkFee,
        parentNetworkFee: '0',
        ourReceiveAddresses,
        signedTx: '',
        otherParams,
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
      let denom = getDenomInfo(this.currencyInfo, currencyCode)
      if (denom == null) {
        denom = getDenomInfo(this.currencyInfo, this.currencyInfo.currencyCode)
        if (denom == null) {
          this.error(`Received unsupported currencyCode: ${currencyCode}`)
          return 0
        }
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
            // eslint-disable-next-line @typescript-eslint/prefer-optional-chain
            ...(existingTrx.otherParams != null &&
            existingTrx.otherParams.data != null
              ? existingTrx.otherParams.data
              : {})
          },
          meta: {
            ...otherParams.meta,
            // eslint-disable-next-line @typescript-eslint/prefer-optional-chain
            ...(existingTrx.otherParams != null &&
            existingTrx.otherParams.meta != null
              ? existingTrx.otherParams.meta
              : {})
          }
        }
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
        if (otherParams.meta.isFeeProcessed) {
          return action.block_num
        }
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
        if (otherParams.meta.isTransferProcessed) {
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
        txid: action.action_trace.trx_id,
        date: this.getUTCDate(action.block_time) / 1000,
        currencyCode,
        blockHeight: action.block_num > 0 ? action.block_num : 0,
        nativeAmount,
        networkFee,
        signedTx: '',
        ourReceiveAddresses: [],
        otherParams,
        walletId: this.walletId
      }
      this.addTransaction(currencyCode, edgeTransaction)
    }

    return action.block_num
  }

  async checkTransactions(historyNodeIndex: number = 0): Promise<boolean> {
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (!this.networkInfo.historyNodeUrls[historyNodeIndex]) return false
    let newHighestTxHeight = this.otherData.highestTxHeight
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

      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-optional-chain
      if (lastActionObject.error && lastActionObject.error.noNodeForIndex) {
        // no more history nodes left
        return false
      }

      asHistoryResponse(lastActionObject)
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      if (lastActionObject.actions.length) {
        lastActionSeqNumber = lastActionObject.actions[0].account_action_seq
      } else {
        // if no transactions at all
        return true
      }
    } catch (e: any) {
      return await this.checkTransactions(++historyNodeIndex)
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
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-optional-chain
        if (actionsObject.error && actionsObject.error.noNodeForIndex) {
          return false
        }

        let actions = []

        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
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
            blockNum < this.otherData.highestTxHeight
          ) {
            finish = true
            break
          }
        }

        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
        if (!actions.length || actions.length < HISTORY_NODE_OFFSET) {
          break
        }
        pos -= HISTORY_NODE_OFFSET
      } catch (e: any) {
        return await this.checkTransactions(++historyNodeIndex)
      }
    }
    if (newHighestTxHeight > this.otherData.highestTxHeight) {
      this.otherData.highestTxHeight = newHighestTxHeight
      this.localDataDirty()
    }
    return true
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  async checkTransactionsInnerLoop() {
    let transactions
    try {
      transactions = await this.checkTransactions()
    } catch (e: any) {
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
      account_name: string
      pos: number
      offset: number
    },
    uri: string
  ): Promise<any> {
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (!this.networkInfo.historyNodeUrls[nodeIndex])
      return { error: { noNodeForIndex: true } }
    const apiUrl = this.networkInfo.historyNodeUrls[nodeIndex]
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    const result = await this.fetchCors(`${apiUrl}history/${uri || ''}`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
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
        case 'getFioBalance':
          res = await fioSdk.genericAction(actionName, params)
          asGetFioBalanceResponse(res)
          if (res.balance != null && res.balance < 0)
            throw new Error('Invalid balance')

          break
        default:
          res = await fioSdk.genericAction(actionName, params)
      }
    } catch (e: any) {
      // handle FIO API error
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      if (e.errorCode && fioApiErrorCodes.includes(e.errorCode)) {
        if (
          // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-optional-chain
          e.json &&
          // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
          e.json.fields &&
          // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
          e.json.fields[0] &&
          // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
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

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  async executePreparedTrx(
    apiUrl: string,
    endpoint: string,
    preparedTrx: PreparedTrx
  ) {
    const fioSdk = new FIOSDK(
      this.walletInfo.keys.fioKey,
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
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      if (e.errorCode && fioApiErrorCodes.includes(e.errorCode)) {
        this.log(
          `executePreparedTrx error. requestParams: ${JSON.stringify(
            preparedTrx
          )} - apiUrl: ${apiUrl} - endpoint: ${endpoint} - message: ${JSON.stringify(
            e.json
          )}`
        )
        if (
          // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-optional-chain
          e.json &&
          // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
          e.json.fields &&
          // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
          e.json.fields[0] &&
          // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
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
      let preparedTrx = asMaybe(asFioSignedTx)(params)
      if (preparedTrx == null) {
        this.warn(
          `multicastServers prepare trx. actionName: ${actionName} - res: ${JSON.stringify(
            params
          )}`
        )
        preparedTrx = await asyncWaterfall(
          shuffleArray(
            this.networkInfo.apiUrls.map(
              apiUrl => async () =>
                await this.fioApiRequest(apiUrl, actionName, params, true)
            )
          )
        )
      }
      this.warn(
        `multicastServers executePreparedTrx. actionName: ${actionName} - res: ${JSON.stringify(
          preparedTrx
        )}`
      )
      res = await promiseAny(
        shuffleArray(
          this.networkInfo.apiUrls.map(
            async apiUrl =>
              await this.executePreparedTrx(
                apiUrl,
                EndPoint[ACTIONS_TO_END_POINT_KEYS[actionName]],
                preparedTrx as FioSignedTx
              )
          )
        )
      )
      this.warn(
        `multicastServers res. actionName: ${actionName} - res: ${JSON.stringify(
          res
        )}`
      )
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      if (!res) {
        throw new Error('Service is unavailable')
      }
    } else if (actionName === 'getFioNames') {
      res = await promiseNy(
        this.networkInfo.apiUrls.map(
          async apiUrl =>
            await timeout(this.fioApiRequest(apiUrl, actionName, params), 10000)
        ),
        (result: GetFioName) => {
          try {
            return JSON.stringify(asGetFioName(result))
          } catch (e: any) {
            this.log(`getFioNames checkResult function returned error `, e)
          }
        },
        2
      )
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

    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (res.isError) {
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      const error = new FioError(res.errorMessage || res.data.message)
      error.json = res.data.json
      error.list = res.data.list
      error.errorCode = res.data.code

      throw error
    }

    return res
  }

  // Check all account balance and other relevant info
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  async checkAccountInnerLoop() {
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
      // @ts-expect-error
      const balances: {
        staked: string
        locked: string
      } = {}
      const { balance, available, staked, srps, roe } =
        await this.multicastServers('getFioBalance')
      const nativeAmount = String(balance)
      balances.staked = String(staked)
      balances.locked = sub(nativeAmount, String(available))

      this.otherData.srps = srps
      this.otherData.stakingRoe = roe

      this.updateBalance(currencyCode, nativeAmount)
      this.updateBalance(balanceCurrencyCodes.staked, balances.staked)
      this.updateBalance(balanceCurrencyCodes.locked, balances.locked)
    } catch (e: any) {
      this.log('checkAccountInnerLoop getFioBalance error: ', e)
    }

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
                // @ts-expect-error
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
            // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
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
                // @ts-expect-error
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
        // @ts-expect-error
        this.otherData.fioAddresses = result.fio_addresses.map(fioAddress => ({
          name: fioAddress.fio_address,
          bundledTxs: fioAddress.remaining_bundled_tx
        }))
      }

      if (areDomainsChanged) {
        isChanged = true
        // @ts-expect-error
        this.otherData.fioDomains = result.fio_domains.map(fioDomain => ({
          name: fioDomain.fio_domain,
          expiration: fioDomain.expiration,
          // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
          isPublic: !!fioDomain.is_public
        }))
      }

      if (isChanged) this.localDataDirty()
    } catch (e: any) {
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
      // @ts-expect-error
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

        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
        if (requests) {
          requestsLastPage++
          fioRequests.push(...requests)
          lastPageAmount = requests.length
        }
      } catch (e: any) {
        lastPageAmount = 0
        this.error('fetchFioRequests error: ', e)
      }
    }

    if (
      // @ts-expect-error
      this.fioRequestsListChanged(this.otherData.fioRequests[type], fioRequests)
    ) {
      // @ts-expect-error
      this.otherData.fioRequests[type] = [...fioRequests]
      isChanged = true
    }

    if (isChanged) this.localDataDirty()
  }

  fioRequestsListChanged = (
    existingList: FioRequest[],
    newList: FioRequest[]
  ): boolean => {
    // @ts-expect-error
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
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
    // @ts-expect-error
    const fioRequestIndex = this.otherData.fioRequests[type].findIndex(
      (fioRequest: FioRequest) =>
        fioRequest.fio_request_id === `${fioRequestId}`
    )

    if (fioRequestIndex > -1) {
      // @ts-expect-error
      this.otherData.fioRequests[type].splice(fioRequestIndex, 1)
    }
  }

  async approveErroredFioRequests(): Promise<void> {
    for (const fioRequestId in this.otherData.fioRequestsToApprove) {
      try {
        // @ts-expect-error
        await this.otherMethods.fioAction(
          'recordObtData',
          this.otherData.fioRequestsToApprove[fioRequestId]
        )
      } catch (e: any) {
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
    // @ts-expect-error
    this.otherData.fioRequests = {
      [FIO_REQUESTS_TYPES.SENT]: [],
      [FIO_REQUESTS_TYPES.PENDING]: []
    }
    this.otherData.fioRequestsToApprove = {}
    this.otherData.stakingStatus = {
      stakedAmounts: []
    }
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
    this.addToLoop('approveErroredFioRequests', ADDRESS_POLL_MILLISECONDS)
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.addToLoop('checkFioRequests', REQUEST_POLL_MILLISECONDS)
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    super.startEngine()
  }

  async resyncBlockchain(): Promise<void> {
    await this.killEngine()
    await this.clearBlockchainCache()
    await this.startEngine()
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  async makeSpend(edgeSpendInfoIn: EdgeSpendInfo) {
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

    const {
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
    } = edgeSpendInfo

    const { name, params } = asFioAction(otherParams.action)

    let fee
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
        if (
          gt(quantity, stakedBalance) ||
          gt(add(quantity, `${fee}`), availableBalance)
        ) {
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
      default: {
        // Do nothing
      }
    }

    if (fee == null) {
      let feeFioAddress = ''
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      if (FEE_ACTION_MAP[name] != null && params) {
        feeFioAddress = params[FEE_ACTION_MAP[name].propName] as string
      }
      // @ts-expect-error
      fee = await this.otherMethods.getFee(name, feeFioAddress)
      params.maxFee = fee
    }

    const edgeTransaction: EdgeTransaction = {
      txid: '',
      date: 0,
      currencyCode,
      blockHeight: 0,
      nativeAmount: sub(`-${quantity}`, `${fee}`),
      networkFee: `${fee}`,
      ourReceiveAddresses: [],
      signedTx: '',
      otherParams: {
        ...otherParams,
        txParams
      },
      walletId: this.walletId
    }

    return edgeTransaction
  }

  async signTx(edgeTransaction: EdgeTransaction): Promise<EdgeTransaction> {
    const otherParams = getOtherParams(edgeTransaction)
    const txParams = asMaybe(asFioTxParams)(otherParams.txParams)

    if (txParams != null) {
      const transactions = new Transactions()

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
        privateKeys: [this.walletInfo.keys.fioKey],
        transaction: rawTx,
        serializedTransaction,
        serializedContextFreeData
      })

      edgeTransaction.otherParams = { ...edgeTransaction.otherParams, signedTx }
    }
    return edgeTransaction
  }

  async broadcastTx(
    edgeTransaction: EdgeTransaction
  ): Promise<EdgeTransaction> {
    let trx: FioBroadcastResult
    const otherParams = getOtherParams(edgeTransaction)

    if (otherParams.action?.name == null) {
      throw new Error(
        'Action is not set, "action" prop of otherParams is required for FIO actions'
      )
    }

    if ('signedTx' in otherParams) {
      const signedTx = asFioSignedTx(otherParams.signedTx)
      trx = await this.multicastServers(otherParams.action.name, signedTx)
    } else {
      // @ts-expect-error
      trx = await this.otherMethods.fioAction(
        otherParams.action.name,
        otherParams.action.params
      )
    }
    trx = asFioBroadcastResult(trx)

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
      }
    } catch (e) {
      this.log.warn(`Error attempting post-broadcast action ${name}:`, e)
    }

    await super.saveTx(edgeTransaction)
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getFreshAddress(options: any): Promise<EdgeFreshAddress> {
    return { publicAddress: this.walletInfo.keys.publicKey }
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  getDisplayPrivateSeed() {
    let out = ''
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-optional-chain
    if (this.walletInfo.keys && this.walletInfo.keys.fioKey) {
      // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
      out += this.walletInfo.keys.fioKey
    }
    return out
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  getDisplayPublicSeed() {
    let out = ''
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-optional-chain
    if (this.walletInfo.keys && this.walletInfo.keys.publicKey) {
      // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
      out += this.walletInfo.keys.publicKey
    }
    return out
  }
}

export async function makeCurrencyEngine(
  env: PluginEnvironment<FioNetworkInfo>,
  tools: FioTools,
  walletInfo: EdgeWalletInfo,
  opts: EdgeCurrencyEngineOptions
): Promise<EdgeCurrencyEngine> {
  const { tpid = 'finance@edge' } = env.initOptions
  const engine = new FioEngine(env, tools, walletInfo, opts, tpid)
  await engine.loadEngine(tools, walletInfo, opts)

  return engine
}
