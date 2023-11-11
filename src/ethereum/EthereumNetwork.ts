import { add, div, mul, sub } from 'biggystring'
import { EdgeTransaction, JsonObject } from 'edge-core-js/types'
import { ethers } from 'ethers'
import { FetchResponse } from 'serverlet'
import parse from 'url-parse'

import { asMaybeContractLocation } from '../common/tokenHelpers'
import { asIntegerString } from '../common/types'
import {
  asyncWaterfall,
  cleanTxLogs,
  decimalToHex,
  hexToDecimal,
  isHex,
  padHex,
  pickRandom,
  promiseAny,
  removeHexPrefix,
  safeErrorMessage,
  shuffleArray,
  snooze
} from '../common/utils'
import ETH_BAL_CHECKER_ABI from './abi/ETH_BAL_CHECKER_ABI.json'
import { WEI_MULTIPLIER } from './ethereumConsts'
import { EthereumEngine } from './EthereumEngine'
import {
  asEtherscanGetAccountNonce,
  asEtherscanGetBlockHeight
} from './ethereumSchema'
import {
  AlethioTokenTransfer,
  asBlockbookAddress,
  asBlockbookBlockHeight,
  asBlockbookTokenBalance,
  asBlockChairAddress,
  asCheckBlockHeightBlockchair,
  asCheckTokenBalBlockchair,
  asEthereumInitKeys,
  asEvmScancanTokenTransaction,
  asEvmScanInternalTransaction,
  asEvmScanTransaction,
  asGetTransactionReceipt,
  asRpcResultString,
  BlockbookAddress,
  CheckTokenBalBlockchair,
  EthereumNetworkInfo,
  EthereumTxOtherParams,
  EvmScanInternalTransaction,
  EvmScanTransaction,
  RpcResultString
} from './ethereumTypes'
import { getEvmScanApiKey } from './fees/feeProviders'

const BLOCKHEIGHT_POLL_MILLISECONDS = 20000
const NONCE_POLL_MILLISECONDS = 20000
const BAL_POLL_MILLISECONDS = 20000
const TXS_POLL_MILLISECONDS = 20000

const ADDRESS_QUERY_LOOKBACK_BLOCKS = 4 * 2 // ~ 2 minutes
const ADDRESS_QUERY_LOOKBACK_SEC = 2 * 60 // ~ 2 minutes
const NUM_TRANSACTIONS_TO_QUERY = 50

interface EthereumNeeds {
  blockHeightLastChecked: number
  nonceLastChecked: number
  tokenBalsLastChecked: number
  tokenBalLastChecked: { [currencyCode: string]: number }
  tokenTxsLastChecked: { [currencyCode: string]: number }
}

interface EdgeTransactionsBlockHeightTuple {
  blockHeight: number
  edgeTransactions: EdgeTransaction[]
}

interface EthereumNetworkUpdate {
  blockHeight?: number
  newNonce?: string
  tokenBal?: { [currencyCode: string]: string }
  tokenTxs?: { [currencyCode: string]: EdgeTransactionsBlockHeightTuple }
  server?: string
}

type EthFunction =
  | 'broadcastTx'
  | 'eth_call'
  | 'eth_getTransactionReceipt'
  | 'eth_estimateGas'
  | 'eth_getCode'

interface BroadcastResults {
  incrementNonce: boolean
  decrementNonce: boolean
}

interface GetEthscanAllTxsOptions {
  contractAddress?: string
  searchRegularTxs?: boolean
}

interface GetEthscanAllTxsResponse {
  allTransactions: EdgeTransaction[]
  server: string | undefined
}

interface BroadcastWrapper<T> {
  result: T
  server: string
}

async function broadcastWrapper<T extends object>(
  promise: Promise<T>,
  server: string
): Promise<BroadcastWrapper<T>> {
  const out: BroadcastWrapper<T> = {
    result: await promise,
    server
  }
  return out
}

interface GetTxsParams {
  startBlock: number
  startDate: number
  currencyCode: string
}

type NetworkAdapterUpdateMethod = keyof Pick<
  NetworkAdapter,
  'blockheight' | 'nonce' | 'tokenBal' | 'tokenBals' | 'txs'
>
interface NetworkAdapter {
  blockheight?: (...args: any[]) => Promise<EthereumNetworkUpdate>
  nonce?: (...args: any[]) => Promise<EthereumNetworkUpdate>
  tokenBal?: (...args: any[]) => Promise<EthereumNetworkUpdate>
  tokenBals?: () => Promise<EthereumNetworkUpdate>
  txs?: (...args: any[]) => Promise<EthereumNetworkUpdate>
}

/**
 * Builds the `feeRateUsed` object for an Ethereum transaction.
 * Usually, a valid output will be consumed by the GUI for display purposes.
 * Failure to construct the object will return an empty object.
 *
 * An example of the object returned:
 * ```js
 * getFeeRateUsed(gasPrice: '33000000000', gasUsed: '20000', gasLimit: '21000') => {
 *  gasPrice: '33',
 *  gasUsed: '20000',
 *  gasLimit: '21000'
 * }
 * ```
 *
 * An example usage:
 * ```js
 * const edgeTransaction: EdgeTransaction = {
 * ...
 * feeRateUsed: this.getFeeRateUsed(...),
 * ...
 * }
 * ```
 *
 * @param {string} gasPrice - The gas price of the transaction, in ***wei***.
 * @param {string} gasLimit - The gas limit of the transaction, in units of gas. If the
 *                            limit was not customly set, it will default to 21000.
 * @param {void | string} gasUsed - The amount of gas used in a transaction, in units of gas.
 * @returns {any} A `feeRateUsed` object to be included in an `EdgeTransaction`
 */
