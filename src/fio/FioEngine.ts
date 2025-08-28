import { FIOSDK } from '@fioprotocol/fiosdk'
import { BalanceResponse } from '@fioprotocol/fiosdk/lib/entities/BalanceResponse'
import { EndPoint } from '@fioprotocol/fiosdk/lib/entities/EndPoint'
import { GetEncryptKeyResponse } from '@fioprotocol/fiosdk/lib/entities/GetEncryptKeyResponse'
import { GetObtDataResponse } from '@fioprotocol/fiosdk/lib/entities/GetObtDataResponse'
import {
  PendingFioRequests,
  SentFioRequests
} from '@fioprotocol/fiosdk/lib/transactions/queries'
import { Query } from '@fioprotocol/fiosdk/lib/transactions/queries/Query'
import { Transactions } from '@fioprotocol/fiosdk/lib/transactions/Transactions'
import AbortController from 'abort-controller'
import { add, div, gt, lt, lte, max, mul, sub } from 'biggystring'
import { asMaybe, asString, asTuple } from 'cleaners'
import {
  EdgeCurrencyEngine,
  EdgeCurrencyEngineOptions,
  EdgeDenomination,
  EdgeEnginePrivateKeyOptions,
  EdgeFetchFunction,
  EdgeFreshAddress,
  EdgeSpendInfo,
  EdgeStakingStatus,
  EdgeTokenId,
  EdgeTransaction,
  EdgeWalletInfo,
  InsufficientFundsError,
  JsonObject,
  NoAmountSpecifiedError
} from 'edge-core-js/types'

