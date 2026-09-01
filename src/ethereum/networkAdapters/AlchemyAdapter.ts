import { add, gt, mul, sub } from 'biggystring'
import {
  asArray,
  asEither,
  asNull,
  asNumber,
  asObject,
  asOptional,
  asString,
  asUnknown
} from 'cleaners'
import { EdgeTransaction, JsonObject } from 'edge-core-js/types'
import parse from 'url-parse'

import { asMaybeContractLocation } from '../../common/tokenHelpers'
import { decimalToHex, hexToDecimal } from '../../common/utils'
import { EthereumEngine } from '../EthereumEngine'
import {
  EdgeTransactionsBlockHeightTuple,
  EthereumNetworkUpdate,
  getFeeRateUsed
} from '../EthereumNetwork'
import { EthereumTxOtherParams } from '../ethereumTypes'
import { resolveServerApiKey } from './apiKeyTemplate'
import { TransactionProcessingContext } from './EvmScanAdapter'
import { GetTxsParams, NetworkAdapter } from './networkAdapterTypes'

/** Alchemy caps `maxCount` at 1000 transfers per page */
const MAX_TRANSFERS_PER_PAGE = '0x3e8'

export interface AlchemyAdapterConfig {
  type: 'alchemy'
  /**
   * Alchemy JSON-RPC endpoints for the chain, such as
   * `https://<network>.g.alchemy.com/v2/{{alchemyApiKey}}`. A server whose
   * placeholder has no init option is dropped, so a missing key only removes
   * this adapter from the waterfall.
   */
  servers: string[]
}

/**
 * Transaction history and token balances from Alchemy's enhanced APIs.
 *
 * `alchemy_getAssetTransfers` reports value movements rather than
 * transactions, without gas data, so a wallet's outgoing transactions are
 * completed with `eth_getTransactionByHash` and `eth_getTransactionReceipt`
 * from the same endpoint. The `internal` category is not available on every
 * network Alchemy serves; where it is missing, ETH paid out to the wallet from
 * inside a contract call is not reported by this adapter.
 */
export class AlchemyAdapter extends NetworkAdapter<AlchemyAdapterConfig> {
  batchMulticastRpc = null
  broadcast = null
  connect = null
  disconnect = null
  fetchBlockheight = null
  fetchNonce = null
  fetchTokenBalance = null
  getBaseFeePerGas = null
  multicastRpc = null
  subscribeAddressSync = null

  constructor(ethEngine: EthereumEngine, config: AlchemyAdapterConfig) {
    super(ethEngine, config)

    this.config.servers = this.config.servers
      .map((server): string | undefined => {
        try {
          return resolveServerApiKey(server, ethEngine)
        } catch (error: unknown) {
          return undefined
        }
      })
      .filter((server): server is string => server != null)
  }

  fetchTokenBalances = async (): Promise<EthereumNetworkUpdate> => {
    const { allTokensMap, walletLocalData } = this.ethEngine
    const address = walletLocalData.publicKey

    const contractAddresses: string[] = []
    for (const token of Object.values(allTokensMap)) {
      const location = asMaybeContractLocation(token.networkLocation)
      if (location != null) contractAddresses.push(location.contractAddress)
    }

    const { result, server } = await this.serialServers(async baseUrl => {
      const requests = [
        { method: 'eth_getBalance', params: [address, 'latest'] },
        {
          method: 'alchemy_getTokenBalances',
          params: [address, contractAddresses]
        }
      ]
      const [rawBalance, rawTokenBalances] = await this.fetchBatchRpc(
        baseUrl,
        requests
      )
      return {
        server: parse(baseUrl).hostname,
        result: {
          balance: asString(rawBalance),
          tokenBalances: asTokenBalancesResult(rawTokenBalances).tokenBalances
        }
      }
    })

    const tokenBal: EthereumNetworkUpdate['tokenBal'] = new Map()
    const detectedTokenIds: string[] = []
    tokenBal.set(null, hexToDecimal(result.balance))
    for (const tokenBalance of result.tokenBalances) {
      const tokenId = tokenBalance.contractAddress
        .toLowerCase()
        .replace('0x', '')
      if (allTokensMap[tokenId] == null) {
        this.logError(
          'fetchTokenBalances',
          new Error(
            `Alchemy returned an unknown token: ${tokenBalance.contractAddress}`
          )
        )
        continue
      }
      const balance = hexToDecimal(tokenBalance.tokenBalance ?? '0x0')
      if (gt(balance, '0')) detectedTokenIds.push(tokenId)
      tokenBal.set(tokenId, balance)
    }

    return { tokenBal, detectedTokenIds, server }
  }

