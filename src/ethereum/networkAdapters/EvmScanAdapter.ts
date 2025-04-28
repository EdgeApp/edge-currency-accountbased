import { add, max, mul, sub } from 'biggystring'
import {
  asArray,
  asMaybe,
  asObject,
  asOptional,
  asString,
  asUnknown,
  asValue,
  Cleaner
} from 'cleaners'
import {
  EdgeConfirmationState,
  EdgeCurrencyInfo,
  EdgeTokenId,
  EdgeTokenMap,
  EdgeTransaction
} from 'edge-core-js/types'

import { asIntegerString } from '../../common/types'
import { decimalToHex, pickRandom, safeErrorMessage } from '../../common/utils'
import {
  BroadcastResults,
  EdgeTransactionsBlockHeightTuple,
  EthereumNetworkUpdate,
  getFeeRateUsed
} from '../EthereumNetwork'
import {
  asEtherscanGetAccountNonce,
  asEtherscanGetBlockHeight
} from '../ethereumSchema'
import {
  asGetTransactionReceipt,
  asRpcResultString,
  EthereumTxOtherParams,
  RpcResultString
} from '../ethereumTypes'
import { getEvmScanApiKey } from '../fees/feeProviders'
import { GetTxsParams, NetworkAdapter, RateLimitError } from './types'

interface GetEthscanAllTxsOptions {
  contractAddress?: string
  searchRegularTxs?: boolean
}

interface GetEthscanAllTxsResponse {
  allTransactions: EdgeTransaction[]
  server: string | undefined
}

const NUM_TRANSACTIONS_TO_QUERY = 50

export interface EvmScanAdapterConfig {
  type: 'evmscan'
  servers: string[]
}

export class EvmScanAdapter extends NetworkAdapter<EvmScanAdapterConfig> {
  connect = null
  disconnect = null
  fetchTokenBalances = null
  getBaseFeePerGas = null
  multicastRpc = null
  subscribeAddressSync = null

  fetchBlockheight = async (): Promise<EthereumNetworkUpdate> => {
    const { result: jsonObj, server } = await this.serialServers(
      async server => {
        if (!server.includes('etherscan') && !server.includes('blockscout')) {
          throw new Error(`Unsupported command eth_blockNumber in ${server}`)
        }
        let blockNumberUrlSyntax = `?module=proxy&action=eth_blockNumber`
        // special case for blockscout
        if (server.includes('blockscout')) {
          blockNumberUrlSyntax = `?module=block&action=eth_block_number`
        }

        const response = await this.fetchGetEtherscan(
          server,
          blockNumberUrlSyntax
        )
        if (response.status === '0') {
          this.handledUnexpectedResponse(server, 'eth_blockNumber', response)
        }
        return { server, result: response }
      }
    )

    const clean = asEtherscanGetBlockHeight(jsonObj)
    return { blockHeight: clean.result, server }
  }

  broadcast = async (
    edgeTransaction: EdgeTransaction
  ): Promise<BroadcastResults> => {
    return await this.parallelServers(async baseUrl => {
      // RSK also uses the "eth_sendRaw" syntax
      const urlSuffix = `?module=proxy&action=eth_sendRawTransaction&hex=${edgeTransaction.signedTx}`
      const response = await this.fetchGetEtherscan(baseUrl, urlSuffix)
      return {
        result: this.broadcastResponseHandler(
          response,
          baseUrl,
          edgeTransaction
        ),
        server: 'etherscan'
      }
    }, 'Broadcast failed:')
  }

  fetchNonce = async (): Promise<EthereumNetworkUpdate> => {
    const address = this.ethEngine.walletLocalData.publicKey

    const url = `?module=proxy&action=eth_getTransactionCount&address=${address}&tag=latest`
    const response = await this.serialServers(async server => {
      // if falsy URL then error thrown
      if (!server.includes('etherscan') && !server.includes('blockscout')) {
        throw new Error(
          `Unsupported command eth_getTransactionCount in ${server}`
        )
      }
      const response = await this.fetchGetEtherscan(server, url)
      if (response.status === '0') {
        this.handledUnexpectedResponse(
          server,
          'eth_getTransactionCount',
          response
        )
      }
      return { server, result: response }
    })

    const clean = asEtherscanGetAccountNonce(response.result)
    return { newNonce: clean.result, server: response.server }
  }

