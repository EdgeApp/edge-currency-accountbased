// @flow
import { bns } from 'biggystring'
import type {
  EdgeCurrencyInfo,
  EdgeTransaction
} from 'edge-core-js/src/types/types'
import parse from 'url-parse'

import {
  asyncWaterfall,
  cleanTxLogs,
  isHex,
  pickRandom,
  promiseAny,
  shuffleArray,
  snooze,
  validateObject
} from '../common/utils'
import { EthereumEngine } from './ethEngine'
import {
  AmberdataRpcSchema,
  BlockChairStatsSchema,
  EtherscanGetAccountNonce,
  EtherscanGetBlockHeight
} from './ethSchema'
import {
  type AlethioTokenTransfer,
  type AmberdataInternalTx,
  type AmberdataTx,
  type BlockbookAddress,
  type BlockbookTokenBalance,
  type BlockbookTokenTransfer,
  type BlockbookTx,
  type CheckTokenBalBlockchair,
  type EthereumTxOtherParams,
  type EtherscanGetAccountBalance,
  type EtherscanInternalTransaction,
  type EtherscanTransaction,
  type FetchGetAlethio,
  type FetchGetAmberdataApiResponse,
  asAlethioAccountsTokenTransfer,
  asAmberdataAccountsFuncs,
  asAmberdataAccountsTx,
  asBlockbookAddress,
  asBlockbookBlockHeight,
  asBlockbookTokenBalance,
  asBlockbookTx,
  asBlockChairAddress,
  asCheckTokenBalBlockchair,
  asEtherscanGetAccountBalance,
  asEtherscanInternalTransaction,
  asEtherscanTokenTransaction,
  asEtherscanTransaction,
  asFetchGetAlethio,
  asFetchGetAmberdataApiResponse
} from './ethTypes'

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
  contractAddress?: string,
  searchRegularTxs?: boolean
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

