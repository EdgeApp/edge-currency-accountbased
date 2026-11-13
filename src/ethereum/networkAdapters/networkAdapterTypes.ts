import {
  asArray,
  asMaybe,
  asNumber,
  asObject,
  asString,
  asUnknown
} from 'cleaners'
import { EdgeTokenId, EdgeTransaction, JsonObject } from 'edge-core-js/types'
import { FetchResponse } from 'serverlet'

import {
  asyncWaterfall,
  formatAggregateError,
  promiseAny
} from '../../common/promiseUtils'
import {
  cleanTxLogs,
  exponentialBackoff,
  safeErrorMessage,
  shuffleArray
} from '../../common/utils'
import { EthereumEngine } from '../EthereumEngine'
import { BroadcastResults, EthereumNetworkUpdate } from '../EthereumNetwork'
import { AlchemyAdapterConfig } from './AlchemyAdapter'
import { AmberdataAdapterConfig } from './AmberdataAdapter'
import { BlockbookAdapterConfig } from './BlockbookAdapter'
import { BlockbookWsAdapterConfig } from './BlockbookWsAdapter'
import { BlockchairAdapterConfig } from './BlockchairAdapter'
import { BlockscoutAdapterConfig } from './BlockscoutAdapter'
import { EvmScanAdapterConfig } from './EvmScanAdapter'
import { FilfoxAdapterConfig } from './FilfoxAdapter'
import { PulsechainScanAdapterConfig } from './PulsechainScanAdapter'
import { RpcAdapterConfig } from './RpcAdapter'

export interface GetTxsParams {
  startBlock: number
  startDate: number
  tokenId: EdgeTokenId
}

export type NetworkAdapterConfig =
  | AlchemyAdapterConfig
  | AmberdataAdapterConfig
  | BlockbookAdapterConfig
  | BlockbookWsAdapterConfig
  | BlockchairAdapterConfig
  | BlockscoutAdapterConfig
  | EvmScanAdapterConfig
  | FilfoxAdapterConfig
  | PulsechainScanAdapterConfig
  | RpcAdapterConfig

export type NetworkAdapterUpdateMethod = keyof Pick<
  NetworkAdapter<NetworkAdapterConfig>,
  | 'fetchBlockheight'
  | 'fetchInternalTxs'
  | 'fetchNonce'
  | 'fetchTokenBalance'
  | 'fetchTokenBalances'
  | 'fetchTxs'
>

export type ConnectionChangeHandler = (isConnected: boolean) => void

export abstract class NetworkAdapter<
  Config extends NetworkAdapterConfig = NetworkAdapterConfig
