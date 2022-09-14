import { add, div, mul, sub } from 'biggystring'
import {
  EdgeCurrencyInfo,
  EdgeTransaction,
  JsonObject
  // @ts-expect-error
} from 'edge-core-js/src/types/types'
import { FetchResponse } from 'serverlet'
import parse from 'url-parse'

import {
  asyncWaterfall,
  cleanTxLogs,
  hexToDecimal,
  isHex,
  padHex,
  pickRandom,
  promiseAny,
  removeHexPrefix,
  safeErrorMessage,
  shuffleArray,
  snooze,
  validateObject
} from '../common/utils'
import { WEI_MULTIPLIER } from './ethConsts'
import { EthereumEngine } from './ethEngine'
import { EtherscanGetAccountNonce, EtherscanGetBlockHeight } from './ethSchema'
import {
  AlethioTokenTransfer,
  asBlockbookAddress,
  asBlockbookBlockHeight,
  asBlockbookTokenBalance,
  asBlockChairAddress,
  asCheckBlockHeightBlockchair,
  asCheckTokenBalBlockchair,
  asEvmScancanTokenTransaction,
  asEvmScanInternalTransaction,
  asEvmScanTransaction,
  asRpcResultString,
  BlockbookAddress,
  BlockbookTokenBalance,
  CheckTokenBalBlockchair,
  EthereumSettings,
  EthereumTxOtherParams,
  EvmScanInternalTransaction,
  EvmScanTransaction,
  RpcResultString
} from './ethTypes'
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
  | 'eth_blockNumber'
  | 'eth_call'
  | 'eth_getTransactionCount'
  | 'eth_getBalance'
  | 'eth_estimateGas'
  | 'getTokenBalance'
  | 'getTransactions'
  | 'eth_getCode'
  | 'blockbookBlockHeight'
  | 'blockbookAddress'

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
  server: string
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
async function broadcastWrapper(promise: Promise<Object>, server: string) {
  const out = {
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

type UpdateMethods = 'blockheight' | 'nonce' | 'tokenBal' | 'txs'

interface QueryFuncs {
  // @ts-expect-error
  [method: UpdateMethods]: (
    ...args: any
  ) => Array<Promise<EthereumNetworkUpdate>>
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
 * @returns {object} A `feeRateUsed` object to be included in an `EdgeTransaction`
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const getFeeRateUsed = (
  gasPrice: string,
  gasLimit: string,
  gasUsed?: string
) => {
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
  // @ts-expect-error
  fetchGetEtherscan: (...any) => any
  // @ts-expect-error
  multicastServers: (...any) => any
  // @ts-expect-error
  checkBlockHeightEthscan: (...any) => any
  // @ts-expect-error
  checkBlockHeightBlockchair: (...any) => any
  // @ts-expect-error
  checkBlockHeightAmberdata: (...any) => any
  // @ts-expect-error
  checkBlockHeightBlockbook: (...any) => any
  // @ts-expect-error
  checkAddressBlockbook: (...any) => any
  // @ts-expect-error
  checkNonceEthscan: (...any) => any
  // @ts-expect-error
  checkNonceAmberdata: (...any) => any
  // @ts-expect-error
  checkTokenBalEthscan: (...any) => any
  // @ts-expect-error
  checkTokenBalBlockchair: (...any) => any
  // @ts-expect-error
  checkTokenBalRpc: (...any) => any
  // @ts-expect-error
  checkTxsEthscan: (...any) => any
  // @ts-expect-error
  processEthereumNetworkUpdate: (...any) => any
  // @ts-expect-error
  checkTxsAmberdata: (...any) => any
  currencyInfo: EdgeCurrencyInfo
  queryFuncs: QueryFuncs

  constructor(ethEngine: EthereumEngine, currencyInfo: EdgeCurrencyInfo) {
    this.ethEngine = ethEngine
    this.ethNeeds = {
      blockHeightLastChecked: 0,
      nonceLastChecked: 0,
      tokenBalLastChecked: {},
      tokenTxsLastChecked: {}
    }
    this.currencyInfo = currencyInfo
    // @ts-expect-error
    this.fetchGetEtherscan = this.fetchGetEtherscan.bind(this)
    // @ts-expect-error
    this.multicastServers = this.multicastServers.bind(this)
    // @ts-expect-error
    this.checkAddressBlockbook = this.checkAddressBlockbook.bind(this)
    // @ts-expect-error
    this.checkBlockHeightEthscan = this.checkBlockHeightEthscan.bind(this)
    // @ts-expect-error
    this.checkBlockHeightBlockchair = this.checkBlockHeightBlockchair.bind(this)
    // @ts-expect-error
    this.checkBlockHeightAmberdata = this.checkBlockHeightAmberdata.bind(this)
    // @ts-expect-error
    this.checkBlockHeightBlockbook = this.checkBlockHeightBlockbook.bind(this)
    // @ts-expect-error
    this.checkNonceEthscan = this.checkNonceEthscan.bind(this)
    // @ts-expect-error
    this.checkNonceAmberdata = this.checkNonceAmberdata.bind(this)
    // @ts-expect-error
    this.checkTokenBalEthscan = this.checkTokenBalEthscan.bind(this)
    // @ts-expect-error
    this.checkTokenBalBlockchair = this.checkTokenBalBlockchair.bind(this)
    // @ts-expect-error
    this.checkTokenBalRpc = this.checkTokenBalRpc.bind(this)
    // @ts-expect-error
    this.checkTxsEthscan = this.checkTxsEthscan.bind(this)
    this.processEthereumNetworkUpdate =
      // @ts-expect-error
      this.processEthereumNetworkUpdate.bind(this)
    this.queryFuncs = this.buildQueryFuncs(
      currencyInfo.defaultSettings.otherSettings
    )
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  processEvmScanTransaction(
    tx: EvmScanTransaction | EvmScanInternalTransaction,
    currencyCode: string
  ) {
    let netNativeAmount: string // Amount received into wallet
    const ourReceiveAddresses: string[] = []
    let nativeNetworkFee: string = '0'
    const tokenTx = currencyCode !== this.ethEngine.currencyInfo.currencyCode

    // @ts-expect-error
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (!tx.contractAddress && tx.gasPrice) {
      // @ts-expect-error
      nativeNetworkFee = mul(tx.gasPrice, tx.gasUsed)
    }

    const isSpend =
      tx.from.toLowerCase() ===
      this.ethEngine.walletLocalData.publicKey.toLowerCase()

    if (isSpend) {
      if (tx.from.toLowerCase() === tx.to.toLowerCase()) {
        // Spend to self. netNativeAmount is just the fee
        netNativeAmount = mul(nativeNetworkFee, '-1')
      } else {
        // spend to someone else
        netNativeAmount = sub('0', tx.value)

        // For spends, include the network fee in the transaction amount if not a token tx
        if (!tokenTx) {
          netNativeAmount = sub(netNativeAmount, nativeNetworkFee)
        }
      }
    } else {
      // Receive transaction
      netNativeAmount = add('0', tx.value)
      ourReceiveAddresses.push(
        this.ethEngine.walletLocalData.publicKey.toLowerCase()
      )
    }

    const otherParams: EthereumTxOtherParams = {
      from: [tx.from],
      to: [tx.to],
      gas: tx.gas,
      // @ts-expect-error
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      gasPrice: tx.gasPrice || '',
      gasUsed: tx.gasUsed
    }

    let blockHeight = parseInt(tx.blockNumber)
    if (blockHeight < 0) blockHeight = 0
    let txid
    if (tx.hash != null) {
      txid = tx.hash
    } else if (tx.transactionHash != null) {
      txid = tx.transactionHash
    } else {
      throw new Error('Invalid transaction result format')
    }

    let parentNetworkFee
    let networkFee = '0'
    if (tokenTx && isSpend) {
      parentNetworkFee = nativeNetworkFee
    } else {
      networkFee = nativeNetworkFee
    }

    const edgeTransaction: EdgeTransaction = {
      txid,
      date: parseInt(tx.timeStamp),
      currencyCode,
      blockHeight,
      nativeAmount: netNativeAmount,
      networkFee,
      feeRateUsed:
        // @ts-expect-error
        tx.gasPrice != null
          ? // @ts-expect-error
            getFeeRateUsed(tx.gasPrice, tx.gas, tx.gasUsed)
          : undefined,
      parentNetworkFee,
      ourReceiveAddresses,
      signedTx: '',
      otherParams
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
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    const fee = tokenTransfer.attributes.fee
      ? tokenTransfer.attributes.fee
      : '0'
    const fromAddress = tokenTransfer.relationships.from.data.id
    const toAddress = tokenTransfer.relationships.to.data.id

    if (currencyCode === this.currencyInfo.currencyCode) {
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
      gasUsed: '0'
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
      txid: tokenTransfer.relationships.transaction.data.id,
      date: tokenTransfer.attributes.blockCreationTime,
      currencyCode,
      blockHeight,
      nativeAmount: netNativeAmount,
      networkFee,
      ourReceiveAddresses,
      signedTx: '',
      parentNetworkFee,
      otherParams
    }

    return edgeTransaction
  }

  // @ts-expect-error
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  async fetchGetEtherscan(server: string, cmd: string) {
    const scanApiKey = getEvmScanApiKey(
      this.ethEngine.initOptions,
      this.currencyInfo,
      this.ethEngine.log
    )
    const apiKey = `&apikey=${
      Array.isArray(scanApiKey)
        ? pickRandom(scanApiKey, 1)[0]
        : scanApiKey ?? ''
    }`

    const url = `${server}/api${cmd}`
    const response = await this.ethEngine.io.fetch(`${url}${apiKey}`)
    if (!response.ok) this.throwError(response, 'fetchGetEtherscan', url)
    return await response.json()
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  async fetchGetBlockbook(server: string, param: string) {
    const url = server + param
    const resultRaw = !server.includes('trezor')
      ? await this.ethEngine.io.fetch(url)
      : await this.ethEngine.fetchCors(url, {
          headers: { 'User-Agent': 'http.agent' }
        })
    return await resultRaw.json()
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  async fetchPostRPC(
    method: string,
    params: Object,
    networkId: number,
    url: string
  ) {
    const body = {
      id: networkId,
      jsonrpc: '2.0',
      method,
      params
    }

    let addOnUrl = ''
    if (url.includes('infura')) {
      const { infuraProjectId } = this.ethEngine.initOptions
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      if (!infuraProjectId || infuraProjectId.length < 6) {
        throw new Error('Need Infura Project ID')
      }
      addOnUrl = `/${infuraProjectId}`
    } else if (url.includes('alchemyapi')) {
      const { alchemyApiKey } = this.ethEngine.initOptions
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      if (!alchemyApiKey || alchemyApiKey.length < 6) {
        throw new Error('Need Alchemy API key')
      }
      addOnUrl = `/v2/-${alchemyApiKey}`
    } else if (url.includes('quiknode')) {
      const { quiknodeApiKey } = this.ethEngine.initOptions
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      if (!quiknodeApiKey || quiknodeApiKey.length < 6) {
        throw new Error('Need Quiknode API key')
      }
      addOnUrl = `/${quiknodeApiKey}/`
    }
    url += addOnUrl

    const response = await this.ethEngine.io.fetch(url, {
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

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  async fetchPostBlockcypher(cmd: string, body: any, baseUrl: string) {
    const { blockcypherApiKey } = this.ethEngine.initOptions
    let apiKey = ''
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (blockcypherApiKey && blockcypherApiKey.length > 5) {
      apiKey = '&token=' + blockcypherApiKey
    }

    const url = `${baseUrl}/${cmd}${apiKey}`
    const response = await this.ethEngine.io.fetch(url, {
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

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  async fetchGetBlockchair(path: string, includeKey: boolean = false) {
    const { blockchairApiKey } = this.ethEngine.initOptions
    const { blockchairApiServers } =
      this.currencyInfo.defaultSettings.otherSettings

    const keyParam =
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      includeKey && blockchairApiKey ? `&key=${blockchairApiKey}` : ''
    const url = `${blockchairApiServers[0]}${path}`
    const response = await this.ethEngine.io.fetch(`${url}${keyParam}`)
    if (!response.ok) this.throwError(response, 'fetchGetBlockchair', url)
    return await response.json()
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  async fetchPostAmberdataRpc(method: string, params: string[] = []) {
    const { amberdataApiKey = '' } = this.ethEngine.initOptions
    const { amberdataRpcServers } =
      this.currencyInfo.defaultSettings.otherSettings

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
          this.currencyInfo.defaultSettings.otherSettings.amberDataBlockchainId,
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

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  async fetchGetAmberdataApi(path: string) {
    const { amberdataApiKey = '' } = this.ethEngine.initOptions
    const { amberdataApiServers } =
      this.currencyInfo.defaultSettings.otherSettings
    const url = `${amberdataApiServers[0]}${path}`
    const response = await this.ethEngine.fetchCors(url, {
      headers: {
        'x-amberdata-blockchain-id':
          this.currencyInfo.defaultSettings.otherSettings.amberDataBlockchainId,
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

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  async fetchGetAlethio(
    pathOrLink: string,
    // eslint-disable-next-line @typescript-eslint/default-param-last
    isPath: boolean = true,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    useApiKey: boolean
  ) {
    const { alethioApiKey = '' } = this.ethEngine.initOptions
    const { alethioApiServers } =
      this.currencyInfo.defaultSettings.otherSettings
    const url = isPath ? `${alethioApiServers[0]}${pathOrLink}` : pathOrLink

    const response = await this.ethEngine.io.fetch(
      url,
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      alethioApiKey
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
    const urlSuffix = `v1/${this.currencyInfo.currencyCode.toLowerCase()}/main/txs/push`
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

  // @ts-expect-error
  async multicastServers(func: EthFunction, ...params: any): Promise<any> {
    const otherSettings: EthereumSettings =
      this.currencyInfo.defaultSettings.otherSettings
    const {
      rpcServers,
      blockcypherApiServers,
      evmScanApiServers,
      blockbookServers,
      chainParams
    } = otherSettings
    const { chainId } = chainParams
    let out = { result: '', server: 'no server' }
    // @ts-expect-error
    let funcs, url
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
          `${this.currencyInfo.currencyCode} multicastServers ${func} ${out.server} won`
        )
        break
      }

      case 'eth_blockNumber':
        funcs = evmScanApiServers.map(server => async () => {
          if (!server.includes('etherscan') && !server.includes('blockscout')) {
            throw new Error(`Unsupported command eth_blockNumber in ${server}`)
          }
          let blockNumberUrlSyntax = `?module=proxy&action=eth_blockNumber`
          // special case for blockscout
          if (server.includes('blockscout')) {
            blockNumberUrlSyntax = `?module=block&action=eth_block_number`
          }

          const result = await this.fetchGetEtherscan(
            server,
            blockNumberUrlSyntax
          )
          if (typeof result.result !== 'string') {
            const msg = `Invalid return value eth_blockNumber in ${server}`
            this.ethEngine.error(msg)
            throw new Error(msg)
          }
          return { server, result }
        })

        funcs.push(
          ...rpcServers.map(baseUrl => async () => {
            const result = await this.fetchPostRPC(
              'eth_blockNumber',
              [],
              chainId,
              baseUrl
            )
            // Check if successful http response was actually an error
            if (result.error != null) {
              this.ethEngine.error(
                `Successful eth_blockNumber response object from ${baseUrl} included an error ${result.error}`
              )
              throw new Error(
                'Successful eth_blockNumber response object included an error'
              )
            }
            return { server: parse(baseUrl).hostname, result }
          })
        )

        // Randomize array
        funcs = shuffleArray(funcs)
        out = await asyncWaterfall(funcs)
        break

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
              `Successful eth_estimateGas response object from ${baseUrl} included an error ${result.error}`
            )
            throw new Error(
              'Successful eth_estimateGas response object included an error'
            )
          }
          return { server: parse(baseUrl).hostname, result }
        })

        out = await asyncWaterfall(funcs)
        break

      case 'eth_getCode':
        funcs = rpcServers.map(baseUrl => async () => {
          const result = await this.fetchPostRPC(
            'eth_getCode',
            params[0],
            chainId,
            baseUrl
          )
          // Check if successful http response was actually an error
          if (result.error != null) {
            this.ethEngine.error(
              `Successful eth_getCode response object from ${baseUrl} included an error ${result.error}`
            )
            throw new Error(
              'Successful eth_getCode response object included an error'
            )
          }
          return { server: parse(baseUrl).hostname, result }
        })

        out = await asyncWaterfall(funcs)
        break

      case 'eth_getTransactionCount':
        url = `?module=proxy&action=eth_getTransactionCount&address=${params[0]}&tag=latest`
        funcs = evmScanApiServers.map(server => async () => {
          // if falsy URL then error thrown
          if (!server.includes('etherscan') && !server.includes('blockscout')) {
            throw new Error(
              `Unsupported command eth_getTransactionCount in ${server}`
            )
          }
          // @ts-expect-error
          const result = await this.fetchGetEtherscan(server, url)
          if (typeof result.result !== 'string') {
            const msg = `Invalid return value eth_getTransactionCount in ${server}`
            this.ethEngine.error(msg)
            throw new Error(msg)
          }
          return { server, result }
        })

        funcs.push(
          ...rpcServers.map(baseUrl => async () => {
            const result = await this.fetchPostRPC(
              'eth_getTransactionCount',
              [params[0], 'latest'],
              chainId,
              baseUrl
            )
            // Check if successful http response was actually an error
            if (result.error != null) {
              this.ethEngine.error(
                `Successful eth_getTransactionCount response object from ${baseUrl} included an error ${result.error}`
              )
              throw new Error(
                'Successful eth_getTransactionCount response object included an error'
              )
            }
            return { server: parse(baseUrl).hostname, result }
          })
        )

        // Randomize array
        funcs = shuffleArray(funcs)
        out = await asyncWaterfall(funcs)
        break

      case 'eth_getBalance':
        url = `?module=account&action=balance&address=${params[0]}&tag=latest`
        funcs = evmScanApiServers.map(server => async () => {
          // @ts-expect-error
          const result = await this.fetchGetEtherscan(server, url)
          // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
          if (!result.result || typeof result.result !== 'string') {
            const msg = `Invalid return value eth_getBalance in ${server}`
            this.ethEngine.error(msg)
            throw new Error(msg)
          }
          return { server, result }
        })

        funcs.push(
          ...rpcServers.map(baseUrl => async () => {
            const result = await this.fetchPostRPC(
              'eth_getBalance',
              [params[0], 'latest'],
              chainId,
              baseUrl
            )
            // Check if successful http response was actually an error
            if (result.error != null) {
              this.ethEngine.error(
                `Successful eth_getBalance response object from ${baseUrl} included an error ${result.error}`
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
            result.result = add(result.result, '0')
            return { server: parse(baseUrl).hostname, result }
          })
        )

        // Randomize array
        funcs = shuffleArray(funcs)
        out = await asyncWaterfall(funcs)
        break

      case 'getTokenBalance':
        url = `?module=account&action=tokenbalance&contractaddress=${params[1]}&address=${params[0]}&tag=latest`
        funcs = evmScanApiServers.map(server => async () => {
          // @ts-expect-error
          const result = await this.fetchGetEtherscan(server, url)
          // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
          if (!result.result || typeof result.result !== 'string') {
            const msg = `Invalid return value getTokenBalance in ${server}`
            this.ethEngine.error(msg)
            throw new Error(msg)
          }
          return { server, result }
        })
        // Randomize array
        funcs = shuffleArray(funcs)
        out = await asyncWaterfall(funcs)
        break

      case 'getTransactions': {
        const {
          currencyCode,
          address,
          startBlock,
          page,
          offset,
          contractAddress,
          searchRegularTxs
        } = params[0]
        let startUrl
        if (currencyCode === this.currencyInfo.currencyCode) {
          startUrl = `?action=${
            // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
            searchRegularTxs ? 'txlist' : 'txlistinternal'
          }&module=account`
        } else {
          startUrl = `?action=tokentx&contractaddress=${contractAddress}&module=account`
        }
        url = `${startUrl}&address=${address}&startblock=${startBlock}&endblock=999999999&sort=asc&page=${page}&offset=${offset}`
        funcs = evmScanApiServers.map(server => async () => {
          // @ts-expect-error
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
        // Randomize array
        funcs = shuffleArray(funcs)
        out = await asyncWaterfall(funcs)
        break
      }

      case 'blockbookBlockHeight':
        funcs = blockbookServers.map(server => async () => {
          const result = await this.fetchGetBlockbook(server, params[0])
          return { server, result }
        })
        // Randomize array
        funcs = shuffleArray(funcs)
        out = await asyncWaterfall(funcs)
        break

      case 'blockbookAddress':
        funcs = blockbookServers.map(server => async () => {
          const result = await this.fetchGetBlockbook(server, params[0])
          return { server, result }
        })
        // Randomize array
        funcs = shuffleArray(funcs)
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
              `Successful eth_call response object from ${baseUrl} included an error ${result.error}`
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

  async getBaseFeePerGas(): Promise<{ baseFeePerGas: string | undefined }> {
    const {
      rpcServers,
      chainParams: { chainId }
    } = this.currencyInfo.defaultSettings.otherSettings

    const funcs = rpcServers.map(
      // @ts-expect-error
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

          return { baseFeePerGas }
        })
    )

    return await asyncWaterfall(funcs)
  }

  // @ts-expect-error
  async checkBlockHeightEthscan(): Promise<EthereumNetworkUpdate> {
    const { result: jsonObj, server } = await this.multicastServers(
      'eth_blockNumber'
    )
    const valid = validateObject(jsonObj, EtherscanGetBlockHeight)
    if (valid && /0[xX][0-9a-fA-F]+/.test(jsonObj.result)) {
      const blockHeight = parseInt(jsonObj.result, 16)
      return { blockHeight, server }
    } else {
      throw new Error('Ethscan returned invalid JSON')
    }
  }

  // @ts-expect-error
  async checkBlockHeightBlockbook(): Promise<EthereumNetworkUpdate> {
    try {
      const { result: jsonObj, server } = await this.multicastServers(
        'blockbookBlockHeight',
        '/api/v2'
      )

      const blockHeight = asBlockbookBlockHeight(jsonObj).blockbook.bestHeight
      return { blockHeight, server }
    } catch (e: any) {
      this.ethEngine.log('checkBlockHeightBlockbook blockHeight ', e)
      throw new Error(`checkBlockHeightBlockbook returned invalid JSON`)
    }
  }

  // @ts-expect-error
  async checkBlockHeightBlockchair(): Promise<EthereumNetworkUpdate> {
    try {
      const jsonObj = await this.fetchGetBlockchair(
        `/${this.currencyInfo.pluginId}/stats`,
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

  // @ts-expect-error
  async checkBlockHeightAmberdata(): Promise<EthereumNetworkUpdate> {
    try {
      const jsonObj = await this.fetchPostAmberdataRpc('eth_blockNumber', [])
      const blockHeight = parseInt(asRpcResultString(jsonObj).result, 16)
      return { blockHeight, server: 'amberdata' }
    } catch (e: any) {
      this.logError('checkBlockHeightAmberdata', e)
      throw new Error('checkTxsAmberdata (regular tx) response is invalid')
    }
  }

  // @ts-expect-error
  async checkNonceEthscan(): Promise<EthereumNetworkUpdate> {
    const address = this.ethEngine.walletLocalData.publicKey
    const { result: jsonObj, server } = await this.multicastServers(
      'eth_getTransactionCount',
      address
    )
    const valid = validateObject(jsonObj, EtherscanGetAccountNonce)
    if (valid && /0[xX][0-9a-fA-F]+/.test(jsonObj.result)) {
      const newNonce = add('0', jsonObj.result)
      return { newNonce, server }
    } else {
      throw new Error('Ethscan returned invalid JSON')
    }
  }

  // @ts-expect-error
  async checkNonceAmberdata(): Promise<EthereumNetworkUpdate> {
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
    method: UpdateMethods,
    ...args: any
  ): Promise<EthereumNetworkUpdate> {
    return await asyncWaterfall(
      // @ts-expect-error
      // eslint-disable-next-line @typescript-eslint/return-await
      this.queryFuncs[method].map(func => async () => await func(...args))
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    const address = this.ethEngine.walletLocalData.publicKey
    let page = 1

    const allTransactions: EdgeTransaction[] = []
    let server: string = ''
    const contractAddress = options.contractAddress
    const searchRegularTxs = options.searchRegularTxs
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    while (1) {
      const offset = NUM_TRANSACTIONS_TO_QUERY
      const response = await this.multicastServers('getTransactions', {
        currencyCode,
        address,
        startBlock,
        page,
        offset,
        contractAddress,
        searchRegularTxs
      })
      server = response.server
      const transactions = response.result.result
      for (let i = 0; i < transactions.length; i++) {
        try {
          const cleanedTx = cleanerFunc(transactions[i])
          const tx = this.processEvmScanTransaction(cleanedTx, currencyCode)
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

  // @ts-expect-error
  async checkTxsEthscan(params: GetTxsParams): Promise<EthereumNetworkUpdate> {
    const { startBlock, currencyCode } = params
    let server
    let allTransactions

    if (currencyCode === this.currencyInfo.currencyCode) {
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
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      server = txsRegularResp.server || txsInternalResp.server
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
        server = resp.server
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
      return this.currencyInfo.currencyCode
    } else {
      for (const tk of this.ethEngine.enabledTokens) {
        const tokenInfo = this.ethEngine.getTokenInfo(tk)
        if (tokenInfo != null) {
          const tokenContractAddress = tokenInfo.contractAddress
          if (
            // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
            txnContractAddress &&
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

  // @ts-expect-error
  async checkAddressBlockbook(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    params: GetTxsParams
  ): Promise<EthereumNetworkUpdate> {
    const address = this.ethEngine.walletLocalData.publicKey.toLowerCase()
    const out = {
      newNonce: '0',
      tokenBal: {},
      server: ''
    }
    const query = '/api/v2/address/' + address + `?&details=tokenBalances`
    const { result: jsonObj, server } = await this.multicastServers(
      'blockbookAddress',
      query
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
    // @ts-expect-error
    out.tokenBal[this.currencyInfo.currencyCode] = balance
    out.server = server

    // Token balances
    // @ts-expect-error
    for (const token: BlockbookTokenBalance of tokens) {
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

  // @ts-expect-error
  async checkTokenBalEthscan(tk: string): Promise<EthereumNetworkUpdate> {
    const address = this.ethEngine.walletLocalData.publicKey
    let response
    let jsonObj
    let server
    let cleanedResponseObj: RpcResultString
    try {
      if (tk === this.currencyInfo.currencyCode) {
        response = await this.multicastServers('eth_getBalance', address)
        jsonObj = response.result
        server = response.server
      } else {
        const tokenInfo = this.ethEngine.getTokenInfo(tk)
        if (
          tokenInfo != null &&
          typeof tokenInfo.contractAddress === 'string'
        ) {
          const contractAddress = tokenInfo.contractAddress
          const response = await this.multicastServers(
            'getTokenBalance',
            address,
            contractAddress
          )
          jsonObj = response.result
          server = response.server
        }
      }
      cleanedResponseObj = asRpcResultString(jsonObj)
    } catch (e: any) {
      this.ethEngine.error(
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
        `checkTokenBalEthscan token ${tk} response ${response || ''} `,
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

  // @ts-expect-error
  async checkTokenBalBlockchair(): Promise<EthereumNetworkUpdate> {
    let cleanedResponseObj: CheckTokenBalBlockchair
    const address = this.ethEngine.walletLocalData.publicKey
    const path = `/${this.currencyInfo.pluginId}/dashboards/address/${address}?erc_20=true`
    try {
      const jsonObj = await this.fetchGetBlockchair(path, true)
      cleanedResponseObj = asCheckTokenBalBlockchair(jsonObj)
    } catch (e: any) {
      this.logError('checkTokenBalBlockchair', e)
      throw new Error('checkTokenBalBlockchair response is invalid')
    }
    const response = {
      [this.currencyInfo.currencyCode]:
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
          // @ts-expect-error
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

  // @ts-expect-error
  async checkTokenBalRpc(tk: string): Promise<EthereumNetworkUpdate> {
    // eth_call cannot be used to query mainnet currency code balance
    if (tk === this.currencyInfo.currencyCode) return {}
    let cleanedResponseObj: RpcResultString
    let response
    let jsonObj
    let server
    const address = this.ethEngine.walletLocalData.publicKey
    try {
      const tokenInfo = this.ethEngine.getTokenInfo(tk)
      if (tokenInfo != null && typeof tokenInfo.contractAddress === 'string') {
        const params = {
          data: `0x70a08231${padHex(removeHexPrefix(address), 32)}`,
          to: tokenInfo.contractAddress
        }

        const response = await this.multicastServers('eth_call', params)
        jsonObj = response.result
        server = response.server
      }

      cleanedResponseObj = asRpcResultString(jsonObj)
    } catch (e: any) {
      this.ethEngine.error(
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-nullish-coalescing
        `checkTokenBalRpc token ${tk} response ${response || ''} `,
        e
      )
      throw new Error(
        `checkTokenBalRpc invalid ${tk} response ${JSON.stringify(jsonObj)}`
      )
    }
    if (isHex(cleanedResponseObj.result)) {
      return {
        tokenBal: { [tk]: hexToDecimal(cleanedResponseObj.result) },
        server
      }
    } else {
      throw new Error(`checkTokenBalRpc returned invalid JSON for ${tk}`)
    }
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  async checkAndUpdate(
    // eslint-disable-next-line @typescript-eslint/default-param-last
    lastChecked: number = 0,
    pollMillisec: number,
    preUpdateBlockHeight: number,
    checkFunc: () => Promise<EthereumNetworkUpdate>
  ) {
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

      const { currencyCode } = this.currencyInfo
      const currencyCodes = this.ethEngine.enabledTokens

      if (!currencyCodes.includes(currencyCode)) {
        currencyCodes.push(currencyCode)
      }

      for (const tk of currencyCodes) {
        await this.checkAndUpdate(
          this.ethNeeds.tokenBalLastChecked[tk],
          BAL_POLL_MILLISECONDS,
          preUpdateBlockHeight,
          async () => await this.check('tokenBal', tk)
        )

        await this.checkAndUpdate(
          this.ethNeeds.tokenTxsLastChecked[tk],
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

  // @ts-expect-error
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  processEthereumNetworkUpdate(
    now: number,
    ethereumNetworkUpdate: EthereumNetworkUpdate,
    preUpdateBlockHeight: number
  ) {
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (!ethereumNetworkUpdate) return
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (ethereumNetworkUpdate.blockHeight) {
      this.ethEngine.log(
        `${
          this.currencyInfo.currencyCode
        } processEthereumNetworkUpdate blockHeight ${
          // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-nullish-coalescing
          ethereumNetworkUpdate.server || 'no server'
        } won`
      )
      const blockHeight = ethereumNetworkUpdate.blockHeight
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      this.ethEngine.log(`Got block height ${blockHeight || 'no blockheight'}`)
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

    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (ethereumNetworkUpdate.newNonce) {
      this.ethEngine.log(
        `${this.currencyInfo.currencyCode} processEthereumNetworkUpdate nonce ${
          // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-nullish-coalescing
          ethereumNetworkUpdate.server || 'no server'
        } won`
      )
      this.ethNeeds.nonceLastChecked = now
      // @ts-expect-error
      this.ethEngine.walletLocalData.otherData.nextNonce =
        ethereumNetworkUpdate.newNonce
      this.ethEngine.walletLocalDataDirty = true
    }

    if (ethereumNetworkUpdate.tokenBal != null) {
      const tokenBal = ethereumNetworkUpdate.tokenBal
      this.ethEngine.log(
        `${
          this.currencyInfo.currencyCode
        } processEthereumNetworkUpdate tokenBal ${
          // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-nullish-coalescing
          ethereumNetworkUpdate.server || 'no server'
        } won`
      )
      for (const tk of Object.keys(tokenBal)) {
        this.ethNeeds.tokenBalLastChecked[tk] = now
        this.ethEngine.updateBalance(tk, tokenBal[tk])
      }
    }

    if (ethereumNetworkUpdate.tokenTxs != null) {
      const tokenTxs = ethereumNetworkUpdate.tokenTxs
      this.ethEngine.log(
        `${
          this.currencyInfo.currencyCode
        } processEthereumNetworkUpdate tokenTxs ${
          // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-nullish-coalescing
          ethereumNetworkUpdate.server || 'no server'
        } won`
      )
      for (const tk of Object.keys(tokenTxs)) {
        this.ethNeeds.tokenTxsLastChecked[tk] = now
        this.ethEngine.tokenCheckTransactionsStatus[tk] = 1
        const tuple: EdgeTransactionsBlockHeightTuple = tokenTxs[tk]
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
        if (tuple.edgeTransactions) {
          // @ts-expect-error
          for (const tx: EdgeTransaction of tuple.edgeTransactions) {
            this.ethEngine.addTransaction(tk, tx)
          }
          this.ethEngine.walletLocalData.lastTransactionQueryHeight[tk] =
            preUpdateBlockHeight
          this.ethEngine.walletLocalData.lastTransactionDate[tk] = now
        }
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

  buildQueryFuncs(settings: EthereumSettings): QueryFuncs {
    const {
      rpcServers,
      evmScanApiServers,
      blockbookServers,
      blockchairApiServers,
      amberdataRpcServers,
      amberdataApiServers
    } = settings
    const blockheight = []
    const nonce = []
    const txs = []
    const tokenBal = []

    if (evmScanApiServers.length > 0) {
      blockheight.push(this.checkBlockHeightEthscan)
      nonce.push(this.checkNonceEthscan)
      txs.push(this.checkTxsEthscan)
      tokenBal.push(this.checkTokenBalEthscan)
    }
    if (blockbookServers.length > 0) {
      blockheight.push(this.checkBlockHeightBlockbook)
      tokenBal.push(this.checkAddressBlockbook)
      nonce.push(this.checkAddressBlockbook)
    }
    if (blockchairApiServers.length > 0) {
      blockheight.push(this.checkBlockHeightBlockchair)
      tokenBal.push(this.checkTokenBalBlockchair)
    }
    if (amberdataRpcServers.length > 0) {
      blockheight.push(this.checkBlockHeightAmberdata)
      nonce.push(this.checkNonceAmberdata)
    }
    if (amberdataApiServers.length > 0) {
      // txs.push(this.checkTxsAmberdata)
    }
    if (rpcServers.length > 0) {
      tokenBal.push(this.checkTokenBalRpc)
    }

    return { blockheight, nonce, txs, tokenBal }
  }

  // TODO: Convert to error types
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  throwError(res: FetchResponse, funcName: string, url: string) {
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

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  logError(funcName: string, e?: Error) {
    safeErrorMessage(e).includes('rateLimited')
      ? this.ethEngine.log(funcName, e)
      : this.ethEngine.error(funcName, e)
  }
}
