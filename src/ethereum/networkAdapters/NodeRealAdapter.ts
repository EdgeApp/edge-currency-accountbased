import {
  asArray,
  asEither,
  asNull,
  asNumber,
  asObject,
  asOptional,
  asString,
  asUnknown
} from 'cleaners'
import { JsonObject } from 'edge-core-js/types'
import parse from 'url-parse'

import { asMaybeContractLocation } from '../../common/tokenHelpers'
import { hexToDecimal, shuffleArray, snooze } from '../../common/utils'
import {
  EdgeTransactionsBlockHeightTuple,
  EthereumNetworkUpdate
} from '../EthereumNetwork'
import {
  AlchemyAssetTransfer,
  AlchemyTxDetails,
  processAlchemyTransfers
} from './AlchemyAdapter'
import {
  GetTxsParams,
  NetworkAdapter,
  RateLimitError
} from './networkAdapterTypes'

/** NodeReal caps `maxCount` at 1000 transfers per page */
const MAX_TRANSFERS_PER_PAGE = '0x3e8'

/** The JSON-RPC error code NodeReal answers once an endpoint's quota is spent */
const USAGE_LIMIT_ERROR_CODE = -32005

/**
 * How many times one page is retried after a rate limit (1s, 2s, 4s, ...
 * between attempts) before the error goes up and the sync starts over.
 * The public endpoints' quota refills about a minute after a burst.
 */
const PAGE_RATE_LIMIT_RETRIES = 7

export interface NodeRealAdapterConfig {
  type: 'nodereal'
  /** NodeReal JSON-RPC endpoints that serve the `nr_` enhanced API */
  servers: string[]
}

/**
 * Transaction history from NodeReal's `nr_getTransactionByAddress`.
 *
 * The API lists value movements (external, internal and token transfers)
 * the way Alchemy's asset transfers do, so the rows go through the same
 * processing. Each row carries its transaction's gas figures, L1 data fee
 * and receipt status, but neither the signer nor the nonce, so the wallet's
 * own external rows supply the details of the transactions it signed.
 *
 * A block range ending at `latest` answers no rows at all, so pages run
 * newest first with no range and stop once they pass the sync's start block.
 */
export class NodeRealAdapter extends NetworkAdapter<NodeRealAdapterConfig> {
  batchMulticastRpc = null
  broadcast = null
  connect = null
  disconnect = null
  fetchBlockheight = null
  fetchInternalTxs = null
  fetchNonce = null
  fetchTokenBalance = null
  fetchTokenBalances = null
  getBaseFeePerGas = null
  multicastRpc = null
  subscribeAddressSync = null