> {
  config: Config
  ethEngine: EthereumEngine

  /**
   * How many times `serialServers` and `parallelServers` retry a call after
   * a `RateLimitError` before giving up (1s, 2s, 4s, ... between attempts).
   * Unbounded by default; an adapter whose failure the engine can absorb
   * (a secondary source like `BlockscoutAdapter`) sets a small number so a
   * throttled provider does not hold a sync open.
   */
  protected rateLimitRetries: number = Infinity

  constructor(engine: EthereumEngine, config: Config) {
    this.ethEngine = engine
    this.config = config
  }

  abstract broadcast:
    | ((tx: EdgeTransaction) => Promise<BroadcastResults>)
    | null

  abstract connect: ((cb?: ConnectionChangeHandler) => void) | null

  abstract disconnect: (() => void) | null

  abstract fetchBlockheight:
    | ((...args: any[]) => Promise<EthereumNetworkUpdate>)
    | null

  /**
   * Native-asset value moved by contract calls (internal transactions).
   * Only needed when `fetchTxs` cannot report them itself; the engine merges
   * the rows into the native-asset history of the same sync pass.
   */
  abstract fetchInternalTxs:
    | ((...args: any[]) => Promise<EthereumNetworkUpdate>)
    | null

  abstract fetchNonce:
    | ((...args: any[]) => Promise<EthereumNetworkUpdate>)
    | null

  abstract fetchTokenBalance:
    | ((...args: any[]) => Promise<EthereumNetworkUpdate>)
    | null

  abstract fetchTokenBalances: (() => Promise<EthereumNetworkUpdate>) | null

  abstract fetchTxs: ((...args: any[]) => Promise<EthereumNetworkUpdate>) | null

  abstract getBaseFeePerGas: (() => Promise<string | undefined>) | null

  abstract multicastRpc:
    | ((
        method: string,
        params: any[]
      ) => Promise<{ result: any; server: string }>)
    | null

  abstract batchMulticastRpc:
    | ((
        requests: Array<{ method: string; params: any[] }>
      ) => Promise<{ result: any; server: string }>)
    | null

  abstract subscribeAddressSync:
    | ((address: string, callback: (txid?: string) => void) => void)
    | null

  protected broadcastResponseHandler(
    res: JsonObject,
    server: string,
    tx: EdgeTransaction
  ): BroadcastResults['result'] {
    // `EthereumNetwork.broadcastTx` logs failures, once every route has failed:
    if (typeof res.error !== 'undefined') {
      const response = JSON.stringify(res.error)
      // Blockbook sends the reason as a bare string:
      const reason =
        typeof res.error === 'string'
          ? res.error
          : asMaybe(asObject({ message: asString }))(res.error)?.message
      throw new BroadcastRejection(server, reason ?? response, response)
    } else if (res.status === '0') {
      // Etherscan refuses with `NOTOK` and puts its reason in `result`:
      const response = JSON.stringify(res)
      throw new BroadcastRejection(
        server,
        typeof res.result === 'string' ? res.result : response,
        response
      )
    } else if (typeof res.result === 'string') {
      // Success!!
      this.ethEngine.warn(`SUCCESS ${server}\n${cleanTxLogs(tx)}`)
      // @ts-expect-error
      return res
    } else {
      throw new BroadcastRejection(
        server,
        'Invalid return value on transaction send',
        `Invalid return value ${JSON.stringify(res)}`
      )
    }
  }

  protected logError(funcName: string, e?: Error): void {
    safeErrorMessage(e).includes('rateLimited')
      ? this.ethEngine.log(funcName, e)
      : this.ethEngine.error(funcName, e)
  }

  protected async serialServers<T>(
    fn: (server: string) => Promise<T>
  ): Promise<T> {
    const callServers = async (): Promise<T> => {
      if (!('servers' in this.config))
        throw new Error(`No servers for config type ${this.config.type}`)
      const funcs = (this.config.servers ?? []).map(
        server => async () => await fn(server)
      )

      return await asyncWaterfall(shuffleArray(funcs))
    }

    try {
      return await callServers()
    } catch (error) {
      if (error instanceof RateLimitError) {
        this.ethEngine.warn(error.message)
        return await exponentialBackoff(
          async () => await callServers(),
          1000,
          2,
          this.rateLimitRetries
        )
      }
      throw error
    }
  }

  protected async parallelServers<T>(
    fn: (server: string) => Promise<T>,
    title: string
  ): Promise<T> {
    const callServers = async (): Promise<T> => {
      if (!('servers' in this.config))
        throw new Error(`No servers for config type ${this.config.type}`)
      const promises = (this.config.servers ?? []).map(
        async server => await fn(server)
      )
      return await formatAggregateError(promiseAny(promises), title)
    }
    try {
      return await callServers()
    } catch (error) {
      if (error instanceof RateLimitError) {
        this.ethEngine.warn(error.message)
        return await exponentialBackoff(
          async () => await callServers(),
          1000,
          2,
          this.rateLimitRetries
        )
      }
      throw error
    }
  }

  // TODO: Convert to error types
  protected throwError(
    res: FetchResponse,
    funcName: string,
    url: string,
    resBody: string
  ): void {
    const throwDefaultError = (): never => {
      throw new Error(
        `${funcName} The server returned error code ${res.status} for ${url}`
      )
    }
    switch (res.status) {
      case 402:
      case 429:
      case 432: {
        throw new RateLimitError(`Rate limit exceeded for ${url}`)
      }
      default: {
        // amberdata
        // alchemy
        if (isRateLimitError(resBody)) {
          throw new RateLimitError(`Rate limit exceeded for ${url}`)
        }
        throwDefaultError()
      }
    }
  }
}

export class RateLimitError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RateLimitError'
  }
}

/**
 * A route's refusal of a transaction. The message is the node's reason, so the
 * error the user sees names it.
 */
export class BroadcastRejection extends Error {
  /** The route that refused the transaction */
  readonly server: string
  /** The route's whole reply, for the logs */
  readonly response: string

  constructor(server: string, message: string, response: string) {
    super(message)
    this.server = server
    this.response = response
  }
}

/**
 * Collects the route refusals inside a broadcast error. Each adapter races
 * its own servers, so a failed broadcast is an aggregate of aggregates.
 */
export function findBroadcastRejections(error: unknown): BroadcastRejection[] {
  if (error instanceof BroadcastRejection) return [error]
  const aggregate = asMaybe(asObject({ errors: asArray(asUnknown) }))(error)
  if (aggregate == null) return []

  const out: BroadcastRejection[] = []
  for (const inner of aggregate.errors) {
    out.push(...findBroadcastRejections(inner))
  }
  return out
}

/**
 * Detects if an RPC error response indicates a rate limit error
 */
function isRateLimitError(error: any): boolean {
  // Define cleaner for RPC error structure with optional data field
  const asRpcError = asObject({
    code: asNumber,
    message: asString,
    data: asMaybe(
      asObject({
        retryable: asMaybe(asString)
      })
    )
  })
  try {
    const rpcError = asMaybe(asRpcError)(error)
    if (rpcError == null) return false

    // Check for rate limit error codes and messages
    if (rpcError.message.toLowerCase().includes('too many request')) {
      return true
    }
    if (rpcError.message.toLowerCase().includes('capacity limit exceeded')) {
      return true
    }
    if (rpcError.message.toLowerCase().includes('high load')) {
      return true
    }
    if (rpcError.message.toLowerCase().includes('try again')) {
      return true
    }

    // Check if data.retryable is "true"
    if (rpcError.data?.retryable === 'true') {
      return true
    }

    return false
  } catch {
    return false
  }
}
