import parse from 'url-parse'

import { asyncWaterfall, shuffleArray } from '../../common/utils'
import { base58ToHexAddress } from '../../tron/tronUtils'
import { EthereumNetworkUpdate } from '../EthereumNetwork'
import { asRpcResultString } from '../ethereumTypes'
import { NetworkAdapter, NetworkAdapterBase } from './types'

export interface AmberdataAdapterConfig {
  type: 'amberdata-rpc'
  servers: string[]
}

export class AmberdataAdapter
  extends NetworkAdapterBase<AmberdataAdapterConfig>
  implements NetworkAdapter
{
  broadcast = null
  fetchTokenBalance = null
  fetchTokenBalances = null
  fetchTxs = null
  getBaseFeePerGas = null
  multicastRpc = null

  fetchBlockheight = async (): Promise<EthereumNetworkUpdate> => {
    try {
      const jsonObj = await this.fetchPostAmberdataRpc('eth_blockNumber', [])
      const blockHeight = parseInt(asRpcResultString(jsonObj).result, 16)
      return { blockHeight, server: 'amberdata' }
    } catch (e: any) {
      this.logError('checkBlockHeightAmberdata', e)
      throw new Error('checkTxsAmberdata (regular tx) response is invalid')
    }
  }

  fetchNonce = async (): Promise<EthereumNetworkUpdate> => {
    const address = this.ethEngine.walletLocalData.publicKey
    try {
      const jsonObj = await this.fetchPostAmberdataRpc(
        'eth_getTransactionCount',
        [address, 'latest']
      )
      const newNonce = `${parseInt(asRpcResultString(jsonObj).result, 16)}`
      return { newNonce, server: 'amberdata' }
    } catch (e: any) {
      this.logError('checkNonceAmberdata', e)
      throw new Error('Amberdata returned invalid JSON')
    }
  }

  // TODO: Clean return type
  private async fetchPostAmberdataRpc(
    method: string,
    params: string[] = []
  ): Promise<any> {
    const { amberdataApiKey = '' } = this.ethEngine.initOptions

    const funcs = this.config.servers.map(baseUrl => async () => {
      const url = `${this.config.servers[0]}`
      const body = {
        jsonrpc: '2.0',
        method: method,
        params: params,
        id: 1
      }
      const response = await this.ethEngine.fetchCors(url, {
        headers: {
          'x-amberdata-blockchain-id':
            this.ethEngine.networkInfo.amberDataBlockchainId,
          'x-api-key': amberdataApiKey,
          'Content-Type': 'application/json'
        },
        method: 'POST',
        body: JSON.stringify(body)
      })
      const parsedUrl = parse(url, {}, true)
      if (!response.ok) {
        // @ts-expect-error
        this.throwError(response, 'fetchPostAmberdataRpc', parsedUrl)
      }
      const jsonObj = await response.json()
      return jsonObj
    })

    return await asyncWaterfall(shuffleArray(funcs))
  }

  // TODO: Clean return type
  private async fetchGetAmberdataApi(path: string): Promise<any> {
    const { amberdataApiKey = '' } = this.ethEngine.initOptions

    const funcs = this.config.servers.map(baseUrl => async () => {
      const url = `${base58ToHexAddress}${path}`
      const response = await this.ethEngine.fetchCors(url, {
        headers: {
          'x-amberdata-blockchain-id':
            this.ethEngine.networkInfo.amberDataBlockchainId,
          'x-api-key': amberdataApiKey
        }
      })
      if (!response.ok) {
        this.throwError(response, 'fetchGetAmberdata', url)
      }
      return await response.json()
    })

    return await asyncWaterfall(shuffleArray(funcs))
  }
}
