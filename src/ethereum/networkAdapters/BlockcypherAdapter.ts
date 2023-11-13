import { EdgeTransaction } from 'edge-core-js/types'
import parse from 'url-parse'

import { promiseAny } from '../../common/utils'
import { BroadcastResults } from '../EthereumNetwork'
import { NetworkAdapter, NetworkAdapterBase } from './types'

export class BlockcypherAdapter
  extends NetworkAdapterBase
  implements NetworkAdapter
{
  fetchNonce = null
  fetchBlockheight = null
  fetchTokenBalance = null
  fetchTokenBalances = null
  fetchTxs = null
  getBaseFeePerGas = null
  multicastRpc = null

  broadcast = async (
    edgeTransaction: EdgeTransaction
  ): Promise<BroadcastResults> => {
    const promises = this.servers.map(async baseUrl => {
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
    })

    return await promiseAny(promises)
  }

  // TODO: Clean return type
  private async fetchPostBlockcypher(
    cmd: string,
    body: any,
    baseUrl: string
  ): Promise<any> {
    const { blockcypherApiKey } = this.ethEngine.initOptions
    let apiKey = ''
    if (blockcypherApiKey != null && blockcypherApiKey.length > 5) {
      apiKey = '&token=' + blockcypherApiKey
    }

    const url = `${baseUrl}/${cmd}${apiKey}`
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
