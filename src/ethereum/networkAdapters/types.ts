import { EdgeTransaction, JsonObject } from 'edge-core-js/types'
import { FetchResponse } from 'serverlet'

import {
  asyncWaterfall,
  cleanTxLogs,
  promiseAny,
  safeErrorMessage,
  shuffleArray
} from '../../common/utils'
import { EthereumEngine } from '../EthereumEngine'
import { BroadcastResults, EthereumNetworkUpdate } from '../EthereumNetwork'
import { AmberdataAdapterConfig } from './AmberdataAdapter'
import { BlockbookAdapterConfig } from './BlockbookAdapter'
import { BlockchairAdapterConfig } from './BlockchairAdapter'
import { BlockcypherAdapterConfig } from './BlockcypherAdapter'
import { EvmScanAdapterConfig } from './EvmScanAdapter'
import { FilfoxAdapterConfig } from './FilfoxAdapter'
import { PulsechainScanAdapterConfig } from './PulsechainScanAdapter'
import { RpcAdapterConfig } from './RpcAdapter'

export interface GetTxsParams {
  startBlock: number
  startDate: number
  currencyCode: string
}

export type NetworkAdapterConfig =
  | AmberdataAdapterConfig
  | BlockbookAdapterConfig
  | BlockchairAdapterConfig
  | BlockcypherAdapterConfig
  | EvmScanAdapterConfig
  | FilfoxAdapterConfig
  | PulsechainScanAdapterConfig
  | RpcAdapterConfig

export type NetworkAdapterUpdateMethod = keyof Pick<
  NetworkAdapter<NetworkAdapterConfig>,
  | 'fetchBlockheight'
  | 'fetchNonce'
  | 'fetchTokenBalance'
  | 'fetchTokenBalances'
  | 'fetchTxs'
>

export abstract class NetworkAdapter<
  Config extends NetworkAdapterConfig = NetworkAdapterConfig
> {
  config: Config
  ethEngine: EthereumEngine

  constructor(engine: EthereumEngine, config: Config) {
    this.ethEngine = engine
    this.config = config
  }

  abstract fetchBlockheight:
    | ((...args: any[]) => Promise<EthereumNetworkUpdate>)
    | null

  abstract broadcast:
    | ((tx: EdgeTransaction) => Promise<BroadcastResults>)
    | null

  abstract getBaseFeePerGas: (() => Promise<string | undefined>) | null
  abstract multicastRpc:
    | ((
        method: string,
        params: any[]
      ) => Promise<{ result: any; server: string }>)
    | null

  abstract fetchNonce:
    | ((...args: any[]) => Promise<EthereumNetworkUpdate>)
    | null

  abstract fetchTokenBalance:
    | ((...args: any[]) => Promise<EthereumNetworkUpdate>)
    | null

  abstract fetchTokenBalances: (() => Promise<EthereumNetworkUpdate>) | null
  abstract fetchTxs: ((...args: any[]) => Promise<EthereumNetworkUpdate>) | null

  protected broadcastResponseHandler(
    res: JsonObject,
    server: string,
    tx: EdgeTransaction
  ): BroadcastResults['result'] {
    if (typeof res.error !== 'undefined') {
      this.ethEngine.error(
        `FAILURE ${server}\n${JSON.stringify(res.error)}\n${cleanTxLogs(tx)}`
      )
      throw res.error
    } else if (typeof res.result === 'string') {
      // Success!!
      this.ethEngine.warn(`SUCCESS ${server}\n${cleanTxLogs(tx)}`)
      // @ts-expect-error
      return res
    } else {
      this.ethEngine.error(
        `FAILURE ${server}\nInvalid return value ${JSON.stringify(
          res
        )}\n${cleanTxLogs(tx)}`
      )
      throw new Error('Invalid return value on transaction send')
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
    const funcs = (this.config.servers ?? []).map(
      server => async () => await fn(server)
    )
    return await asyncWaterfall(shuffleArray(funcs))
  }

  protected async parallelServers<T>(
    fn: (server: string) => Promise<T>
  ): Promise<T> {
    const promises = (this.config.servers ?? []).map(
      async server => await fn(server)
    )
    return await promiseAny(promises)
  }

  // TODO: Convert to error types
  protected throwError(
    res: FetchResponse,
    funcName: string,
    url: string
  ): void {
    switch (res.status) {
      case 402: // blockchair
      case 429: // amberdata
      case 432: // blockchair
        throw new Error('rateLimited')
      default:
        throw new Error(
          `${funcName} The server returned error code ${res.status} for ${url}`
        )
    }
  }
}