  fetchTokenBalance = async (
    currencyCode: string
  ): Promise<EthereumNetworkUpdate> => {
    const address = this.ethEngine.walletLocalData.publicKey
    let response
    let jsonObj
    let server
    let cleanedResponseObj: RpcResultString
    try {
      if (currencyCode === this.ethEngine.currencyInfo.currencyCode) {
        const url = `?module=account&action=balance&address=${address}&tag=latest`
        response = await this.serialServers(async server => {
          const response = await this.fetchGetEtherscan(server, url)
          if (response.status === '0') {
            this.handledUnexpectedResponse(server, 'eth_getBalance', response)
          }
          asIntegerString(response.result)
          return { server, result: response }
        })

        jsonObj = response.result
        server = response.server
      } else {
        const tokenInfo = this.ethEngine.getTokenInfo(currencyCode)
        if (
          tokenInfo != null &&
          typeof tokenInfo.contractAddress === 'string'
        ) {
          const contractAddress = tokenInfo.contractAddress

          const url = `?module=account&action=tokenbalance&contractaddress=${contractAddress}&address=${address}&tag=latest`
          const response = await this.serialServers(async server => {
            const response = await this.fetchGetEtherscan(server, url)
            if (response.status === '0') {
              this.handledUnexpectedResponse(
                server,
                'getTokenBalance',
                response
              )
            }
            return { server, result: response }
          })

          jsonObj = response.result
          server = response.server
        }
      }
      cleanedResponseObj = asRpcResultString(jsonObj)
    } catch (e: any) {
      this.ethEngine.error(
        `checkTokenBalEthscan token ${currencyCode} response ${String(
          response ?? ''
        )} `,
        e
      )
      throw new Error(
        `checkTokenBalEthscan invalid ${currencyCode} response ${JSON.stringify(
          jsonObj
        )}`
      )
    }
    if (/^\d+$/.test(cleanedResponseObj.result)) {
      const balance = cleanedResponseObj.result
      return { tokenBal: { [currencyCode]: balance }, server }
    } else {
      throw new Error(
        `checkTokenBalEthscan returned invalid JSON for ${currencyCode}`
      )
    }
  }

  fetchTxs = async (params: GetTxsParams): Promise<EthereumNetworkUpdate> => {
    const { startBlock, currencyCode } = params
    let server: string
    let allTransactions

    if (currencyCode === this.ethEngine.currencyInfo.currencyCode) {
      const txsRegularResp = await this.getAllTxsEthscan(
        startBlock,
        currencyCode,
        asEvmScanTransaction,
        { searchRegularTxs: true }
      )
      let txsInternalResp: GetEthscanAllTxsResponse = {
        allTransactions: [],
        server: ''
      }
      if (this.ethEngine.networkInfo.disableEvmScanInternal !== true) {
        txsInternalResp = await this.getAllTxsEthscan(
          startBlock,
          currencyCode,
          asEvmScanInternalTransaction,
          { searchRegularTxs: false }
        )
      }
      server = txsRegularResp.server ?? txsInternalResp.server ?? ''
      allTransactions = mergeEdgeTransactions([
        ...txsRegularResp.allTransactions,
        ...txsInternalResp.allTransactions
      ])
    } else {
      const tokenInfo = this.ethEngine.getTokenInfo(currencyCode)
      if (tokenInfo != null && typeof tokenInfo.contractAddress === 'string') {
        const contractAddress = tokenInfo.contractAddress
        const resp = await this.getAllTxsEthscan(
          startBlock,
          currencyCode,
          asEvmScanTokenTransaction,
          { contractAddress }
        )
        server = resp.server ?? ''
        allTransactions = resp.allTransactions
      } else {
        return {}
      }
    }

    const edgeTransactionsBlockHeightTuple: EdgeTransactionsBlockHeightTuple = {
      blockHeight: startBlock,
      edgeTransactions: allTransactions
    }
    const maxBlockHeight = allTransactions.reduce((max, tx) => {
      return Math.max(max, tx.blockHeight)
    }, 0)
    return {
      tokenTxs: { [currencyCode]: edgeTransactionsBlockHeightTuple },
      blockHeight: maxBlockHeight,
      server
    }
  }

