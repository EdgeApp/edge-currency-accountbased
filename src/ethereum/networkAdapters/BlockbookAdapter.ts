import { EdgeTransaction } from 'edge-core-js/types'

import { asyncWaterfall, promiseAny, shuffleArray } from '../../common/utils'
import { BroadcastResults, EthereumNetworkUpdate } from '../EthereumNetwork'
import {
  asBlockbookAddress,
  asBlockbookBlockHeight,
  asBlockbookTokenBalance,
  BlockbookAddress
} from '../ethereumTypes'
import { NetworkAdapter, NetworkAdapterBase } from './types'

export interface BlockbookAdapterConfig {
  type: 'blockbook'
  servers: string[]
}

export class BlockbookAdapter
  extends NetworkAdapterBase<BlockbookAdapterConfig>
  implements NetworkAdapter
{
  getBaseFeePerGas = null
  multicastRpc = null
  fetchTokenBalances = null
  fetchTxs = null

  fetchBlockheight = async (): Promise<EthereumNetworkUpdate> => {
    try {
      const funcs = this.config.servers.map(server => async () => {
        const result = await this.fetchGetBlockbook(server, '/api/v2')
        return { server, result }
      })

      const { result: jsonObj, server } = await asyncWaterfall(
        shuffleArray(funcs)
      )

      const blockHeight = asBlockbookBlockHeight(jsonObj).blockbook.bestHeight
      return { blockHeight, server }
    } catch (e: any) {
      this.ethEngine.log('checkBlockHeightBlockbook blockHeight ', e)
      throw new Error(`checkBlockHeightBlockbook returned invalid JSON`)
    }
  }

  broadcast = async (
    edgeTransaction: EdgeTransaction
  ): Promise<BroadcastResults> => {
    const promises = this.config.servers.map(async baseUrl => {
      const jsonObj = await this.fetchGetBlockbook(
        baseUrl,
        `/api/v2/sendtx/${edgeTransaction.signedTx}`
      )

      return {
        result: this.broadcastResponseHandler(
          jsonObj,
          baseUrl,
          edgeTransaction
        ),
        server: 'blockbook'
      }
    })

    return await promiseAny(promises)
  }

  fetchNonce = async (): Promise<EthereumNetworkUpdate> => {
    return await this.checkAddressBlockbook()
  }

  fetchTokenBalance = async (): Promise<EthereumNetworkUpdate> => {
    return await this.checkAddressBlockbook()
  }

  async checkAddressBlockbook(): Promise<EthereumNetworkUpdate> {
    const address = this.ethEngine.walletLocalData.publicKey.toLowerCase()
    const out: EthereumNetworkUpdate = {
      newNonce: '0',
      tokenBal: {},
      server: ''
    }
    const query = '/api/v2/address/' + address + `?&details=tokenBalances`

    const funcs = this.config.servers.map(server => async () => {
      const result = await this.fetchGetBlockbook(server, query)
      return { server, result }
    })
    const { result: jsonObj, server } = await asyncWaterfall(
      shuffleArray(funcs)
    )

    let addressInfo: BlockbookAddress
    try {
      addressInfo = asBlockbookAddress(jsonObj)
    } catch (e: any) {
      this.ethEngine.error(
        `checkTxsBlockbook ${server} error BlockbookAddress ${JSON.stringify(
          jsonObj
        )}`
      )
      throw new Error(
        `checkTxsBlockbook ${server} returned invalid JSON for BlockbookAddress`
      )
    }
    const { nonce, tokens, balance } = addressInfo
    out.newNonce = nonce
    if (out.tokenBal != null)
      out.tokenBal[this.ethEngine.currencyInfo.currencyCode] = balance
    out.server = server

    // Token balances
    for (const token of tokens) {
      try {
        const { symbol, balance } = asBlockbookTokenBalance(token)
        // @ts-expect-error
        out.tokenBal[symbol] = balance
      } catch (e: any) {
        this.ethEngine.error(
          `checkTxsBlockbook ${server} BlockbookTokenBalance ${JSON.stringify(
            token
          )}`
        )
        throw new Error(
          `checkTxsBlockbook ${server} returned invalid JSON for BlockbookTokenBalance`
        )
      }
    }
    return out
  }

  // TODO: Clean return type
  private async fetchGetBlockbook(server: string, param: string): Promise<any> {
    const url = server + param
    const resultRaw = !server.includes('trezor')
      ? await this.ethEngine.fetchCors(url)
      : await this.ethEngine.fetchCors(url, {
          headers: { 'User-Agent': 'http.agent' }
        })
    return await resultRaw.json()
  }
}
