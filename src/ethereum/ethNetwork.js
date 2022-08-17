// @flow
import { bns } from 'biggystring'
import type {
  EdgeCurrencyInfo,
  EdgeTransaction,
  JsonObject
} from 'edge-core-js/src/types/types'
import { type FetchResponse } from 'serverlet'
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
import { WEI_MULTIPLIER } from './ethConsts.js'
import { EthereumEngine } from './ethEngine'
import { EtherscanGetAccountNonce, EtherscanGetBlockHeight } from './ethSchema'
import {
  type AlethioTokenTransfer,
  type AmberdataTx,
  type BlockbookAddress,
  type BlockbookTokenBalance,
  type BlockbookTokenTransfer,
  type BlockbookTx,
  type CheckTokenBalBlockchair,
  type EthereumSettings,
  type EthereumTxOtherParams,
  type EvmScanTransaction,
  type FetchGetAlethio,
  type FetchGetAmberdataApiResponse,
  type RpcResultString,
  asAlethioAccountsTokenTransfer,
  asAmberdataAccountsTx,
  asBlockbookAddress,
  asBlockbookBlockHeight,
  asBlockbookTokenBalance,
  asBlockbookTx,
  asBlockChairAddress,
  asCheckBlockHeightBlockchair,
  asCheckTokenBalBlockchair,
  asEvmScancanTokenTransaction,
  asEvmScanTransaction,
  asFetchGetAlethio,
  asFetchGetAmberdataApiResponse,
  asRpcResultString
} from './ethTypes'
import { getEvmScanApiKey } from './fees/feeProviders.js'

const BLOCKHEIGHT_POLL_MILLISECONDS = 20000
const NONCE_POLL_MILLISECONDS = 20000
const BAL_POLL_MILLISECONDS = 20000
const TXS_POLL_MILLISECONDS = 20000

const ADDRESS_QUERY_LOOKBACK_BLOCKS = 4 * 2 // ~ 2 minutes
const ADDRESS_QUERY_LOOKBACK_SEC = 2 * 60 // ~ 2 minutes
const NUM_TRANSACTIONS_TO_QUERY = 50

type EthereumNeeds = {
  blockHeightLastChecked: number,
  nonceLastChecked: number,
  tokenBalLastChecked: { [currencyCode: string]: number },
  tokenTxsLastChecked: { [currencyCode: string]: number }
}

type EdgeTransactionsBlockHeightTuple = {
  blockHeight: number,
  edgeTransactions: EdgeTransaction[]
}