  // TODO: Clean return type
  private async fetchGetEtherscan(
    server: string,
    cmd: string
  ): Promise<EvmScanResponse<unknown>> {
    const scanApiKey = getEvmScanApiKey(
      this.ethEngine.initOptions,
      this.ethEngine.currencyInfo,
      this.ethEngine.log
    )

    // Quick hack to signal to use slower fetchCors over fetch from EdgeIo
    const useFetchCors = server.indexOf('cors-http') === 0
    if (useFetchCors) server = server.replace(/^cors-http/, 'http')

    const apiKey = Array.isArray(scanApiKey)
      ? pickRandom(scanApiKey, 1)[0]
      : scanApiKey ?? ''
    const apiKeyParam = apiKey !== '' ? `&apikey=${apiKey}` : ''

    const url = `${server}/api${cmd}`

    const response = await this.ethEngine.fetchCors(`${url}${apiKeyParam}`)
    if (!response.ok) this.throwError(response, 'fetchGetEtherscan', url)
    const data = await response.json()
    const cleanData = asEvmScanResponse(asUnknown)(data)
    if (
      cleanData.status === '0' &&
      typeof cleanData.result === 'string' &&
      cleanData.result.match(/Max calls|rate limit/) != null
    ) {
      throw new RateLimitError(`fetchGetEtherscan rate limit for ${server}`)
    }
    return cleanData
  }

  private async getAllTxsEthscan(
    startBlock: number,
    currencyCode: string,
    asTransaction: Cleaner<
      EvmScanTransaction | EvmScanInternalTransaction | EvmScanTokenTransaction
    >,
    options: GetEthscanAllTxsOptions
  ): Promise<GetEthscanAllTxsResponse> {
    const { contractAddress, searchRegularTxs = false } = options
    const address = this.ethEngine.walletLocalData.publicKey
    let page = 1

    let allTransactions: EdgeTransaction[] = []
    let server: string | undefined
    while (true) {
      const offset = NUM_TRANSACTIONS_TO_QUERY

      let startUrl
      if (currencyCode === this.ethEngine.currencyInfo.currencyCode) {
        startUrl = `?action=${
          searchRegularTxs ? 'txlist' : 'txlistinternal'
        }&module=account`
      } else {
        startUrl = `?action=tokentx&contractaddress=${contractAddress}&module=account`
      }

      const url = `${startUrl}&address=${address}&startblock=${startBlock}&endblock=999999999&sort=asc&page=${page}&offset=${offset}`

      const response =
        this.config.servers.length === 0
          ? // HACK: If a currency doesn't have an etherscan API compatible
            // server we need to return an empty array
            { response: { result: [] }, server: undefined }
          : await this.serialServers(async server => {
              const response = await this.fetchGetEtherscan(server, url)
              if (
                response.status === '0' &&
                response.message !== 'No transactions found'
              ) {
                this.handledUnexpectedResponse(
                  server,
                  'getTransactions',
                  response
                )
              }
              return { server, response }
            })

      server = response.server
      const transactions = asArray(asUnknown)(response.response.result)
      for (let i = 0; i < transactions.length; i++) {
        try {
          const cleanedTx = asTransaction(transactions[i])
          const l1RollupFee = await this.getL1RollupFee(cleanedTx)
          const tx = processEvmScanTransaction(
            {
              allTokensMap: this.ethEngine.allTokensMap,
              currencyInfo: this.ethEngine.currencyInfo,
              forWhichAddress: this.ethEngine.walletLocalData.publicKey,
              forWhichCurrencyCode: currencyCode,
              forWhichWalletId: this.ethEngine.walletId
            },
            cleanedTx,
            l1RollupFee
          )
          allTransactions = mergeEdgeTransactions([...allTransactions, tx])
        } catch (e: any) {
          this.ethEngine.error(
            `getAllTxsEthscan ${asTransaction.name}\n${safeErrorMessage(
              e
            )}\n${JSON.stringify(transactions[i])}`
          )
          throw new Error(`getAllTxsEthscan ${asTransaction.name} is invalid`)
        }
      }
      if (transactions.length === 0) {
        break
      }
      page++
    }

    return { allTransactions, server }
  }