import { CurrencyEngine } from '../common/CurrencyEngine'
import { PluginEnvironment } from '../common/innerPlugin'
import { getRandomDelayMs } from '../common/network'
import {
  asyncWaterfall,
  formatAggregateError,
  promiseAny,
  promisesAgree,
  timeout
} from '../common/promiseUtils'
import {
  cleanTxLogs,
  getDenomination,
  getFetchCors,
  getOtherParams,
  safeErrorMessage,
  shuffleArray
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
  MAINNET_LOCKS_ERROR,
  NO_FIO_NAMES,
  PUBLIC_KEY_NOT_FOUND,
  STAKING_LOCK_PERIOD,
  STAKING_REWARD_MEMO,
  TxOtherParams
} from './fioConst'
import { fioApiErrorCodes, FioError } from './fioError'
import {
  asFioHistoryNodeAction,
  asGetFioAddress,
  asGetFioBalanceResponse,
  asGetFioDomains,
  asHistoryResponse,
  FioHistoryNodeAction,
  FioTxName
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

const ADDRESS_POLL_MILLISECONDS = getRandomDelayMs(20000)
const BLOCKCHAIN_POLL_MILLISECONDS = getRandomDelayMs(20000)
const TRANSACTION_POLL_MILLISECONDS = getRandomDelayMs(20000)
const SYNC_NETWORK_INTERVAL = getRandomDelayMs(20000)

interface PreparedTrx {
  signatures: string[]
  compression: number
  packed_context_free_data: string
  packed_trx: string
}

interface UpdateStakingStatus {
  nativeAmount: string
  blockTime: string
  txId: string
  txName: FioTxName
}
interface ParseActionParams {
  action: FioHistoryNodeAction
  actor: string
  tokenId: EdgeTokenId
  currencyCode: string
  denom: EdgeDenomination
  highestTxHeight: number
  publicKey: string
  walletId: string
  findTransaction: FindTransaction
  getTransactionList: GetTransactionList
}
interface ParseActionResult {
  blockNum: number
  transaction?: EdgeTransaction
  updateStakingStatus?: UpdateStakingStatus
}

export type FindTransaction = (tokenId: EdgeTokenId, txId: string) => number
export type GetTransactionList = (tokenId: EdgeTokenId) => EdgeTransaction[]

export class FioEngine extends CurrencyEngine<FioTools, SafeFioWalletInfo> {
  fetchCors: EdgeFetchFunction
  otherMethods: Object
  otherMethodsWithKeys: Object
  tpid: string
  otherData!: FioWalletOtherData
  networkInfo: FioNetworkInfo
  refBlock: FioRefBlock
  fees: FioActionFees
  actor: string

  localDataDirty(): void {
    this.walletLocalDataDirty = true
  }

  // TODO: v1.9 of the FIO sdk introduced a getEncyptKey prop to their
  // checkFioRequests fn, though the SDK can still function without it.
  // Whenever they require it or provide more information about what it even
  // is, we should implement it.
  defaultGetEncryptKey = async (
    fioAddress: string
  ): Promise<GetEncryptKeyResponse> => {
    // Provide a default response or handle the fallback logic here
    return {
      encrypt_public_key: this.walletInfo.keys.publicKey // Use the public key as a fallback
    }
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

    this.otherMethods = {
      fioAction: async (actionName: string, params: any): Promise<any> => {
        return await this.multicastServers(actionName, params)
      },
      fetchFioAddresses: async (): Promise<FioAddress[]> => {
        await this.refreshFioAddresses()
        return this.otherData.fioAddresses
      },
      fetchFioDomains: async (): Promise<FioDomain[]> => {
        await this.refreshFioDomains()
        return this.otherData.fioDomains
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
      }
    }

    this.otherMethodsWithKeys = {
      fetchObtData: async (
        privateKeys: JsonObject,
        ...rest: any[]
      ): Promise<ObtData[]> => {
        const fioSdk = new FIOSDK(
          privateKeys.fioKey,
          this.walletInfo.keys.publicKey,
          this.networkInfo.historyNodeUrls,
          this.fetchCors
        )
        const ITEMS_PER_PAGE = 100

        let lastPageAmount = ITEMS_PER_PAGE
        let requestsLastPage = 1
        const decryptedObtDataRecords: ObtData[] = []
        while (lastPageAmount === ITEMS_PER_PAGE) {
          let response: GetObtDataResponse
          try {
            response = await fioSdk.getObtData({
              limit: ITEMS_PER_PAGE,
              offset: (requestsLastPage - 1) * ITEMS_PER_PAGE,
              includeEncrypted: true
            })

            const cleanResponse = asGetObtDataResponse(response)

            const { obt_data_records: obtDataRecords, more } = cleanResponse
            decryptedObtDataRecords.push(...obtDataRecords)
            if (more === 0) break

            requestsLastPage++
            lastPageAmount = obtDataRecords.length
          } catch (e: any) {
            const errorJson = asMaybe(asFioEmptyResponse)(e.json)
            if (errorJson?.message !== 'No FIO Requests') {
              this.error('fetchDecryptedObtData error: ', e)
            }
            break
          }
        }

        return decryptedObtDataRecords
      }
    }
  }

  setOtherData(raw: any): void {
    this.otherData = asFioWalletOtherData(raw)
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

    try {
      this.currencyEngineCallbacks.onStakingStatusChanged({
        ...this.otherData.stakingStatus
      })
    } catch (e: any) {
      this.error(`doInitialBalanceCallback onStakingStatusChanged`, e)
    }
  }

  updateStakingStatus(params?: {
    nativeAmount: string
    blockTime: string
    txId: string
    txName: FioTxName
  }): void {
    // First two entries in stakedAmounts will always be the locked and staked amounts
    this.otherData.stakingStatus.stakedAmounts[0] = {
      nativeAmount: this.otherData.lockedBalances.locked,
      unlockDate: undefined,
      otherParams: {
        type: 'LOCKED'
      }
    }
    this.otherData.stakingStatus.stakedAmounts[1] = {
      nativeAmount: this.otherData.lockedBalances.staked,
      unlockDate: undefined,
      otherParams: {
        type: 'STAKED'
      }
    }

    if (params != null) {
      const { nativeAmount, blockTime, txId, txName } = params
      const unlockDate = getUnlockDate(new Date(getUTCDate(blockTime)))

      /**
       * Compare each stakedAmount's unlockDate with the transaction's unlockDate to
       * find the correct stakedAmount object to place where the transaction.
       */
      const stakedAmountIndex =
        this.otherData.stakingStatus.stakedAmounts.findIndex(stakedAmount => {
          return stakedAmount.unlockDate?.getTime() === unlockDate.getTime()
        })

      /**
       * If no stakedAmount object was found, then insert a new object into the
       * stakedAmounts array. Insert into the array at the correct index maintaining
       * a sorting by unlockDate in descending order.
       */
      if (stakedAmountIndex < 0) {
        // Search for the correct index to insert the new stakedAmount object
        const needleIndex =
          this.otherData.stakingStatus.stakedAmounts.findIndex(
            stakedAmount =>
              unlockDate.getTime() >=
              (stakedAmount.unlockDate?.getTime() ?? Infinity)
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
    tokenId: EdgeTokenId = null
  ): number {
    const denom = getDenomination(
      this.currencyInfo.currencyCode,
      this.currencyInfo,
      this.allTokensMap
    )
    if (denom == null) {
      this.error(
        `Received unsupported currencyCode: ${this.currencyInfo.currencyCode}`
      )
      return 0
    }

    const { blockNum, transaction, updateStakingStatus } = parseAction({
      action,
      actor,
      currencyCode: this.currencyInfo.currencyCode,
      tokenId,
      denom,
      highestTxHeight: this.otherData.highestTxHeight,
      publicKey: this.walletInfo.keys.publicKey,
      walletId: this.walletId,
      findTransaction: (tokenId: EdgeTokenId, txid: string): number =>
        this.findTransaction(tokenId, txid),
      getTransactionList: (tokenId: EdgeTokenId): EdgeTransaction[] =>
        this.transactionList[tokenId ?? '']
    })
    if (updateStakingStatus != null) {
      this.updateStakingStatus(updateStakingStatus)
    }

    if (transaction != null) {
      this.addTransaction(transaction.tokenId, transaction)
    }

    return blockNum
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
          const action = asFioHistoryNodeAction(actions[i])
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
      this.tokenCheckTransactionsStatus.set(null, 1)
      this.updateOnAddressesChecked()
    }
    this.sendTransactionEvents()
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
          res = await fioSdk.transactions.executeCall({
            baseUrl: apiUrl,
            endPoint: endpoint,
            body: JSON.stringify(body),
            signal: new AbortController().signal
          })
          break
        }
        case 'getCurrencyBalance': {
          // This is a fallback query for this chain bug
          // https://fioprotocol.atlassian.net/wiki/spaces/DAO/pages/852688908/2024-02-07+Token+Locking+Issue+on+Unstake
          // Only the balance of the wallet will be returned and staked amounts
          // will appear as zero until the account is corrected. This can be
          // removed once all affected accounts are fixed.
          const currencyBalRes = await this.fetchCors(
            `${apiUrl}chain/get_currency_balance`,
            {
              method: 'POST',
              headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(params)
            }
          )
          res = await currencyBalRes.json()
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
      res = await formatAggregateError(
        promiseAny(
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
        ),
        'Broadcast failed:'
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
      res = await promisesAgree(
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
    } else if (actionName === 'getCurrencyBalance') {
      // This is a fallback query for this chain bug
      // https://fioprotocol.atlassian.net/wiki/spaces/DAO/pages/852688908/2024-02-07+Token+Locking+Issue+on+Unstake
      // Only the balance of the wallet will be returned and staked amounts will
      // appear as zero until the account is corrected. This can be removed once
      // all affected accounts are fixed.
      res = await promisesAgree(
        this.networkInfo.apiUrls.map(
          async apiUrl =>
            await timeout(
              this.fioApiRequest(apiUrl, 'getCurrencyBalance', {
                code: 'fio.token',
                account: this.actor,
                symbol: 'FIO'
              }),
              10000
            )
        ),
        (result: any) => {
          return JSON.stringify(result)
        },
        2
      )
      if (res?.data?.json?.message === PUBLIC_KEY_NOT_FOUND) {
        res = { balance: 0, available: 0, staked: 0, srps: 0, roe: '' }
      }

      const clean = asTuple(asString)(res)
      const exchangeAmount = clean[0].split(' ')[0]
      const nativeAmount = mul(
        exchangeAmount,
        this.currencyInfo.denominations[0].multiplier ?? '1000000000'
      )

      res = {
        balance: parseInt(nativeAmount),
        available: 0,
        staked: 0,
        srps: 0,
        roe: '0'
      }
    } else if (actionName === 'getFioBalance') {
      res = await promisesAgree(
        this.networkInfo.apiUrls.map(
          async apiUrl =>
            await timeout(this.fioApiRequest(apiUrl, actionName, params), 10000)
        ),
        (result: any) => {
          return comparisonFioBalanceString(result)
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

    if (res.isError != null) {
      const error = new FioError(res.errorMessage ?? res.data.message)
      error.json = res.data.json
      error.list = res.data.list
      error.errorCode = res.data.code

      throw error
    }

    return res
  }

  async refreshFioAddresses(): Promise<boolean> {
    const result = asGetFioAddress(
      await this.multicastServers('getFioAddresses', {
        fioPublicKey: this.walletInfo.keys.publicKey
      })
    )
    let areAddressesChanged = false

    // check addresses
    if (result.fio_addresses.length !== this.otherData.fioAddresses.length) {
      areAddressesChanged = true
    } else {
      for (const fioAddress of result.fio_addresses) {
        const existedFioAddress = this.otherData.fioAddresses.find(
          existedFioAddress => existedFioAddress.name === fioAddress.fio_address
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

    if (areAddressesChanged) {
      this.otherData.fioAddresses = result.fio_addresses.map(fioAddress => ({
        name: fioAddress.fio_address,
        bundledTxs: fioAddress.remaining_bundled_tx
      }))
      return true
    }

    return false
  }

  async refreshFioDomains(): Promise<boolean> {
    // Check domains
    const result = asGetFioDomains(
      await this.multicastServers('getFioDomains', {
        fioPublicKey: this.walletInfo.keys.publicKey
      })
    )
    let areDomainsChanged = false

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

    if (areDomainsChanged) {
      this.otherData.fioDomains = result.fio_domains.map(fioDomain => ({
        name: fioDomain.fio_domain,
        expiration: fioDomain.expiration,
        isPublic: fioDomain.is_public === 1
      }))
      return true
    }

    return false
  }

  // Check all account balance and other relevant info
  async checkAccountInnerLoop(): Promise<void> {
    // Balance
    try {
      const balances = { staked: '0', locked: '0' }
      let balanceRes: BalanceResponse
      try {
        balanceRes = asGetFioBalanceResponse(
          await this.multicastServers('getFioBalance')
        )
      } catch (e: any) {
        if (e?.json?.message === MAINNET_LOCKS_ERROR) {
          // This is a fallback query for this chain bug
          // https://fioprotocol.atlassian.net/wiki/spaces/DAO/pages/852688908/2024-02-07+Token+Locking+Issue+on+Unstake
          // Only the balance of the wallet will be returned and staked amounts
          // will appear as zero until the account is corrected. This can be
          // removed once all affected accounts are fixed.
          balanceRes = asGetFioBalanceResponse(
            await this.multicastServers('getCurrencyBalance')
          )
          this.log.warn('Returning FIO balance only due to chain bug')
        } else if (e?.json?.message === PUBLIC_KEY_NOT_FOUND) {
          balanceRes = { balance: 0, available: 0, staked: 0, srps: 0, roe: '' }
        } else {
          throw e
        }
      }
      const { balance, available, staked, srps, roe } = balanceRes
      const nativeAmount = String(balance)
      balances.staked = String(staked)
      balances.locked = sub(nativeAmount, String(available))

      this.otherData.srps = srps
      this.otherData.stakingRoe = roe

      this.updateBalance(null, nativeAmount)

      if (
        balances.staked !== this.otherData.lockedBalances.staked ||
        balances.locked !== this.otherData.lockedBalances.locked
      ) {
        this.otherData.lockedBalances = balances
        this.localDataDirty()
        this.updateStakingStatus()
      }
    } catch (e: any) {
      this.log.warn('checkAccountInnerLoop getFioBalance error: ', String(e))
    }

    // Fio Addresses and Domains
    const isAddressChanged = await this.refreshFioAddresses().catch(error =>
      console.warn(
        'checkAccountInnerLoop getFioAddresses error:',
        String(error)
      )
    )
    const isDomainChanged = await this.refreshFioDomains().catch(error =>
      console.warn('checkAccountInnerLoop getFioDomains error:', String(error))
    )

    if (isAddressChanged === true || isDomainChanged === true)
      this.localDataDirty()
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

      const decryptedRequestRes: { requests: FioRequest[] } =
        (await decoder.decrypt({
          requests: encryptedReqs
        })) ?? { requests: [] }
      const { requests } = decryptedRequestRes

      if (
        this.fioRequestsListChanged(this.otherData.fioRequests[type], requests)
      ) {
        this.otherData.fioRequests[type] = [...requests]
        isChanged = true
      }
    }

    await checkFioRequests(
      'PENDING',
      new PendingFioRequests({
        fioPublicKey: this.walletInfo.keys.publicKey,
        getEncryptKey: this.defaultGetEncryptKey
      })
    )
    await checkFioRequests(
      'SENT',
      new SentFioRequests({
        fioPublicKey: this.walletInfo.keys.publicKey,
        getEncryptKey: this.defaultGetEncryptKey
      })
    )

    if (isChanged) this.localDataDirty()

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
    this.addToLoop('checkBlockchainInnerLoop', BLOCKCHAIN_POLL_MILLISECONDS)
    this.addToLoop('checkAccountInnerLoop', ADDRESS_POLL_MILLISECONDS)
    this.addToLoop('checkTransactionsInnerLoop', TRANSACTION_POLL_MILLISECONDS)
    await super.startEngine()
  }

  async resyncBlockchain(): Promise<void> {
    await this.killEngine()
    await this.clearBlockchainCache()
    await this.startEngine()
  }

  async getMaxSpendable(spendInfo: EdgeSpendInfo): Promise<string> {
    const { tokenId } = spendInfo
    const balance = this.getBalance({
      tokenId
    })

    const lockedAmount = this.otherData.lockedBalances.locked

    spendInfo.spendTargets[0].nativeAmount = '1'
    const edgeTx = await this.makeSpend(spendInfo)
    const spendableAmount = sub(sub(balance, edgeTx.networkFee), lockedAmount)

    if (lt(spendableAmount, '0')) {
      throw new InsufficientFundsError({
        networkFee: edgeTx.networkFee,
        tokenId
      })
    }

    return spendableAmount
  }

  async makeSpend(edgeSpendInfoIn: EdgeSpendInfo): Promise<EdgeTransaction> {
    const { edgeSpendInfo, nativeBalance, currencyCode } =
      this.makeSpendCheck(edgeSpendInfoIn)
    const { memos = [], tokenId } = edgeSpendInfo

    const lockedBalance = this.otherData.lockedBalances.locked
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

    let nativeAmount = quantity
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
        nativeAmount = '0'
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
        nativeAmount = '0'
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

        const unlockDate = getUnlockDate(new Date())
        const stakedBalance = this.otherData.lockedBalances.staked
        if (gt(quantity, stakedBalance) || gt(`${fee}`, availableBalance)) {
          throw new InsufficientFundsError({ tokenId })
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
      memos,
      nativeAmount: `-${add(nativeAmount, fee)}`,
      networkFee: `${fee}`,
      networkFees: [],
      otherParams: {
        ...otherParams,
        txParams
      },
      ourReceiveAddresses: [],
      signedTx: '',
      tokenId,
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

          const fioSdk = new FIOSDK(
            privateKeys.fioKey,
            this.walletInfo.keys.publicKey,
            this.networkInfo.historyNodeUrls,
            this.fetchCors
          )

          const { encrypt_public_key: encryptPublicKey } =
            await fioSdk.getEncryptKey(payeeFioAddress)

          const cipherContent = transactions.getCipherContent(
            'record_obt_data_content',
            content,
            fioPrivateKeys.fioKey,
            encryptPublicKey
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

    // Remove tpid as a temporary fix for bundled tx's not working when the user
    // has no FIO balance or txs, until FIO fixes their chain
    // TODO: Remove once FIO fixes their chain
    const balance = await this.getBalance({ tokenId: null })
    const tpid =
      lte(balance, '0') &&
      !this.transactionList[''].some(tx => gt(tx.nativeAmount, '0'))
        ? undefined
        : this.tpid

    const rawTx = await transactions.createRawTransaction({
      action: txParams.action,
      account: txParams.account,
      data: { ...txParams.data, tpid },
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
    const result = await this.multicastServers(
      otherParams.action.name,
      signedTx
    )
    const trx = asFioBroadcastResult(result)

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

// Normalize date if not exists "Z" parameter
const getUTCDate = (dateString: string): number => {
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

/**
 * Unstaked FIO is locked until 7 days after the start of the GMT day for when
 * the transaction occurred (block-time).
 */
const getUnlockDate = (txDate: Date): Date => {
  const blockTimeBeginingOfGmtDay =
    Math.floor(txDate.getTime() / DAY_INTERVAL) * DAY_INTERVAL
  return new Date(blockTimeBeginingOfGmtDay + STAKING_LOCK_PERIOD)
}

export const parseAction = ({
  action,
  actor,
  tokenId,
  currencyCode,
  denom,
  highestTxHeight,
  publicKey,
  walletId,
  findTransaction,
  getTransactionList
}: ParseActionParams): ParseActionResult => {
  const {
    act: { name: actName, data, account, authorization }
  } = action.action_trace

  if (action.block_num <= highestTxHeight) {
    return { blockNum: action.block_num }
  }

  let otherParams: TxOtherParams = {
    account,
    name: actName,
    authorization,
    data,
    meta: {}
  }
  const index = findTransaction(tokenId, action.action_trace.trx_id)
  let existingTx: EdgeTransaction | undefined
  if (index > -1) {
    existingTx = getTransactionList(tokenId)[index]
    // Change this part to match the original logic
    if (existingTx.otherParams?.meta?.isTransferProcessed != null) {
      return { blockNum: action.block_num }
    }
  }

  // Process a new action
  const dataMaxFee = data.max_fee?.toString() ?? '0'
  const dataAmount = data.amount?.toString() ?? '0'
  const exchangeAmount = data.quantity?.split(' ')[0] ?? '0'
  const fioAmount = mul(exchangeAmount, denom.multiplier)

  const ourReceiveAddresses = []
  let networkFee = '0'
  let nativeAmount = '0'
  let updateStakingStatus: UpdateStakingStatus | undefined
  let assetAction: EdgeTransaction['assetAction'] | undefined

  switch (actName) {
    case 'trnsfiopubky':
      if (data.payee_public_key === publicKey) {
        ourReceiveAddresses.push(publicKey)
        if (data.actor === actor) {
          networkFee = dataMaxFee
          nativeAmount = `-${networkFee}`
        } else {
          nativeAmount = dataAmount // Receiving funds
          networkFee = '0'
        }
      } else if (data.actor === actor) {
        networkFee = dataMaxFee
        nativeAmount = `-${add(dataAmount, networkFee)}` // Sending funds
      } else {
        // This action doesn't involve our account, so we should ignore it
        return { blockNum: action.block_num }
      }

      otherParams.meta.isTransferProcessed = true
      break

    case 'stakefio': {
      networkFee = dataMaxFee
      nativeAmount = `-${networkFee}`
      otherParams.meta.isTransferProcessed = true
      assetAction = {
        assetActionType: 'stake'
      }
      break
    }

    case 'unstakefio':
      updateStakingStatus = {
        nativeAmount: dataAmount,
        blockTime: action.block_time,
        txId: action.action_trace.trx_id,
        txName: actName
      }
      networkFee = dataMaxFee
      if (existingTx != null) {
        // Unstake actions should have a corresponding reward 'transfer' action
        // that was parsed right before this action, which only reports the reward
        // portion of the unstake.
        otherParams = {
          ...existingTx.otherParams,
          ...otherParams,
          data: {
            ...existingTx.otherParams?.data,
            ...data
          },
          meta: {
            ...existingTx.otherParams?.meta,
            ...otherParams.meta
          }
        }
        nativeAmount = sub(existingTx.nativeAmount, networkFee)
      } else {
        nativeAmount = `-${networkFee}`
      }

      otherParams.meta.isTransferProcessed = true
      assetAction = {
        assetActionType: 'unstakeOrder'
      }
      break

    case 'regaddress':
      // The action must have been authorized by the engine's actor in order
      // for use to consider this a spend transaction.
      // Otherwise, we should ignore regaddress actions which are received
      // address, until we have some metadata explaining the receive.
      if (
        action.action_trace.act.authorization.some(auth => auth.actor === actor)
      ) {
        networkFee = dataMaxFee
        nativeAmount = `-${networkFee}`
      }
      otherParams.meta.isTransferProcessed = true
      break

    // Fee or (unstake) reward transaction
    case 'transfer':
      {
        // Some transfers might be rewards/yield from unstaking
        const isUnstakeRewardTx =
          otherParams.data != null &&
          otherParams.data.memo === STAKING_REWARD_MEMO
        if (isUnstakeRewardTx) {
          updateStakingStatus = {
            nativeAmount: fioAmount,
            blockTime: action.block_time,
            txId: action.action_trace.trx_id,
            txName: actName
          }
          networkFee = '0'
          nativeAmount = fioAmount
          assetAction = {
            assetActionType: 'unstake'
          }
        } else {
          const isRecipient = data.to === actor
          networkFee = isRecipient ? `0` : fioAmount
          nativeAmount = isRecipient ? '0' : `-${networkFee}`
        }

        if (existingTx != null) {
          otherParams = {
            ...otherParams,
            ...existingTx.otherParams,
            data: {
              ...otherParams.data,
              ...(existingTx.otherParams?.data ?? {})
            },
            meta: {
              ...otherParams.meta,
              ...(existingTx.otherParams?.meta ?? {})
            },
            name: isUnstakeRewardTx ? 'unstakefio' : otherParams.name
          }

          if (otherParams.meta.isTransferProcessed != null) {
            if (data.to !== actor) {
              networkFee = dataMaxFee
              nativeAmount = sub(existingTx.nativeAmount, networkFee)
            } else {
              networkFee = '0'
            }
          } else {
            throw new Error(
              'processTransaction error - existing spend transaction should have isTransferProcessed set'
            )
          }
        }
      }
      break

    default:
      // Unhandled action, don't create a tx
      return { blockNum: action.block_num }
  }

  const transaction: EdgeTransaction = {
    assetAction,
    blockHeight: action.block_num > 0 ? action.block_num : 0,
    currencyCode,
    date: getUTCDate(action.block_time) / 1000,
    isSend: nativeAmount.startsWith('-'),
    memos: [],
    nativeAmount,
    networkFee,
    networkFees: [],
    otherParams,
    ourReceiveAddresses,
    signedTx: '',
    tokenId: null,
    txid: action.action_trace.trx_id,
    walletId
  }

  return { blockNum: action.block_num, transaction, updateStakingStatus }
}
