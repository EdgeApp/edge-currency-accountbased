import { add } from 'biggystring'
import { EdgeTransaction } from 'edge-core-js/types'
import { ethers } from 'ethers'
import parse from 'url-parse'

import { asMaybeContractLocation } from '../../common/tokenHelpers'
import {
  asyncWaterfall,
  hexToDecimal,
  isHex,
  padHex,
  promiseAny,
  removeHexPrefix,
  shuffleArray
} from '../../common/utils'
import ETH_BAL_CHECKER_ABI from '../abi/ETH_BAL_CHECKER_ABI.json'
import { BroadcastResults, EthereumNetworkUpdate } from '../EthereumNetwork'
import { asEtherscanGetBlockHeight } from '../ethereumSchema'
import {
  asEthereumInitKeys,
  asRpcResultString,
  RpcResultString
} from '../ethereumTypes'
import { GetTxsParams, NetworkAdapter, NetworkAdapterBase } from './types'

export class RpcAdapter extends NetworkAdapterBase implements NetworkAdapter {
  fetchBlockheight = async (): Promise<EthereumNetworkUpdate> => {
    const {
      chainParams: { chainId }
    } = this.ethEngine.networkInfo

    const funcs = this.servers.map(baseUrl => async () => {
      const result = await this.fetchPostRPC(
        'eth_blockNumber',
        [],
        chainId,
        baseUrl
      )
      // Check if successful http response was actually an error
      if (result.error != null) {
        this.ethEngine.error(
          `Successful eth_blockNumber response object from ${baseUrl} included an error ${JSON.stringify(
            result.error
          )}`
        )
        throw new Error(
          'Successful eth_blockNumber response object included an error'
        )
      }
      return { server: parse(baseUrl).hostname, result }
    })

    const { result: jsonObj, server } = await asyncWaterfall(
      shuffleArray(funcs)
    )

    const clean = asEtherscanGetBlockHeight(jsonObj)
    return { blockHeight: clean.result, server }
  }

  broadcast = async (
    edgeTransaction: EdgeTransaction
  ): Promise<BroadcastResults> => {
    const {
      chainParams: { chainId }
    } = this.ethEngine.networkInfo

    const promises = this.servers.map(async baseUrl => {
      const method = 'eth_sendRawTransaction'
      const params = [edgeTransaction.signedTx]

      const jsonObj = await this.fetchPostRPC(method, params, chainId, baseUrl)

      const parsedUrl = parse(baseUrl, {}, true)
      return {
        result: this.broadcastResponseHandler(
          jsonObj,
          parsedUrl.toString(),
          edgeTransaction
        ),
        server: parsedUrl.hostname
      }
    })

    return await promiseAny(promises)
  }

  getBaseFeePerGas = async (): Promise<string | undefined> => {
    const {
      chainParams: { chainId }
    } = this.ethEngine.networkInfo

    const funcs = this.servers.map(
      baseUrl => async () =>
        await this.fetchPostRPC(
          'eth_getBlockByNumber',
          ['latest', false],
          chainId,
          baseUrl
        ).then(response => {
          if (response.error != null) {
            const errorMessage = `multicast get_baseFeePerGas error response from ${baseUrl}: ${JSON.stringify(
              response.error
            )}`
            this.ethEngine.warn(errorMessage)
            throw new Error(errorMessage)
          }

          const baseFeePerGas: string = response.result.baseFeePerGas
          return baseFeePerGas
        })
    )

    return await asyncWaterfall(funcs)
  }

  multicastRpc = async (
    method: string,
    params: any[]
  ): Promise<{ result: any; server: string }> => {
    const {
      chainParams: { chainId }
    } = this.ethEngine.networkInfo

    const funcs = this.servers.map(baseUrl => async () => {
      const result = await this.fetchPostRPC(method, params, chainId, baseUrl)
      // Check if successful http response was actually an error
      if (result.error != null) {
        this.ethEngine.error(
          `Successful ${method} response object from ${baseUrl} included an error ${JSON.stringify(
            result.error
          )}`
        )
        throw new Error(
          `Successful ${method} response object included an error`
        )
      }
      return { server: parse(baseUrl).hostname, result }
    })

    return await asyncWaterfall(funcs)
  }