  fetchTxs = async (params: GetTxsParams): Promise<EthereumNetworkUpdate> => {
    const { startBlock, tokenId } = params
    const address = this.ethEngine.walletLocalData.publicKey

    let contractAddress: string | undefined
    if (tokenId != null) {
      const location = asMaybeContractLocation(
        this.ethEngine.allTokensMap[tokenId]?.networkLocation
      )
      if (location == null) return {}
      contractAddress = location.contractAddress
    }

    const { result: edgeTransactions, server } = await this.serialServers(
      async baseUrl => {
        const transfers = [
          ...(await this.fetchAssetTransfers(baseUrl, {
            startBlock,
            contractAddress,
            fromAddress: address
          })),
          ...(await this.fetchAssetTransfers(baseUrl, {
            startBlock,
            contractAddress,
            toAddress: address
          }))
        ]

        // Only the wallet's own outgoing transactions need gas data:
        const spendTxids = new Set<string>()
        for (const transfer of transfers) {
          if (transfer.from.toLowerCase() === address.toLowerCase()) {
            spendTxids.add(transfer.hash.toLowerCase())
          }
        }
        const txDetails = await this.fetchTxDetails(baseUrl, [...spendTxids])

        const edgeTransactions = processAlchemyTransfers(
          {
            allTokensMap: this.ethEngine.allTokensMap,
            currencyInfo: this.ethEngine.currencyInfo,
            forWhichAddress: address,
            forWhichTokenId: tokenId,
            forWhichWalletId: this.ethEngine.walletId
          },
          transfers,
          txDetails
        )
        return { server: parse(baseUrl).hostname, result: edgeTransactions }
      }
    )

    const edgeTransactionsBlockHeightTuple: EdgeTransactionsBlockHeightTuple = {
      blockHeight: startBlock,
      edgeTransactions
    }
    const maxBlockHeight = edgeTransactions.reduce((max, tx) => {
      return Math.max(max, tx.blockHeight)
    }, 0)
    return {
      tokenTxs: new Map([[tokenId, edgeTransactionsBlockHeightTuple]]),
      blockHeight: maxBlockHeight,
      server
    }
  }

  /**
   * Pages through `alchemy_getAssetTransfers` for one direction of one asset.
   */
  private async fetchAssetTransfers(
    baseUrl: string,
    query: {
      startBlock: number
      contractAddress?: string
      fromAddress?: string
      toAddress?: string
    }
  ): Promise<AlchemyAssetTransfer[]> {
    const { startBlock, contractAddress, fromAddress, toAddress } = query
    const params: JsonObject = {
      fromBlock: decimalToHex(startBlock.toString()),
      toBlock: 'latest',
      category: contractAddress == null ? ['external'] : ['erc20'],
      withMetadata: true,
      order: 'asc',
      maxCount: MAX_TRANSFERS_PER_PAGE
    }
    if (fromAddress != null) params.fromAddress = fromAddress
    if (toAddress != null) params.toAddress = toAddress
    if (contractAddress != null) {
      params.contractAddresses = [contractAddress]
    } else if (fromAddress != null) {
      // A plain contract call from the wallet moves no value but still costs
      // gas, and belongs in the history the way an explorer's txlist shows it.
      params.excludeZeroValue = false
    }

    const transfers: AlchemyAssetTransfer[] = []
    let pageKey: string | undefined
    while (true) {
      const [raw] = await this.fetchBatchRpc(baseUrl, [
        {
          method: 'alchemy_getAssetTransfers',
          params: [pageKey == null ? params : { ...params, pageKey }]
        }
      ])
      const page = asAssetTransfersResult(raw)
      for (const rawTransfer of page.transfers) {
        transfers.push(asAlchemyAssetTransfer(rawTransfer))
      }
      pageKey = page.pageKey
      if (pageKey == null) break
    }
    return transfers
  }

