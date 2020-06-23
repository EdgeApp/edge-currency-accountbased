// @flow
import { bns } from 'biggystring'
import type {
  EdgeCurrencyInfo,
  EdgeTransaction
} from 'edge-core-js/src/types/types'
import parse from 'url-parse'

import {
  asyncWaterfall,
  isHex,
  pickRandom,
  promiseAny,
  shuffleArray,
  snooze,
  validateObject
} from '../common/utils'
import { EthereumEngine } from './ethEngine'
import {
  AlethioAccountsTokenTransferSchema,
  AmberdataAccountsFuncsSchema,
  AmberdataAccountsTxSchema,
  AmberdataRpcSchema,
  BlockChairAddressSchema,
  BlockChairStatsSchema,
  EtherscanGetAccountBalance,
  EtherscanGetAccountNonce,
  EtherscanGetBlockHeight,
  EtherscanGetInternalTransactions,
  EtherscanGetTokenTransactions,
  EtherscanGetTransactions
} from './ethSchema'
import type {
  AlethioTokenTransfer,
  AmberdataInternalTx,
  AmberdataTx,
  EthereumTxOtherParams,
  EtherscanInternalTransaction,
  EtherscanTransaction
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
  edgeTransactions: Array<EdgeTransaction>
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

type BroadcastResults = {
  incrementNonce: boolean,
  decrementNonce: boolean
}

type GetEthscanAllTxsOptions = {
  contractAddress?: string,
  searchRegularTxs?: boolean
}

type GetEthscanAllTxsResponse = {
  allTransactions: Array<EdgeTransaction>,
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
    const ourReceiveAddresses: Array<string> = []
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
    const edgeTransaction: EdgeTransaction = {
      txid: tx.hash,
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
    const ourReceiveAddresses: Array<string> = []
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
    const ourReceiveAddresses: Array<string> = []
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
    const ourReceiveAddresses: Array<string> = []
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

    if (url.includes('infura')) {
      const { infuraProjectId } = this.ethEngine.initOptions
      const projectIdSyntax = infuraProjectId || ''
      if (!infuraProjectId || infuraProjectId.length < 6) {
        throw new Error('Need Infura Project ID')
      }
      url += `/${projectIdSyntax}`
    }

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

  async fetchPostAmberdataRpc(method: string, params: Array<string> = []) {
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
    const response = await this.ethEngine.io.fetch(url, {
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
    return this.fetchGet(url, {
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

  async fetchGetAlethio(pathOrLink: string, isPath: boolean = true) {
    const { alethioApiKey } = this.ethEngine.initOptions
    const {
      alethioApiServers
    } = this.currencyInfo.defaultSettings.otherSettings
    if (alethioApiKey) {
      const url = isPath ? `${alethioApiServers[0]}${pathOrLink}` : pathOrLink
      return this.fetchGet(url, {
        headers: {
          Authorization: `Bearer ${alethioApiKey}`
        }
      })
    } else {
      return Promise.reject(
        new Error('fetchGetAlethio ERROR: alethioApiKey not set')
      )
    }
  }

  async broadcastEtherscan(
    edgeTransaction: EdgeTransaction,
    baseUrl: string
  ): Promise<BroadcastResults> {
    const transactionParsed = JSON.stringify(edgeTransaction, null, 2)

    this.ethEngine.log(
      `${this.currencyInfo.currencyCode} Etherscan: sent transaction to network:\n${transactionParsed}\n`
    )
    // RSK also uses the "eth_sendRaw" syntax
    const urlSuffix = `?module=proxy&action=eth_sendRawTransaction&hex=${edgeTransaction.signedTx}`
    const jsonObj = await this.fetchGetEtherscan(baseUrl, urlSuffix)

    this.ethEngine.log('broadcastEtherscan jsonObj:', jsonObj)

    if (typeof jsonObj.error !== 'undefined') {
      this.ethEngine.log('EtherScan: Error sending transaction')
      throw jsonObj.error
    } else if (typeof jsonObj.result === 'string') {
      // Success!!
      return jsonObj
    } else {
      throw new Error('Invalid return value on transaction send')
    }
  }

  async broadcastRPC(
    edgeTransaction: EdgeTransaction,
    networkId: number,
    baseUrl: string
  ): Promise<BroadcastResults> {
    const transactionParsed = JSON.stringify(edgeTransaction, null, 2)

    const method = 'eth_sendRawTransaction'
    const params = [edgeTransaction.signedTx]

    const jsonObj = await this.fetchPostRPC(method, params, networkId, baseUrl)

    const parsedUrl = parse(baseUrl, {}, true)

    if (typeof jsonObj.error !== 'undefined') {
      this.ethEngine.log(`${parsedUrl.host}: Error sending transaction`)
      throw jsonObj.error
    } else if (typeof jsonObj.result === 'string') {
      // Success!!
      this.ethEngine.log(
        `${parsedUrl.host}: sent transaction to network:\n${transactionParsed}\n`
      )
      return jsonObj
    } else {
      throw new Error('Invalid return value on transaction send')
    }
  }

  async broadcastBlockCypher(
    edgeTransaction: EdgeTransaction,
    baseUrl: string
  ): Promise<BroadcastResults> {
    const transactionParsed = JSON.stringify(edgeTransaction, null, 2)
    this.ethEngine.log(
      `Blockcypher: sending transaction to network:\n${transactionParsed}\n`
    )

    const urlSuffix = `v1/${this.currencyInfo.currencyCode.toLowerCase()}/main/txs/push`
    const hexTx = edgeTransaction.signedTx.replace('0x', '')
    const jsonObj = await this.fetchPostBlockcypher(
      urlSuffix,
      { tx: hexTx },
      baseUrl
    )

    this.ethEngine.log('broadcastBlockCypher jsonObj:', jsonObj)
    if (typeof jsonObj.error !== 'undefined') {
      this.ethEngine.log('BlockCypher: Error sending transaction')
      throw jsonObj.error
    } else if (jsonObj.tx && typeof jsonObj.tx.hash === 'string') {
      this.ethEngine.log(`Blockcypher success sending txid ${jsonObj.tx.hash}`)
      // Success!!
      return jsonObj
    } else {
      throw new Error('Invalid return value on transaction send')
    }
  }

  async multicastServers(func: EthFunction, ...params: any): Promise<any> {
    const {
      rpcServers,
      blockcypherApiServers,
      etherscanApiServers,
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
            this.ethEngine.log(msg)
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
            this.ethEngine.log(msg)
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
            this.ethEngine.log(msg)
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
            this.ethEngine.log(msg)
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
            this.ethEngine.log(msg)
            throw new Error(msg)
          }
          return { server, result }
        })
        // Randomize array
        funcs = shuffleArray(funcs)
        out = await asyncWaterfall(funcs)
        break
      }
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

  async checkBlockHeightBlockchair(): Promise<EthereumNetworkUpdate> {
    const jsonObj = await this.fetchGetBlockchair(
      `/${this.currencyInfo.pluginName}/stats`,
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
      this.checkBlockHeightBlockchair
    ]).catch(err => {
      this.ethEngine.log('checkBlockHeight failed to update', err)
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
      this.ethEngine.log('checkNonce failed to update', err)
      return {}
    })
  }

  async getAllTxsEthscan(
    startBlock: number,
    currencyCode: string,
    schema:
      | EtherscanGetTransactions
      | EtherscanGetInternalTransactions
      | EtherscanGetTokenTransactions,
    options: GetEthscanAllTxsOptions
  ): Promise<GetEthscanAllTxsResponse> {
    const address = this.ethEngine.walletLocalData.publicKey
    let page = 1

    const allTransactions: Array<EdgeTransaction> = []
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
      const jsonObj = response.result
      const valid = validateObject(jsonObj, schema)
      if (valid) {
        const transactions = jsonObj.result
        for (let i = 0; i < transactions.length; i++) {
          const tx = this.processEtherscanTransaction(
            transactions[i],
            currencyCode
          )
          allTransactions.push(tx)
        }
        if (transactions.length < NUM_TRANSACTIONS_TO_QUERY) {
          break
        }
        page++
      } else {
        throw new Error(
          `checkTxsEthscan invalid JSON data:${JSON.stringify(jsonObj)}`
        )
      }
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
        EtherscanGetTransactions,
        { searchRegularTxs: true }
      )
      const txsInternalResp = await this.getAllTxsEthscan(
        startBlock,
        currencyCode,
        EtherscanGetInternalTransactions,
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
          EtherscanGetTokenTransactions,
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
    currencyCode: string
  ): Promise<EthereumNetworkUpdate> {
    const address = this.ethEngine.walletLocalData.publicKey
    const {
      native,
      token
    } = this.currencyInfo.defaultSettings.otherSettings.alethioCurrencies
    let linkNext
    const allTransactions: Array<EdgeTransaction> = []
    while (1) {
      let jsonObj
      if (linkNext) {
        jsonObj = await this.fetchGetAlethio(linkNext, false)
      } else {
        if (currencyCode === this.currencyInfo.currencyCode) {
          jsonObj = await this.fetchGetAlethio(
            `/accounts/${address}/${native}Transfers`,
            true
          )
        } else {
          jsonObj = await this.fetchGetAlethio(
            `/accounts/${address}/${token}Transfers`,
            true
          )
        }
      }
      const valid = validateObject(jsonObj, AlethioAccountsTokenTransferSchema)
      if (valid) {
        const tokenTransfers: Array<AlethioTokenTransfer> = jsonObj.data
        linkNext = jsonObj.links.next
        let hasNext = jsonObj.meta.page.hasNext
        for (const tokenTransfer of tokenTransfers) {
          const txBlockheight = tokenTransfer.attributes.globalRank[0]
          if (txBlockheight > startBlock) {
            let txCurrencyCode = this.currencyInfo.currencyCode
            if (currencyCode !== this.currencyInfo.currencyCode) {
              const contractAddress = tokenTransfer.relationships.token.data.id
              txCurrencyCode = this.getTokenCurrencyCode(contractAddress)
            }
            if (typeof txCurrencyCode === 'string') {
              const tx = this.processAlethioTransaction(
                tokenTransfer,
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
        }
        if (!hasNext) {
          break
        }
      } else {
        throw new Error(`checkTxsAlethio response is invalid(2)`)
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
  ): Promise<Array<EdgeTransaction>> {
    const address = this.ethEngine.walletLocalData.publicKey

    let page = 0
    const allTransactions: Array<EdgeTransaction> = []
    while (1) {
      let url = `/addresses/${address}/${
        searchRegularTxs ? 'transactions' : 'functions'
      }?page=${page}&size=${NUM_TRANSACTIONS_TO_QUERY}`

      if (searchRegularTxs) {
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
        const valid = validateObject(jsonObj, AmberdataAccountsTxSchema)
        if (valid) {
          const amberdataTxs: Array<AmberdataTx> = jsonObj.payload.records
          for (const amberdataTx of amberdataTxs) {
            const tx = this.processAmberdataTxRegular(amberdataTx, currencyCode)
            if (tx) {
              allTransactions.push(tx)
            }
          }
          if (amberdataTxs.length < NUM_TRANSACTIONS_TO_QUERY) {
            break
          }
          page++
        } else {
          throw new Error('checkTxsAmberdata (regular tx) response is invalid')
        }
      } else {
        if (startDate) {
          url = url + `&startDate=${startDate}&endDate=${Date.now()}`
        }
        const jsonObj = await this.fetchGetAmberdataApi(url)
        const valid = validateObject(jsonObj, AmberdataAccountsFuncsSchema)
        if (valid) {
          const amberdataTxs: Array<AmberdataInternalTx> =
            jsonObj.payload.records
          for (const amberdataTx of amberdataTxs) {
            const tx = this.processAmberdataTxInternal(
              amberdataTx,
              currencyCode
            )
            if (tx) {
              allTransactions.push(tx)
            }
          }
          if (amberdataTxs.length < NUM_TRANSACTIONS_TO_QUERY) {
            break
          }
          page++
        } else {
          throw new Error('checkTxsAmberdata (internal tx) response is invalid')
        }
      }
    }

    return allTransactions
  }

  async checkTxsAmberdata(
    startBlock: number,
    startDate: number,
    currencyCode: string
  ): Promise<EthereumNetworkUpdate> {
    const allTxsRegular: Array<EdgeTransaction> = await this.getAllTxsAmberdata(
      startBlock,
      startDate,
      currencyCode,
      true
    )

    const allTxsInternal: Array<EdgeTransaction> = await this.getAllTxsAmberdata(
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
    if (currencyCode === this.currencyInfo.currencyCode) {
      checkTxsFuncs = [
        async () => this.checkTxsAmberdata(startBlock, startDate, currencyCode),
        async () => this.checkTxsAlethio(startBlock, currencyCode),
        async () => this.checkTxsEthscan(startBlock, currencyCode)
      ]
    } else {
      checkTxsFuncs = [
        async () => this.checkTxsAlethio(startBlock, currencyCode),
        async () => this.checkTxsEthscan(startBlock, currencyCode)
      ]
    }
    return asyncWaterfall(checkTxsFuncs).catch(err => {
      this.ethEngine.log('checkTxs failed to update', err)
      return {}
    })
  }

  async checkTokenBalEthscan(tk: string): Promise<EthereumNetworkUpdate> {
    const address = this.ethEngine.walletLocalData.publicKey
    let jsonObj = {}
    let server

    if (tk === this.currencyInfo.currencyCode) {
      const response = await this.multicastServers('eth_getBalance', address)
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
    const valid = validateObject(jsonObj, EtherscanGetAccountBalance)
    if (valid && /^\d+$/.test(jsonObj.result)) {
      const balance = jsonObj.result
      return { tokenBal: { [tk]: balance }, server }
    } else {
      throw new Error(
        `Ethscan returned invalid JSON for ${this.currencyInfo.currencyCode} tokens`
      )
    }
  }

  async checkTokenBalBlockchair(): Promise<EthereumNetworkUpdate> {
    const address = this.ethEngine.walletLocalData.publicKey
    const jsonObj = await this.fetchGetBlockchair(
      `/${this.currencyInfo.pluginName}/dashboards/address/${address}?erc_20=true`,
      true
    )
    const valid = validateObject(jsonObj, BlockChairAddressSchema)
    if (valid) {
      // Note: Blockchair returns eth balance and all tokens balances
      const response = {
        [this.currencyInfo.currencyCode]: jsonObj.data[address].address.balance
      }

      for (const tokenData of jsonObj.data[address].layer_2.erc_20) {
        const balance = tokenData.balance
        const tokenAddress = tokenData.token_address
        const tokenSymbol = tokenData.token_symbol
        const tokenInfo = this.ethEngine.getTokenInfo(tokenSymbol)
        if (tokenInfo && tokenInfo.contractAddress === tokenAddress) {
          response[tokenSymbol] = balance
        } else {
          // Do nothing, eg: Old DAI token balance is ignored
        }
      }
      return { tokenBal: response, server: 'blockchair' }
    } else {
      throw new Error('Blockchair returned invalid JSON')
    }
  }

  async checkTokenBal(tk: string): Promise<EthereumNetworkUpdate> {
    return asyncWaterfall([
      async () => this.checkTokenBalEthscan(tk),
      this.checkTokenBalBlockchair
    ]).catch(err => {
      this.ethEngine.log('checkTokenBal failed to update', err)
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
        console.log(e)
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