type EthereumNetworkUpdate = {
  blockHeight?: number,
  newNonce?: string,
  tokenBal?: { [currencyCode: string]: string },
  tokenTxs?: { [currencyCode: string]: EdgeTransactionsBlockHeightTuple },
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
  | 'blockbookTxs'

type BroadcastResults = {
  incrementNonce: boolean,
  decrementNonce: boolean
}

type GetEthscanAllTxsOptions = {
  contractAddress?: string
}

type GetEthscanAllTxsResponse = {
  allTransactions: EdgeTransaction[],
  server: string
}

async function broadcastWrapper(promise: Promise<Object>, server: string) {
  const out = {
    result: await promise,
    server
  }
  return out
}

type GetTxsParams = {
  startBlock: number,
  startDate: number,
  currencyCode: string
}

type UpdateMethods = 'blockheight' | 'nonce' | 'tokenBal' | 'txs'

type QueryFuncs = {
  [method: UpdateMethods]: (...args: any) => Promise<EthereumNetworkUpdate>[]
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
export const getFeeRateUsed = (
  gasPrice: string,
  gasLimit: string,
  gasUsed?: string
) => {
  let feeRateUsed = {}

  try {
    feeRateUsed = {
      // Convert gasPrice from wei to gwei
      gasPrice: bns.div(
        gasPrice,
        WEI_MULTIPLIER.toString(),
        WEI_MULTIPLIER.toString().length - 1
      ),
      ...(gasUsed !== undefined ? { gasUsed: gasUsed } : {}),
      gasLimit: gasLimit
    }
  } catch (e) {
    console.log(`Failed to construct feeRateUssed: ${e}`)
  }

  return feeRateUsed
}

export class EthereumNetwork {
  ethNeeds: EthereumNeeds
  ethEngine: EthereumEngine
  fetchGetEtherscan: (...any) => any
  multicastServers: (...any) => any
  checkBlockHeightEthscan: (...any) => any
  checkBlockHeightBlockchair: (...any) => any
  checkBlockHeightAmberdata: (...any) => any
  checkBlockHeightBlockbook: (...any) => any
  checkTxsBlockbook: (...any) => any
  checkNonceEthscan: (...any) => any
  checkNonceAmberdata: (...any) => any
  checkTokenBalEthscan: (...any) => any
  checkTokenBalBlockchair: (...any) => any
  checkTokenBalRpc: (...any) => any
  checkTxsEthscan: (...any) => any
  processEthereumNetworkUpdate: (...any) => any
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
    this.fetchGetEtherscan = this.fetchGetEtherscan.bind(this)
    this.multicastServers = this.multicastServers.bind(this)
    this.checkBlockHeightEthscan = this.checkBlockHeightEthscan.bind(this)
    this.checkBlockHeightBlockchair = this.checkBlockHeightBlockchair.bind(this)
    this.checkBlockHeightAmberdata = this.checkBlockHeightAmberdata.bind(this)
    this.checkBlockHeightBlockbook = this.checkBlockHeightBlockbook.bind(this)
    this.checkTxsBlockbook = this.checkTxsBlockbook.bind(this)
    this.checkNonceEthscan = this.checkNonceEthscan.bind(this)
    this.checkNonceAmberdata = this.checkNonceAmberdata.bind(this)
    this.checkTokenBalEthscan = this.checkTokenBalEthscan.bind(this)
    this.checkTokenBalBlockchair = this.checkTokenBalBlockchair.bind(this)
    this.checkTokenBalRpc = this.checkTokenBalRpc.bind(this)
    this.checkTxsEthscan = this.checkTxsEthscan.bind(this)
    this.processEthereumNetworkUpdate =
      this.processEthereumNetworkUpdate.bind(this)
    this.checkTxsAmberdata = this.checkTxsAmberdata.bind(this)
    this.queryFuncs = this.buildQueryFuncs(
      currencyInfo.defaultSettings.otherSettings
    )
  }

  processEvmScanTransaction(tx: EvmScanTransaction, currencyCode: string) {
    let netNativeAmount: string // Amount received into wallet
    const ourReceiveAddresses: string[] = []
    let nativeNetworkFee: string = '0'
    const tokenTx = currencyCode !== this.ethEngine.currencyInfo.currencyCode

    if (tx.gasPrice) {
      nativeNetworkFee = bns.mul(tx.gasPrice, tx.gasUsed)
    }

    if (
      tx.from.toLowerCase() ===
      this.ethEngine.walletLocalData.publicKey.toLowerCase()
    ) {
      // is a spend
      if (tx.from.toLowerCase() === tx.to.toLowerCase()) {
        // Spend to self. netNativeAmount is just the fee
        netNativeAmount = bns.mul(nativeNetworkFee, '-1')
      } else {
        // spend to someone else
        netNativeAmount = bns.sub('0', tx.value)

        // For spends, include the network fee in the transaction amount if not a token tx
        if (!tokenTx) {
          netNativeAmount = bns.sub(netNativeAmount, nativeNetworkFee)
        }
      }
    } else {
      // Receive transaction
      netNativeAmount = bns.add('0', tx.value)
      ourReceiveAddresses.push(
        this.ethEngine.walletLocalData.publicKey.toLowerCase()
      )
    }

    const otherParams: EthereumTxOtherParams = {
      from: [tx.from],
      to: [tx.to],
      gas: tx.gas,
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
    if (tokenTx) {
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
      feeRateUsed: getFeeRateUsed(tx.gasPrice, tx.gas, tx.gasUsed),
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

    if (
      fromAddress.toLowerCase() ===
      this.ethEngine.walletLocalData.publicKey.toLowerCase()
    ) {
      // is a spend
      if (fromAddress.toLowerCase() === toAddress.toLowerCase()) {
        // Spend to self. netNativeAmount is just the fee
        netNativeAmount = bns.mul(nativeNetworkFee, '-1')
      } else {
        // spend to someone else
        netNativeAmount = bns.sub('0', value)

        // For spends, include the network fee in the transaction amount if not a token tx
        if (!tokenTx) {
          netNativeAmount = bns.sub(netNativeAmount, nativeNetworkFee)
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
    if (tokenTx) {
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

  processAmberdataTxRegular(
    amberdataTx: AmberdataTx,
    currencyCode: string
  ): EdgeTransaction | null {
    const walletAddress = this.ethEngine.walletLocalData.publicKey
    let netNativeAmount: string
    const ourReceiveAddresses: string[] = []
    let nativeNetworkFee: string
    const tokenTx = currencyCode !== this.ethEngine.currencyInfo.currencyCode

    const value = amberdataTx.value
    const fee = amberdataTx.fee ? amberdataTx.fee : '0'
    const fromAddress =
      amberdataTx.from.length > 0 ? amberdataTx.from[0].address : ''
    const toAddress = amberdataTx.to.length > 0 ? amberdataTx.to[0].address : ''

    if (fromAddress && toAddress) {
      nativeNetworkFee = fee

      if (fromAddress.toLowerCase() === walletAddress.toLowerCase()) {
        // is a spend
        if (fromAddress.toLowerCase() === toAddress.toLowerCase()) {
          // Spend to self. netNativeAmount is just the fee
          netNativeAmount = bns.mul(nativeNetworkFee, '-1')
        } else {
          // spend to someone else
          netNativeAmount = bns.sub('0', value)

          // For spends, include the network fee in the transaction amount if not a token tx
          if (!tokenTx) {
            netNativeAmount = bns.sub(netNativeAmount, nativeNetworkFee)
          }
        }
      } else if (toAddress.toLowerCase() === walletAddress.toLowerCase()) {
        // Receive transaction
        netNativeAmount = value
        ourReceiveAddresses.push(walletAddress.toLowerCase())
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

      let blockHeight = parseInt(amberdataTx.blockNumber, 10)
      if (blockHeight < 0) blockHeight = 0
      const date = new Date(amberdataTx.timestamp).getTime() / 1000
      let parentNetworkFee
      let networkFee = '0'
      if (tokenTx) {
        parentNetworkFee = nativeNetworkFee
      } else {
        networkFee = nativeNetworkFee
      }

      const edgeTransaction: EdgeTransaction = {
        txid: amberdataTx.hash,
        date,
        currencyCode,
        blockHeight,
        nativeAmount: netNativeAmount,
        networkFee,
        feeRateUsed: getFeeRateUsed(
          amberdataTx.gasPrice,
          amberdataTx.gasLimit,
          amberdataTx.gasUsed
        ),
        ourReceiveAddresses,
        signedTx: '',
        parentNetworkFee,
        otherParams
      }

      return edgeTransaction
    } else {
      return null
    }
  }

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
    return response.json()
  }

  async fetchGetBlockbook(server: string, param: string) {
    const url = server + param
    const resultRaw =
      server.indexOf('trezor') === -1
        ? await this.ethEngine.io.fetch(url)
        : await this.ethEngine.fetchCors(url)
    return resultRaw.json()
  }

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
      if (!infuraProjectId || infuraProjectId.length < 6) {
        throw new Error('Need Infura Project ID')
      }
      addOnUrl = `/${infuraProjectId}`
    } else if (url.includes('alchemyapi')) {
      const { alchemyApiKey } = this.ethEngine.initOptions
      if (!alchemyApiKey || alchemyApiKey.length < 6) {
        throw new Error('Need Alchemy API key')
      }
      addOnUrl = `/v2/-${alchemyApiKey}`
    } else if (url.includes('quiknode')) {
      const { quiknodeApiKey } = this.ethEngine.initOptions
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
    return response.json()
  }

  async fetchPostBlockcypher(cmd: string, body: any, baseUrl: string) {
    const { blockcypherApiKey } = this.ethEngine.initOptions
    let apiKey = ''
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
    return response.json()
  }

  async fetchGetBlockchair(path: string, includeKey: boolean = false) {
    const { blockchairApiKey } = this.ethEngine.initOptions
    const { blockchairApiServers } =
      this.currencyInfo.defaultSettings.otherSettings

    const keyParam =
      includeKey && blockchairApiKey ? `&key=${blockchairApiKey}` : ''
    const url = `${blockchairApiServers[0]}${path}`
    const response = await this.ethEngine.io.fetch(`${url}${keyParam}`)
    if (!response.ok) this.throwError(response, 'fetchGetBlockchair', url)
    return response.json()
  }

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
      this.throwError(response, 'fetchPostAmberdataRpc', parsedUrl)
    }
    const jsonObj = await response.json()
    return jsonObj
  }

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
    return response.json()
  }

  /*
   * @param pathOrLink: A "path" is appended to the alethioServers base URL and
   *  a "link" is a full URL that needs no further modification
   * @param isPath: If TRUE then the pathOrLink param is interpretted as a "path"
   *  otherwise it is interpretted as a "link"
   *
   * @throws Exception when Alethio throttles with a 429 response code
   */

  async fetchGetAlethio(
    pathOrLink: string,
    isPath: boolean = true,
    useApiKey: boolean
  ) {
    const { alethioApiKey = '' } = this.ethEngine.initOptions
    const { alethioApiServers } =
      this.currencyInfo.defaultSettings.otherSettings
    const url = isPath ? `${alethioApiServers[0]}${pathOrLink}` : pathOrLink

    const response = await this.ethEngine.io.fetch(
      url,
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
    let funcs, url
    switch (func) {
      case 'broadcastTx': {
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
          const result = await this.fetchGetEtherscan(server, url)
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
            result.result = bns.add(result.result, '0')
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
          const result = await this.fetchGetEtherscan(server, url)
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
          contractAddress
        } = params[0]
        let startUrl
        if (currencyCode === this.currencyInfo.currencyCode) {
          startUrl = `?action=txlist&module=account`
        } else {
          startUrl = `?action=tokentx&contractaddress=${contractAddress}&module=account`
        }
        url = `${startUrl}&address=${address}&startblock=${startBlock}&endblock=999999999&sort=asc&page=${page}&offset=${offset}`
        funcs = evmScanApiServers.map(server => async () => {
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

      case 'blockbookTxs':
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

  async getBaseFeePerGas(): Promise<{ baseFeePerGas: string | void }> {
    const {
      rpcServers,
      chainParams: { chainId }
    } = this.currencyInfo.defaultSettings.otherSettings

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

          return { baseFeePerGas }
        })
    )

    return await asyncWaterfall(funcs)
  }

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

  async checkBlockHeightBlockbook(): Promise<EthereumNetworkUpdate> {
    try {
      const { result: jsonObj, server } = await this.multicastServers(
        'blockbookBlockHeight',
        '/api/v2'
      )

      const blockHeight = asBlockbookBlockHeight(jsonObj).blockbook.bestHeight
      return { blockHeight, server }
    } catch (e) {
      this.ethEngine.log('checkBlockHeightBlockbook blockHeight ', e)
      throw new Error(`checkBlockHeightBlockbook returned invalid JSON`)
    }
  }

  async checkBlockHeightBlockchair(): Promise<EthereumNetworkUpdate> {
    try {
      const jsonObj = await this.fetchGetBlockchair(
        `/${this.currencyInfo.pluginId}/stats`,
        false
      )
      const blockHeight = parseInt(
        asCheckBlockHeightBlockchair(jsonObj).data.blocks,
        10
      )
      return { blockHeight, server: 'blockchair' }
    } catch (e) {
      this.logError(e)
      throw new Error('checkBlockHeightBlockchair returned invalid JSON')
    }
  }

  async checkBlockHeightAmberdata(): Promise<EthereumNetworkUpdate> {
    try {
      const jsonObj = await this.fetchPostAmberdataRpc('eth_blockNumber', [])
      const blockHeight = parseInt(asRpcResultString(jsonObj).result, 16)
      return { blockHeight, server: 'amberdata' }
    } catch (e) {
      this.logError('checkBlockHeightAmberdata', e)
      throw new Error('checkTxsAmberdata (regular tx) response is invalid')
    }
  }

  async checkNonceEthscan(): Promise<EthereumNetworkUpdate> {
    const address = this.ethEngine.walletLocalData.publicKey
    const { result: jsonObj, server } = await this.multicastServers(
      'eth_getTransactionCount',
      address
    )
    const valid = validateObject(jsonObj, EtherscanGetAccountNonce)
    if (valid && /0[xX][0-9a-fA-F]+/.test(jsonObj.result)) {
      const newNonce = bns.add('0', jsonObj.result)
      return { newNonce, server }
    } else {
      throw new Error('Ethscan returned invalid JSON')
    }
  }

  async checkNonceAmberdata(): Promise<EthereumNetworkUpdate> {
    const address = this.ethEngine.walletLocalData.publicKey
    try {
      const jsonObj = await this.fetchPostAmberdataRpc(
        'eth_getTransactionCount',
        [address, 'latest']
      )
      const newNonce = `${parseInt(asRpcResultString(jsonObj).result, 16)}`
      return { newNonce, server: 'amberdata' }
    } catch (e) {
      this.logError('checkNonceAmberdata', e)
      throw new Error('Amberdata returned invalid JSON')
    }
  }

  async check(
    method: UpdateMethods,
    ...args: any
  ): Promise<EthereumNetworkUpdate> {
    return asyncWaterfall(
      this.queryFuncs[method].map(func => async () => await func(...args))
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
    while (1) {
      const offset = NUM_TRANSACTIONS_TO_QUERY
      const response = await this.multicastServers('getTransactions', {
        currencyCode,
        address,
        startBlock,
        page,
        offset,
        contractAddress
      })
      server = response.server
      const transactions = response.result.result
      for (let i = 0; i < transactions.length; i++) {
        try {
          const cleanedTx = cleanerFunc(transactions[i])
          const tx = this.processEvmScanTransaction(cleanedTx, currencyCode)
          allTransactions.push(tx)
        } catch (e) {
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

  async checkTxsEthscan(params: GetTxsParams): Promise<EthereumNetworkUpdate> {
    const { startBlock, currencyCode } = params
    let server
    let allTransactions

    if (currencyCode === this.currencyInfo.currencyCode) {
      const txsRegularResp = await this.getAllTxsEthscan(
        startBlock,
        currencyCode,
        asEvmScanTransaction,
        {}
      )
      server = txsRegularResp.server
      allTransactions = [...txsRegularResp.allTransactions]
    } else {
      const tokenInfo = this.ethEngine.getTokenInfo(currencyCode)
      if (tokenInfo && typeof tokenInfo.contractAddress === 'string') {
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
  getTokenCurrencyCode(txnContractAddress: string): string | void {
    const address = this.ethEngine.walletLocalData.publicKey
    if (txnContractAddress.toLowerCase() === address.toLowerCase()) {
      return this.currencyInfo.currencyCode
    } else {
      for (const tk of this.ethEngine.enabledTokens) {
        const tokenInfo = this.ethEngine.getTokenInfo(tk)
        if (tokenInfo) {
          const tokenContractAddress = tokenInfo.contractAddress
          if (
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

  async checkTxsAlethio(
    startBlock: number,
    currencyCode: string,
    useApiKey: boolean
  ): Promise<EthereumNetworkUpdate> {
    const address = this.ethEngine.walletLocalData.publicKey
    const { native, token } =
      this.currencyInfo.defaultSettings.otherSettings.alethioCurrencies
    let linkNext
    let cleanedResponseObj: FetchGetAlethio
    const allTransactions: EdgeTransaction[] = []
    while (1) {
      let jsonObj
      try {
        if (linkNext) {
          jsonObj = await this.fetchGetAlethio(linkNext, false, useApiKey)
        } else {
          if (currencyCode === this.currencyInfo.currencyCode) {
            jsonObj = await this.fetchGetAlethio(
              `/accounts/${address}/${native}Transfers`,
              true,
              useApiKey
            )
          } else {
            jsonObj = await this.fetchGetAlethio(
              `/accounts/${address}/${token}Transfers`,
              true,
              useApiKey
            )
          }
        }
        cleanedResponseObj = asFetchGetAlethio(jsonObj)
      } catch (e) {
        this.ethEngine.error(
          `checkTxsAlethio \n${safeErrorMessage(e)}\n${linkNext || ''}`
        )
        throw new Error('checkTxsAlethio response is invalid')
      }

      linkNext = cleanedResponseObj.links.next
      let hasNext = cleanedResponseObj.meta.page.hasNext

      for (const tokenTransfer of cleanedResponseObj.data) {
        try {
          const cleanTokenTransfer =
            asAlethioAccountsTokenTransfer(tokenTransfer)
          const txBlockheight = cleanTokenTransfer.attributes.globalRank[0]
          if (txBlockheight > startBlock) {
            let txCurrencyCode = this.currencyInfo.currencyCode
            if (currencyCode !== this.currencyInfo.currencyCode) {
              const contractAddress =
                cleanTokenTransfer.relationships.token.data.id
              txCurrencyCode = this.getTokenCurrencyCode(contractAddress)
            }
            if (typeof txCurrencyCode === 'string') {
              const tx = this.processAlethioTransaction(
                cleanTokenTransfer,
                txCurrencyCode
              )
              if (tx) {
                allTransactions.push(tx)
              }
            }
          } else {
            hasNext = false
            break
          }
        } catch (e) {
          this.ethEngine.error('checkTxsAlethio tokenTransfer ', e)
          throw new Error(
            `checkTxsAlethio tokenTransfer is invalid\n${JSON.stringify(
              tokenTransfer
            )}`
          )
        }
      }

      if (!hasNext) {
        break
      }
    }

    // We init txsByCurrency with all tokens (or ETH) in order to
    // force processEthereumNetworkUpdate to set the lastChecked
    // timestamp.  Otherwise tokens w/out transactions won't get
    // throttled properly. Remember that Alethio responds with
    // txs for *all* tokens.
    const response = { tokenTxs: {}, server: 'alethio' }
    if (currencyCode !== this.currencyInfo.currencyCode) {
      for (const tk of this.ethEngine.enabledTokens) {
        if (tk !== this.currencyInfo.currencyCode) {
          response.tokenTxs[tk] = {
            blockHeight: startBlock,
            edgeTransactions: []
          }
        }
      }
    } else {
      // ETH is singled out here because it is a different (but very
      // similar) Alethio process
      response.tokenTxs[this.currencyInfo.currencyCode] = {
        blockHeight: startBlock,
        edgeTransactions: []
      }
    }

    for (const tx: EdgeTransaction of allTransactions) {
      response.tokenTxs[tx.currencyCode].edgeTransactions.push(tx)
    }
    return response
  }

  // fine, used in asyncWaterfalls
  async getAllTxsAmberdata(
    startBlock: number,
    startDate: number,
    currencyCode: string
  ): Promise<EdgeTransaction[]> {
    const address = this.ethEngine.walletLocalData.publicKey

    let page = 0
    const allTransactions: EdgeTransaction[] = []
    while (1) {
      let url = `/addresses/${address}/transactions?page=${page}&size=${NUM_TRANSACTIONS_TO_QUERY}`

      let cleanedResponseObj: FetchGetAmberdataApiResponse
      try {
        if (startDate) {
          const newDateObj = new Date(startDate)
          const now = new Date()
          if (newDateObj) {
            url =
              url +
              `&startDate=${newDateObj.toISOString()}&endDate=${now.toISOString()}`
          }
        }

        const jsonObj = await this.fetchGetAmberdataApi(url)
        cleanedResponseObj = asFetchGetAmberdataApiResponse(jsonObj)
      } catch (e) {
        this.logError('checkTxsAmberdata regular txs', e)
        throw new Error('checkTxsAmberdata (regular tx) response is invalid')
      }
      const amberdataTxs = cleanedResponseObj.payload.records
      for (const amberdataTx of amberdataTxs) {
        try {
          const cleanAmberdataTx = asAmberdataAccountsTx(amberdataTx)

          const tx = this.processAmberdataTxRegular(
            cleanAmberdataTx,
            currencyCode
          )
          if (tx) {
            allTransactions.push(tx)
          }
        } catch (e) {
          this.ethEngine.error(
            `checkTxsAmberdata process regular ${safeErrorMessage(
              e
            )}\n${JSON.stringify(amberdataTx)}`
          )
          throw new Error('checkTxsAmberdata regular amberdataTx is invalid')
        }
      }
      if (amberdataTxs.length === 0) {
        break
      }
      page++
    }
    return allTransactions
  }

  async checkTxsAmberdata(
    params: GetTxsParams
  ): Promise<EthereumNetworkUpdate> {
    const { startBlock, startDate, currencyCode } = params
    const allTxsRegular: EdgeTransaction[] = await this.getAllTxsAmberdata(
      startBlock,
      startDate,
      currencyCode
    )

    return {
      tokenTxs: {
        [`${this.currencyInfo.currencyCode}`]: {
          blockHeight: startBlock,
          edgeTransactions: [...allTxsRegular]
        }
      },
      server: 'amberdata'
    }
  }

  async checkTxsBlockbook(
    params: GetTxsParams
  ): Promise<EthereumNetworkUpdate> {
    const { startBlock = 0 } = params
    const address = this.ethEngine.walletLocalData.publicKey.toLowerCase()
    let page = 1
    let totalPages = 1
    const out = {
      newNonce: '0',
      tokenBal: {},
      tokenTxs: {
        [this.currencyInfo.currencyCode]: {
          blockHeight: startBlock,
          edgeTransactions: []
        }
      },
      server: ''
    }
    while (page <= totalPages) {
      const query =
        '/api/v2/address/' +
        address +
        `?from=${startBlock}&page=${page}&details=txs`
      const { result: jsonObj, server } = await this.multicastServers(
        'blockbookTxs',
        query
      )
      let addressInfo: BlockbookAddress
      try {
        addressInfo = asBlockbookAddress(jsonObj)
      } catch (e) {
        this.ethEngine.error(
          `checkTxsBlockbook ${server} error BlockbookAddress ${JSON.stringify(
            jsonObj
          )}`
        )
        throw new Error(
          `checkTxsBlockbook ${server} returned invalid JSON for BlockbookAddress`
        )
      }
      const { nonce, tokens, balance, transactions } = addressInfo
      out.newNonce = nonce
      out.tokenBal[this.currencyInfo.currencyCode] = balance
      out.server = server
      totalPages = addressInfo.totalPages
      page++

      // Token balances
      for (const token: BlockbookTokenBalance of tokens) {
        try {
          const { symbol, balance } = asBlockbookTokenBalance(token)
          out.tokenBal[symbol] = balance
        } catch (e) {
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

      // Transactions
      for (const tx: BlockbookTx of transactions) {
        const transactionsArray = []
        try {
          const cleanTx = asBlockbookTx(tx)
          if (
            cleanTx.tokenTransfers !== undefined &&
            cleanTx.tokenTransfers.length > 0
          ) {
            for (const tokenTransfer of cleanTx.tokenTransfers) {
              if (
                address === tokenTransfer.to.toLowerCase() ||
                address === tokenTransfer.from.toLowerCase()
              ) {
                try {
                  transactionsArray.push(
                    this.processBlockbookTx(tx, tokenTransfer)
                  )
                } catch (e) {
                  if (safeErrorMessage(e) !== 'Unsupported contract address')
                    throw e
                  continue
                }
              }
            }
          }
          if (
            address === tx.vout[0].addresses[0].toLowerCase() ||
            address === tx.vin[0].addresses[0].toLowerCase()
          )
            transactionsArray.push(this.processBlockbookTx(tx))
        } catch (e) {
          this.ethEngine.error(`checkTxsBlockbook ${server} BlockbookTx `, e)
          throw new Error(
            `Blockbook ${server} returned invalid JSON for BlockbookTx`
          )
        }
        for (const edgeTransaction of transactionsArray) {
          if (out.tokenTxs[edgeTransaction.currencyCode] === undefined)
            out.tokenTxs[edgeTransaction.currencyCode] = {
              blockHeight: startBlock,
              edgeTransactions: []
            }
          out.tokenTxs[edgeTransaction.currencyCode].edgeTransactions.push(
            edgeTransaction
          )
        }
      }
    }
    return out
  }

  processBlockbookTx(
    blockbookTx: BlockbookTx,
    tokenTx?: BlockbookTokenTransfer
  ): EdgeTransaction {
    const {
      txid,
      blockHeight,
      blockTime,
      value,
      ethereumSpecific: { gasLimit, gasUsed, gasPrice },
      vin,
      vout
    } = blockbookTx
    const ourAddress = this.ethEngine.walletLocalData.publicKey.toLowerCase()
    let toAddress = vout[0].addresses[0].toLowerCase()
    let fromAddress = vin[0].addresses[0].toLowerCase()
    let currencyCode = this.currencyInfo.currencyCode
    let nativeAmount = value
    let networkFee = bns.mul(gasPrice, gasUsed.toString())
    let parentNetworkFee
    const ourReceiveAddresses = []
    if (toAddress === fromAddress) {
      // Send to self
      nativeAmount = bns.mul('-1', networkFee)
    } else if (toAddress === ourAddress) {
      // Receive
      ourReceiveAddresses.push(ourAddress)
    } else if (fromAddress === ourAddress) {
      // Send
      nativeAmount = bns.mul('-1', bns.add(nativeAmount, networkFee))
    }
    if (tokenTx) {
      const { symbol, value, to, from, token } = tokenTx
      // Ignore token transaction if the contract address isn't recognized
      if (
        !this.ethEngine.allTokens
          .concat(this.ethEngine.customTokens)
          .some(
            metatoken =>
              metatoken.contractAddress &&
              metatoken.contractAddress.toLowerCase() === token.toLowerCase()
          )
      ) {
        this.ethEngine.log(`processBlockbookTx unsupported token ${token}`)
        throw new Error('Unsupported contract address')
      }
      // Override currencyCode and nativeAmount if token transaction
      toAddress = to.toLowerCase()
      if (toAddress === ourAddress) ourReceiveAddresses.push(ourAddress)
      fromAddress = from.toLowerCase()
      currencyCode = symbol
      nativeAmount = toAddress === ourAddress ? value : bns.mul('-1', value)
      networkFee = '0'
      parentNetworkFee = bns.mul(gasPrice, gasUsed.toString())
    }
    const otherParams: EthereumTxOtherParams = {
      from: [fromAddress],
      to: [toAddress],
      gas: gasLimit.toString(),
      gasPrice,
      gasUsed: gasUsed.toString()
    }
    const edgeTransaction: EdgeTransaction = {
      txid,
      date: blockTime,
      currencyCode,
      blockHeight,
      nativeAmount,
      networkFee,
      parentNetworkFee,
      feeRateUsed: getFeeRateUsed(
        gasPrice,
        gasLimit.toString(),
        gasUsed.toString()
      ),
      ourReceiveAddresses,
      signedTx: '',
      otherParams
    }
    return edgeTransaction
  }

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
        if (tokenInfo && typeof tokenInfo.contractAddress === 'string') {
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
    } catch (e) {
      this.ethEngine.error(
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

  async checkTokenBalBlockchair(): Promise<EthereumNetworkUpdate> {
    let cleanedResponseObj: CheckTokenBalBlockchair
    const address = this.ethEngine.walletLocalData.publicKey
    const path = `/${this.currencyInfo.pluginId}/dashboards/address/${address}?erc_20=true`
    try {
      const jsonObj = await this.fetchGetBlockchair(path, true)
      cleanedResponseObj = asCheckTokenBalBlockchair(jsonObj)
    } catch (e) {
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
        if (tokenInfo && tokenInfo.contractAddress === tokenAddress) {
          response[tokenSymbol] = balance
        } else {
          // Do nothing, eg: Old DAI token balance is ignored
        }
      } catch (e) {
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
      if (tokenInfo && typeof tokenInfo.contractAddress === 'string') {
        const params = {
          data: `0x70a08231${padHex(removeHexPrefix(address), 32)}`,
          to: tokenInfo.contractAddress
        }

        const response = await this.multicastServers('eth_call', params)
        jsonObj = response.result
        server = response.server
      }

      cleanedResponseObj = asRpcResultString(jsonObj)
    } catch (e) {
      this.ethEngine.error(
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

  async checkAndUpdate(
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
      } catch (e) {
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
        async () => this.check('blockheight')
      )

      await this.checkAndUpdate(
        this.ethNeeds.nonceLastChecked,
        NONCE_POLL_MILLISECONDS,
        preUpdateBlockHeight,
        async () => this.check('nonce')
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
          async () => this.check('tokenBal', tk)
        )

        await this.checkAndUpdate(
          this.ethNeeds.tokenTxsLastChecked[tk],
          TXS_POLL_MILLISECONDS,
          preUpdateBlockHeight,
          async () =>
            this.check('txs', {
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

  processEthereumNetworkUpdate(
    now: number,
    ethereumNetworkUpdate: EthereumNetworkUpdate,
    preUpdateBlockHeight: number
  ) {
    if (!ethereumNetworkUpdate) return
    if (ethereumNetworkUpdate.blockHeight) {
      this.ethEngine.log(
        `${
          this.currencyInfo.currencyCode
        } processEthereumNetworkUpdate blockHeight ${
          ethereumNetworkUpdate.server || 'no server'
        } won`
      )
      const blockHeight = ethereumNetworkUpdate.blockHeight
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

    if (ethereumNetworkUpdate.newNonce) {
      this.ethEngine.log(
        `${this.currencyInfo.currencyCode} processEthereumNetworkUpdate nonce ${
          ethereumNetworkUpdate.server || 'no server'
        } won`
      )
      this.ethNeeds.nonceLastChecked = now
      this.ethEngine.walletLocalData.otherData.nextNonce =
        ethereumNetworkUpdate.newNonce
      this.ethEngine.walletLocalDataDirty = true
    }

    if (ethereumNetworkUpdate.tokenBal) {
      const tokenBal = ethereumNetworkUpdate.tokenBal
      this.ethEngine.log(
        `${
          this.currencyInfo.currencyCode
        } processEthereumNetworkUpdate tokenBal ${
          ethereumNetworkUpdate.server || 'no server'
        } won`
      )
      for (const tk of Object.keys(tokenBal)) {
        this.ethNeeds.tokenBalLastChecked[tk] = now
        this.ethEngine.updateBalance(tk, tokenBal[tk])
      }
    }

    if (ethereumNetworkUpdate.tokenTxs) {
      const tokenTxs = ethereumNetworkUpdate.tokenTxs
      this.ethEngine.log(
        `${
          this.currencyInfo.currencyCode
        } processEthereumNetworkUpdate tokenTxs ${
          ethereumNetworkUpdate.server || 'no server'
        } won`
      )
      for (const tk of Object.keys(tokenTxs)) {
        this.ethNeeds.tokenTxsLastChecked[tk] = now
        this.ethEngine.tokenCheckTransactionsStatus[tk] = 1
        const tuple: EdgeTransactionsBlockHeightTuple = tokenTxs[tk]
        if (tuple.edgeTransactions) {
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
      txs.push(this.checkTxsBlockbook)
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
      txs.push(this.checkTxsAmberdata)
    }
    if (rpcServers.length > 0) {
      tokenBal.push(this.checkTokenBalRpc)
    }
    // $FlowFixMe // Flow doesn't like that the arrays start empty
    return { blockheight, nonce, txs, tokenBal }
  }

  // TODO: Convert to error types
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

  logError(funcName: string, e?: Error) {
    safeErrorMessage(e).includes('rateLimited')
      ? this.ethEngine.log(funcName, e)
      : this.ethEngine.error(funcName, e)
  }
}
