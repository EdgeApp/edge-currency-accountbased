import { add, div } from 'biggystring'
import { EdgeTransaction } from 'edge-core-js/types'

import { getRandomDelayMs } from '../common/network'
import { makePeriodicTask, PeriodicTask } from '../common/periodicTask'
import { asyncWaterfall, promiseAny } from '../common/utils'
import { WEI_MULTIPLIER } from './ethereumConsts'
import { EthereumEngine } from './EthereumEngine'
import { EthereumNetworkInfo } from './ethereumTypes'
import { AmberdataAdapter } from './networkAdapters/AmberdataAdapter'
import { BlockbookAdapter } from './networkAdapters/BlockbookAdapter'
import { BlockchairAdapter } from './networkAdapters/BlockchairAdapter'
import { BlockcypherAdapter } from './networkAdapters/BlockcypherAdapter'
import { EvmScanAdapter } from './networkAdapters/EvmScanAdapter'
import { FilfoxAdapter } from './networkAdapters/FilfoxAdapter'
import { PulsechainScanAdapter } from './networkAdapters/PulsechainScanAdapter'
import { RpcAdapter } from './networkAdapters/RpcAdapter'
import {
  NetworkAdapter,
  NetworkAdapterConfig,
  NetworkAdapterUpdateMethod
} from './networkAdapters/types'

const BLOCKHEIGHT_POLL_MILLISECONDS = getRandomDelayMs(20000)
const NONCE_POLL_MILLISECONDS = getRandomDelayMs(20000)
const BAL_POLL_MILLISECONDS = getRandomDelayMs(20000)
const TXS_POLL_MILLISECONDS = getRandomDelayMs(20000)

const ADDRESS_QUERY_LOOKBACK_BLOCKS = 4 * 2 // ~ 2 minutes
const ADDRESS_QUERY_LOOKBACK_SEC = 2 * 60 // ~ 2 minutes

interface EthereumNeeds {
  blockHeightLastChecked: number
  nonceLastChecked: number
  tokenBalsLastChecked: number
  tokenBalLastChecked: { [currencyCode: string]: number }
  tokenTxsLastChecked: { [currencyCode: string]: number }
}

type NotNull<T> = { [P in keyof T]: Exclude<T[P], null> }

export interface EdgeTransactionsBlockHeightTuple {
  blockHeight: number
  edgeTransactions: EdgeTransaction[]
}

export interface EthereumNetworkUpdate {
  blockHeight?: number
  newNonce?: string
  tokenBal?: { [currencyCode: string]: string }
  tokenTxs?: { [currencyCode: string]: EdgeTransactionsBlockHeightTuple }
  detectedTokenIds?: string[]
  server?: string
}

type RpcMethod =
  | 'eth_call'
  | 'eth_getTransactionReceipt'
  | 'eth_estimateGas'
  | 'eth_getCode'

export interface BroadcastResults {
  result: {
    incrementNonce: boolean
    decrementNonce: boolean
  }
  server: string
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
 * @param {void | string} minerTip – The gas price of the transaction in ***wei*** to pay to the miner for EIP-1559 txs.
 * @returns {any} A `feeRateUsed` object to be included in an `EdgeTransaction`
 */
export const getFeeRateUsed = (
  gasPrice: string,
  gasLimit: string,
  gasUsed?: string,
  minerTip?: string
): any => {
  let feeRateUsed = {}

  feeRateUsed = {
    // Convert gasPrice from wei to gwei
    gasPrice: div(
      add(gasPrice, '0', 10),
      WEI_MULTIPLIER.toString(),
      WEI_MULTIPLIER.toString().length - 1,
      10
    ),
    ...(gasUsed !== undefined ? { gasUsed } : {}),
    ...(minerTip !== undefined
      ? {
          minerTip: div(
            add(minerTip, '0', 10),
            WEI_MULTIPLIER.toString(),
            WEI_MULTIPLIER.toString().length - 1,
            10
          )
        }
      : {}),
    gasLimit: gasLimit
  }

  return feeRateUsed
}

export class EthereumNetwork {
  ethNeeds: EthereumNeeds
  ethEngine: EthereumEngine
  walletId: string
  needsLoopTask: PeriodicTask
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
    this.needsLoopTask = makePeriodicTask(this.needsLoop.bind(this), 1000, {
      onError: error => {
        this.ethEngine.log.warn('needsLoopTask error:', error)
      }
    })
    this.networkAdapters = this.buildNetworkAdapters(this.ethEngine.networkInfo)
    this.walletId = ethEngine.walletInfo.id
  }