export class EthereumNetwork {
  ethNeeds: EthereumNeeds
  ethEngine: EthereumEngine
  fetchGetEtherscan: (...any) => any
  multicastServers: (...any) => any
  checkBlockHeightEthscan: (...any) => any
  checkBlockHeightBlockchair: (...any) => any
  checkBlockHeightAmberdata: (...any) => any
  checkBlockHeight: (...any) => any
  checkBlockHeightBlockbook: (...any) => any
  checkTxsBlockbook: (...any) => any
  checkNonceEthscan: (...any) => any
  checkNonceAmberdata: (...any) => any
  checkNonce: (...any) => any
  checkTxs: (...any) => any
  checkTokenBalEthscan: (...any) => any
  checkTokenBalBlockchair: (...any) => any
  checkTokenBal: (...any) => any
  processEthereumNetworkUpdate: (...any) => any
  currencyInfo: EdgeCurrencyInfo

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
    this.checkBlockHeight = this.checkBlockHeight.bind(this)
    this.checkNonceEthscan = this.checkNonceEthscan.bind(this)
    this.checkNonceAmberdata = this.checkNonceAmberdata.bind(this)
    this.checkNonce = this.checkNonce.bind(this)
    this.checkTxs = this.checkTxs.bind(this)
    this.checkTokenBalEthscan = this.checkTokenBalEthscan.bind(this)
    this.checkTokenBalBlockchair = this.checkTokenBalBlockchair.bind(this)
    this.checkTokenBal = this.checkTokenBal.bind(this)
    this.processEthereumNetworkUpdate = this.processEthereumNetworkUpdate.bind(
      this
    )
  }

  processEtherscanTransaction(
    tx: EtherscanTransaction | EtherscanInternalTransaction,
    currencyCode: string
  ) {
    let netNativeAmount: string // Amount received into wallet
    const ourReceiveAddresses: string[] = []
    let nativeNetworkFee: string = '0'

    if (!tx.contractAddress && tx.gasPrice) {
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

        // For spends, include the network fee in the transaction amount
        netNativeAmount = bns.sub(netNativeAmount, nativeNetworkFee)
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
      gasUsed: tx.gasUsed,
      cumulativeGasUsed: tx.cumulativeGasUsed || '',
      errorVal: parseInt(tx.isError),
      tokenRecipientAddress: null
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
    const edgeTransaction: EdgeTransaction = {
      txid,
      date: parseInt(tx.timeStamp),
      currencyCode,
      blockHeight,
      nativeAmount: netNativeAmount,
      networkFee: nativeNetworkFee,
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
    let tokenRecipientAddress: string | null

    const value = tokenTransfer.attributes.value
    const fee = tokenTransfer.attributes.fee
      ? tokenTransfer.attributes.fee
      : '0'
    const fromAddress = tokenTransfer.relationships.from.data.id
    const toAddress = tokenTransfer.relationships.to.data.id

    if (currencyCode === this.currencyInfo.currencyCode) {
      nativeNetworkFee = fee
      tokenRecipientAddress = null
    } else {
      nativeNetworkFee = '0'
      tokenRecipientAddress = toAddress
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

        // For spends, include the network fee in the transaction amount
        netNativeAmount = bns.sub(netNativeAmount, nativeNetworkFee)
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
      errorVal: 0,
      tokenRecipientAddress
    }

    let blockHeight = tokenTransfer.attributes.globalRank[0]
    if (blockHeight < 0) blockHeight = 0
    const edgeTransaction: EdgeTransaction = {
      txid: tokenTransfer.relationships.transaction.data.id,
      date: tokenTransfer.attributes.blockCreationTime,
      currencyCode,
      blockHeight,
      nativeAmount: netNativeAmount,
      networkFee: nativeNetworkFee,
      ourReceiveAddresses,
      signedTx: '',
      parentNetworkFee: '',
      otherParams
    }

    return edgeTransaction
  }

  processAmberdataTxInternal(
    amberdataTx: AmberdataInternalTx,
    currencyCode: string
  ): EdgeTransaction | null {
    const walletAddress = this.ethEngine.walletLocalData.publicKey
    let netNativeAmount: string = bns.add('0', amberdataTx.value)
    const ourReceiveAddresses: string[] = []
    let nativeNetworkFee: string

    const value = amberdataTx.value
    const fromAddress = amberdataTx.from.address || ''
    const toAddress = amberdataTx.to.length > 0 ? amberdataTx.to[0].address : ''

    if (fromAddress && toAddress) {
      nativeNetworkFee = '0'

      if (fromAddress.toLowerCase() === walletAddress.toLowerCase()) {
        // is a spend
        if (fromAddress.toLowerCase() === toAddress.toLowerCase()) {
          // Spend to self. netNativeAmount is just the fee
          netNativeAmount = bns.mul(nativeNetworkFee, '-1')
        } else {
          // spend to someone else
          netNativeAmount = bns.sub('0', value)

          // For spends, include the network fee in the transaction amount
          netNativeAmount = bns.sub(netNativeAmount, nativeNetworkFee)
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
        gasUsed: '0',
        errorVal: 0,
        tokenRecipientAddress: null
      }

      let blockHeight = parseInt(amberdataTx.blockNumber, 10)
      if (blockHeight < 0) blockHeight = 0
      const date = new Date(amberdataTx.timestamp).getTime() / 1000
      const edgeTransaction: EdgeTransaction = {
        txid: amberdataTx.transactionHash,
        date,
        currencyCode,
        blockHeight,
        nativeAmount: netNativeAmount,
        networkFee: nativeNetworkFee,
        ourReceiveAddresses,
        signedTx: '',
        parentNetworkFee: '',
        otherParams
      }

      return edgeTransaction
    } else {
      return null
    }
  }

  processAmberdataTxRegular(
    amberdataTx: AmberdataTx,
    currencyCode: string
  ): EdgeTransaction | null {
    const walletAddress = this.ethEngine.walletLocalData.publicKey
    let netNativeAmount: string
    const ourReceiveAddresses: string[] = []
    let nativeNetworkFee: string
    let tokenRecipientAddress: string | null

    const value = amberdataTx.value
    const fee = amberdataTx.fee ? amberdataTx.fee : '0'
    const fromAddress =
      amberdataTx.from.length > 0 ? amberdataTx.from[0].address : ''
    const toAddress = amberdataTx.to.length > 0 ? amberdataTx.to[0].address : ''

    if (fromAddress && toAddress) {
      nativeNetworkFee = fee
      tokenRecipientAddress = null

      if (fromAddress.toLowerCase() === walletAddress.toLowerCase()) {
        // is a spend
        if (fromAddress.toLowerCase() === toAddress.toLowerCase()) {
          // Spend to self. netNativeAmount is just the fee
          netNativeAmount = bns.mul(nativeNetworkFee, '-1')
        } else {
          // spend to someone else
          netNativeAmount = bns.sub('0', value)

          // For spends, include the network fee in the transaction amount
          netNativeAmount = bns.sub(netNativeAmount, nativeNetworkFee)
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
        gasUsed: '0',
        errorVal: 0,
        tokenRecipientAddress
      }

      let blockHeight = parseInt(amberdataTx.blockNumber, 10)
      if (blockHeight < 0) blockHeight = 0
      const date = new Date(amberdataTx.timestamp).getTime() / 1000
      const edgeTransaction: EdgeTransaction = {
        txid: amberdataTx.hash,
        date,
        currencyCode,
        blockHeight,
        nativeAmount: netNativeAmount,
        networkFee: nativeNetworkFee,
        ourReceiveAddresses,
        signedTx: '',
        parentNetworkFee: '',
        otherParams
      }

      return edgeTransaction
    } else {
      return null
    }
  }

  async fetchGet(url: string, _options: Object = {}) {
    const options = { ..._options }
    options.method = 'GET'
    const response = await this.ethEngine.io.fetch(url, options)
    if (!response.ok) {
      const {
        blockcypherApiKey,
        etherscanApiKey,
        infuraProjectId,
        blockchairApiKey
      } = this.ethEngine.initOptions
      if (typeof etherscanApiKey === 'string')
        url = url.replace(etherscanApiKey, 'private')
      if (Array.isArray(etherscanApiKey)) {
        for (const key of etherscanApiKey) {
          url = url.replace(key, 'private')
        }
      }
      // removes API keys from error messages
      if (blockcypherApiKey) url = url.replace(blockcypherApiKey, 'private')
      if (infuraProjectId) url = url.replace(infuraProjectId, 'private')
      if (blockchairApiKey) url = url.replace(blockchairApiKey, 'private')
      throw new Error(
        `The server returned error code ${response.status} for ${url}`
      )
    }
    return response.json()
  }

  async fetchGetEtherscan(server: string, cmd: string) {
    const { etherscanApiKey } = this.ethEngine.initOptions
    const chosenKey = Array.isArray(etherscanApiKey)
      ? pickRandom(etherscanApiKey, 1)[0]
      : etherscanApiKey
    const apiKey =
      chosenKey && chosenKey.length > 5 && server.includes('etherscan')
        ? '&apikey=' + chosenKey
        : ''

    const url = `${server}/api${cmd}${apiKey}`
    return this.fetchGet(url)
  }

  async fetchGetAmberdata(url: string, _options: Object = {}) {
    const options = { ..._options }
    options.method = 'GET'
    const response = await this.ethEngine.fetchCors(url, options)
    if (!response.ok) {
      throw new Error(
        `The server returned error code ${response.status} for ${url}`
      )
    }
    return response.json()
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
      throw new Error(
        `The server returned error code ${response.status} for ${parsedUrl.hostname}`
      )
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
      throw new Error(
        `The server returned error code ${response.status} for ${parsedUrl.hostname}`
      )
    }
    return response.json()
  }

  async fetchGetBlockchair(path: string, includeKey: boolean = false) {
    let keyParam = ''
    const { blockchairApiKey } = this.ethEngine.initOptions
    const {
      blockchairApiServers
    } = this.currencyInfo.defaultSettings.otherSettings
    if (includeKey && blockchairApiKey) {
      keyParam = `&key=${blockchairApiKey}`
    }
    const url = `${blockchairApiServers[0]}${path}${keyParam}`
    return this.fetchGet(url)
  }

  async fetchPostAmberdataRpc(method: string, params: string[] = []) {
    const { amberdataApiKey } = this.ethEngine.initOptions
    const {
      amberdataRpcServers
    } = this.currencyInfo.defaultSettings.otherSettings
    let apiKey = ''
    if (amberdataApiKey) {
      apiKey = '?x-api-key=' + amberdataApiKey
    }
    const url = `${amberdataRpcServers[0]}${apiKey}`
    const body = {
      jsonrpc: '2.0',
      method: method,
      params: params,
      id: 1
    }
    const response = await this.ethEngine.fetchCors(url, {
      headers: {
        'x-amberdata-blockchain-id': this.currencyInfo.defaultSettings
          .otherSettings.amberDataBlockchainId
      },
      method: 'POST',
      body: JSON.stringify(body)
    })
    const parsedUrl = parse(url, {}, true)
    if (!response.ok) {
      throw new Error(
        `The server returned error code ${response.status} for ${parsedUrl.hostname}`
      )
    }
    const jsonObj = await response.json()
    return jsonObj
  }

  async fetchGetAmberdataApi(path: string) {
    const { amberdataApiKey } = this.ethEngine.initOptions
    const {
      amberdataApiServers
    } = this.currencyInfo.defaultSettings.otherSettings
    const url = `${amberdataApiServers[0]}${path}`
    return this.fetchGetAmberdata(url, {
      headers: {
        'x-amberdata-blockchain-id': this.currencyInfo.defaultSettings
          .otherSettings.amberDataBlockchainId,
        'x-api-key': amberdataApiKey
      }
    })
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
    const { alethioApiKey } = this.ethEngine.initOptions
    const {
      alethioApiServers
    } = this.currencyInfo.defaultSettings.otherSettings
    const url = isPath ? `${alethioApiServers[0]}${pathOrLink}` : pathOrLink
    if (alethioApiKey && useApiKey) {
      return this.fetchGet(url, {
        headers: {
          Authorization: `Bearer ${alethioApiKey}`
        }
      })
    } else {
      return this.fetchGet(url)
    }
  }

  async broadcastEtherscan(
    edgeTransaction: EdgeTransaction,
    baseUrl: string
  ): Promise<BroadcastResults> {
    // RSK also uses the "eth_sendRaw" syntax
    const urlSuffix = `?module=proxy&action=eth_sendRawTransaction&hex=${edgeTransaction.signedTx}`
    const jsonObj = await this.fetchGetEtherscan(baseUrl, urlSuffix)

    if (typeof jsonObj.error !== 'undefined') {
      this.ethEngine.log.error(
        `FAILURE broadcastEtherscan\n${JSON.stringify(
          jsonObj.error
        )}\n${cleanTxLogs(edgeTransaction)}`
      )
      throw jsonObj.error
    } else if (typeof jsonObj.result === 'string') {
      // Success!!
      this.ethEngine.log.warn(
        `SUCCESS broadcastEtherscan\n${cleanTxLogs(edgeTransaction)}`
      )
      return jsonObj
    } else {
      this.ethEngine.log.error(
        `FAILURE broadcastEtherscan invalid return value\n${JSON.stringify(
          jsonObj
        )}\n${cleanTxLogs(edgeTransaction)}`
      )
      throw new Error('Invalid return value on transaction send')
    }
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

    if (typeof jsonObj.error !== 'undefined') {
      this.ethEngine.log.error(
        `FAILURE broadcastRPC ${parsedUrl.host}\n${JSON.stringify(
          jsonObj.error
        )}\n${cleanTxLogs(edgeTransaction)}`
      )
      throw jsonObj.error
    } else if (typeof jsonObj.result === 'string') {
      // Success!!
      this.ethEngine.log.warn(
        `SUCCESS broadcastRPC ${parsedUrl.host}\n${cleanTxLogs(
          edgeTransaction
        )}`
      )
      return jsonObj
    } else {
      this.ethEngine.log.error(
        `FAILURE broadcastRPC ${
          parsedUrl.host
        }\nInvalid return value ${JSON.stringify(jsonObj)}\n${cleanTxLogs(
          edgeTransaction
        )}`
      )
      throw new Error('Invalid return value on transaction send')
    }
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

    if (typeof jsonObj.error !== 'undefined') {
      this.ethEngine.log.error(
        `FAILURE broadcastBlockCypher\n${JSON.stringify(
          jsonObj.error
        )}\n${cleanTxLogs(edgeTransaction)}`
      )
      throw jsonObj.error
    } else if (jsonObj.tx && typeof jsonObj.tx.hash === 'string') {
      this.ethEngine.log.error(
        `SUCCESS broadcastBlockCypher\n${cleanTxLogs(edgeTransaction)}`
      )
      // Success!!
      return jsonObj
    } else {
      this.ethEngine.log.error(
        `FAILURE broadcastBlockCypher\nInvalid return data ${JSON.stringify(
          jsonObj
        )}\n${cleanTxLogs(edgeTransaction)}`
      )
      throw new Error('Invalid return value on transaction send')
    }
  }

  async multicastServers(func: EthFunction, ...params: any): Promise<any> {
    const {
      rpcServers,
      blockcypherApiServers,
      etherscanApiServers,
      blockbookServers,
      chainId
    } = this.currencyInfo.defaultSettings.otherSettings
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

        etherscanApiServers.forEach(baseUrl => {
          promises.push(
            broadcastWrapper(
              this.broadcastEtherscan(params[0], baseUrl),
              'etherscan'
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
        funcs = etherscanApiServers.map(server => async () => {
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
            this.ethEngine.log.error(msg)
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
              this.ethEngine.log.error(
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
            this.ethEngine.log.error(
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
            this.ethEngine.log.error(
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
        funcs = etherscanApiServers.map(server => async () => {
          // if falsy URL then error thrown
          if (!server.includes('etherscan') && !server.includes('blockscout')) {
            throw new Error(
              `Unsupported command eth_getTransactionCount in ${server}`
            )
          }
          const result = await this.fetchGetEtherscan(server, url)
          if (typeof result.result !== 'string') {
            const msg = `Invalid return value eth_getTransactionCount in ${server}`
            this.ethEngine.log.error(msg)
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
              this.ethEngine.log.error(
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
        funcs = etherscanApiServers.map(server => async () => {
          const result = await this.fetchGetEtherscan(server, url)
          if (!result.result || typeof result.result !== 'string') {
            const msg = `Invalid return value eth_getBalance in ${server}`
            this.ethEngine.log.error(msg)
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
              this.ethEngine.log.error(
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
        funcs = etherscanApiServers.map(server => async () => {
          const result = await this.fetchGetEtherscan(server, url)
          if (!result.result || typeof result.result !== 'string') {
            const msg = `Invalid return value getTokenBalance in ${server}`
            this.ethEngine.log.error(msg)
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
            searchRegularTxs ? 'txlist' : 'txlistinternal'
          }&module=account`
        } else {
          startUrl = `?action=tokentx&contractaddress=${contractAddress}&module=account`
        }
        url = `${startUrl}&address=${address}&startblock=${startBlock}&endblock=999999999&sort=asc&page=${page}&offset=${offset}`
        funcs = etherscanApiServers.map(server => async () => {
          const result = await this.fetchGetEtherscan(server, url)
          if (
            typeof result.result !== 'object' ||
            typeof result.result.length !== 'number'
          ) {
            const msg = `Invalid return value getTransactions in ${server}`
            this.ethEngine.log.error(msg)
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
          const result =
            server.indexOf('trezor') === -1
              ? await this.fetchGet(server + '/api/v2')
              : await this.ethEngine.fetchCors(server + '/api/v2')
          return { server, result }
        })
        // Randomize array
        funcs = shuffleArray(funcs)
        out = await asyncWaterfall(funcs)
        break

      case 'blockbookTxs':
        funcs = blockbookServers.map(server => async () => {
          const url = server + params[0]
          const result =
            server.indexOf('trezor') === -1
              ? await this.fetchGet(url)
              : await this.ethEngine.fetchCors(url)
          return { server, result }
        })
        // Randomize array
        funcs = shuffleArray(funcs)
        out = await asyncWaterfall(funcs)
        break
    }

    return out
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
        'blockbookBlockHeight'
      )

      const blockHeight = asBlockbookBlockHeight(jsonObj).blockbook.bestHeight
      return { blockHeight, server }
    } catch (e) {
      this.ethEngine.log(`checkBlockHeightBlockbook blockHeight ${e}`)
      throw new Error(`checkBlockHeightBlockbook returned invalid JSON`)
    }
  }

  async checkBlockHeightBlockchair(): Promise<EthereumNetworkUpdate> {
    const jsonObj = await this.fetchGetBlockchair(
      `/${this.currencyInfo.pluginId}/stats`,
      false
    )
    const valid = validateObject(jsonObj, BlockChairStatsSchema)
    if (valid) {
      const blockHeight = parseInt(jsonObj.data.blocks, 10)
      return { blockHeight, server: 'blockchair' }
    } else {
      throw new Error('Blockchair returned invalid JSON')
    }
  }

  async checkBlockHeightAmberdata(): Promise<EthereumNetworkUpdate> {
    const jsonObj = await this.fetchPostAmberdataRpc('eth_blockNumber', [])
    const valid = validateObject(jsonObj, AmberdataRpcSchema)
    if (valid) {
      const blockHeight = parseInt(jsonObj.result, 16)
      return { blockHeight, server: 'amberdata' }
    } else {
      throw new Error('Amberdata returned invalid JSON')
    }
  }

  async checkBlockHeight(): Promise<EthereumNetworkUpdate> {
    return asyncWaterfall([
      this.checkBlockHeightEthscan,
      this.checkBlockHeightAmberdata,
      this.checkBlockHeightBlockchair,
      this.checkBlockHeightBlockbook
    ]).catch(err => {
      this.ethEngine.log.error('checkBlockHeight failed to update', err)
      return {}
    })
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
    const jsonObj = await this.fetchPostAmberdataRpc(
      'eth_getTransactionCount',
      [address, 'latest']
    )
    const valid = validateObject(jsonObj, AmberdataRpcSchema)
    if (valid) {
      const newNonce = `${parseInt(jsonObj.result, 16)}`
      return { newNonce, server: 'amberdata' }
    } else {
      throw new Error('Amberdata returned invalid JSON')
    }
  }

  async checkNonce(): Promise<EthereumNetworkUpdate> {
    return asyncWaterfall([
      this.checkNonceEthscan,
      this.checkNonceAmberdata
    ]).catch(err => {
      this.ethEngine.log.error('checkNonce failed to update', err)
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
          const tx = this.processEtherscanTransaction(cleanedTx, currencyCode)
          allTransactions.push(tx)
        } catch (e) {
          this.ethEngine.log.error(
            `getAllTxsEthscan ${cleanerFunc.name}\n${
              e.message
            }\n${JSON.stringify(transactions[i])}`
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

  async checkTxsEthscan(
    startBlock: number,
    currencyCode: string
  ): Promise<EthereumNetworkUpdate> {
    let server
    let allTransactions

    if (currencyCode === this.currencyInfo.currencyCode) {
      const txsRegularResp = await this.getAllTxsEthscan(
        startBlock,
        currencyCode,
        asEtherscanTransaction,
        { searchRegularTxs: true }
      )
      const txsInternalResp = await this.getAllTxsEthscan(
        startBlock,
        currencyCode,
        asEtherscanInternalTransaction,
        { searchRegularTxs: false }
      )
      server = txsRegularResp.server || txsInternalResp.server
      allTransactions = [
        ...txsRegularResp.allTransactions,
        ...txsInternalResp.allTransactions
      ]
    } else {
      const tokenInfo = this.ethEngine.getTokenInfo(currencyCode)
      if (tokenInfo && typeof tokenInfo.contractAddress === 'string') {
        const contractAddress = tokenInfo.contractAddress
        const resp = await this.getAllTxsEthscan(
          startBlock,
          currencyCode,
          asEtherscanTokenTransaction,
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
      for (const tk of this.ethEngine.walletLocalData.enabledTokens) {
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
    const {
      native,
      token
    } = this.currencyInfo.defaultSettings.otherSettings.alethioCurrencies
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
        this.ethEngine.log.error(
          `checkTxsAlethio \n${e.message}\n${linkNext || ''}`
        )
        throw new Error('checkTxsAlethio response is invalid')
      }

      linkNext = cleanedResponseObj.links.next
      let hasNext = cleanedResponseObj.meta.page.hasNext

      for (const tokenTransfer of cleanedResponseObj.data) {
        try {
          const cleanTokenTransfer = asAlethioAccountsTokenTransfer(
            tokenTransfer
          )
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
          this.ethEngine.log.error(`checkTxsAlethio tokenTransfer ${e.message}`)
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
      for (const tk of this.ethEngine.walletLocalData.enabledTokens) {
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
    currencyCode: string,
    searchRegularTxs: boolean
  ): Promise<EdgeTransaction[]> {
    const address = this.ethEngine.walletLocalData.publicKey

    let page = 0
    const allTransactions: EdgeTransaction[] = []
    while (1) {
      let url = `/addresses/${address}/${
        searchRegularTxs ? 'transactions' : 'functions'
      }?page=${page}&size=${NUM_TRANSACTIONS_TO_QUERY}`

      if (searchRegularTxs) {
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
          this.ethEngine.log.error(
            `checkTxsAmberdata fetch regular ${e.message}\n${url}`
          )
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
            this.ethEngine.log.error(
              `checkTxsAmberdata process regular ${e.message}\n${JSON.stringify(
                amberdataTx
              )}`
            )
            throw new Error('checkTxsAmberdata regular amberdataTx is invalid')
          }
        }
        if (amberdataTxs.length === 0) {
          break
        }
        page++
      } else {
        let cleanedResponseObj: FetchGetAmberdataApiResponse
        try {
          if (startDate) {
            url = url + `&startDate=${startDate}&endDate=${Date.now()}`
          }
          const jsonObj = await this.fetchGetAmberdataApi(url)
          cleanedResponseObj = asFetchGetAmberdataApiResponse(jsonObj)
        } catch (e) {
          this.ethEngine.log.error(
            `checkTxsAmberdata fetch internal ${e.message}\n${url}`
          )
          throw new Error('checkTxsAmberdata (internal tx) response is invalid')
        }
        const amberdataTxs = cleanedResponseObj.payload.records
        for (const amberdataTx of amberdataTxs) {
          try {
            const cleanamberdataTx = asAmberdataAccountsFuncs(amberdataTx)
            const tx = this.processAmberdataTxInternal(
              cleanamberdataTx,
              currencyCode
            )
            if (tx) {
              allTransactions.push(tx)
            }
          } catch (e) {
            this.ethEngine.log.error(
              `checkTxsAmberdata process internal ${
                e.message
              }\n${JSON.stringify(amberdataTx)}`
            )
            throw new Error('checkTxsAmberdata internal amberdataTx is invalid')
          }
        }
        if (amberdataTxs.length === 0) {
          break
        }
        page++
      }
    }

    return allTransactions
  }

  async checkTxsAmberdata(
    startBlock: number,
    startDate: number,
    currencyCode: string
  ): Promise<EthereumNetworkUpdate> {
    const allTxsRegular: EdgeTransaction[] = await this.getAllTxsAmberdata(
      startBlock,
      startDate,
      currencyCode,
      true
    )

    const allTxsInternal: EdgeTransaction[] = await this.getAllTxsAmberdata(
      startBlock,
      startDate,
      currencyCode,
      false
    )

    return {
      tokenTxs: {
        [`${this.currencyInfo.currencyCode}`]: {
          blockHeight: startBlock,
          edgeTransactions: [...allTxsRegular, ...allTxsInternal]
        }
      },
      server: 'amberdata'
    }
  }

  async checkTxs(
    startBlock: number,
    startDate: number,
    currencyCode: string
  ): Promise<EthereumNetworkUpdate> {
    let checkTxsFuncs = []
    // const useApiKey = true
    if (currencyCode === this.currencyInfo.currencyCode) {
      checkTxsFuncs = [
        async () => this.checkTxsAmberdata(startBlock, startDate, currencyCode),
        // async () => this.checkTxsAlethio(startBlock, currencyCode, useApiKey),
        // async () => this.checkTxsAlethio(startBlock, currencyCode, !useApiKey),
        async () => this.checkTxsBlockbook(startBlock),
        async () => this.checkTxsEthscan(startBlock, currencyCode)
      ]
    } else {
      checkTxsFuncs = [
        // async () => this.checkTxsAlethio(startBlock, currencyCode, useApiKey),
        // async () => this.checkTxsAlethio(startBlock, currencyCode, !useApiKey),
        async () => this.checkTxsBlockbook(startBlock),
        async () => this.checkTxsEthscan(startBlock, currencyCode)
      ]
    }
    return asyncWaterfall(checkTxsFuncs).catch(err => {
      this.ethEngine.log.error('checkTxs failed to update', err)
      return {}
    })
  }

  async checkTxsBlockbook(
    startBlock: number = 0
  ): Promise<EthereumNetworkUpdate> {
    const address = this.ethEngine.walletLocalData.publicKey.toLowerCase()
    let page = 1
    let totalPages = 1
    const out = {
      newNonce: '0',
      tokenBal: {},
      tokenTxs: {},
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
        this.ethEngine.log.error(
          `checkTxsBlockbook ${server} BlockbookAddress ${JSON.stringify(
            jsonObj
          )}`
        )
        throw new Error(
          `Blockbook ${server} returned invalid JSON for BlockbookAddress`
        )
      }
      const { nonce, tokens, balance, transactions } = addressInfo
      out.newNonce = nonce
      out.tokenBal.ETH = balance
      out.server = server
      totalPages = addressInfo.totalPages
      page++

      // Token balances
      for (const token: BlockbookTokenBalance of tokens) {
        try {
          const { symbol, balance } = asBlockbookTokenBalance(token)
          out.tokenBal[symbol] = balance
        } catch (e) {
          this.ethEngine.log.error(
            `checkTxsBlockbook ${server} BlockbookTokenBalance ${JSON.stringify(
              token
            )}`
          )
          throw new Error(
            `Blockbook ${server} returned invalid JSON for BlockbookTokenBalance`
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
                transactionsArray.push(
                  this.processBlockbookTx(tx, tokenTransfer)
                )
              }
            }
          }
          if (
            address === tx.vout[0].addresses[0].toLowerCase() ||
            address === tx.vin[0].addresses[0].toLowerCase()
          )
            transactionsArray.push(this.processBlockbookTx(tx))
        } catch (e) {
          this.ethEngine.log.error(
            `checkTxsBlockbook ${server} BlockbookTx ${JSON.stringify(tx)}`
          )
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
      ethereumSpecific: { gasLimit, status, gasUsed, gasPrice },
      vin,
      vout
    } = blockbookTx
    const ourAddress = this.ethEngine.walletLocalData.publicKey.toLowerCase()
    let toAddress = vout[0].addresses[0].toLowerCase()
    let fromAddress = vin[0].addresses[0].toLowerCase()
    let currencyCode = 'ETH'
    let nativeAmount = value
    let tokenRecipientAddress = null
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
    // Override currencyCode and nativeAmount if token transaction
    if (tokenTx) {
      const { symbol, value, to, from } = tokenTx
      toAddress = to.toLowerCase()
      fromAddress = from.toLowerCase()
      currencyCode = symbol
      nativeAmount = toAddress === ourAddress ? value : bns.mul('-1', value)
      tokenRecipientAddress = toAddress
      networkFee = '0'
      parentNetworkFee = bns.mul(gasPrice, gasUsed.toString())
    }
    const otherParams: EthereumTxOtherParams = {
      from: [fromAddress],
      to: [toAddress],
      gas: gasLimit.toString(),
      gasPrice,
      gasUsed: gasUsed.toString(),
      errorVal: status,
      tokenRecipientAddress
    }
    const edgeTransaction: EdgeTransaction = {
      txid,
      date: blockTime,
      currencyCode,
      blockHeight,
      nativeAmount,
      networkFee,
      parentNetworkFee,
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
    let cleanedResponseObj: EtherscanGetAccountBalance
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
      cleanedResponseObj = asEtherscanGetAccountBalance(jsonObj)
    } catch (e) {
      this.ethEngine.log.error(`checkTokenBalEthscan ${e.message}`)
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
    const url = `/${this.currencyInfo.pluginId}/dashboards/address/${address}?erc_20=true`
    try {
      const jsonObj = await this.fetchGetBlockchair(url, true)
      cleanedResponseObj = asCheckTokenBalBlockchair(jsonObj)
    } catch (e) {
      this.ethEngine.log.error(`checkTokenBalBlockchair ${url} ${e.message}`)
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
        this.ethEngine.log.error(
          `checkTokenBalBlockchair tokenData ${e.message}\n${JSON.stringify(
            tokenData
          )}`
        )
        throw new Error('checkTokenBalBlockchair tokenData is invalid')
      }
    }
    return { tokenBal: response, server: 'blockchair' }
  }

  async checkTokenBal(tk: string): Promise<EthereumNetworkUpdate> {
    return asyncWaterfall([
      async () => this.checkTokenBalEthscan(tk),
      this.checkTokenBalBlockchair
    ]).catch(err => {
      this.ethEngine.log.error('checkTokenBal failed to update', err)
      return {}
    })
  }

  async checkAndUpdate(
    lastChecked: number = 0,
    pollMillisec: number,
    preUpdateBlockHeight: number,
    checkFunc: () => EthereumNetworkUpdate
  ) {
    const now = Date.now()
    if (now - lastChecked > pollMillisec) {
      try {
        const ethUpdate = await checkFunc()
        this.processEthereumNetworkUpdate(now, ethUpdate, preUpdateBlockHeight)
      } catch (e) {
        this.ethEngine.log.error(e)
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
        this.checkBlockHeight
      )

      await this.checkAndUpdate(
        this.ethNeeds.nonceLastChecked,
        NONCE_POLL_MILLISECONDS,
        preUpdateBlockHeight,
        this.checkNonce
      )

      let currencyCodes
      if (
        this.ethEngine.walletLocalData.enabledTokens.indexOf(
          this.currencyInfo.currencyCode
        ) === -1
      ) {
        currencyCodes = [this.currencyInfo.currencyCode].concat(
          this.ethEngine.walletLocalData.enabledTokens
        )
      } else {
        currencyCodes = this.ethEngine.walletLocalData.enabledTokens
      }
      for (const tk of currencyCodes) {
        await this.checkAndUpdate(
          this.ethNeeds.tokenBalLastChecked[tk],
          BAL_POLL_MILLISECONDS,
          preUpdateBlockHeight,
          async () => this.checkTokenBal(tk)
        )

        await this.checkAndUpdate(
          this.ethNeeds.tokenTxsLastChecked[tk],
          TXS_POLL_MILLISECONDS,
          preUpdateBlockHeight,
          async () =>
            this.checkTxs(
              this.getQueryHeightWithLookback(
                this.ethEngine.walletLocalData.lastTransactionQueryHeight[tk]
              ),
              this.getQueryDateWithLookback(
                this.ethEngine.walletLocalData.lastTransactionDate[tk]
              ),
              tk
            )
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
          this.ethEngine.walletLocalData.lastTransactionQueryHeight[
            tk
          ] = preUpdateBlockHeight
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
}