  private async getL1RollupFee(
    tx:
      | EvmScanTransaction
      | EvmScanInternalTransaction
      | EvmScanTokenTransaction
  ): Promise<string> {
    const txid = tx.hash ?? tx.transactionHash
    const isSpend =
      tx.from.toLowerCase() ===
      this.ethEngine.walletLocalData.publicKey.toLowerCase()

    let l1RollupFee = '0'
    if (isSpend && this.ethEngine.networkInfo.optimismRollup === true) {
      const rpcResponse = await this.ethEngine.ethNetwork.multicastRpc(
        'eth_getTransactionReceipt',
        [txid]
      )
      let json = asMaybe(asGetTransactionReceipt)(rpcResponse.result.result)
      if (json == null) {
        const path = `?module=proxy&action=eth_getTransactionReceipt&txhash=${txid}`
        const response = await this.serialServers(async server => {
          const response = await this.fetchGetEtherscan(server, path)
          if (response.status === '0') {
            this.handledUnexpectedResponse(
              server,
              'eth_getTransactionReceipt',
              response
            )
          }
          return response
        })
        json = asGetTransactionReceipt(response.result)
      }
      l1RollupFee = add(l1RollupFee, decimalToHex(json.l1Fee))
    }

    return l1RollupFee
  }

  private handledUnexpectedResponse(
    server: string,
    action: string,
    response: EvmScanErrorResponse
  ): never {
    const message = `Unexpected response from ${server} for action '${action}': ${
      response.status
    } ${response.message} (results: ${typeof response.result})`
    this.ethEngine.error(message)
    throw new Error(message)
  }
}

/**
 * This is context info about the evm transaction being processed.
 * It contains information about the wallet, currency, and tokens which
 * the transaction is being processed for.
 **/
export interface TransactionProcessingContext {
  allTokensMap: EdgeTokenMap
  currencyInfo: EdgeCurrencyInfo
  /** Which wallet address which the transaction is being processed for */
  forWhichAddress: string
  /** Which currencyCode is the transaction being processed for */
  forWhichCurrencyCode: string
  /** Which walletId is the transaction being processed for */
  forWhichWalletId: string
}

