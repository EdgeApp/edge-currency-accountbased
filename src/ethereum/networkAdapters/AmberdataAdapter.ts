import parse from 'url-parse'

import { getServiceKeyIndex } from '../../common/getServiceKeyIndex'
import { pickRandom } from '../../common/utils'
import { EthereumNetworkUpdate } from '../EthereumNetwork'
import { asRpcResultString } from '../ethereumTypes'
import { NetworkAdapter } from './networkAdapterTypes'

export interface AmberdataAdapterConfig {
  type: 'amberdata-rpc'
  servers: string[]
}

export class AmberdataAdapter extends NetworkAdapter<AmberdataAdapterConfig> {
  broadcast = null
  connect = null
  disconnect = null
  fetchTokenBalance = null
  fetchTokenBalances = null
  fetchTxs = null
  getBaseFeePerGas = null
  multicastRpc = null
  subscribeAddressSync = null

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
    const { amberdataApiKey, serviceKeys } = this.ethEngine.initOptions

    return await this.serialServers(async url => {
      const serviceKeyIndex = getServiceKeyIndex(url)
      const serviceKey =
        serviceKeyIndex != null ? serviceKeys[serviceKeyIndex] : []
      let apiKey: string | undefined = pickRandom(serviceKey, 1)[0]

      if (apiKey === null && amberdataApiKey != null) {
        this.ethEngine.log.warn(
          "INIT OPTION 'amberdataApiKey' IS DEPRECATED. USE 'serviceKeys' INSTEAD"
        )
        apiKey = amberdataApiKey
      }

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
          'x-api-key': apiKey,
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
  }

  // TODO: Clean return type
  private async fetchGetAmberdataApi(path: string): Promise<any> {
    const { amberdataApiKey, serviceKeys } = this.ethEngine.initOptions

    return await this.serialServers(async baseUrl => {
      const serviceKeyIndex = getServiceKeyIndex(baseUrl)
      const serviceKey =
        serviceKeyIndex != null ? serviceKeys[serviceKeyIndex] : []
      let apiKey: string | undefined = pickRandom(serviceKey, 1)[0]

      if (apiKey == null && amberdataApiKey != null) {
        this.ethEngine.log.warn(
          "INIT OPTION 'amberdataApiKey' IS DEPRECATED. USE 'serviceKeys' INSTEAD"
        )
        apiKey = amberdataApiKey
      }

      const url = `${baseUrl}${path}`
      const response = await this.ethEngine.fetchCors(url, {
        headers: {
          'x-amberdata-blockchain-id':
            this.ethEngine.networkInfo.amberDataBlockchainId,
          'x-api-key': apiKey
        }
      })
      if (!response.ok) {
        this.throwError(response, 'fetchGetAmberdata', url)
      }
      return await response.json()
    })
  }
}
