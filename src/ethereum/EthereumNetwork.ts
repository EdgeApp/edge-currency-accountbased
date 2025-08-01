import { add, div } from 'biggystring'
import { EdgeTransaction } from 'edge-core-js/types'

import { getRandomDelayMs } from '../common/network'
import { makePeriodicTask, PeriodicTask } from '../common/periodicTask'
import {
  asyncWaterfall,
  formatAggregateError,
  promiseAny
} from '../common/promiseUtils'
import { normalizeAddress } from '../common/utils'
import { WEI_MULTIPLIER } from './ethereumConsts'
import { EthereumEngine } from './EthereumEngine'
import { EthereumNetworkInfo } from './ethereumTypes'
import { AmberdataAdapter } from './networkAdapters/AmberdataAdapter'
import { BlockbookAdapter } from './networkAdapters/BlockbookAdapter'
import { BlockbookWsAdapter } from './networkAdapters/BlockbookWsAdapter'
import { BlockchairAdapter } from './networkAdapters/BlockchairAdapter'
import { BlockcypherAdapter } from './networkAdapters/BlockcypherAdapter'
import { EvmScanAdapter } from './networkAdapters/EvmScanAdapter'
import { FilfoxAdapter } from './networkAdapters/FilfoxAdapter'
import {
  NetworkAdapter,
  NetworkAdapterConfig,
  NetworkAdapterUpdateMethod
} from './networkAdapters/networkAdapterTypes'
import { PulsechainScanAdapter } from './networkAdapters/PulsechainScanAdapter'
import { RpcAdapter } from './networkAdapters/RpcAdapter'

const BLOCKHEIGHT_POLL_MILLISECONDS = getRandomDelayMs(20000)
const NEEDS_LOOP_INTERVAL = 1000
const NONCE_POLL_MILLISECONDS = getRandomDelayMs(20000)

const ADDRESS_QUERY_LOOKBACK_SEC = 2 * 60 // ~ 2 minutes

interface EthereumNeeds {
  /**
   * Address network synchronization needs.
   *
   * This is only defined for engines with network adapters that support
   * address synchronization through the `subscribeAddressSync` method. If this
   * is not defined, then the engine will always pull for address data; it
   * assume all needs are true.
   */
  addressSync: {
    // This should be true immediately after connecting to a network adapter.
    needsInitialSync: boolean
    // These are the txids that need to be checked from the
    // subscribeAddressSync handler.
    needsTxids: string[]
  }
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

  // Add properties to manage websocket connections and retries
  private readonly adapterConnections: Map<
    NetworkAdapter,
    'connected' | 'disconnected'
  > = new Map()

  constructor(ethEngine: EthereumEngine) {
    this.ethEngine = ethEngine
    this.ethNeeds = {
      addressSync: {
        needsInitialSync: true,
        needsTxids: []
      }
    }
    this.needsLoopTask = makePeriodicTask(
      this.needsLoop.bind(this),
      NEEDS_LOOP_INTERVAL,
      {
        onError: error => {
          this.ethEngine.log.warn('needsLoopTask error:', error)
        }
      }
    )
    this.networkAdapters = this.buildNetworkAdapters(this.ethEngine.networkInfo)
    this.walletId = ethEngine.walletInfo.id
  }

  private setupAdapterSubscriptions(): void {
    const handleSubscribeAddressSync = (txid?: string): void => {
      if (txid != null) {
        this.ethNeeds.addressSync.needsTxids.push(txid)
      }
    }
    const adapters = this.qualifyNetworkAdapters('subscribeAddressSync')
    adapters.forEach(adapter => {
      adapter.subscribeAddressSync(
        this.ethEngine.walletLocalData.publicKey,
        handleSubscribeAddressSync
      )
    })
  }