export const getFeeRateUsed = (
  gasPrice: string,
  gasLimit: string,
  gasUsed?: string
): any => {
  let feeRateUsed = {}

  try {
    feeRateUsed = {
      // Convert gasPrice from wei to gwei
      gasPrice: div(
        gasPrice,
        WEI_MULTIPLIER.toString(),
        WEI_MULTIPLIER.toString().length - 1
      ),
      ...(gasUsed !== undefined ? { gasUsed: gasUsed } : {}),
      gasLimit: gasLimit
    }
  } catch (e: any) {
    console.log(`Failed to construct feeRateUssed: ${e}`)
  }

  return feeRateUsed
}

export class EthereumNetwork {
  ethNeeds: EthereumNeeds
  ethEngine: EthereumEngine
  walletId: string
  networkAdapters: NetworkAdapter[]

  constructor(ethEngine: EthereumEngine) {
    this.ethEngine = ethEngine
    this.ethNeeds = {
      blockHeightLastChecked: 0,
      nonceLastChecked: 0,
      tokenBalsLastChecked: 0,
      tokenBalLastChecked: {},
      tokenTxsLastChecked: {}
    }
    this.networkAdapters = this.buildNetworkAdapters(this.ethEngine.networkInfo)
    this.walletId = ethEngine.walletInfo.id
  }

  async processEvmScanTransaction(
    tx: EvmScanTransaction | EvmScanInternalTransaction,
    currencyCode: string
  ): Promise<EdgeTransaction> {
    const ourReceiveAddresses: string[] = []

    const txid = tx.hash ?? tx.transactionHash
    if (txid == null) {
      throw new Error('Invalid transaction result format')
    }

    const isSpend =
      tx.from.toLowerCase() ===
      this.ethEngine.walletLocalData.publicKey.toLowerCase()
    const tokenTx = currencyCode !== this.ethEngine.currencyInfo.currencyCode

    const gasPrice = 'gasPrice' in tx ? tx.gasPrice : undefined
    const nativeNetworkFee: string =
      gasPrice != null ? mul(gasPrice, tx.gasUsed) : '0'

    let l1RollupFee = '0'
    if (isSpend && this.ethEngine.networkInfo.l1RollupParams != null) {
      const response = await this.multicastServers(
        'eth_getTransactionReceipt',
        [txid]
      )
      const json = asGetTransactionReceipt(response.result.result)
      l1RollupFee = add(l1RollupFee, decimalToHex(json.l1Fee))
    }

    let nativeAmount: string
    let networkFee: string
    let parentNetworkFee: string | undefined

    if (isSpend) {
      if (tokenTx) {
        nativeAmount = sub('0', tx.value)
        networkFee = '0'
        parentNetworkFee = add(nativeNetworkFee, l1RollupFee)
      } else {
        // Spend to self. netNativeAmount is just the fee
        if (tx.from.toLowerCase() === tx.to.toLowerCase()) {
          nativeAmount = sub(sub('0', nativeNetworkFee), l1RollupFee)
          networkFee = add(nativeNetworkFee, l1RollupFee)
        } else {
          nativeAmount = sub(
            sub(sub('0', tx.value), nativeNetworkFee),
            l1RollupFee
          )
          networkFee = add(nativeNetworkFee, l1RollupFee)
        }
      }
    } else {
      // Receive
      if (tokenTx) {
        nativeAmount = tx.value
        networkFee = '0'
      } else {
        nativeAmount = tx.value
        networkFee = '0'
      }
      ourReceiveAddresses.push(this.ethEngine.walletLocalData.publicKey)
    }

    const otherParams: EthereumTxOtherParams = {
      from: [tx.from],
      to: [tx.to],
      gas: tx.gas,
      gasPrice: gasPrice ?? '',
      gasUsed: tx.gasUsed,
      isFromMakeSpend: false
    }

    let blockHeight = parseInt(tx.blockNumber)
    if (blockHeight < 0) blockHeight = 0

    const edgeTransaction: EdgeTransaction = {
      blockHeight,
      currencyCode,
      date: parseInt(tx.timeStamp),
      feeRateUsed:
        gasPrice != null
          ? getFeeRateUsed(gasPrice, tx.gas, tx.gasUsed)
          : undefined,
      isSend: nativeAmount.startsWith('-'),
      memos: [],
      nativeAmount,
      networkFee,
      otherParams,
      ourReceiveAddresses,
      parentNetworkFee,
      signedTx: '',
      txid,
      walletId: this.walletId
    }

    return edgeTransaction
    // or should be this.addTransaction(currencyCode, edgeTransaction)?
  }

  processAlethioTransaction(
    tokenTransfer: AlethioTokenTransfer,
    currencyCode: string
  ): EdgeTransaction | null {
    let netNativeAmount: string
    const ourReceiveAddresses: string[] = []
    let nativeNetworkFee: string
    const tokenTx = currencyCode !== this.ethEngine.currencyInfo.currencyCode

    const value = tokenTransfer.attributes.value
    const fee =
      tokenTransfer.attributes.fee != null &&
      tokenTransfer.attributes.fee !== ''
        ? tokenTransfer.attributes.fee
        : '0'
    const fromAddress = tokenTransfer.relationships.from.data.id
    const toAddress = tokenTransfer.relationships.to.data.id

    if (currencyCode === this.ethEngine.currencyInfo.currencyCode) {
      nativeNetworkFee = fee
    } else {
      nativeNetworkFee = '0'
    }

    const isSpend =
      fromAddress.toLowerCase() ===
      this.ethEngine.walletLocalData.publicKey.toLowerCase()

    if (isSpend) {
      if (fromAddress.toLowerCase() === toAddress.toLowerCase()) {
        // Spend to self. netNativeAmount is just the fee
        netNativeAmount = mul(nativeNetworkFee, '-1')
      } else {
        // spend to someone else
        netNativeAmount = sub('0', value)

        // For spends, include the network fee in the transaction amount if not a token tx
        if (!tokenTx) {
          netNativeAmount = sub(netNativeAmount, nativeNetworkFee)
        }
      }
    } else if (
      toAddress.toLowerCase() ===
      this.ethEngine.walletLocalData.publicKey.toLowerCase()
    ) {
      // Receive transaction
      netNativeAmount = value
      ourReceiveAddresses.push(
        this.ethEngine.walletLocalData.publicKey.toLowerCase()
      )
    } else {
      return null
    }

    const otherParams: EthereumTxOtherParams = {
      from: [fromAddress],
      to: [toAddress],
      gas: '0',
      gasPrice: '0',
      gasUsed: '0',
      isFromMakeSpend: false
    }

    let blockHeight = tokenTransfer.attributes.globalRank[0]
    if (blockHeight < 0) blockHeight = 0

    let parentNetworkFee
    let networkFee = '0'
    if (tokenTx && isSpend) {
      parentNetworkFee = nativeNetworkFee
    } else {
      networkFee = nativeNetworkFee
    }

    const edgeTransaction: EdgeTransaction = {
      blockHeight,
      currencyCode,
      date: tokenTransfer.attributes.blockCreationTime,
      isSend: netNativeAmount.startsWith('-'),
      memos: [],
      nativeAmount: netNativeAmount,
      networkFee,
      otherParams,
      ourReceiveAddresses,
      parentNetworkFee,
      signedTx: '',
      txid: tokenTransfer.relationships.transaction.data.id,
      walletId: this.walletId
    }

    return edgeTransaction
  }

