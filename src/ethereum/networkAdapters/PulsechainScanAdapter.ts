import { mul, sub } from 'biggystring'
import {
  asArray,
  asBoolean,
  asJSON,
  asNumber,
  asObject,
  asOptional,
  asString
} from 'cleaners'
import { EdgeTransaction } from 'edge-core-js/types'

import { EthereumNetworkUpdate, getFeeRateUsed } from '../EthereumNetwork'
import { EthereumTxOtherParams } from '../ethereumTypes'
import { GetTxsParams, NetworkAdapter } from './types'

export interface PulsechainScanAdapterConfig {
  type: 'pulsechain-scan'
  servers: string[]
}

export class PulsechainScanAdapter extends NetworkAdapter<PulsechainScanAdapterConfig> {
  fetchBlockheight = null
  broadcast = null
  getBaseFeePerGas = null
  multicastRpc = null
  fetchNonce = null
  fetchTokenBalance = null
  fetchTokenBalances = null

  currentScan: Promise<EthereumNetworkUpdate> | undefined

  fetchTxs = async (params: GetTxsParams): Promise<EthereumNetworkUpdate> => {
    try {
      // We shouldn't start scanning if scanning is already happening:
      if (this.currentScan != null) {
        return await this.currentScan
      }

      this.currentScan = this.checkTransactions(params)
      const update = await this.currentScan
      return update
    } catch (error) {
      console.error(error)
      throw error
    } finally {
      this.currentScan = undefined
    }
  }

  private async checkTransactions(
    params: GetTxsParams
  ): Promise<EthereumNetworkUpdate> {
    const { startBlock, currencyCode } = params
    const address = this.ethEngine.walletLocalData.publicKey

    const scanTransactions: PulsechainScanTransaction[] = []
    let nextPageParams: NextPageParams | undefined

    while (true) {
      const responseData = await this.queryTransactions(address, nextPageParams)

      scanTransactions.push(...responseData.items)
      nextPageParams = responseData.next_page_params

      // Exit if a transaction block height is less than/equal to the startBlock:
      if (responseData.items.some(scanTx => scanTx.block <= startBlock)) break

      // Exit if there is no next page of transactions:
      if (nextPageParams == null) break
    }

    // Convert the transaction data into EdgeTransactions:
    const edgeTransactions: EdgeTransaction[] = scanTransactions.map(tx =>
      this.processScanTransaction(tx, currencyCode)
    )

    return {
      tokenTxs: {
        [currencyCode]: {
          blockHeight: startBlock,
          edgeTransactions
        }
      },
      server: this.config.servers.join(',')
    }
  }

  private processScanTransaction(
    scanTx: PulsechainScanTransaction,
    currencyCode: string
  ): EdgeTransaction {
    const ourReceiveAddresses: string[] = []

    const txid = scanTx.hash
    if (txid == null) {
      throw new Error('Invalid transaction result format')
    }

    const isSpend =
      scanTx.from.hash.toLowerCase() ===
      this.ethEngine.walletLocalData.publicKey.toLowerCase()
    const tokenTx = currencyCode !== this.ethEngine.currencyInfo.currencyCode

    const gasPrice = scanTx.gas_price
    const nativeNetworkFee: string =
      gasPrice != null ? mul(gasPrice, scanTx.gas_used) : '0'

    let nativeAmount: string
    let networkFee: string
    let parentNetworkFee: string | undefined

    if (isSpend) {
      if (tokenTx) {
        nativeAmount = sub('0', scanTx.value)
        networkFee = '0'
        parentNetworkFee = nativeNetworkFee
      } else {
        // Spend to self. netNativeAmount is just the fee
        if (scanTx.from.hash.toLowerCase() === scanTx.to.hash.toLowerCase()) {
          nativeAmount = sub('0', nativeNetworkFee)
          networkFee = nativeNetworkFee
        } else {
          nativeAmount = sub(sub('0', scanTx.value), nativeNetworkFee)
          networkFee = nativeNetworkFee
        }
      }
    } else {
      nativeAmount = scanTx.value
      networkFee = '0'
      ourReceiveAddresses.push(this.ethEngine.walletLocalData.publicKey)
    }

    const otherParams: EthereumTxOtherParams = {
      from: [scanTx.from.hash],
      to: [scanTx.to.hash],
      gas: scanTx.gas_limit,
      gasPrice: gasPrice ?? '',
      gasUsed: scanTx.gas_used,
      isFromMakeSpend: false
    }

    let blockHeight = scanTx.block
    if (blockHeight < 0) blockHeight = 0

    const edgeTransaction: EdgeTransaction = {
      blockHeight,
      currencyCode,
      date: parseInt(scanTx.timestamp),
      feeRateUsed:
        gasPrice != null
          ? getFeeRateUsed(gasPrice, scanTx.gas_limit, scanTx.gas_used)
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
  }

  private async queryTransactions(
    address: string,
    nextPageParams?: NextPageParams
  ): Promise<PulsechainScanAddressTransactionsResponse> {
    return await this.serialServers(async server => {
      const endpoint = `addresses/${address}/transactions`
      const params =
        nextPageParams != null
          ? new URLSearchParams(nextPageParams as any).toString()
          : ''
      const url = `${server}/api/v2/${endpoint}?${params}`
      const response = await this.ethEngine.fetchCors(url, {
        method: 'GET',
        headers: {
          'content-type': 'application/json'
        }
      })
      const responseText = await response.text()
      const responseData =
        asPulsechainScanAddressTransactionsResponse(responseText)
      return responseData
    })
  }
}

//
// Cleaners
//

const asAddress = asObject({
  hash: asString,
  is_contract: asOptional(asBoolean),
  is_verified: asOptional(asBoolean)
})

// Note: Commented out fields are not used by the plugin
const asPulsechainScanAddressTransaction = asObject({
  timestamp: asString,
  // fee: asObject({
  //   type: asString,
  //   value: asString
  // }),
  gas_limit: asString,
  block: asNumber,
  // status: asString,
  // confirmations: asNumber,
  // type: asNumber,
  to: asAddress,
  from: asAddress,
  hash: asString,
  gas_price: asString,
  // base_fee_per_gas: asOptional(asString),
  gas_used: asString,
  value: asString
  // actions: asArray(asNull),
  // tx_types: asArray(asString),
  // position: asNumber,
  // nonce: asNumber,
  // has_error_in_internal_txs: asBoolean,
  // confirmation_duration: asArray(asNumber)
})
type PulsechainScanTransaction = ReturnType<
  typeof asPulsechainScanAddressTransaction
>

const asNextPageParams = asObject({
  block_number: asNumber,
  fee: asString,
  hash: asString,
  index: asNumber,
  inserted_at: asString,
  items_count: asNumber,
  value: asString
})

type NextPageParams = ReturnType<typeof asNextPageParams>

const asPulsechainScanAddressTransactionsResponse = asJSON(
  asObject({
    items: asArray(asPulsechainScanAddressTransaction),
    next_page_params: asOptional(asNextPageParams)
  })
)

type PulsechainScanAddressTransactionsResponse = ReturnType<
  typeof asPulsechainScanAddressTransactionsResponse
>