  fetchNonce = async (): Promise<EthereumNetworkUpdate> => {
    const {
      chainParams: { chainId }
    } = this.ethEngine.networkInfo

    const address = this.ethEngine.walletLocalData.publicKey

    const funcs = this.servers.map(baseUrl => async () => {
      const result = await this.fetchPostRPC(
        'eth_getTransactionCount',
        [address, 'latest'],
        chainId,
        baseUrl
      )
      // Check if successful http response was actually an error
      if (result.error != null) {
        this.ethEngine.error(
          `Successful eth_getTransactionCount_RPC response object from ${baseUrl} included an error ${JSON.stringify(
            result.error
          )}`
        )
        throw new Error(
          'Successful eth_getTransactionCount_RPC response object included an error'
        )
      }
      return { server: parse(baseUrl).hostname, result }
    })

    const { result, server } = await asyncWaterfall(shuffleArray(funcs))

    const cleanRes = asRpcResultString(result)
    if (/0[xX][0-9a-fA-F]+/.test(cleanRes.result)) {
      const newNonce = add('0', cleanRes.result)
      return { newNonce, server }
    } else {
      throw new Error('checkNonceRpc returned invalid JSON')
    }
  }

  fetchTokenBalance = async (tk: string): Promise<EthereumNetworkUpdate> => {
    const {
      chainParams: { chainId }
    } = this.ethEngine.networkInfo

    let cleanedResponseObj: RpcResultString
    let response
    let jsonObj
    let server
    const address = this.ethEngine.walletLocalData.publicKey
    try {
      if (tk === this.ethEngine.currencyInfo.currencyCode) {
        const funcs = this.servers.map(baseUrl => async () => {
          const result = await this.fetchPostRPC(
            'eth_getBalance',
            [address, 'latest'],
            chainId,
            baseUrl
          )
          // Check if successful http response was actually an error
          if (result.error != null) {
            this.ethEngine.error(
              `Successful eth_getBalance response object from ${baseUrl} included an error ${JSON.stringify(
                result.error
              )}`
            )
            throw new Error(
              'Successful eth_getBalance response object included an error'
            )
          }
          // Convert hex
          if (!isHex(result.result)) {
            throw new Error(
              `eth_getBalance not hex for ${parse(baseUrl).hostname}`
            )
          }
          // Convert to decimal
          result.result = hexToDecimal(result.result)
          return { server: parse(baseUrl).hostname, result }
        })

        // Randomize array
        response = await asyncWaterfall(shuffleArray(funcs))

        jsonObj = response.result
        server = response.server
      } else {
        const tokenInfo = this.ethEngine.getTokenInfo(tk)
        if (
          tokenInfo != null &&
          typeof tokenInfo.contractAddress === 'string'
        ) {
          const params = {
            data: `0x70a08231${padHex(removeHexPrefix(address), 32)}`,
            to: tokenInfo.contractAddress
          }

          const response = await this.ethEngine.ethNetwork.multicastServers(
            'eth_call',
            params
          )
          const result: string = response.result.result

          if (!result.startsWith('0x')) {
            throw new Error('Invalid return value. Result not hex')
          }
          response.result.result = hexToDecimal(result)

          jsonObj = response.result
          server = response.server
        }
      }
      cleanedResponseObj = asRpcResultString(jsonObj)
    } catch (e: any) {
      this.ethEngine.error(
        `checkTokenBalRpc token ${tk} response ${String(response ?? '')} `,
        e
      )
      throw new Error(
        `checkTokenBalRpc invalid ${tk} response ${JSON.stringify(jsonObj)}`
      )
    }

    return {
      tokenBal: { [tk]: cleanedResponseObj.result },
      server
    }
  }