  /**
   * Fetches the transaction and receipt for each txid in one batch, giving the
   * sender, nonce and gas figures that asset transfers leave out.
   */
  private async fetchTxDetails(
    baseUrl: string,
    txids: string[]
  ): Promise<Map<string, AlchemyTxDetails>> {
    const txDetails = new Map<string, AlchemyTxDetails>()
    if (txids.length === 0) return txDetails

    const requests = txids.flatMap(txid => [
      { method: 'eth_getTransactionByHash', params: [txid] },
      { method: 'eth_getTransactionReceipt', params: [txid] }
    ])
    const results = await this.fetchBatchRpc(baseUrl, requests)

    for (let i = 0; i < txids.length; i++) {
      const tx = asAlchemyTransaction(results[i * 2])
      const receipt = asAlchemyReceipt(results[i * 2 + 1])
      const gasPrice = receipt.effectiveGasPrice ?? tx.gasPrice ?? '0x0'
      txDetails.set(txids[i].toLowerCase(), {
        from: tx.from,
        to: tx.to,
        nonce: hexToDecimal(tx.nonce),
        gas: hexToDecimal(tx.gas),
        gasPrice: hexToDecimal(gasPrice),
        gasUsed: hexToDecimal(receipt.gasUsed)
      })
    }
    return txDetails
  }

  /**
   * Sends a JSON-RPC batch and returns the results in request order,
   * throwing on the first error entry.
   */
  private async fetchBatchRpc(
    baseUrl: string,
    requests: Array<{ method: string; params: unknown[] }>
  ): Promise<unknown[]> {
    const body = requests.map((request, index) => ({
      id: index + 1,
      jsonrpc: '2.0',
      method: request.method,
      params: request.params
    }))
    const response = await this.ethEngine.engineFetch(baseUrl, {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      method: 'POST',
      body: JSON.stringify(body)
    })

    const hostname = parse(baseUrl).hostname
    if (!response.ok) {
      const resBody = await response.text()
      this.throwError(response, 'fetchBatchRpc', hostname, resBody)
    }

    const raw = await response.json()
    const results = asArray(asRpcResponse)(Array.isArray(raw) ? raw : [raw])
    results.sort((a, b) => a.id - b.id)
    return results.map(result => {
      if (result.error != null) {
        this.ethEngine.error(
          `Batch RPC error from ${hostname}: ${JSON.stringify(result.error)}`
        )
        throw new Error(`Batch RPC error: ${result.error.message}`)
      }
      return result.result
    })
  }
}

/**
 * Sender, nonce and gas figures for one of the wallet's own transactions,
 * as decimal strings.
 */
export interface AlchemyTxDetails {
  from: string
  to: string | null
  nonce: string
  gas: string
  gasPrice: string
  gasUsed: string
}

/**
 * Folds asset transfers into one EdgeTransaction per transaction hash, with
 * the same amount and fee conventions as `processEvmScanTransaction`:
 * a spend's nativeAmount includes the fee, a self-send nets to the fee alone,
 * and a token spend carries the fee as parentNetworkFee.
 *
 * Transfers are deduplicated by uniqueId, since a transfer between two of the
 * wallet's own addresses appears in both the fromAddress and toAddress
 * queries. `txDetails` is keyed by lowercase txid and only needs entries for
 * transactions the wallet sent.
 */