  fetchTxs = async (params: GetTxsParams): Promise<EthereumNetworkUpdate> => {
    const { startBlock, tokenId } = params
    const address = this.ethEngine.walletLocalData.publicKey
    const ourAddress = address.toLowerCase()

    let contractAddress: string | undefined
    if (tokenId != null) {
      const location = asMaybeContractLocation(
        this.ethEngine.allTokensMap[tokenId]?.networkLocation
      )
      if (location == null) return {}
      contractAddress = location.contractAddress
    }
    const category = contractAddress == null ? ['external', 'internal'] : ['20']

    const { result: edgeTransactions, server } = await this.eachServer(
      async baseUrl => {
        // The public endpoints turn away bursts, so one request at a time:
        const query = { address, category, contractAddress, startBlock }
        const sent = await this.fetchTransfers(baseUrl, {
          ...query,
          addressType: 'from'
        })
        const received = await this.fetchTransfers(baseUrl, {
          ...query,
          addressType: 'to'
        })

        // A token row does not say who signed its transaction (a third party
        // can pull an approved allowance), so a token sync with outgoing rows
        // also reads the wallet's own external rows, which do.
        const spends =
          contractAddress == null || sent.length === 0
            ? sent
            : await this.fetchTransfers(baseUrl, {
                address,
                addressType: 'from',
                category: ['external'],
                startBlock
              })
        const txDetails = new Map<string, AlchemyTxDetails>()
        for (const row of spends) {
          if (row.category !== 'external') continue
          if (row.from.toLowerCase() !== ourAddress) continue
          txDetails.set(row.hash.toLowerCase(), makeNodeRealTxDetails(row))
        }

        // A reverted transaction moved no value. Only the wallet's own
        // reverted sends belong in its history, for the fee they cost.
        const transfers = [...sent, ...received]
          .filter(
            row =>
              row.receiptsStatus !== 0 || txDetails.has(row.hash.toLowerCase())
          )
          .map(nodeRealToAssetTransfer)

        return {
          server: parse(baseUrl).hostname,
          result: processAlchemyTransfers(
            {
              allTokensMap: this.ethEngine.allTokensMap,
              currencyInfo: this.ethEngine.currencyInfo,
              forWhichAddress: address,
              forWhichTokenId: tokenId,
              forWhichWalletId: this.ethEngine.walletId
            },
            transfers,
            txDetails
          )
        }
      }
    )

    const edgeTransactionsBlockHeightTuple: EdgeTransactionsBlockHeightTuple = {
      blockHeight: startBlock,
      edgeTransactions,
      includesInternal: contractAddress == null
    }
    const maxBlockHeight = edgeTransactions.reduce((max, tx) => {
      return Math.max(max, tx.blockHeight)
    }, 0)
    return {
      tokenTxs: new Map([[tokenId, edgeTransactionsBlockHeightTuple]]),
      blockHeight: maxBlockHeight,
      server
    }
  }

  /**
   * Tries each endpoint in turn. Unlike `serialServers`, it never starts a
   * second endpoint while the first is still paging: the public endpoints
   * share one rate limit, so a second stream would only halve the pace.
   */
  private async eachServer<T>(fn: (server: string) => Promise<T>): Promise<T> {
    let lastError: unknown = new Error('No NodeReal servers')
    for (const server of shuffleArray([...this.config.servers])) {
      try {
        return await fn(server)
      } catch (error: unknown) {
        lastError = error
      }
    }
    throw lastError
  }

  /**
   * Pages through one direction of the wallet's transfers, newest first,
   * down to the start block.
   */
  private async fetchTransfers(
    baseUrl: string,
    query: {
      address: string
      addressType: 'from' | 'to'
      category: string[]
      contractAddress?: string
      startBlock: number
    }
  ): Promise<NodeRealTransfer[]> {
    const { address, addressType, category, contractAddress, startBlock } =
      query
    const params: JsonObject = {
      address,
      addressType,
      category,
      // A plain contract call from the wallet moves no native value but still
      // costs gas, and a token transfer's own transaction carries none either.
      excludeZeroValue: !(contractAddress == null && addressType === 'from'),
      maxCount: MAX_TRANSFERS_PER_PAGE,
      order: 'desc'
    }
    if (contractAddress != null) params.contractAddresses = [contractAddress]

    const transfers: NodeRealTransfer[] = []
    let pageKey: string | undefined
    while (true) {
      const page = asTransfersResult(
        await this.fetchPage(
          baseUrl,
          pageKey == null ? params : { ...params, pageKey }
        )
      )
      let passedStart = false
      for (const raw of page.transfers) {
        const row = asNodeRealTransfer(raw)
        if (parseInt(row.blockNum, 16) < startBlock) {
          passedStart = true
          break
        }
        transfers.push(row)
      }
      pageKey = page.pageKey
      if (passedStart || pageKey == null || pageKey === '') break
    }
    return transfers
  }

  /**
   * Fetches one page, retrying it in place after a rate limit, so a long
   * history keeps the pages it already has.
   */
  private async fetchPage(
    baseUrl: string,
    params: JsonObject
  ): Promise<unknown> {
    let delay = 1000
    for (let attempt = 0; ; ++attempt) {
      try {
        return await this.fetchRpc(baseUrl, 'nr_getTransactionByAddress', [
          params
        ])
      } catch (error: unknown) {
        if (!(error instanceof RateLimitError)) throw error
        if (attempt >= PAGE_RATE_LIMIT_RETRIES) throw error
        await snooze(delay)
        delay *= 2
      }
    }
  }

