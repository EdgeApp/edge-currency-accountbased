import { add } from 'biggystring'
import { EdgeTransaction } from 'edge-core-js/types'
import { ethers } from 'ethers'
import parse from 'url-parse'

import {
  getRandomServiceKey,
  getServiceKeyIndex
} from '../../common/serviceKeys'
import { asMaybeContractLocation } from '../../common/tokenHelpers'
import {
  hexToDecimal,
  isHex,
  padHex,
  removeHexPrefix
} from '../../common/utils'
import ETH_BAL_CHECKER_ABI from '../abi/ETH_BAL_CHECKER_ABI.json'
import { EthereumEngine } from '../EthereumEngine'
import { BroadcastResults, EthereumNetworkUpdate } from '../EthereumNetwork'
import { asEtherscanGetBlockHeight } from '../ethereumSchema'
import {
  asEthereumInitKeys,
  asRpcResultString,
  RpcResultString
} from '../ethereumTypes'
import { NetworkAdapter } from './networkAdapterTypes'

export interface RpcAdapterConfig {
  type: 'rpc'
  servers: string[]
  ethBalCheckerContract?: string
}

export class RpcAdapter extends NetworkAdapter<RpcAdapterConfig> {
  connect = null
  disconnect = null
  fetchTxs = null
  subscribeAddressSync = null

  constructor(ethEngine: EthereumEngine, config: RpcAdapterConfig) {
    super(ethEngine, config)

    // Add API keys to servers
    this.config.servers = this.config.servers
      .map((server): string | undefined => {
        try {
          return this.addRpcApiKey(server)
        } catch (error) {}
        return undefined
      })
      .filter((server): server is string => server != null)
  }

