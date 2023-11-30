import { safeErrorMessage } from '../../common/utils'
import { EthereumNetworkUpdate } from '../EthereumNetwork'
import {
  asBlockChairAddress,
  asCheckBlockHeightBlockchair,
  asCheckTokenBalBlockchair,
  CheckTokenBalBlockchair
} from '../ethereumTypes'
import { NetworkAdapter } from './types'

export interface BlockchairAdapterConfig {
  type: 'blockchair'
  servers: string[]
}

export class BlockchairAdapter extends NetworkAdapter<BlockchairAdapterConfig> {
  broadcast = null
  fetchNonce = null
  fetchTokenBalances = null
  fetchTxs = null
  getBaseFeePerGas = null
  multicastRpc = null

  fetchBlockheight = async (): Promise<EthereumNetworkUpdate> => {
    try {
      const jsonObj = await this.fetchGetBlockchair(
        `/${this.ethEngine.currencyInfo.pluginId}/stats`,
        false
      )
      const blockHeight = parseInt(
        asCheckBlockHeightBlockchair(jsonObj).data.blocks.toString(),
        10
      )
      return { blockHeight, server: 'blockchair' }
    } catch (e: any) {
      this.logError(e)
      throw new Error('checkBlockHeightBlockchair returned invalid JSON')
    }
  }

  fetchTokenBalance = async (tk: string): Promise<EthereumNetworkUpdate> => {
    let cleanedResponseObj: CheckTokenBalBlockchair
    const address = this.ethEngine.walletLocalData.publicKey
    const path = `/${this.ethEngine.currencyInfo.pluginId}/dashboards/address/${address}?erc_20=true`
    try {
      const jsonObj = await this.fetchGetBlockchair(path, false)
      cleanedResponseObj = asCheckTokenBalBlockchair(jsonObj)
    } catch (e: any) {
      this.logError('checkTokenBalBlockchair', e)
      throw new Error('checkTokenBalBlockchair response is invalid')
    }
    const response = {
      [this.ethEngine.currencyInfo.currencyCode]:
        cleanedResponseObj.data[address].address.balance
    }
    for (const tokenData of cleanedResponseObj.data[address].layer_2.erc_20) {
      try {
        const cleanTokenData = asBlockChairAddress(tokenData)
        const balance = cleanTokenData.balance
        const tokenAddress = cleanTokenData.token_address
        const tokenSymbol = cleanTokenData.token_symbol
        const tokenInfo = this.ethEngine.getTokenInfo(tokenSymbol)
        if (tokenInfo != null && tokenInfo.contractAddress === tokenAddress) {
          response[tokenSymbol] = balance
        } else {
          // Do nothing, eg: Old DAI token balance is ignored
        }
      } catch (e: any) {
        this.ethEngine.error(
          `checkTokenBalBlockchair tokenData ${safeErrorMessage(
            e
          )}\n${JSON.stringify(tokenData)}`
        )
        throw new Error('checkTokenBalBlockchair tokenData is invalid')
      }
    }
    return { tokenBal: response, server: 'blockchair' }
  }

  // TODO: Clean return type
  private async fetchGetBlockchair(
    path: string,
    includeKey: boolean = false
  ): Promise<any> {
    const { blockchairApiKey } = this.ethEngine.initOptions

    return await this.serialServers(async baseUrl => {
      const keyParam =
        includeKey && blockchairApiKey != null ? `&key=${blockchairApiKey}` : ''
      const url = `${baseUrl}${path}`
      const response = await this.ethEngine.fetchCors(`${url}${keyParam}`)
      if (!response.ok) this.throwError(response, 'fetchGetBlockchair', url)
      return await response.json()
    })
  }
}
