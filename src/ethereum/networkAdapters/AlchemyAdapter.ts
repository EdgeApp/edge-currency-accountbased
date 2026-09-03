import { add, gt, mul, sub } from 'biggystring'
import {
  asArray,
  asEither,
  asMaybe,
  asNull,
  asNumber,
  asObject,
  asOptional,
  asString,
  asUnknown
} from 'cleaners'
import { EdgeTokenId, EdgeTransaction, JsonObject } from 'edge-core-js/types'
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

/**
 * Alchemy caps a JSON-RPC batch at 1000 entries; each spend needs two, so
 * receipts are fetched in batches of this many transactions.
 */
const MAX_SPENDS_PER_BATCH = 400

/**
 * Endpoints (by hostname) that answered `alchemy_getAssetTransfers` with the
 * "category is not supported for this network" error for `internal`.
 * Shared across wallets so each chain learns the answer once per session.
 */
const internalCategoryUnsupported = new Set<string>()

/** A JSON-RPC error entry returned inside an HTTP 200 batch reply */
class AlchemyRpcError extends Error {
  code: number

  constructor(code: number, message: string) {
    super(message)
    this.name = 'AlchemyRpcError'
    this.code = code
  }
}

const isUnsupportedCategoryError = (error: unknown): boolean =>
  error instanceof AlchemyRpcError &&
  error.code === -32602 &&
  /category is not supported/i.test(error.message)

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
 * from the same endpoint. Native-asset queries ask for the `internal`
 * category alongside `external`; Alchemy rejects that category on some
 * networks, and the first such rejection is remembered per endpoint so the
 * adapter keeps serving `external` transfers there without retrying it.
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
          ethEngine.warn(`Alchemy server dropped: ${String(error)}`)
          return undefined
        }
      })
      .filter((server): server is string => server != null)

    // With no usable endpoint the adapter leaves the waterfall entirely,
    // the way RpcAdapter gates fetchTokenBalances on its checker contract,
    // instead of failing every sync with a confusing error.
    if (this.config.servers.length === 0) {
      this.fetchTokenBalances = null
      this.fetchTxs = null
    }
  }

  fetchTokenBalances: (() => Promise<EthereumNetworkUpdate>) | null =
    async () => {
      const { allTokensMap, walletLocalData } = this.ethEngine
      const address = walletLocalData.publicKey

      const contractAddresses: string[] = []
      for (const token of Object.values(allTokensMap)) {
        const location = asMaybeContractLocation(token.networkLocation)
        if (location != null) contractAddresses.push(location.contractAddress)
      }

      const { result, server } = await this.serialServers(async baseUrl => {
        const requests: Array<{ method: string; params: unknown[] }> = [
          { method: 'eth_getBalance', params: [address, 'latest'] }
        ]
        // A chain with no tokens has nothing to ask getTokenBalances about
        if (contractAddresses.length > 0) {
          requests.push({
            method: 'alchemy_getTokenBalances',
            params: [address, contractAddresses]
          })
        }
        const [rawBalance, rawTokenBalances] = await this.fetchBatchRpc(
          baseUrl,
          requests
        )
        return {
          server: parse(baseUrl).hostname,
          result: {
            balance: asString(rawBalance),
            tokenBalances:
              rawTokenBalances == null
                ? []
                : asTokenBalancesResult(rawTokenBalances).tokenBalances
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

  fetchTxs: ((params: GetTxsParams) => Promise<EthereumNetworkUpdate>) | null =
    async params => {
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

      const { result, server } = await this.serialServers(async baseUrl => {
        const hostname = parse(baseUrl).hostname
        const [sent, received] = await Promise.all([
          this.fetchAssetTransfers(baseUrl, {
            startBlock,
            contractAddress,
            fromAddress: address
          }),
          this.fetchAssetTransfers(baseUrl, {
            startBlock,
            contractAddress,
            toAddress: address
          })
        ])

        // A native query that kept the `internal` category through both
        // directions already carries internal transfers, so the engine must
        // not merge a second source's copy of them. Should the two legs
        // ever disagree, the internal rows are dropped so the tuple is
        // consistently external-only and the engine fetches them elsewhere.
        const includesInternal =
          sent.includedInternal && received.includedInternal
        const transfers = [...sent.transfers, ...received.transfers].filter(
          transfer => includesInternal || transfer.category !== 'internal'
        )

        // Only the wallet's own outgoing transactions need gas data:
        const spendTxids = new Set<string>()
        for (const transfer of transfers) {
          if (transfer.from.toLowerCase() === address.toLowerCase()) {
            spendTxids.add(transfer.hash.toLowerCase())
          }
        }
        const txDetails = await this.fetchTxDetails(baseUrl, [...spendTxids])

        const edgeTransactions = [
          ...processAlchemyTransfers(
            {
              allTokensMap: this.ethEngine.allTokensMap,
              currencyInfo: this.ethEngine.currencyInfo,
              forWhichAddress: address,
              forWhichTokenId: tokenId,
              forWhichWalletId: this.ethEngine.walletId
            },
            transfers,
            txDetails
          ),
          ...(await this.fetchFailedSends(baseUrl, tokenId))
        ]
        return {
          server: hostname,
          result: { edgeTransactions, includesInternal }
        }
      })
      const { edgeTransactions } = result

      const edgeTransactionsBlockHeightTuple: EdgeTransactionsBlockHeightTuple =
        {
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
   * `includedInternal` reports whether the rows came from a query that kept
   * the `internal` category.
   */
  private async fetchAssetTransfers(
    baseUrl: string,
    query: {
      startBlock: number
      contractAddress?: string
      fromAddress?: string
      toAddress?: string
    }
  ): Promise<{ transfers: AlchemyAssetTransfer[]; includedInternal: boolean }> {
    const { startBlock, contractAddress, fromAddress, toAddress } = query
    const hostname = parse(baseUrl).hostname
    const withInternal =
      contractAddress == null && !internalCategoryUnsupported.has(hostname)
    const params: JsonObject = {
      fromBlock: decimalToHex(startBlock.toString()),
      toBlock: 'latest',
      category:
        contractAddress != null
          ? ['erc20']
          : withInternal
          ? ['external', 'internal']
          : ['external'],
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
      let raw: unknown
      try {
        ;[raw] = await this.fetchBatchRpc(baseUrl, [
          {
            method: 'alchemy_getAssetTransfers',
            params: [pageKey == null ? params : { ...params, pageKey }]
          }
        ])
      } catch (error: unknown) {
        if (!withInternal || !isUnsupportedCategoryError(error)) throw error
        // This network has no internal transfers on Alchemy. Remember that
        // and answer with external transfers only.
        this.ethEngine.warn(
          `${hostname} does not serve internal transfers; using external only`
        )
        internalCategoryUnsupported.add(hostname)
        return await this.fetchAssetTransfers(baseUrl, query)
      }
      const page = asAssetTransfersResult(raw)
      for (const rawTransfer of page.transfers) {
        transfers.push(asAlchemyAssetTransfer(rawTransfer))
      }
      pageKey = page.pageKey
      if (pageKey == null) break
    }
    return { transfers, includedInternal: withInternal }
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
    for (let start = 0; start < txids.length; start += MAX_SPENDS_PER_BATCH) {
      const batch = txids.slice(start, start + MAX_SPENDS_PER_BATCH)
      const requests = batch.flatMap(txid => [
        { method: 'eth_getTransactionByHash', params: [txid] },
        { method: 'eth_getTransactionReceipt', params: [txid] }
      ])
      const results = await this.fetchBatchRpc(baseUrl, requests)

      for (let i = 0; i < batch.length; i++) {
        // A pending, reorged or not-yet-indexed hash answers null; leave its
        // details out (the transfer still lists, without fee or nonce)
        // rather than failing the whole page.
        const tx = asMaybe(asAlchemyTransaction)(results[i * 2])
        const receipt = asMaybe(asAlchemyReceipt)(results[i * 2 + 1])
        if (tx == null || receipt == null) continue
        const gasPrice = receipt.effectiveGasPrice ?? tx.gasPrice ?? '0x0'
        txDetails.set(batch[i].toLowerCase(), {
          from: tx.from,
          to: tx.to,
          nonce: hexToDecimal(tx.nonce),
          gas: hexToDecimal(tx.gas),
          gasPrice: hexToDecimal(gasPrice),
          gasUsed: hexToDecimal(receipt.gasUsed),
          blockHeight: parseInt(receipt.blockNumber, 16),
          succeeded:
            receipt.status == null ? undefined : receipt.status !== '0x0'
        })
      }
    }
    return txDetails
  }

  /**
   * Alchemy's asset transfers omit a reverted transaction, since it moved no
   * value, so a send the wallet broadcast that then failed would never come
   * back from `fetchTxs` and its unconfirmed row would keep blocking further
   * sends. The wallet's own still-unconfirmed rows are looked up by receipt
   * and the failed ones reported with their fee.
   */
  private async fetchFailedSends(
    baseUrl: string,
    tokenId: EdgeTokenId
  ): Promise<EdgeTransaction[]> {
    const pending = (
      this.ethEngine.transactionList[tokenId ?? ''] ?? []
    ).filter(tx => tx.blockHeight === 0 && tx.isSend)
    if (pending.length === 0) return []

    const txDetails = await this.fetchTxDetails(
      baseUrl,
      pending.map(tx => tx.txid)
    )
    const failed: EdgeTransaction[] = []
    for (const tx of pending) {
      const details = txDetails.get(tx.txid.toLowerCase())
      // Not mined yet, or mined fine (asset transfers report those):
      if (details == null || details.succeeded !== false) continue
      failed.push(makeFailedSend(tx, details))
    }
    return failed
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
    // Pair replies with requests by id: positional pairing would silently
    // attach one transaction's receipt to another if an entry went missing.
    const byId = new Map(results.map(result => [result.id, result]))
    return requests.map((request, index) => {
      const result = byId.get(index + 1)
      if (result == null) {
        throw new Error(
          `Batch RPC reply from ${hostname} is missing entry ${index + 1} (${
            request.method
          })`
        )
      }
      if (result.error != null) {
        this.ethEngine.error(
          `Batch RPC error from ${hostname}: ${JSON.stringify(result.error)}`
        )
        throw new AlchemyRpcError(result.error.code, result.error.message)
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
  blockHeight: number
  /** From the receipt status; undefined on a pre-Byzantium receipt */
  succeeded: boolean | undefined
}

/**
 * The row for a wallet send whose receipt shows a revert: the value stayed
 * put, the fee was still paid, and the row keeps its pending metadata.
 */
export function makeFailedSend(
  pending: EdgeTransaction,
  details: AlchemyTxDetails
): EdgeTransaction {
  const fee = mul(details.gasPrice, details.gasUsed)
  const tokenTx = pending.tokenId != null
  return {
    ...pending,
    blockHeight: details.blockHeight,
    confirmations: 'failed',
    feeRateUsed: getFeeRateUsed(details.gasPrice, details.gas, details.gasUsed),
    isSend: true,
    nativeAmount: tokenTx ? '0' : sub('0', fee),
    networkFee: tokenTx ? '0' : fee,
    parentNetworkFee: tokenTx ? fee : undefined,
    otherParams: {
      ...pending.otherParams,
      gasPrice: details.gasPrice,
      gasUsed: details.gasUsed
    }
  }
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
    // The engine only asks for tokens it knows, so this is unreachable in
    // practice; an empty result keeps one stray tokenId from failing the sync.
    if (knownToken == null) return []
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
  /** `external`, `internal`, `erc20`, ... */
  category: asString,
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
  blockNumber: asString,
  gasUsed: asString,
  effectiveGasPrice: asOptional(asString),
  /** `0x1` success, `0x0` reverted; absent before Byzantium */
  status: asOptional(asString)
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