  private async fetchRpc(
    baseUrl: string,
    method: string,
    params: unknown[]
  ): Promise<unknown> {
    const response = await this.ethEngine.engineFetch(baseUrl, {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      method: 'POST',
      body: JSON.stringify({ id: 1, jsonrpc: '2.0', method, params })
    })

    const hostname = parse(baseUrl).hostname
    if (!response.ok) {
      const resBody = await response.text()
      this.throwError(response, method, hostname, resBody)
    }

    const reply = asRpcReply(await response.json())
    if (reply.error != null) {
      // The quota error arrives inside an HTTP 200 reply:
      if (reply.error.code === USAGE_LIMIT_ERROR_CODE) {
        throw new RateLimitError(`Rate limit exceeded for ${hostname}`)
      }
      throw new Error(
        `${method} error from ${hostname}: ${JSON.stringify(reply.error)}`
      )
    }
    return reply.result
  }
}

/** The details of a transaction the wallet signed, from its external row */
export function makeNodeRealTxDetails(row: NodeRealTransfer): AlchemyTxDetails {
  return {
    from: row.from,
    to: row.to ?? null,
    gas: String(row.gas ?? 0),
    gasPrice: String(row.gasPrice ?? 0),
    gasUsed: String(row.gasUsed ?? 0),
    // A transaction with no L1 data fee reports a bare `0x`:
    l1Fee:
      row.l1Fee == null || row.l1Fee === '0x'
        ? undefined
        : hexToDecimal(row.l1Fee),
    blockHeight: parseInt(row.blockNum, 16),
    succeeded: row.receiptsStatus == null ? undefined : row.receiptsStatus !== 0
  }
}

export function nodeRealToAssetTransfer(
  row: NodeRealTransfer
): AlchemyAssetTransfer {
  return {
    blockNum: row.blockNum,
    // One transaction can move value several times, told apart by the log
    // (token transfers) or the trace (internal transfers) they came from:
    uniqueId: `${row.hash}:${row.category}:${row.logIndex ?? 0}:${
      row.traceIndex ?? 0
    }`,
    hash: row.hash,
    category: row.category,
    from: row.from,
    to: row.to ?? null,
    rawContract: {
      value: row.value,
      address: row.contractAddress ?? null
    },
    metadata: {
      blockTimestamp: new Date(row.blockTimeStamp * 1000).toISOString()
    }
  }
}

export type NodeRealTransfer = ReturnType<typeof asNodeRealTransfer>
export const asNodeRealTransfer = asObject({
  /** `external`, `internal`, `20` (ERC-20), ... */
  category: asString,
  blockNum: asString,
  from: asString,
  to: asOptional(asEither(asString, asNull)),
  /** Hex, zero-padded to 32 bytes on token rows */
  value: asString,
  hash: asString,
  contractAddress: asOptional(asString),
  /** Unix seconds */
  blockTimeStamp: asNumber,
  /** Gas figures of the whole transaction; absent on internal rows */
  gas: asOptional(asNumber),
  gasPrice: asOptional(asNumber),
  gasUsed: asOptional(asNumber),
  /** Hex, or a bare `0x` when there is none */
  l1Fee: asOptional(asString),
  /** `1` success, `0` reverted */
  receiptsStatus: asOptional(asNumber),
  logIndex: asOptional(asNumber),
  traceIndex: asOptional(asNumber)
})

const asTransfersResult = asObject({
  transfers: asArray(asUnknown),
  /** Empty once the last page is reached */
  pageKey: asOptional(asString)
})

const asRpcReply = asObject({
  result: asUnknown,
  error: asOptional(
    asObject({
      code: asNumber,
      message: asString
    })
  )
})