export function processAlchemyTransfers(
  context: TransactionProcessingContext,
  transfers: AlchemyAssetTransfer[],
  txDetails: Map<string, AlchemyTxDetails>
): EdgeTransaction[] {
  const ourAddress = context.forWhichAddress.toLowerCase()
  const tokenTx = context.forWhichTokenId != null
  let currencyCode: string = context.currencyInfo.currencyCode
  if (tokenTx) {
    const knownToken = context.allTokensMap[context.forWhichTokenId ?? '']
    if (knownToken == null) {
      throw new Error(
        `Unknown token ${context.forWhichTokenId} for ${context.forWhichAddress}`
      )
    }
    currencyCode = knownToken.currencyCode
  }

  const seenUniqueIds = new Set<string>()
  const transfersByTxid = new Map<string, AlchemyAssetTransfer[]>()
  for (const transfer of transfers) {
    if (seenUniqueIds.has(transfer.uniqueId)) continue
    seenUniqueIds.add(transfer.uniqueId)
    const txid = transfer.hash.toLowerCase()
    const group = transfersByTxid.get(txid) ?? []
    group.push(transfer)
    transfersByTxid.set(txid, group)
  }

  const edgeTransactions: EdgeTransaction[] = []
  for (const [txid, group] of transfersByTxid) {
    let received = '0'
    let sent = '0'
    let fromUs = false
    for (const transfer of group) {
      const value = hexToDecimal(transfer.rawContract.value ?? '0x0')
      if (transfer.from.toLowerCase() === ourAddress) {
        fromUs = true
        sent = add(sent, value)
      }
      if (transfer.to?.toLowerCase() === ourAddress) {
        received = add(received, value)
      }
    }

    // The wallet only paid the fee if it signed the transaction. A token
    // transfer "from" the wallet can also be a third party pulling an
    // approved allowance, and that party paid.
    const details = txDetails.get(txid)
    const paidFee =
      fromUs && details != null && details.from.toLowerCase() === ourAddress
    const fee = paidFee ? mul(details.gasPrice, details.gasUsed) : '0'

    const netAmount = sub(received, sent)
    let nativeAmount: string
    let networkFee = '0'
    let parentNetworkFee: string | undefined
    if (tokenTx) {
      nativeAmount = netAmount
      if (paidFee) parentNetworkFee = fee
    } else {
      nativeAmount = sub(netAmount, fee)
      networkFee = fee
    }
    const ourReceiveAddresses =
      !fromUs && gt(received, '0') ? [context.forWhichAddress] : []

    const first = group[0]
    const otherParams: EthereumTxOtherParams = {
      from: [details?.from ?? first.from],
      to: [details?.to ?? first.to ?? ''],
      gas: details?.gas ?? '0',
      gasPrice: details?.gasPrice ?? '',
      gasUsed: details?.gasUsed ?? '0',
      isFromMakeSpend: false,
      nonceUsed: details?.nonce
    }

    edgeTransactions.push({
      blockHeight: parseInt(first.blockNum, 16),
      currencyCode,
      date: Math.floor(Date.parse(first.metadata.blockTimestamp) / 1000),
      feeRateUsed:
        details == null
          ? undefined
          : getFeeRateUsed(details.gasPrice, details.gas, details.gasUsed),
      isSend: nativeAmount.startsWith('-'),
      memos: [],
      nativeAmount,
      networkFee,
      networkFees: [],
      otherParams,
      ourReceiveAddresses,
      parentNetworkFee,
      signedTx: '',
      tokenId: context.forWhichTokenId,
      txid: first.hash,
      walletId: context.forWhichWalletId
    })
  }

  return edgeTransactions
}

export type AlchemyAssetTransfer = ReturnType<typeof asAlchemyAssetTransfer>
export const asAlchemyAssetTransfer = asObject({
  blockNum: asString,
  /** `<hash>:external` or `<hash>:log:<index>`, unique per value movement */
  uniqueId: asString,
  hash: asString,
  from: asString,
  to: asEither(asString, asNull),
  rawContract: asObject({
    value: asEither(asString, asNull),
    address: asEither(asString, asNull)
  }),
  metadata: asObject({
    blockTimestamp: asString
  })
})

const asAssetTransfersResult = asObject({
  transfers: asArray(asUnknown),
  pageKey: asOptional(asString)
})

const asTokenBalancesResult = asObject({
  tokenBalances: asArray(
    asObject({
      contractAddress: asString,
      tokenBalance: asEither(asString, asNull)
    })
  )
})

const asAlchemyTransaction = asObject({
  from: asString,
  to: asEither(asString, asNull),
  nonce: asString,
  gas: asString,
  gasPrice: asOptional(asString)
})

const asAlchemyReceipt = asObject({
  gasUsed: asString,
  effectiveGasPrice: asOptional(asString)
})

const asRpcResponse = asObject({
  id: asNumber,
  result: asUnknown,
  error: asOptional(
    asObject({
      code: asNumber,
      message: asString
    })
  )
})
