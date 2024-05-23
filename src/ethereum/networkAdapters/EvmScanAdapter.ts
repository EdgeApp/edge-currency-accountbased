import { add, max, mul, sub } from 'biggystring'
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
  asEvmScancanTokenTransaction,
  asEvmScanInternalTransaction,
  asEvmScanTransaction,
  asGetTransactionReceipt,
  asRpcResultString,
  EthereumTxOtherParams,
  EvmScanInternalTransaction,
  EvmScanTransaction,
  RpcResultString
} from '../ethereumTypes'
import { getEvmScanApiKey } from '../fees/feeProviders'
import { GetTxsParams, NetworkAdapter } from './types'

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
  getBaseFeePerGas = null
  multicastRpc = null
  fetchTokenBalances = null

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

        const result = await this.fetchGetEtherscan(
          server,
          blockNumberUrlSyntax
        )
        if (typeof result.result !== 'string') {
          const msg = `Invalid return value eth_blockNumber in ${server}`
          this.ethEngine.error(msg)
          throw new Error(msg)
        }
        return { server, result }
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
      const jsonObj = await this.fetchGetEtherscan(baseUrl, urlSuffix)
      return {
        result: this.broadcastResponseHandler(
          jsonObj,
          baseUrl,
          edgeTransaction
        ),
        server: 'etherscan'
      }
    })
  }

  fetchNonce = async (): Promise<EthereumNetworkUpdate> => {
    const address = this.ethEngine.walletLocalData.publicKey

    const url = `?module=proxy&action=eth_getTransactionCount&address=${address}&tag=latest`
    const { result: jsonObj, server } = await this.serialServers(
      async server => {
        // if falsy URL then error thrown
        if (!server.includes('etherscan') && !server.includes('blockscout')) {
          throw new Error(
            `Unsupported command eth_getTransactionCount in ${server}`
          )
        }
        const result = await this.fetchGetEtherscan(server, url)
        if (typeof result.result !== 'string') {
          const msg = `Invalid return value eth_getTransactionCount in ${server}`
          this.ethEngine.error(msg)
          throw new Error(msg)
        }
        return { server, result }
      }
    )

    const clean = asEtherscanGetAccountNonce(jsonObj)
    return { newNonce: clean.result, server }
  }

  fetchTokenBalance = async (tk: string): Promise<EthereumNetworkUpdate> => {
    const address = this.ethEngine.walletLocalData.publicKey
    let response
    let jsonObj
    let server
    let cleanedResponseObj: RpcResultString
    try {
      if (tk === this.ethEngine.currencyInfo.currencyCode) {
        const url = `?module=account&action=balance&address=${address}&tag=latest`
        response = await this.serialServers(async server => {
          const result = await this.fetchGetEtherscan(server, url)
          if (typeof result.result !== 'string' || result.result === '') {
            const msg = `Invalid return value eth_getBalance in ${server}`
            this.ethEngine.error(msg)
            throw new Error(msg)
          }
          asIntegerString(result.result)
          return { server, result }
        })

        jsonObj = response.result
        server = response.server
      } else {
        const tokenInfo = this.ethEngine.getTokenInfo(tk)
        if (
          tokenInfo != null &&
          typeof tokenInfo.contractAddress === 'string'
        ) {
          const contractAddress = tokenInfo.contractAddress

          const url = `?module=account&action=tokenbalance&contractaddress=${contractAddress}&address=${address}&tag=latest`
          const response = await this.serialServers(async server => {
            const result = await this.fetchGetEtherscan(server, url)
            if (typeof result.result !== 'string' || result.result === '') {
              const msg = `Invalid return value getTokenBalance in ${server}`
              this.ethEngine.error(msg)
              throw new Error(msg)
            }
            return { server, result }
          })

          jsonObj = response.result
          server = response.server
        }
      }
      cleanedResponseObj = asRpcResultString(jsonObj)
    } catch (e: any) {
      this.ethEngine.error(
        `checkTokenBalEthscan token ${tk} response ${String(response ?? '')} `,
        e
      )
      throw new Error(
        `checkTokenBalEthscan invalid ${tk} response ${JSON.stringify(jsonObj)}`
      )
    }
    if (/^\d+$/.test(cleanedResponseObj.result)) {
      const balance = cleanedResponseObj.result
      return { tokenBal: { [tk]: balance }, server }
    } else {
      throw new Error(`checkTokenBalEthscan returned invalid JSON for ${tk}`)
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
      const txsInternalResp = await this.getAllTxsEthscan(
        startBlock,
        currencyCode,
        asEvmScanInternalTransaction,
        { searchRegularTxs: false }
      )
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
          asEvmScancanTokenTransaction,
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
    return {
      tokenTxs: { [currencyCode]: edgeTransactionsBlockHeightTuple },
      server
    }
  }

  // TODO: Clean return type
  private async fetchGetEtherscan(server: string, cmd: string): Promise<any> {
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
    return await response.json()
  }

  private async getAllTxsEthscan(
    startBlock: number,
    currencyCode: string,
    cleanerFunc: Function,
    options: GetEthscanAllTxsOptions
  ): Promise<GetEthscanAllTxsResponse> {
    const { contractAddress, searchRegularTxs = false } = options
    const address = this.ethEngine.walletLocalData.publicKey
    let page = 1

    const allTransactions: EdgeTransaction[] = []
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
            { result: { result: [] }, server: undefined }
          : await this.serialServers(async server => {
              const result = await this.fetchGetEtherscan(server, url)
              if (
                typeof result.result !== 'object' ||
                typeof result.result.length !== 'number'
              ) {
                const msg = `Invalid return value getTransactions in ${server}`
                if (result.result !== 'Max rate limit reached')
                  this.ethEngine.error(msg)
                throw new Error(msg)
              }
              return { server, result }
            })

      server = response.server
      const transactions = response.result.result
      for (let i = 0; i < transactions.length; i++) {
        try {
          const cleanedTx = cleanerFunc(transactions[i])
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
          allTransactions.push(tx)
        } catch (e: any) {
          this.ethEngine.error(
            `getAllTxsEthscan ${cleanerFunc.name}\n${safeErrorMessage(
              e
            )}\n${JSON.stringify(transactions[i])}`
          )
          throw new Error(`getAllTxsEthscan ${cleanerFunc.name} is invalid`)
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
    tx: EvmScanTransaction | EvmScanInternalTransaction
  ): Promise<string> {
    const txid = tx.hash ?? tx.transactionHash
    const isSpend =
      tx.from.toLowerCase() ===
      this.ethEngine.walletLocalData.publicKey.toLowerCase()

    let l1RollupFee = '0'
    if (isSpend && this.ethEngine.networkInfo.optimismRollup === true) {
      const response = await this.ethEngine.ethNetwork.multicastRpc(
        'eth_getTransactionReceipt',
        [txid]
      )
      const json = asGetTransactionReceipt(response.result.result)
      l1RollupFee = add(l1RollupFee, decimalToHex(json.l1Fee))
    }

    return l1RollupFee
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
  tx: EvmScanTransaction | EvmScanInternalTransaction,
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
    if (existingTransaction.parentNetworkFee !== transaction.parentNetworkFee) {
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

    // Update the existing transaction:
    const nativeAmount = add(
      existingTransaction.nativeAmount,
      transaction.nativeAmount
    )
    txidToTransaction.set(uniqueKey, {
      ...existingTransaction,
      isSend: nativeAmount.startsWith('-'),
      nativeAmount,
      networkFee: mergedNetworkFee,
      ourReceiveAddresses: [
        ...existingTransaction.ourReceiveAddresses,
        ...transaction.ourReceiveAddresses
      ]
    })
  }

  return Array.from(txidToTransaction.values())
}