export function processEvmScanTransaction(
  context: TransactionProcessingContext,
  tx: EvmScanTransaction | EvmScanInternalTransaction | EvmScanTokenTransaction,
  l1RollupFee: string
): EdgeTransaction {
  const ourReceiveAddresses: string[] = []

  const txid = tx.hash ?? tx.transactionHash
  if (txid == null) {
    throw new Error('Invalid transaction result format')
  }

  const isSpend =
    tx.from.toLowerCase() === context.forWhichAddress.toLowerCase()
  const tokenTx =
    context.forWhichCurrencyCode !== context.currencyInfo.currencyCode
  let tokenId: EdgeTokenId = null
  if (tokenTx) {
    const knownTokenId = Object.keys(context.allTokensMap).find(
      tokenId =>
        context.allTokensMap[tokenId].currencyCode ===
        context.forWhichCurrencyCode
    )
    if (knownTokenId === undefined) {
      throw new Error(
        `Unknown token ${tokenId} for ${context.forWhichCurrencyCode}`
      )
    }
    tokenId = knownTokenId
  }
  const gasPrice = 'gasPrice' in tx ? tx.gasPrice : undefined
  const nativeNetworkFee: string =
    gasPrice != null ? mul(gasPrice, tx.gasUsed) : '0'

  let nativeAmount: string
  let networkFee: string
  let parentNetworkFee: string | undefined

  if (isSpend) {
    if (tokenTx) {
      nativeAmount = sub('0', tx.value)
      networkFee = '0'
      parentNetworkFee = add(nativeNetworkFee, l1RollupFee)
    } else {
      // Spend to self. netNativeAmount is just the fee
      if (tx.from.toLowerCase() === tx.to.toLowerCase()) {
        nativeAmount = sub(sub('0', nativeNetworkFee), l1RollupFee)
        networkFee = add(nativeNetworkFee, l1RollupFee)
      } else {
        nativeAmount = sub(
          sub(sub('0', tx.value), nativeNetworkFee),
          l1RollupFee
        )
        networkFee = add(nativeNetworkFee, l1RollupFee)
      }
    }
  } else {
    nativeAmount = tx.value
    networkFee = '0'
    ourReceiveAddresses.push(context.forWhichAddress)
  }

  const otherParams: EthereumTxOtherParams = {
    from: [tx.from],
    to: [tx.to],
    gas: tx.gas,
    gasPrice: gasPrice ?? '',
    gasUsed: tx.gasUsed,
    isFromMakeSpend: false
  }

  let blockHeight = parseInt(tx.blockNumber)
  if (blockHeight < 0) blockHeight = 0

  const confirmations: EdgeConfirmationState | undefined =
    tx.isError === '1' ? 'failed' : undefined

  const edgeTransaction: EdgeTransaction = {
    blockHeight,
    currencyCode: context.forWhichCurrencyCode,
    confirmations,
    date: parseInt(tx.timeStamp),
    feeRateUsed:
      gasPrice != null
        ? getFeeRateUsed(gasPrice, tx.gas, tx.gasUsed)
        : undefined,
    isSend: nativeAmount.startsWith('-'),
    memos: [],
    nativeAmount,
    networkFee,
    networkFees: [],
    otherParams,
    ourReceiveAddresses,
    parentNetworkFee,
    signedTx: '',
    tokenId,
    txid,
    walletId: context.forWhichWalletId
  }

  return edgeTransaction
  // or should be this.addTransaction(currencyCode, edgeTransaction)?
}

export function mergeEdgeTransactions(
  transactions: EdgeTransaction[]
): EdgeTransaction[] {
  // The Map key is the txid and tokenId concatenated
  const txidToTransaction: Map<string, EdgeTransaction> = new Map()
  for (const transaction of transactions) {
    const uniqueKey = `${transaction.txid}:${transaction.tokenId ?? ''}`
    const existingTransaction = txidToTransaction.get(uniqueKey)
    if (existingTransaction == null) {
      txidToTransaction.set(uniqueKey, transaction)
      continue
    }

    // A non-zero network fee is expected to always be present in at least
    // one transaction for native currency transactions. If both sides
    // transactions have a non-zero network fee, they are expected to match.
    if (
      existingTransaction.networkFee !== '0' &&
      transaction.networkFee !== '0' &&
      transaction.networkFee !== existingTransaction.networkFee
    ) {
      throw new Error(
        `Failed to merge transaction '${uniqueKey}': Mismatch networkFee`
      )
    }

    // Parent network is expected to always match for token transactions:
    if (
      existingTransaction.parentNetworkFee != null &&
      transaction.parentNetworkFee != null &&
      existingTransaction.parentNetworkFee !== transaction.parentNetworkFee
    ) {
      throw new Error(
        `Failed to merge transaction '${uniqueKey}': Mismatch parentNetworkFee`
      )
    }

    // We can safely assume that the networkFees for each transaction are
    // either the same or one or both are zero. So, we can take the max
    // of the two networkFees to get the merged networkFee:
    const mergedNetworkFee = max(
      existingTransaction.networkFee,
      transaction.networkFee
    )

    // We can safely assume that the parentNetworkFees for each transaction
    // are either the same or one or both are undefined. So, we can take the
    // first non-undefined parentNetworkFee to get the merged parentNetworkFee:
    const mergedParentNetworkFee =
      existingTransaction.parentNetworkFee ?? transaction.parentNetworkFee

    // Update the existing transaction:
    const nativeAmount = add(
      existingTransaction.nativeAmount,
      transaction.nativeAmount
    )

    const mergedTx = {
      ...existingTransaction,
      isSend: nativeAmount.startsWith('-'),
      nativeAmount,
      networkFee: mergedNetworkFee,
      ourReceiveAddresses: [
        ...existingTransaction.ourReceiveAddresses,
        ...transaction.ourReceiveAddresses
      ]
    }
    if (mergedParentNetworkFee != null) {
      mergedTx.parentNetworkFee = mergedParentNetworkFee
    }

    txidToTransaction.set(uniqueKey, mergedTx)
  }

  return Array.from(txidToTransaction.values())
}

