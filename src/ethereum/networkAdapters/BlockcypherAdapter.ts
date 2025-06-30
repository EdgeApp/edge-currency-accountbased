import { EdgeTransaction } from 'edge-core-js/types'
import parse from 'url-parse'

import { getServiceKeyIndex } from '../../common/getServiceKeyIndex'
import { pickRandom } from '../../common/utils'
import { BroadcastResults } from '../EthereumNetwork'
import { NetworkAdapter } from './networkAdapterTypes'

export interface BlockcypherAdapterConfig {
  type: 'blockcypher'
  servers: string[]
}

export class BlockcypherAdapter extends NetworkAdapter<BlockcypherAdapterConfig> {
  connect = null
  disconnect = null
  fetchNonce = null
  fetchBlockheight = null
  fetchTokenBalance = null
  fetchTokenBalances = null
  fetchTxs = null
  getBaseFeePerGas = null
  multicastRpc = null
  subscribeAddressSync = null

  broadcast = async (
    edgeTransaction: EdgeTransaction
  ): Promise<BroadcastResults> => {
    return await this.parallelServers(async baseUrl => {
      const urlSuffix = `v1/${this.ethEngine.currencyInfo.currencyCode.toLowerCase()}/main/txs/push`
      const hexTx = edgeTransaction.signedTx.replace('0x', '')
      const jsonObj = await this.fetchPostBlockcypher(
        urlSuffix,
        { tx: hexTx },
        baseUrl
      )
      return {
        result: this.broadcastResponseHandler(
          jsonObj,
          baseUrl,
          edgeTransaction
        ),
        server: 'blockcypher'
      }
    }, 'Broadcast failed:')
  }

  // TODO: Clean return type
  private async fetchPostBlockcypher(
    cmd: string,
    body: any,
    baseUrl: string
  ): Promise<any> {
    const { blockcypherApiKey, serviceKeys } = this.ethEngine.initOptions
    const serviceKeyIndex = getServiceKeyIndex(baseUrl)
    const serviceKey =
      serviceKeyIndex != null ? serviceKeys[serviceKeyIndex] : []

    let apiKey: string | undefined = pickRandom(serviceKey, 1)[0]

    if (
      apiKey == null &&
      blockcypherApiKey != null &&
      blockcypherApiKey.length > 5
    ) {
      apiKey = blockcypherApiKey
      this.ethEngine.log.warn(
        "INIT OPTION 'blockcypherApiKey' IS DEPRECATED. USE 'serviceKeys' INSTEAD"
      )
    }

    const url = `${baseUrl}/${cmd}${apiKey != null ? `&token=${apiKey}` : ''}`
    const response = await this.ethEngine.fetchCors(url, {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      method: 'POST',
      body: JSON.stringify(body)
    })
    const parsedUrl = parse(url, {}, true)
    if (!response.ok) {
      this.throwError(response, 'fetchPostBlockcypher', parsedUrl.hostname)
    }
    return await response.json()
  }
}