  // TODO: Clean return type
  fetchGetEtherscan = async (server: string, cmd: string): Promise<any> => {
    const scanApiKey = getEvmScanApiKey(
      this.ethEngine.initOptions,
      this.ethEngine.currencyInfo,
      this.ethEngine.log
    )

    // Quick hack to signal to use slower fetchCors over fetch from EdgeIo
    const useFetchCors = server.indexOf('cors-http') === 0
    if (useFetchCors) server = server.replace(/^cors-http/, 'http')

    const apiKey = Array.isArray(scanApiKey)
      ? pickRandom(scanApiKey, 1)[0]
      : scanApiKey ?? ''
    const apiKeyParam = apiKey !== '' ? `&apikey=${apiKey}` : ''

    const url = `${server}/api${cmd}`

    const response = await this.ethEngine.fetchCors(`${url}${apiKeyParam}`)
    if (!response.ok) this.throwError(response, 'fetchGetEtherscan', url)
    return await response.json()
  }

  // TODO: Clean return type
  async fetchGetBlockbook(server: string, param: string): Promise<any> {
    const url = server + param
    const resultRaw = !server.includes('trezor')
      ? await this.ethEngine.fetchCors(url)
      : await this.ethEngine.fetchCors(url, {
          headers: { 'User-Agent': 'http.agent' }
        })
    return await resultRaw.json()
  }