  async broadcastTx(
    edgeTransaction: EdgeTransaction
  ): Promise<BroadcastResults> {
    const promises = this.qualifyNetworkAdapters('broadcast').map(
      async adapter => await adapter.broadcast(edgeTransaction)
    )

    const broadcastResults = await promiseAny(promises)
    this.ethEngine.log(
      `${this.ethEngine.currencyInfo.currencyCode} broadcastTx ${broadcastResults.server} won`
    )
    return broadcastResults
  }

  multicastRpc = async (method: RpcMethod, params: any[]): Promise<any> => {
    const funcs = this.qualifyNetworkAdapters('multicastRpc').map(
      adapter => async () => {
        return await adapter.multicastRpc(method, params)
      }
    )

    const out: { result: any; server: string } = await asyncWaterfall(funcs)
    return out
  }

  getBaseFeePerGas = async (): Promise<string> => {
    const promises = this.qualifyNetworkAdapters('getBaseFeePerGas').map(
      adapter => async () => await adapter.getBaseFeePerGas()
    )
    return await asyncWaterfall(promises)
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

  /*
   * @returns The currencyCode of the token or undefined if
   * the token is not enabled for this user.
   */
  getTokenCurrencyCode(txnContractAddress: string): string | undefined {
    const address = this.ethEngine.walletLocalData.publicKey
    if (txnContractAddress.toLowerCase() === address.toLowerCase()) {
      return this.ethEngine.currencyInfo.currencyCode
    } else {
      for (const currencyCode of this.ethEngine.enabledTokens) {
        const tokenInfo = this.ethEngine.getTokenInfo(currencyCode)
        if (tokenInfo != null) {
          const tokenContractAddress = tokenInfo.contractAddress
          if (
            txnContractAddress != null &&
            typeof tokenContractAddress === 'string' &&
            tokenContractAddress.toLowerCase() ===
              txnContractAddress.toLowerCase()
          ) {
            return currencyCode
          }
        }
      }
    }
  }

  async checkAndUpdate(
    lastChecked: number,
    pollMillisec: number,
    checkFunc: () => Promise<EthereumNetworkUpdate>
  ): Promise<void> {
    const now = Date.now()
    if (now - lastChecked > pollMillisec) {
      try {
        const ethUpdate = await checkFunc()
        const preUpdateBlockHeight = this.ethEngine.walletLocalData.blockHeight
        this.processEthereumNetworkUpdate(now, ethUpdate, preUpdateBlockHeight)
      } catch (e: any) {
        this.ethEngine.error('checkAndUpdate ', e)
      }
    }
  }

  start(): void {
    this.connectNetworkAdapters()
    this.needsLoopTask.start()
  }

  stop(): void {
    this.needsLoopTask.stop()
    this.disconnectNetworkAdapters()
  }

  needsLoop = async (): Promise<void> => {
    await this.checkAndUpdate(
      this.ethNeeds.blockHeightLastChecked,
      BLOCKHEIGHT_POLL_MILLISECONDS,
      async () => await this.check('fetchBlockheight')
    )

    await this.checkAndUpdate(
      this.ethNeeds.nonceLastChecked,
      NONCE_POLL_MILLISECONDS,
      async () => await this.check('fetchNonce')
    )

    const { currencyCode } = this.ethEngine.currencyInfo
    const currencyCodes = this.ethEngine.enabledTokens

    if (!currencyCodes.includes(currencyCode)) {
      currencyCodes.push(currencyCode)
    }

    // The engine supports token balances batch queries if an adapter provides
    // the functionality.
    const isFetchTokenBalancesSupported =
      this.networkAdapters.find(
        adapter => adapter.fetchTokenBalances != null
      ) != null

    // If this engine supports the batch token balance query, no need to check
    // each currencyCode individually.
    if (isFetchTokenBalancesSupported) {
      await this.checkAndUpdate(
        this.ethNeeds.tokenBalsLastChecked,
        BAL_POLL_MILLISECONDS,
        async () => await this.check('fetchTokenBalances')
      )
    }

    for (const currencyCode of currencyCodes) {
      // Only check each code individually if this engine does not support
      // batch token balance queries.
      if (!isFetchTokenBalancesSupported) {
        await this.checkAndUpdate(
          this.ethNeeds.tokenBalLastChecked[currencyCode] ?? 0,
          BAL_POLL_MILLISECONDS,
          async () => await this.check('fetchTokenBalance', currencyCode)
        )
      }

      await this.checkAndUpdate(
        this.ethNeeds.tokenTxsLastChecked[currencyCode] ?? 0,
        TXS_POLL_MILLISECONDS,
        async (): Promise<EthereumNetworkUpdate> => {
          const lastTransactionQueryHeight =
            this.ethEngine.walletLocalData.lastTransactionQueryHeight[
              currencyCode
            ] ?? 0
          const lastTransactionDate =
            this.ethEngine.walletLocalData.lastTransactionDate[currencyCode] ??
            0
          const params = {
            // Only query for transactions as far back as ADDRESS_QUERY_LOOKBACK_BLOCKS from the last time we queried transactions
            startBlock: Math.max(
              lastTransactionQueryHeight - ADDRESS_QUERY_LOOKBACK_BLOCKS,
              0
            ),
            // Only query for transactions as far back as ADDRESS_QUERY_LOOKBACK_SEC from the last time we queried transactions
            startDate: Math.max(
              lastTransactionDate - ADDRESS_QUERY_LOOKBACK_SEC,
              0
            ),
            currencyCode
          }

          // Send an empty tokenTxs network update if no network adapters
          // qualify for 'fetchTxs':
          if (this.qualifyNetworkAdapters('fetchTxs').length === 0) {
            return {
              tokenTxs: {
                [this.ethEngine.currencyInfo.currencyCode]: {
                  blockHeight: params.startBlock,
                  edgeTransactions: []
                }
              },
              server: 'none'
            }
          }

          return await this.check('fetchTxs', params)
        }
      )
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
      for (const currencyCode of Object.keys(tokenBal)) {
        this.ethNeeds.tokenBalLastChecked[currencyCode] = now
        this.ethEngine.updateBalance(currencyCode, tokenBal[currencyCode])
      }
      this.ethEngine.currencyEngineCallbacks.onNewTokens(
        ethereumNetworkUpdate.detectedTokenIds ?? []
      )
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
      for (const currencyCode of Object.keys(tokenTxs)) {
        this.ethNeeds.tokenTxsLastChecked[currencyCode] = now
        this.ethEngine.tokenCheckTransactionsStatus[currencyCode] = 1
        const tuple: EdgeTransactionsBlockHeightTuple = tokenTxs[currencyCode]
        for (const tx of tuple.edgeTransactions) {
          this.ethEngine.addTransaction(currencyCode, tx)
        }
        this.ethEngine.walletLocalData.lastTransactionQueryHeight[
          currencyCode
        ] = preUpdateBlockHeight
        this.ethEngine.walletLocalData.lastTransactionDate[currencyCode] = now
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
    const { networkAdapterConfigs } = settings
    const networkAdapters: NetworkAdapter[] = networkAdapterConfigs.map(
      config => makeNetworkAdapter(config, this.ethEngine)
    )

    return networkAdapters
  }

  connectNetworkAdapters(): void {
    this.qualifyNetworkAdapters('connect').forEach(adapter => {
      adapter.connect()
    })
  }

  disconnectNetworkAdapters(): void {
    this.qualifyNetworkAdapters('disconnect').forEach(adapter => {
      adapter.disconnect()
    })
  }

  /**
   * Returns only the network adapters that contain the requested method.
   */
  qualifyNetworkAdapters<Method extends keyof NetworkAdapter>(
    ...methods: Method[]
  ): Array<NotNull<Pick<NetworkAdapter, Method>> & NetworkAdapter> {
    return this.networkAdapters.filter((adapter): adapter is NotNull<
      Pick<NetworkAdapter, Method>
    > &
      NetworkAdapter => methods.every(method => adapter[method] != null))
  }
}

const makeNetworkAdapter = (
  config: NetworkAdapterConfig,
  ethEngine: EthereumEngine
): NetworkAdapter => {
  switch (config.type) {
    case 'amberdata-rpc':
      return new AmberdataAdapter(ethEngine, config)
    case 'blockbook':
      return new BlockbookAdapter(ethEngine, config)
    case 'blockchair':
      return new BlockchairAdapter(ethEngine, config)
    case 'blockcypher':
      return new BlockcypherAdapter(ethEngine, config)
    case 'evmscan':
      return new EvmScanAdapter(ethEngine, config)
    case 'filfox':
      return new FilfoxAdapter(ethEngine, config)
    case 'pulsechain-scan':
      return new PulsechainScanAdapter(ethEngine, config)
    case 'rpc':
      return new RpcAdapter(ethEngine, config)
  }
}