interface EvmScanErrorResponse {
  status: '0'
  message: string
  result: unknown
}
const asEvmScanErrorResponse = asObject<EvmScanErrorResponse>({
  status: asValue('0'),
  message: asString,
  result: asUnknown
})

interface EvmScanSuccessResponse<T> {
  status: '1'
  message: string
  result: T
}
const asEvmScanSuccessResponse =
  <T>(asT: Cleaner<T>): Cleaner<EvmScanSuccessResponse<T>> =>
  (raw: unknown) => {
    return asObject<EvmScanSuccessResponse<T>>({
      status: asValue('1'),
      message: asString,
      result: asT
    })(raw)
  }

type EvmScanResponse<T> = EvmScanSuccessResponse<T> | EvmScanErrorResponse
const asEvmScanResponse =
  <T>(
    asT: Cleaner<T>
  ): Cleaner<EvmScanSuccessResponse<T> | EvmScanErrorResponse> =>
  (raw: unknown) => {
    return (
      asMaybe(asEvmScanErrorResponse)(raw) ?? asEvmScanSuccessResponse(asT)(raw)
    )
  }

export type EvmScanTransaction = ReturnType<typeof asEvmScanTransaction>
export const asEvmScanTransaction = asObject({
  blockNumber: asString,
  timeStamp: asString,
  hash: asOptional(asString),
  transactionHash: asOptional(asString),
  to: asString,
  from: asString,
  value: asString,
  nonce: asString,
  gasPrice: asString,
  gas: asString,
  gasUsed: asString,
  confirmations: asOptional(asString),
  isError: asOptional(asString)
})

export type EvmScanInternalTransaction = ReturnType<
  typeof asEvmScanInternalTransaction
>
export const asEvmScanInternalTransaction = asObject({
  hash: asOptional(asString),
  transactionHash: asOptional(asString),
  blockNumber: asString,
  timeStamp: asString,
  gasUsed: asString,
  value: asString,
  from: asString,
  to: asString,
  gas: asString,
  isError: asOptional(asString),
  contractAddress: asOptional(asString)
})

export type EvmScanTokenTransaction = ReturnType<
  typeof asEvmScanTokenTransaction
>
export const asEvmScanTokenTransaction = asObject({
  blockNumber: asString,
  timeStamp: asString,
  hash: asOptional(asString),
  transactionHash: asOptional(asString),
  to: asString,
  from: asString,
  value: asString,
  nonce: asString,
  gasPrice: asString,
  gas: asString,
  gasUsed: asString,
  confirmations: asString,
  contractAddress: asString,
  isError: asOptional(asString),
  tokenName: asString,
  tokenSymbol: asString,
  tokenDecimal: asString
})