  // TODO: Clean return type
  async fetchPostRPC(
    method: string,
    params: Object,
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

  addRpcApiKey(url: string): string {
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
  async fetchPostBlockcypher(
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

  // TODO: Clean return type
  async fetchGetBlockchair(
    path: string,
    includeKey: boolean = false
  ): Promise<any> {
    const { blockchairApiKey } = this.ethEngine.initOptions
    const { blockchairApiServers } = this.ethEngine.networkInfo

    const keyParam =
      includeKey && blockchairApiKey != null ? `&key=${blockchairApiKey}` : ''
    const url = `${blockchairApiServers[0]}${path}`
    const response = await this.ethEngine.fetchCors(`${url}${keyParam}`)
    if (!response.ok) this.throwError(response, 'fetchGetBlockchair', url)
    return await response.json()
  }

  // TODO: Clean return type
  async fetchPostAmberdataRpc(
    method: string,
    params: string[] = []
  ): Promise<any> {
    const { amberdataApiKey = '' } = this.ethEngine.initOptions
    const { amberdataRpcServers } = this.ethEngine.networkInfo

    const url = `${amberdataRpcServers[0]}`
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
  }

  // TODO: Clean return type
  async fetchGetAmberdataApi(path: string): Promise<any> {
    const { amberdataApiKey = '' } = this.ethEngine.initOptions
    const { amberdataApiServers } = this.ethEngine.networkInfo
    const url = `${amberdataApiServers[0]}${path}`
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
  }

  /*
   * @param pathOrLink: A "path" is appended to the alethioServers base URL and
   *  a "link" is a full URL that needs no further modification
   * @param isPath: If TRUE then the pathOrLink param is interpretted as a "path"
   *  otherwise it is interpretted as a "link"
   *
   * @throws Exception when Alethio throttles with a 429 response code
   */
  // TODO: Clean return type
  async fetchGetAlethio(
    pathOrLink: string,
    // eslint-disable-next-line @typescript-eslint/default-param-last
    isPath: boolean = true,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    useApiKey: boolean
  ): Promise<any> {
    const { alethioApiKey } = this.ethEngine.initOptions
    const { alethioApiServers } = this.ethEngine.networkInfo
    const url = isPath ? `${alethioApiServers[0]}${pathOrLink}` : pathOrLink

    const response = await this.ethEngine.fetchCors(
      url,
      alethioApiKey != null
        ? { headers: { Authorization: `Bearer ${alethioApiKey}` } }
        : undefined
    )
    if (!response.ok) this.throwError(response, 'fetchGetAlethio', url)
    return await response.json()
  }

  async broadcastEtherscan(
    edgeTransaction: EdgeTransaction,
    baseUrl: string
  ): Promise<BroadcastResults> {
    // RSK also uses the "eth_sendRaw" syntax
    const urlSuffix = `?module=proxy&action=eth_sendRawTransaction&hex=${edgeTransaction.signedTx}`
    const jsonObj = await this.fetchGetEtherscan(baseUrl, urlSuffix)
    return this.broadcastResponseHandler(jsonObj, baseUrl, edgeTransaction)
  }

  async broadcastRPC(
    edgeTransaction: EdgeTransaction,
    networkId: number,
    baseUrl: string
  ): Promise<BroadcastResults> {
    const method = 'eth_sendRawTransaction'
    const params = [edgeTransaction.signedTx]

    const jsonObj = await this.fetchPostRPC(method, params, networkId, baseUrl)

    const parsedUrl = parse(baseUrl, {}, true)
    // @ts-expect-error
    return this.broadcastResponseHandler(jsonObj, parsedUrl, edgeTransaction)
  }

  async broadcastBlockCypher(
    edgeTransaction: EdgeTransaction,
    baseUrl: string
  ): Promise<BroadcastResults> {
    const urlSuffix = `v1/${this.ethEngine.currencyInfo.currencyCode.toLowerCase()}/main/txs/push`
    const hexTx = edgeTransaction.signedTx.replace('0x', '')
    const jsonObj = await this.fetchPostBlockcypher(
      urlSuffix,
      { tx: hexTx },
      baseUrl
    )
    return this.broadcastResponseHandler(jsonObj, baseUrl, edgeTransaction)
  }

  async broadcastBlockbook(
    edgeTransaction: EdgeTransaction,
    baseUrl: string
  ): Promise<BroadcastResults> {
    const jsonObj = await this.fetchGetBlockbook(
      baseUrl,
      `/api/v2/sendtx/${edgeTransaction.signedTx}`
    )

    return this.broadcastResponseHandler(jsonObj, baseUrl, edgeTransaction)
  }

  broadcastResponseHandler(
    res: JsonObject,
    server: string,
    tx: EdgeTransaction
  ): BroadcastResults {
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

  multicastServers = async (
    func: EthFunction,
    ...params: any
  ): Promise<any> => {
    const {
      rpcServers,
      blockcypherApiServers,
      evmScanApiServers,
      blockbookServers,
      chainParams: { chainId }
    } = this.ethEngine.networkInfo

    let out = { result: '', server: 'no server' }
    let funcs
    switch (func) {
      case 'broadcastTx': {
        // @ts-expect-error
        const promises = []

        rpcServers.forEach(baseUrl => {
          const parsedUrl = parse(baseUrl, {}, true)
          promises.push(
            broadcastWrapper(
              this.broadcastRPC(params[0], chainId, baseUrl),
              parsedUrl.hostname
            )
          )
        })

        evmScanApiServers.forEach(baseUrl => {
          promises.push(
            broadcastWrapper(
              this.broadcastEtherscan(params[0], baseUrl),
              'etherscan'
            )
          )
        })

        blockbookServers.forEach(baseUrl => {
          promises.push(
            broadcastWrapper(
              this.broadcastBlockbook(params[0], baseUrl),
              'blockbook'
            )
          )
        })

        blockcypherApiServers.forEach(baseUrl => {
          promises.push(
            broadcastWrapper(
              this.broadcastBlockCypher(params[0], baseUrl),
              'blockcypher'
            )
          )
        })

        // @ts-expect-error
        out = await promiseAny(promises)

        this.ethEngine.log(
          `${this.ethEngine.currencyInfo.currencyCode} multicastServers ${func} ${out.server} won`
        )
        break
      }

      case 'eth_estimateGas':
        funcs = rpcServers.map(baseUrl => async () => {
          const result = await this.fetchPostRPC(
            'eth_estimateGas',
            params[0],
            chainId,
            baseUrl
          )
          // Check if successful http response was actually an error
          if (result.error != null) {
            this.ethEngine.error(
              `Successful eth_estimateGas response object from ${baseUrl} included an error ${JSON.stringify(
                result.error
              )}`
            )
            throw new Error(
              'Successful eth_estimateGas response object included an error'
            )
          }
          return { server: parse(baseUrl).hostname, result }
        })

        out = await asyncWaterfall(funcs)
        break

      case 'eth_getTransactionReceipt':
      case 'eth_getCode':
        funcs = rpcServers.map(baseUrl => async () => {
          const result = await this.fetchPostRPC(
            func,
            params[0],
            chainId,
            baseUrl
          )
          // Check if successful http response was actually an error
          if (result.error != null) {
            this.ethEngine.error(
              `Successful ${func} response object from ${baseUrl} included an error ${result.error}`
            )
            throw new Error(
              `Successful ${func} response object included an error`
            )
          }
          return { server: parse(baseUrl).hostname, result }
        })

        out = await asyncWaterfall(funcs)
        break

      case 'eth_call':
        funcs = rpcServers.map(baseUrl => async () => {
          const result = await this.fetchPostRPC(
            'eth_call',
            [params[0], 'latest'],
            chainId,
            baseUrl
          )
          // Check if successful http response was actually an error
          if (result.error != null) {
            this.ethEngine.error(
              `Successful eth_call response object from ${baseUrl} included an error ${JSON.stringify(
                result.error
              )}`
            )
            throw new Error(
              'Successful eth_call response object included an error'
            )
          }
          return { server: parse(baseUrl).hostname, result }
        })

        out = await asyncWaterfall(funcs)
        break
    }

    return out
  }

  getBaseFeePerGas = async (): Promise<string | undefined> => {
    const {
      rpcServers,
      chainParams: { chainId }
    } = this.ethEngine.networkInfo

    const funcs = rpcServers.map(
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

  checkBlockHeightEthscan = async (): Promise<EthereumNetworkUpdate> => {
    const { evmScanApiServers } = this.ethEngine.networkInfo

    const funcs = evmScanApiServers.map(server => async () => {
      if (!server.includes('etherscan') && !server.includes('blockscout')) {
        throw new Error(`Unsupported command eth_blockNumber in ${server}`)
      }
      let blockNumberUrlSyntax = `?module=proxy&action=eth_blockNumber`
      // special case for blockscout
      if (server.includes('blockscout')) {
        blockNumberUrlSyntax = `?module=block&action=eth_block_number`
      }

      const result = await this.fetchGetEtherscan(server, blockNumberUrlSyntax)
      if (typeof result.result !== 'string') {
        const msg = `Invalid return value eth_blockNumber in ${server}`
        this.ethEngine.error(msg)
        throw new Error(msg)
      }
      return { server, result }
    })

    const { result: jsonObj, server } = await asyncWaterfall(
      shuffleArray(funcs)
    )

    const clean = asEtherscanGetBlockHeight(jsonObj)
    return { blockHeight: clean.result, server }
  }

  async checkBlockHeightRpc(): Promise<EthereumNetworkUpdate> {
    const {
      rpcServers,
      chainParams: { chainId }
    } = this.ethEngine.networkInfo

    const funcs = rpcServers.map(baseUrl => async () => {
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

  checkBlockHeightBlockbook = async (): Promise<EthereumNetworkUpdate> => {
    const { blockbookServers } = this.ethEngine.networkInfo

    try {
      const funcs = blockbookServers.map(server => async () => {
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

  checkBlockHeightBlockchair = async (): Promise<EthereumNetworkUpdate> => {
    try {
      const jsonObj = await this.fetchGetBlockchair(
        `/${this.ethEngine.currencyInfo.pluginId}/stats`,
        false
      )
      const blockHeight = parseInt(
        // @ts-expect-error
        asCheckBlockHeightBlockchair(jsonObj).data.blocks,
        10
      )
      return { blockHeight, server: 'blockchair' }
    } catch (e: any) {
      this.logError(e)
      throw new Error('checkBlockHeightBlockchair returned invalid JSON')
    }
  }

  checkBlockHeightAmberdata = async (): Promise<EthereumNetworkUpdate> => {
    try {
      const jsonObj = await this.fetchPostAmberdataRpc('eth_blockNumber', [])
      const blockHeight = parseInt(asRpcResultString(jsonObj).result, 16)
      return { blockHeight, server: 'amberdata' }
    } catch (e: any) {
      this.logError('checkBlockHeightAmberdata', e)
      throw new Error('checkTxsAmberdata (regular tx) response is invalid')
    }
  }

  checkNonceRpc = async (): Promise<EthereumNetworkUpdate> => {
    const {
      rpcServers,
      chainParams: { chainId }
    } = this.ethEngine.networkInfo

    const address = this.ethEngine.walletLocalData.publicKey

    const funcs = rpcServers.map(baseUrl => async () => {
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

  checkNonceEthscan = async (): Promise<EthereumNetworkUpdate> => {
    const { evmScanApiServers } = this.ethEngine.networkInfo
    const address = this.ethEngine.walletLocalData.publicKey

    const url = `?module=proxy&action=eth_getTransactionCount&address=${address}&tag=latest`
    const funcs = evmScanApiServers.map(server => async () => {
      // if falsy URL then error thrown
      if (!server.includes('etherscan') && !server.includes('blockscout')) {
        throw new Error(
          `Unsupported command eth_getTransactionCount in ${server}`
        )
      }
      const result = await this.fetchGetEtherscan(server, url)
      if (typeof result.result !== 'string') {
        const msg = `Invalid return value eth_getTransactionCount in ${server}`
        this.ethEngine.error(msg)
        throw new Error(msg)
      }
      return { server, result }
    })

    const { result: jsonObj, server } = await asyncWaterfall(
      // Randomize array
      shuffleArray(funcs)
    )
    const clean = asEtherscanGetAccountNonce(jsonObj)
    return { newNonce: clean.result, server }
  }

  checkNonceAmberdata = async (): Promise<EthereumNetworkUpdate> => {
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

  async check(
    method: NetworkAdapterUpdateMethod,
    ...args: any[]
  ): Promise<EthereumNetworkUpdate> {
    return await asyncWaterfall(
      this.qualifyNetworkAdapters(method).map(
        adapter => async () => await adapter[method](...args)
      )
    ).catch(e => {
      return {}
    })
  }

  async getAllTxsEthscan(
    startBlock: number,
    currencyCode: string,
    cleanerFunc: Function,
    options: GetEthscanAllTxsOptions
  ): Promise<GetEthscanAllTxsResponse> {
    const { evmScanApiServers } = this.ethEngine.networkInfo

    const address = this.ethEngine.walletLocalData.publicKey
    let page = 1

    const allTransactions: EdgeTransaction[] = []
    let server: string | undefined
    const contractAddress = options.contractAddress
    const searchRegularTxs = options.searchRegularTxs
    while (true) {
      const offset = NUM_TRANSACTIONS_TO_QUERY

      let startUrl
      if (currencyCode === this.ethEngine.currencyInfo.currencyCode) {
        startUrl = `?action=${
          // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
          searchRegularTxs ? 'txlist' : 'txlistinternal'
        }&module=account`
      } else {
        startUrl = `?action=tokentx&contractaddress=${contractAddress}&module=account`
      }

      const url = `${startUrl}&address=${address}&startblock=${startBlock}&endblock=999999999&sort=asc&page=${page}&offset=${offset}`
      const funcs = evmScanApiServers.map(server => async () => {
        const result = await this.fetchGetEtherscan(server, url)
        if (
          typeof result.result !== 'object' ||
          typeof result.result.length !== 'number'
        ) {
          const msg = `Invalid return value getTransactions in ${server}`
          if (result.result !== 'Max rate limit reached')
            this.ethEngine.error(msg)
          throw new Error(msg)
        }
        return { server, result }
      })

      const response =
        funcs.length > 0
          ? await asyncWaterfall(shuffleArray(funcs))
          : // HACK: If a currency doesn't have an etherscan API compatible
            // server we need to return an empty array
            { result: { result: [] } }

      server = response.server
      const transactions = response.result.result
      for (let i = 0; i < transactions.length; i++) {
        try {
          const cleanedTx = cleanerFunc(transactions[i])
          const tx = await this.processEvmScanTransaction(
            cleanedTx,
            currencyCode
          )
          allTransactions.push(tx)
        } catch (e: any) {
          this.ethEngine.error(
            `getAllTxsEthscan ${cleanerFunc.name}\n${safeErrorMessage(
              e
            )}\n${JSON.stringify(transactions[i])}`
          )
          throw new Error(`getAllTxsEthscan ${cleanerFunc.name} is invalid`)
        }
      }
      if (transactions.length === 0) {
        break
      }
      page++
    }

    return { allTransactions, server }
  }

  checkTxsEthscan = async (
    params: GetTxsParams
  ): Promise<EthereumNetworkUpdate> => {
    const { startBlock, currencyCode } = params
    let server: string
    let allTransactions

    if (currencyCode === this.ethEngine.currencyInfo.currencyCode) {
      const txsRegularResp = await this.getAllTxsEthscan(
        startBlock,
        currencyCode,
        asEvmScanTransaction,
        { searchRegularTxs: true }
      )
      const txsInternalResp = await this.getAllTxsEthscan(
        startBlock,
        currencyCode,
        asEvmScanInternalTransaction,
        { searchRegularTxs: false }
      )
      server = txsRegularResp.server ?? txsInternalResp.server ?? ''
      allTransactions = [
        ...txsRegularResp.allTransactions,
        ...txsInternalResp.allTransactions
      ]
    } else {
      const tokenInfo = this.ethEngine.getTokenInfo(currencyCode)
      if (tokenInfo != null && typeof tokenInfo.contractAddress === 'string') {
        const contractAddress = tokenInfo.contractAddress
        const resp = await this.getAllTxsEthscan(
          startBlock,
          currencyCode,
          asEvmScancanTokenTransaction,
          { contractAddress }
        )
        server = resp.server ?? ''
        allTransactions = resp.allTransactions
      } else {
        return {}
      }
    }

    const edgeTransactionsBlockHeightTuple: EdgeTransactionsBlockHeightTuple = {
      blockHeight: startBlock,
      edgeTransactions: allTransactions
    }
    return {
      tokenTxs: { [currencyCode]: edgeTransactionsBlockHeightTuple },
      server
    }
  }

  /*
   * @returns The currencyCode of the token or undefined if
   * the token is not enabled for this user.
   */
  getTokenCurrencyCode(txnContractAddress: string): string | undefined {
    const address = this.ethEngine.walletLocalData.publicKey
    if (txnContractAddress.toLowerCase() === address.toLowerCase()) {
      return this.ethEngine.currencyInfo.currencyCode
    } else {
      for (const tk of this.ethEngine.enabledTokens) {
        const tokenInfo = this.ethEngine.getTokenInfo(tk)
        if (tokenInfo != null) {
          const tokenContractAddress = tokenInfo.contractAddress
          if (
            txnContractAddress != null &&
            typeof tokenContractAddress === 'string' &&
            tokenContractAddress.toLowerCase() ===
              txnContractAddress.toLowerCase()
          ) {
            return tk
          }
        }
      }
    }
  }

  checkAddressBlockbook = async (): Promise<EthereumNetworkUpdate> => {
    const { blockbookServers } = this.ethEngine.networkInfo

    const address = this.ethEngine.walletLocalData.publicKey.toLowerCase()
    const out: EthereumNetworkUpdate = {
      newNonce: '0',
      tokenBal: {},
      server: ''
    }
    const query = '/api/v2/address/' + address + `?&details=tokenBalances`

    const funcs = blockbookServers.map(server => async () => {
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

  checkTokenBalEthscan = async (tk: string): Promise<EthereumNetworkUpdate> => {
    const { evmScanApiServers } = this.ethEngine.networkInfo

    const address = this.ethEngine.walletLocalData.publicKey
    let response
    let jsonObj
    let server
    let cleanedResponseObj: RpcResultString
    try {
      if (tk === this.ethEngine.currencyInfo.currencyCode) {
        const url = `?module=account&action=balance&address=${address}&tag=latest`
        const funcs = evmScanApiServers.map(server => async () => {
          const result = await this.fetchGetEtherscan(server, url)
          if (typeof result.result !== 'string' || result.result === '') {
            const msg = `Invalid return value eth_getBalance in ${server}`
            this.ethEngine.error(msg)
            throw new Error(msg)
          }
          asIntegerString(result.result)
          return { server, result }
        })
        response = await asyncWaterfall(shuffleArray(funcs))

        jsonObj = response.result
        server = response.server
      } else {
        const tokenInfo = this.ethEngine.getTokenInfo(tk)
        if (
          tokenInfo != null &&
          typeof tokenInfo.contractAddress === 'string'
        ) {
          const contractAddress = tokenInfo.contractAddress

          const url = `?module=account&action=tokenbalance&contractaddress=${contractAddress}&address=${address}&tag=latest`
          const funcs = evmScanApiServers.map(server => async () => {
            const result = await this.fetchGetEtherscan(server, url)
            if (typeof result.result !== 'string' || result.result === '') {
              const msg = `Invalid return value getTokenBalance in ${server}`
              this.ethEngine.error(msg)
              throw new Error(msg)
            }
            return { server, result }
          })
          const response = await asyncWaterfall(shuffleArray(funcs))

          jsonObj = response.result
          server = response.server
        }
      }
      cleanedResponseObj = asRpcResultString(jsonObj)
    } catch (e: any) {
      this.ethEngine.error(
        `checkTokenBalEthscan token ${tk} response ${String(response ?? '')} `,
        e
      )
      throw new Error(
        `checkTokenBalEthscan invalid ${tk} response ${JSON.stringify(jsonObj)}`
      )
    }
    if (/^\d+$/.test(cleanedResponseObj.result)) {
      const balance = cleanedResponseObj.result
      return { tokenBal: { [tk]: balance }, server }
    } else {
      throw new Error(`checkTokenBalEthscan returned invalid JSON for ${tk}`)
    }
  }

  /**
   * Check the eth-balance-checker contract for balances
   */
  checkEthBalChecker = async (): Promise<EthereumNetworkUpdate> => {
    const { allTokensMap, networkInfo, walletLocalData, currencyInfo } =
      this.ethEngine
    const { chainParams, rpcServers, ethBalCheckerContract } = networkInfo

    const tokenBal: { [currencyCode: string]: string } = {}
    if (ethBalCheckerContract == null) return tokenBal

    // Address for querying ETH balance on ETH network, MATIC on MATIC, etc.
    const mainnetAssetAddr = '0x0000000000000000000000000000000000000000'
    const balanceQueryAddrs = [mainnetAssetAddr]
    for (const rawToken of Object.values(this.ethEngine.allTokensMap)) {
      const token = asMaybeContractLocation(rawToken.networkLocation)
      if (token != null) balanceQueryAddrs.unshift(token.contractAddress)
    }

    let funcs: Array<() => Promise<any>> = []
    rpcServers.forEach(rpcServer => {
      let rpcServerWithApiKey: string
      try {
        rpcServerWithApiKey = this.addRpcApiKey(rpcServer)
      } catch (e) {
        // addRpcApiKey can throw if there's a missing apikey. skip this rpcServer
        return
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
    funcs = shuffleArray(funcs)
    const balances = await asyncWaterfall(funcs).catch(e => {
      throw new Error(`All rpc servers failed eth balance checks: ${e}`)
    })

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
            new Error(`checkEthBalChecker missing builtinToken: ${tokenAddr}`)
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

  checkTokenBalBlockchair = async (): Promise<EthereumNetworkUpdate> => {
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

  checkTokenBalRpc = async (tk: string): Promise<EthereumNetworkUpdate> => {
    const {
      rpcServers,
      chainParams: { chainId }
    } = this.ethEngine.networkInfo

    let cleanedResponseObj: RpcResultString
    let response
    let jsonObj
    let server
    const address = this.ethEngine.walletLocalData.publicKey
    try {
      if (tk === this.ethEngine.currencyInfo.currencyCode) {
        const funcs = rpcServers.map(baseUrl => async () => {
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

          const response = await this.multicastServers('eth_call', params)
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

  async checkAndUpdate(
    lastChecked: number,
    pollMillisec: number,
    preUpdateBlockHeight: number,
    checkFunc: () => Promise<EthereumNetworkUpdate>
  ): Promise<void> {
    const now = Date.now()
    if (now - lastChecked > pollMillisec) {
      try {
        const ethUpdate = await checkFunc()
        this.processEthereumNetworkUpdate(now, ethUpdate, preUpdateBlockHeight)
      } catch (e: any) {
        this.ethEngine.error('checkAndUpdate ', e)
      }
    }
  }

  getQueryHeightWithLookback(queryHeight: number): number {
    if (queryHeight > ADDRESS_QUERY_LOOKBACK_BLOCKS) {
      // Only query for transactions as far back as ADDRESS_QUERY_LOOKBACK_BLOCKS from the last time we queried transactions
      return queryHeight - ADDRESS_QUERY_LOOKBACK_BLOCKS
    } else {
      return 0
    }
  }

  getQueryDateWithLookback(date: number): number {
    if (date > ADDRESS_QUERY_LOOKBACK_SEC) {
      // Only query for transactions as far back as ADDRESS_QUERY_LOOKBACK_SEC from the last time we queried transactions
      return date - ADDRESS_QUERY_LOOKBACK_SEC
    } else {
      return 0
    }
  }

  async needsLoop(): Promise<void> {
    while (this.ethEngine.engineOn) {
      const preUpdateBlockHeight = this.ethEngine.walletLocalData.blockHeight
      await this.checkAndUpdate(
        this.ethNeeds.blockHeightLastChecked,
        BLOCKHEIGHT_POLL_MILLISECONDS,
        preUpdateBlockHeight,
        async () => await this.check('blockheight')
      )

      await this.checkAndUpdate(
        this.ethNeeds.nonceLastChecked,
        NONCE_POLL_MILLISECONDS,
        preUpdateBlockHeight,
        async () => await this.check('nonce')
      )

      const { currencyCode } = this.ethEngine.currencyInfo
      const currencyCodes = this.ethEngine.enabledTokens

      if (!currencyCodes.includes(currencyCode)) {
        currencyCodes.push(currencyCode)
      }

      // If this engine supports the batch token balance query, no need to check
      // each currencyCode individually.
      const { ethBalCheckerContract } = this.ethEngine.networkInfo

      if (ethBalCheckerContract != null) {
        await this.checkAndUpdate(
          this.ethNeeds.tokenBalsLastChecked,
          BAL_POLL_MILLISECONDS,
          preUpdateBlockHeight,
          async () => await this.check('tokenBals')
        )
      }

      for (const tk of currencyCodes) {
        // Only check each code individually if this engine does not support
        // batch token balance queries.
        if (ethBalCheckerContract == null) {
          await this.checkAndUpdate(
            this.ethNeeds.tokenBalLastChecked[tk] ?? 0,
            BAL_POLL_MILLISECONDS,
            preUpdateBlockHeight,
            async () => await this.check('tokenBal', tk)
          )
        }

        await this.checkAndUpdate(
          this.ethNeeds.tokenTxsLastChecked[tk] ?? 0,
          TXS_POLL_MILLISECONDS,
          preUpdateBlockHeight,
          async () =>
            await this.check('txs', {
              startBlock: this.getQueryHeightWithLookback(
                this.ethEngine.walletLocalData.lastTransactionQueryHeight[tk]
              ),
              startDate: this.getQueryDateWithLookback(
                this.ethEngine.walletLocalData.lastTransactionDate[tk]
              ),
              currencyCode: tk
            })
        )
      }

      await snooze(1000)
    }
  }

  processEthereumNetworkUpdate = (
    now: number,
    ethereumNetworkUpdate: EthereumNetworkUpdate,
    preUpdateBlockHeight: number
  ): void => {
    if (ethereumNetworkUpdate == null) return
    if (ethereumNetworkUpdate.blockHeight != null) {
      this.ethEngine.log(
        `${
          this.ethEngine.currencyInfo.currencyCode
        } processEthereumNetworkUpdate blockHeight ${
          ethereumNetworkUpdate.server ?? 'no server'
        } won`
      )
      const blockHeight = ethereumNetworkUpdate.blockHeight
      this.ethEngine.log(`Got block height ${blockHeight}`)
      if (
        typeof blockHeight === 'number' &&
        this.ethEngine.walletLocalData.blockHeight !== blockHeight
      ) {
        this.ethNeeds.blockHeightLastChecked = now
        this.ethEngine.checkDroppedTransactionsThrottled()
        this.ethEngine.walletLocalData.blockHeight = blockHeight // Convert to decimal
        this.ethEngine.walletLocalDataDirty = true
        this.ethEngine.currencyEngineCallbacks.onBlockHeightChanged(
          this.ethEngine.walletLocalData.blockHeight
        )
      }
    }

    if (ethereumNetworkUpdate.newNonce != null) {
      this.ethEngine.log(
        `${
          this.ethEngine.currencyInfo.currencyCode
        } processEthereumNetworkUpdate nonce ${
          ethereumNetworkUpdate.server ?? 'no server'
        } won`
      )
      this.ethNeeds.nonceLastChecked = now
      this.ethEngine.otherData.nextNonce = ethereumNetworkUpdate.newNonce
      this.ethEngine.walletLocalDataDirty = true
    }

    if (ethereumNetworkUpdate.tokenBal != null) {
      const tokenBal = ethereumNetworkUpdate.tokenBal
      this.ethEngine.log(
        `${
          this.ethEngine.currencyInfo.currencyCode
        } processEthereumNetworkUpdate tokenBal ${
          ethereumNetworkUpdate.server ?? 'no server'
        } won`
      )
      for (const tk of Object.keys(tokenBal)) {
        this.ethNeeds.tokenBalLastChecked[tk] = now
        this.ethEngine.updateBalance(tk, tokenBal[tk])
      }
      this.ethNeeds.tokenBalsLastChecked = now
    }

    if (ethereumNetworkUpdate.tokenTxs != null) {
      const tokenTxs = ethereumNetworkUpdate.tokenTxs
      this.ethEngine.log(
        `${
          this.ethEngine.currencyInfo.currencyCode
        } processEthereumNetworkUpdate tokenTxs ${
          ethereumNetworkUpdate.server ?? 'no server'
        } won`
      )
      for (const tk of Object.keys(tokenTxs)) {
        this.ethNeeds.tokenTxsLastChecked[tk] = now
        this.ethEngine.tokenCheckTransactionsStatus[tk] = 1
        const tuple: EdgeTransactionsBlockHeightTuple = tokenTxs[tk]
        for (const tx of tuple.edgeTransactions) {
          this.ethEngine.addTransaction(tk, tx)
        }
        this.ethEngine.walletLocalData.lastTransactionQueryHeight[tk] =
          preUpdateBlockHeight
        this.ethEngine.walletLocalData.lastTransactionDate[tk] = now
      }
      this.ethEngine.updateOnAddressesChecked()
    }

    if (this.ethEngine.transactionsChangedArray.length > 0) {
      this.ethEngine.currencyEngineCallbacks.onTransactionsChanged(
        this.ethEngine.transactionsChangedArray
      )
      this.ethEngine.transactionsChangedArray = []
    }
  }

  buildNetworkAdapters(settings: EthereumNetworkInfo): NetworkAdapter[] {
    const {
      rpcServers,
      evmScanApiServers,
      blockbookServers,
      blockchairApiServers,
      amberdataRpcServers,
      amberdataApiServers,
      ethBalCheckerContract
    } = settings
    const networkAdapters: NetworkAdapter[] = []

    if (evmScanApiServers.length > 0) {
      networkAdapters.push({
        blockheight: this.checkBlockHeightEthscan,
        nonce: this.checkNonceEthscan,
        tokenBal: this.checkTokenBalEthscan
      })
    }
    // We'll fake it if we don't have a server
    networkAdapters.push({
      txs: this.checkTxsEthscan
    })
    if (blockbookServers.length > 0) {
      networkAdapters.push({
        blockheight: this.checkBlockHeightBlockbook,
        tokenBal: this.checkAddressBlockbook,
        nonce: this.checkAddressBlockbook
      })
    }
    if (blockchairApiServers.length > 0) {
      networkAdapters.push({
        blockheight: this.checkBlockHeightBlockchair,
        tokenBal: this.checkTokenBalBlockchair
      })
    }
    if (amberdataRpcServers.length > 0) {
      networkAdapters.push({
        blockheight: this.checkBlockHeightAmberdata,
        nonce: this.checkNonceAmberdata
      })
    }
    if (amberdataApiServers.length > 0) {
      // networkAdapters.push({
      //   txs: this.checkTxsAmberdata
      // })
    }
    if (rpcServers.length > 0) {
      networkAdapters.push({
        blockheight: this.checkBlockHeightRpc,
        nonce: this.checkNonceRpc,
        tokenBal: this.checkTokenBalRpc
      })
    }
    if (ethBalCheckerContract != null) {
      networkAdapters.push({
        tokenBals: this.checkEthBalChecker
      })
    }

    return networkAdapters
  }

  /**
   * Returns only the network adapters that contain the requested method.
   */
  qualifyNetworkAdapters<Method extends keyof NetworkAdapter>(
    ...methods: Method[]
  ): Array<Required<Pick<NetworkAdapter, Method>> & NetworkAdapter> {
    return this.networkAdapters.filter((adapter): adapter is Required<
      Pick<NetworkAdapter, Method>
    > &
      NetworkAdapter => methods.every(method => adapter[method] != null))
  }

  // TODO: Convert to error types
  throwError(res: FetchResponse, funcName: string, url: string): void {
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

  logError(funcName: string, e?: Error): void {
    safeErrorMessage(e).includes('rateLimited')
      ? this.ethEngine.log(funcName, e)
      : this.ethEngine.error(funcName, e)
  }
}