  async broadcastTx(
    edgeTransaction: EdgeTransaction
  ): Promise<BroadcastResults> {
    const promises = this.qualifyNetworkAdapters('broadcast').map(
      async adapter => await adapter.broadcast(edgeTransaction)
    )

    const broadcastResults = await formatAggregateError(
      promiseAny(promises),
      'Broadcast failed:'
    )
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

  /*
   * @returns Hex string representation of the base fee or undefined if
   * the network does not support EIP-1559.
   */
  getBaseFeePerGas = async (): Promise<string | undefined> => {
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
    )
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

  start(): void {
    // this.connectNetworkAdapters()
    // this.setupAdapterSubscriptions()
    this.needsLoopTask.start()
  }

  stop(): void {
    this.needsLoopTask.stop()
    // this.disconnectNetworkAdapters()
    // TODO: Abort all in-flight network sync requests
  }

  acquireBlockHeight = makeThrottledFunction(
    BLOCKHEIGHT_POLL_MILLISECONDS,
    async (): Promise<void> => {
      const update = await this.check('fetchBlockheight')
      return this.processEthereumNetworkUpdate(update)
    }
  )

  acquireNonce = makeThrottledFunction(
    NONCE_POLL_MILLISECONDS,
    async (): Promise<void> => {
      const update = await this.check('fetchNonce')
      return this.processEthereumNetworkUpdate(update)
    }
  )

  acquireTokenBalance = async (currencyCode: string): Promise<void> => {
    const update = await this.check('fetchTokenBalance', currencyCode)
    return this.processEthereumNetworkUpdate(update)
  }

  acquireTokenBalances = async (): Promise<void> => {
    const update = await this.check('fetchTokenBalances')
    return this.processEthereumNetworkUpdate(update)
  }

  acquireTxs = async (currencyCode: string): Promise<void> => {
    const lastTransactionQueryHeight =
      this.ethEngine.walletLocalData.lastTransactionQueryHeight[currencyCode] ??
      0
    const lastTransactionDate =
      this.ethEngine.walletLocalData.lastTransactionDate[currencyCode] ?? 0
    const addressQueryLookbackBlocks =
      this.ethEngine.networkInfo.addressQueryLookbackBlocks
    const params = {
      // Only query for transactions as far back as ADDRESS_QUERY_LOOKBACK_BLOCKS from the last time we queried transactions
      startBlock: Math.max(
        lastTransactionQueryHeight - addressQueryLookbackBlocks,
        0
      ),
      // Only query for transactions as far back as ADDRESS_QUERY_LOOKBACK_SEC from the last time we queried transactions
      startDate: Math.max(lastTransactionDate - ADDRESS_QUERY_LOOKBACK_SEC, 0),
      currencyCode
    }

    // Send an empty tokenTxs network update if no network adapters
    // qualify for 'fetchTxs':
    if (
      this.qualifyNetworkAdapters('fetchTxs').length === 0 ||
      this.ethEngine.lightMode
    ) {
      const tokenTxs: {
        [currencyCode: string]: EdgeTransactionsBlockHeightTuple
      } = {
        [this.ethEngine.currencyInfo.currencyCode]: {
          blockHeight: params.startBlock,
          edgeTransactions: []
        }
      }
      for (const token of Object.values(this.ethEngine.allTokensMap)) {
        tokenTxs[token.currencyCode] = {
          blockHeight: params.startBlock,
          edgeTransactions: []
        }
      }
      return this.processEthereumNetworkUpdate({
        tokenTxs,
        server: 'none'
      })
    }

    const update = await this.check('fetchTxs', params)
    return this.processEthereumNetworkUpdate(update)
  }

  needsLoop = async (): Promise<void> => {
    this.acquireBlockHeight().catch(error => {
      console.error(error)
      this.ethEngine.error('needsLoop acquireBlockHeight', error)
    })

    this.acquireNonce().catch(error => {
      console.error(error)
      this.ethEngine.error('needsLoop acquireNonce', error)
    })
  }

  /**
   * This function gets the balance and transaction updates from the network.
   */
  acquireUpdates = async (): Promise<void> => {
    // The engine supports token balances batch queries if an adapter provides
    // the functionality.
    const isFetchTokenBalancesSupported =
      this.networkAdapters.find(
        adapter => adapter.fetchTokenBalances != null
      ) != null

    if (
      // If this engine supports the batch token balance query, no need to check
      // each currencyCode individually.
      isFetchTokenBalancesSupported
    ) {
      await this.acquireTokenBalances()
    }

    const { currencyCode } = this.ethEngine.currencyInfo
    const currencyCodes = this.ethEngine.enabledTokens

    if (!currencyCodes.includes(currencyCode)) {
      currencyCodes.push(currencyCode)
    }

    for (const currencyCode of currencyCodes) {
      if (
        // Only check each code individually if this engine does not support
        // batch token balance queries.
        !isFetchTokenBalancesSupported
      ) {
        await this.acquireTokenBalance(currencyCode)
      }

      await this.acquireTxs(currencyCode)
    }
  }

  private isAnAdapterConnected(): boolean {
    return [...this.adapterConnections.values()].some(
      status => status === 'connected'
    )
  }

  processEthereumNetworkUpdate = (
    ethereumNetworkUpdate: EthereumNetworkUpdate
  ): void => {
    const now = Date.now()
    const preUpdateBlockHeight: number =
      this.ethEngine.walletLocalData.blockHeight
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
      if (this.ethEngine.walletLocalData.blockHeight !== blockHeight) {
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
        this.ethEngine.updateBalance(currencyCode, tokenBal[currencyCode])
      }
      this.ethEngine.currencyEngineCallbacks.onNewTokens(
        ethereumNetworkUpdate.detectedTokenIds ?? []
      )
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
      let highestTxBlockHeight = 0
      for (const currencyCode of Object.keys(tokenTxs)) {
        this.ethEngine.tokenCheckTransactionsStatus[currencyCode] = 1
        const tuple: EdgeTransactionsBlockHeightTuple = tokenTxs[currencyCode]
        for (const tx of tuple.edgeTransactions) {
          this.ethEngine.addTransaction(currencyCode, tx)
        }
        this.ethEngine.walletLocalData.lastTransactionQueryHeight[
          currencyCode
        ] = preUpdateBlockHeight
        this.ethEngine.walletLocalData.lastTransactionDate[currencyCode] = now
        highestTxBlockHeight = Math.max(highestTxBlockHeight, tuple.blockHeight)
      }
      this.ethEngine.walletLocalData.highestTxBlockHeight = Math.max(
        this.ethEngine.walletLocalData.highestTxBlockHeight,
        highestTxBlockHeight
      )
      this.ethEngine.walletLocalDataDirty = true
      this.ethEngine.updateOnAddressesChecked()

      // Update addressSync state:
      if (
        // Don't update address needs if the engine has not finished it's
        // initial sync.
        this.ethEngine.addressesChecked
      ) {
        // Filter the txids that have been processed:
        const updatedNeedsTxIds = this.ethNeeds.addressSync.needsTxids.filter(
          txid => {
            const txidNormal = normalizeAddress(txid)
            const hasTxidBeenProcessed = Object.keys(tokenTxs).some(
              currencyCode => {
                const txIndex =
                  this.ethEngine.txIdMap[currencyCode][txidNormal] ?? -1
                const edgeTx =
                  this.ethEngine.transactionList[currencyCode][txIndex]
                return edgeTx?.blockHeight > 0
              }
            )
            return !hasTxidBeenProcessed
          }
        )
        this.ethNeeds.addressSync.needsTxids = updatedNeedsTxIds
        // Since we've processed all the txids, we can set needsSync to false
        // because we've done a sync. However, the engine will still poll for
        // address data if there remains txids in the `needsTxIds`.
        this.ethNeeds.addressSync.needsInitialSync = false
      }
    }

    this.ethEngine.sendTransactionEvents()
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
      adapter.connect(isConnected => {
        if (isConnected) {
          this.ethEngine.log('Adapter connected')
          this.adapterConnections.set(adapter, 'connected')
        } else {
          this.ethEngine.log('Adapter disconnected')
          this.adapterConnections.set(adapter, 'disconnected')
          // This allows for the engine to poll from addresses once again when an
          // adapter reconnects.
          this.ethNeeds.addressSync.needsInitialSync = true
        }
      })
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
    case 'blockbook-ws':
      return new BlockbookWsAdapter(ethEngine, config)
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

function makeThrottledFunction<Args extends any[], Rtn>(
  gapMs: number,
  fn: (...args: Args) => Promise<Rtn>
): () => Promise<Rtn> {
  let lastTime = 0
  let lastTimeout: NodeJS.Timeout | undefined
  return async (...args: Args) => {
    return await new Promise((resolve, reject) => {
      const timeSinceLast = Date.now() - lastTime
      const timeRemaining = Math.max(0, gapMs - timeSinceLast)
      if (lastTimeout == null) {
        lastTimeout = setTimeout(() => {
          fn(...args)
            .then(resolve, reject)
            .finally(() => {
              lastTime = Date.now()
              lastTimeout = undefined
            })
        }, timeRemaining)
      }
    })
  }
}
