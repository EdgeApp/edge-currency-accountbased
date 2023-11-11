import { EdgeTransaction, JsonObject } from 'edge-core-js/types'
import { FetchResponse } from 'serverlet'

import { cleanTxLogs, safeErrorMessage } from '../../common/utils'
import { EthereumEngine } from '../EthereumEngine'
import { BroadcastResults, EthereumNetworkUpdate } from '../EthereumNetwork'

export interface GetTxsParams {
  startBlock: number
  startDate: number
  currencyCode: string
}

export type NetworkAdapterUpdateMethod = keyof Pick<
  NetworkAdapter,
  'blockheight' | 'nonce' | 'tokenBal' | 'tokenBals' | 'txs'
>

export interface NetworkAdapter {
  blockheight?: (...args: any[]) => Promise<EthereumNetworkUpdate>
  broadcast?: (tx: EdgeTransaction) => Promise<BroadcastResults>
  getBaseFeePerGas?: () => Promise<string | undefined>
  multicastRpc?: (
    method: string,
    params: any[]
  ) => Promise<{ result: any; server: string }>
  nonce?: (...args: any[]) => Promise<EthereumNetworkUpdate>
  tokenBal?: (...args: any[]) => Promise<EthereumNetworkUpdate>
  tokenBals?: () => Promise<EthereumNetworkUpdate>
  txs?: (...args: any[]) => Promise<EthereumNetworkUpdate>
}

export class NetworkAdapterBase {
  ethEngine: EthereumEngine
  servers: string[]

  constructor(engine: EthereumEngine, servers: string[]) {
    this.ethEngine = engine
    this.servers = servers
  }

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