  /**
   * Check the eth-balance-checker contract for balances
   */
  fetchTokenBalances =
    this.ethEngine.networkInfo.ethBalCheckerContract == null
      ? null
      : async (): Promise<EthereumNetworkUpdate> => {
          const { allTokensMap, networkInfo, walletLocalData, currencyInfo } =
            this.ethEngine
          const { chainParams, ethBalCheckerContract } = networkInfo

          const tokenBal: EthereumNetworkUpdate['tokenBal'] = {}
          if (ethBalCheckerContract == null) return tokenBal

          // Address for querying ETH balance on ETH network, MATIC on MATIC, etc.
          const mainnetAssetAddr = '0x0000000000000000000000000000000000000000'
          const balanceQueryAddrs = [mainnetAssetAddr]
          for (const rawToken of Object.values(this.ethEngine.allTokensMap)) {
            const token = asMaybeContractLocation(rawToken.networkLocation)
            if (token != null) balanceQueryAddrs.unshift(token.contractAddress)
          }

          const funcs: Array<() => Promise<any>> = []
          this.servers.forEach(rpcServer => {
            let rpcServerWithApiKey: string
            try {
              rpcServerWithApiKey = this.addRpcApiKey(rpcServer)
            } catch (e) {
              // addRpcApiKey can throw if there's a missing apikey. skip this rpcServer
              return undefined
            }
            const ethProvider = new ethers.providers.JsonRpcProvider(
              rpcServerWithApiKey,
              chainParams.chainId
            )

            const contract = new ethers.Contract(
              ethBalCheckerContract,
              ETH_BAL_CHECKER_ABI,
              ethProvider
            )

            funcs.push(async () => {
              const contractCallRes = await contract.balances(
                [walletLocalData.publicKey],
                balanceQueryAddrs
              )
              if (contractCallRes.length !== balanceQueryAddrs.length) {
                throw new Error('checkEthBalChecker balances length mismatch')
              }
              return contractCallRes
            })
          })

          // Randomize provider priority to distribute RPC provider load
          const balances = await asyncWaterfall(shuffleArray(funcs)).catch(
            e => {
              throw new Error(`All rpc servers failed eth balance checks: ${e}`)
            }
          )

          // Parse data from smart contract call
          for (let i = 0; i < balances.length; i++) {
            const tokenAddr = balanceQueryAddrs[i].toLowerCase()
            const balanceBn = balances[i]

            let balanceCurrencyCode
            if (tokenAddr === mainnetAssetAddr) {
              const { currencyCode } = currencyInfo
              balanceCurrencyCode = currencyCode
            } else {
              const token = allTokensMap[tokenAddr.replace('0x', '')]
              if (token == null) {
                this.logError(
                  'checkEthBalChecker',
                  new Error(
                    `checkEthBalChecker missing builtinToken: ${tokenAddr}`
                  )
                )
                continue
              }
              const { currencyCode } = token
              balanceCurrencyCode = currencyCode
            }

            tokenBal[balanceCurrencyCode] =
              ethers.BigNumber.from(balanceBn).toString()
          }

          return { tokenBal, server: 'ethBalChecker' }
        }

  fetchTxs = async (params: GetTxsParams): Promise<EthereumNetworkUpdate> => {
    throw new Error('not implemented')
  }

  private addRpcApiKey(url: string): string {
    const regex = /{{(.*?)}}/g
    const match = regex.exec(url)
    if (match != null) {
      const key = match[1]
      const cleanKey = asEthereumInitKeys(key)
      const apiKey = this.ethEngine.initOptions[cleanKey]
      if (typeof apiKey === 'string') {
        url = url.replace(match[0], apiKey)
      } else if (apiKey == null) {
        throw new Error(
          `Missing ${cleanKey} in 'initOptions' for ${this.ethEngine.currencyInfo.pluginId}`
        )
      } else {
        throw new Error('Incorrect apikey type for RPC')
      }
    }
    return url
  }

  // TODO: Clean return type
  private async fetchPostRPC(
    method: string,
    params: any[],
    networkId: number,
    url: string
  ): Promise<any> {
    const body = {
      id: networkId,
      jsonrpc: '2.0',
      method,
      params
    }

    url = this.addRpcApiKey(url)

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
      this.throwError(response, 'fetchPostRPC', parsedUrl.hostname)
    }
    return await response.json()
  }
}
