import { add, mul, sub } from 'biggystring'
import { EdgeTransaction } from 'edge-core-js/types'

import { asIntegerString } from '../../common/types'
import { decimalToHex, pickRandom, safeErrorMessage } from '../../common/utils'
import {
  BroadcastResults,
  EdgeTransactionsBlockHeightTuple,
  EthereumNetworkUpdate,
  getFeeRateUsed
} from '../EthereumNetwork'
import {
  asEtherscanGetAccountNonce,
  asEtherscanGetBlockHeight
} from '../ethereumSchema'
import {
  asEvmScancanTokenTransaction,
  asEvmScanInternalTransaction,
  asEvmScanTransaction,
  asGetTransactionReceipt,
  asRpcResultString,
  EthereumTxOtherParams,
  EvmScanInternalTransaction,
  EvmScanTransaction,
  RpcResultString
} from '../ethereumTypes'
import { getEvmScanApiKey } from '../fees/feeProviders'
import { GetTxsParams, NetworkAdapter } from './types'

interface GetEthscanAllTxsOptions {
  contractAddress?: string
  searchRegularTxs?: boolean
}

interface GetEthscanAllTxsResponse {
  allTransactions: EdgeTransaction[]
  server: string | undefined
}

const NUM_TRANSACTIONS_TO_QUERY = 50

export interface EvmScanAdapterConfig {
  type: 'evmscan'
  servers: string[]
}

export class EvmScanAdapter extends NetworkAdapter<EvmScanAdapterConfig> {
  getBaseFeePerGas = null
  multicastRpc = null
  fetchTokenBalances = null

  fetchBlockheight = async (): Promise<EthereumNetworkUpdate> => {
    const { result: jsonObj, server } = await this.serialServers(
      async server => {
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
      }
    )

    const clean = asEtherscanGetBlockHeight(jsonObj)
    return { blockHeight: clean.result, server }
  }

  broadcast = async (
    edgeTransaction: EdgeTransaction
  ): Promise<BroadcastResults> => {
    return await this.parallelServers(async baseUrl => {
      // RSK also uses the "eth_sendRaw" syntax
      const urlSuffix = `?module=proxy&action=eth_sendRawTransaction&hex=${edgeTransaction.signedTx}`
      const jsonObj = await this.fetchGetEtherscan(baseUrl, urlSuffix)
      return {
        result: this.broadcastResponseHandler(
          jsonObj,
          baseUrl,
          edgeTransaction
        ),
        server: 'etherscan'
      }
    })
  }

  fetchNonce = async (): Promise<EthereumNetworkUpdate> => {
    const address = this.ethEngine.walletLocalData.publicKey

    const url = `?module=proxy&action=eth_getTransactionCount&address=${address}&tag=latest`
    const { result: jsonObj, server } = await this.serialServers(
      async server => {
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
      }
    )

    const clean = asEtherscanGetAccountNonce(jsonObj)
    return { newNonce: clean.result, server }
  }

  fetchTokenBalance = async (tk: string): Promise<EthereumNetworkUpdate> => {
    const address = this.ethEngine.walletLocalData.publicKey
    let response
    let jsonObj
    let server
    let cleanedResponseObj: RpcResultString
    try {
      if (tk === this.ethEngine.currencyInfo.currencyCode) {
        const url = `?module=account&action=balance&address=${address}&tag=latest`
        response = await this.serialServers(async server => {
          const result = await this.fetchGetEtherscan(server, url)
          if (typeof result.result !== 'string' || result.result === '') {
            const msg = `Invalid return value eth_getBalance in ${server}`
            this.ethEngine.error(msg)
            throw new Error(msg)
          }
          asIntegerString(result.result)
          return { server, result }
        })

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
          const response = await this.serialServers(async server => {
            const result = await this.fetchGetEtherscan(server, url)
            if (typeof result.result !== 'string' || result.result === '') {
              const msg = `Invalid return value getTokenBalance in ${server}`
              this.ethEngine.error(msg)
              throw new Error(msg)
            }
            return { server, result }
          })

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

  fetchTxs = async (params: GetTxsParams): Promise<EthereumNetworkUpdate> => {
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

  // TODO: Clean return type
  private async fetchGetEtherscan(server: string, cmd: string): Promise<any> {
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

  private async getAllTxsEthscan(
    startBlock: number,
    currencyCode: string,
    cleanerFunc: Function,
    options: GetEthscanAllTxsOptions
  ): Promise<GetEthscanAllTxsResponse> {
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

      const response =
        this.config.servers.length === 0
          ? // HACK: If a currency doesn't have an etherscan API compatible
            // server we need to return an empty array
            { result: { result: [] }, server: undefined }
          : await this.serialServers(async server => {
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

  private async processEvmScanTransaction(
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
    if (isSpend && this.ethEngine.networkInfo.optimismRollupParams != null) {
      const response = await this.ethEngine.ethNetwork.multicastRpc(
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
      walletId: this.ethEngine.walletId
    }

    return edgeTransaction
    // or should be this.addTransaction(currencyCode, edgeTransaction)?
  }
}