  fetchBlockheight = async (): Promise<EthereumNetworkUpdate> => {
    const {
      chainParams: { chainId }
    } = this.ethEngine.networkInfo

    const { result: jsonObj, server } = await this.serialServers(
      async baseUrl => {
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
      }
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

    return await this.parallelServers(async baseUrl => {
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
    }, 'Broadcast failed:')
  }

  getBaseFeePerGas =
    this.ethEngine.networkInfo.supportsEIP1559 !== true
      ? null
      : async (): Promise<string> => {
          const {
            chainParams: { chainId }
          } = this.ethEngine.networkInfo

          return await this.serialServers(
            async baseUrl =>
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
        }

  multicastRpc = async (
    method: string,
    params: any[]
  ): Promise<{ result: any; server: string }> => {
    const {
      chainParams: { chainId }
    } = this.ethEngine.networkInfo

    return await this.serialServers(async baseUrl => {
      const result = await this.fetchPostRPC(method, params, chainId, baseUrl)
      // Check if successful http response was actually an error
      if (result.error != null) {
        this.ethEngine.error(
          `Successful ${method} response object from ${baseUrl} included an error ${JSON.stringify(
            result.error
          )}`
        )
        throw new Error(
          `Successful ${method} response object included an error: ${result.error.message}`
        )
      }
      return { server: parse(baseUrl).hostname, result }
    })
  }

  batchMulticastRpc = async (
    requests: Array<{ method: string; params: any[] }>
  ): Promise<{ result: any[]; server: string }> => {
    return await this.serialServers(async baseUrl => {
      const body = requests.map((req, i) => ({
        id: i + 1,
        jsonrpc: '2.0',
        method: req.method,
        params: req.params
      }))

      baseUrl = this.addRpcApiKey(baseUrl)

      const response = await this.ethEngine.fetchCors(baseUrl, {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        method: 'POST',
        body: JSON.stringify(body)
      })

      const parsedUrl = parse(baseUrl, {}, true)
      if (!response.ok) {
        const resBody = await response.text()
        this.throwError(
          response,
          'batchMulticastRpc',
          parsedUrl.hostname,
          resBody
        )
      }

      const results = await response.json()
      // Sort results by id to match request order
      const sortedResults = (Array.isArray(results) ? results : [results]).sort(
        (a, b) => a.id - b.id
      )

      // Check for errors
      for (const result of sortedResults) {
        if (result.error != null) {
          this.ethEngine.error(
            `Batch RPC error from ${parsedUrl.hostname}: ${JSON.stringify(
              result.error
            )}`
          )
          throw new Error(`Batch RPC error: ${result.error.message}`)
        }
      }

      return { server: parsedUrl.hostname, result: sortedResults }
    })
  }

  fetchNonce = async (): Promise<EthereumNetworkUpdate> => {
    const {
      chainParams: { chainId }
    } = this.ethEngine.networkInfo

    const address = this.ethEngine.walletLocalData.publicKey

    const { result, server } = await this.serialServers(async baseUrl => {
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

    const cleanRes = asRpcResultString(result)
    if (/0[xX][0-9a-fA-F]+/.test(cleanRes.result)) {
      const newNonce = add('0', cleanRes.result)
      return { newNonce, server }
    } else {
      throw new Error('checkNonceRpc returned invalid JSON')
    }
  }

  fetchTokenBalance = async (
    currencyCode: string
  ): Promise<EthereumNetworkUpdate> => {
    const {
      chainParams: { chainId }
    } = this.ethEngine.networkInfo

    let cleanedResponseObj: RpcResultString
    let response
    let jsonObj
    let server
    const address = this.ethEngine.walletLocalData.publicKey
    try {
      if (currencyCode === this.ethEngine.currencyInfo.currencyCode) {
        response = await this.serialServers(async baseUrl => {
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

        jsonObj = response.result
        server = response.server
      } else {
        const tokenInfo = this.ethEngine.getTokenInfo(currencyCode)
        if (
          tokenInfo != null &&
          typeof tokenInfo.contractAddress === 'string'
        ) {
          const params = {
            data: `0x70a08231${padHex(removeHexPrefix(address), 32)}`,
            to: tokenInfo.contractAddress
          }

          const response = await this.ethEngine.ethNetwork.multicastRpc(
            'eth_call',
            [params, 'pending']
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
        `checkTokenBalRpc token ${currencyCode} response ${String(
          response ?? ''
        )} `,
        e
      )
      throw new Error(
        `checkTokenBalRpc invalid ${currencyCode} response ${JSON.stringify(
          jsonObj
        )}`
      )
    }

    return {
      tokenBal: { [currencyCode]: cleanedResponseObj.result },
      server
    }
  }

  /**
   * Check the eth-balance-checker contract for balances
   */
  // fetchTokenBalances is defined on this adapter only if ethBalCheckerContract is defined
  fetchTokenBalances =
    this.config.ethBalCheckerContract == null
      ? null
      : async (): Promise<EthereumNetworkUpdate> => {
          const { allTokensMap, networkInfo, walletLocalData, currencyInfo } =
            this.ethEngine
          const { chainParams } = networkInfo

          const tokenBal: EthereumNetworkUpdate['tokenBal'] = {}
          const detectedTokenIds: string[] = []
          const ethBalCheckerContract = this.config.ethBalCheckerContract
          if (ethBalCheckerContract == null) return tokenBal

          // Address for querying ETH balance on ETH network, POL on POL, etc.
          const mainnetAssetAddr = '0x0000000000000000000000000000000000000000'
          const balanceQueryAddrs = [mainnetAssetAddr]
          for (const rawToken of Object.values(this.ethEngine.allTokensMap)) {
            const token = asMaybeContractLocation(rawToken.networkLocation)
            if (token != null) balanceQueryAddrs.unshift(token.contractAddress)
          }

          const balances = await this.serialServers(async baseUrl => {
            const ethProvider = new ethers.providers.JsonRpcProvider(
              baseUrl,
              chainParams.chainId
            )

            const contract = new ethers.Contract(
              ethBalCheckerContract,
              ETH_BAL_CHECKER_ABI,
              ethProvider
            )

            const contractCallRes = await contract.balances(
              [walletLocalData.publicKey],
              balanceQueryAddrs
            )
            if (contractCallRes.length !== balanceQueryAddrs.length) {
              throw new Error('checkEthBalChecker balances length mismatch')
            }
            return contractCallRes
          }).catch((e: any) => {
            throw new Error(
              `All rpc servers failed eth balance checks: ${String(e)}`
            )
          })

          // Parse data from smart contract call
          for (let i = 0; i < balances.length; i++) {
            const tokenAddr = balanceQueryAddrs[i].toLowerCase()
            const balanceBn = ethers.BigNumber.from(balances[i])

            let balanceCurrencyCode
            if (tokenAddr === mainnetAssetAddr) {
              const { currencyCode } = currencyInfo
              balanceCurrencyCode = currencyCode
            } else {
              const tokenId = tokenAddr.replace('0x', '')

              // Notify the core that activity was detected on this token
              if (balanceBn.gt(ethers.constants.Zero))
                detectedTokenIds.push(tokenId)

              const token = allTokensMap[tokenId]
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

            tokenBal[balanceCurrencyCode] = balanceBn.toString()
          }

          return { tokenBal, detectedTokenIds, server: 'ethBalChecker' }
        }

  private addRpcApiKey(url: string): string {
    const regex = /{{(.*?)}}/g
    const match = regex.exec(url)

    if (match != null) {
      const key = match[1]

      // try service keys first
      const serviceKeyIndex = getServiceKeyIndex(url)
      let apiKey = getRandomServiceKey(
        this.ethEngine.initOptions.serviceKeys,
        serviceKeyIndex
      )

      // fall back to deprecated keys
      if (apiKey == null) {
        const cleanKey = asEthereumInitKeys(key)
        const cleanApiKey = this.ethEngine.initOptions[cleanKey]
        if (cleanApiKey === 'string') {
          apiKey = cleanApiKey
          this.ethEngine.log.warn(
            `INIT OPTION '${cleanKey}' IS DEPRECATED. USE 'serviceKeys' INSTEAD`
          )
        }
      }

      if (typeof apiKey === 'string') {
        url = url.replace(match[0], apiKey)
      } else if (apiKey == null) {
        throw new Error(
          `Missing '${serviceKeyIndex}' in 'initOptions.serviceKeys' for ${this.ethEngine.currencyInfo.pluginId}`
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
      const resBody = await response.text()
      this.throwError(response, 'fetchPostRPC', parsedUrl.hostname, resBody)
    }
    return await response.json()
  }
}
