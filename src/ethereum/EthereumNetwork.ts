import { add, div } from 'biggystring'
import { asArray, asObject, asOptional, asString } from 'cleaners'
import { EdgeTokenId, EdgeTransaction } from 'edge-core-js/types'

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
import { DecoyAddressConfig, EthereumNetworkInfo } from './ethereumTypes'
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
  tokenBal?: Map<EdgeTokenId, string>
  tokenTxs?: Map<EdgeTokenId, EdgeTransactionsBlockHeightTuple>
  detectedTokenIds?: string[]
  server?: string
}

export type RpcMethod =
  | 'eth_call'
  | 'eth_getTransactionReceipt'
  | 'eth_estimateGas'
  | 'eth_getBlockByNumber'
  | 'eth_getCode'
  | 'eth_getTransactionCount'

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
      `${this.ethEngine.currencyInfo.pluginId} broadcastTx ${broadcastResults.server} won`
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

  batchMulticastRpc = async (
    requests: Array<{ method: RpcMethod; params: any[] }>
  ): Promise<any> => {
    const funcs = this.qualifyNetworkAdapters('batchMulticastRpc').map(
      adapter => async () => {
        return await adapter.batchMulticastRpc(requests)
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

  acquireTokenBalance = async (tokenId: EdgeTokenId): Promise<void> => {
    const update = await this.check('fetchTokenBalance', tokenId)
    return this.processEthereumNetworkUpdate(update)
  }

  acquireTokenBalances = async (): Promise<void> => {
    const update = await this.check('fetchTokenBalances')
    return this.processEthereumNetworkUpdate(update)
  }

  acquireTxs = async (tokenId: EdgeTokenId): Promise<void> => {
    const safeTokenId = tokenId ?? ''
    const lastTransactionQueryHeight =
      this.ethEngine.walletLocalData.lastTransactionQueryHeight[safeTokenId] ??
      0
    const lastTransactionDate =
      this.ethEngine.walletLocalData.lastTransactionDate[safeTokenId] ?? 0
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
      tokenId
    }

    // Send an empty tokenTxs network update if no network adapters
    // qualify for 'fetchTxs':
    if (
      this.qualifyNetworkAdapters('fetchTxs').length === 0 ||
      this.ethEngine.lightMode
    ) {
      const tokenTxs: Map<EdgeTokenId, EdgeTransactionsBlockHeightTuple> =
        new Map()
      tokenTxs.set(null, {
        blockHeight: params.startBlock,
        edgeTransactions: []
      })
      for (const tid of Object.keys(this.ethEngine.allTokensMap)) {
        tokenTxs.set(tid, {
          blockHeight: params.startBlock,
          edgeTransactions: []
        })
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
    const updateFuncs = []

    // The engine supports token balances batch queries if an adapter provides
    // the functionality.
    const isFetchTokenBalancesSupported =
      this.networkAdapters.find(
        adapter => adapter.fetchTokenBalances != null
      ) != null

    if (
      // If this engine supports the batch token balance query, no need to check
      // each token individually.
      isFetchTokenBalancesSupported
    ) {
      updateFuncs.push(async () => await this.acquireTokenBalances())
    }

    const tokenIds: EdgeTokenId[] = [null, ...this.ethEngine.enabledTokenIds]
    for (const tokenId of tokenIds) {
      if (
        // Only check each code individually if this engine does not support
        // batch token balance queries.
        !isFetchTokenBalancesSupported
      ) {
        updateFuncs.push(async () => await this.acquireTokenBalance(tokenId))
      }

      updateFuncs.push(async () => await this.acquireTxs(tokenId))
    }

    let firstError: Error | undefined
    for (const func of updateFuncs) {
      try {
        await func()
      } catch (error: unknown) {
        if (firstError == null && error instanceof Error) {
          firstError = error
        }
      }
    }

    if (firstError != null) throw firstError
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
          this.ethEngine.currencyInfo.pluginId
        } processEthereumNetworkUpdate blockHeight ${
          ethereumNetworkUpdate.server ?? 'no server'
        } won`
      )
      const blockHeight = ethereumNetworkUpdate.blockHeight
      this.ethEngine.log(`Got block height ${blockHeight}`)
      this.ethEngine.updateBlockHeight(blockHeight)
    }

    if (ethereumNetworkUpdate.newNonce != null) {
      this.ethEngine.log(
        `${
          this.ethEngine.currencyInfo.pluginId
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
          this.ethEngine.currencyInfo.pluginId
        } processEthereumNetworkUpdate tokenBal ${
          ethereumNetworkUpdate.server ?? 'no server'
        } won`
      )
      for (const [tokenId, bal] of tokenBal) {
        this.ethEngine.updateBalance(tokenId, bal)
      }
      this.ethEngine.currencyEngineCallbacks.onNewTokens(
        ethereumNetworkUpdate.detectedTokenIds ?? []
      )
    }

    if (ethereumNetworkUpdate.tokenTxs != null) {
      const tokenTxs = ethereumNetworkUpdate.tokenTxs
      this.ethEngine.log(
        `${
          this.ethEngine.currencyInfo.pluginId
        } processEthereumNetworkUpdate tokenTxs ${
          ethereumNetworkUpdate.server ?? 'no server'
        } won`
      )
      let highestTxBlockHeight = 0
      const syncedTokenIds: EdgeTokenId[] = []
      for (const [tokenId, tuple] of tokenTxs) {
        syncedTokenIds.push(tokenId)
        for (const tx of tuple.edgeTransactions) {
          this.ethEngine.addTransaction(tokenId, tx)
        }
        const safeTokenId = tokenId ?? ''
        this.ethEngine.walletLocalData.lastTransactionQueryHeight[safeTokenId] =
          preUpdateBlockHeight
        this.ethEngine.walletLocalData.lastTransactionDate[safeTokenId] = now
        highestTxBlockHeight = Math.max(highestTxBlockHeight, tuple.blockHeight)
      }
      this.ethEngine.walletLocalData.highestTxBlockHeight = Math.max(
        this.ethEngine.walletLocalData.highestTxBlockHeight,
        highestTxBlockHeight
      )

      // Update the main blockHeight if we received transactions with a higher blockHeight
      if (highestTxBlockHeight > this.ethEngine.walletLocalData.blockHeight) {
        this.ethEngine.log(
          `Updating blockHeight from transactions: ${this.ethEngine.walletLocalData.blockHeight} -> ${highestTxBlockHeight}`
        )
        this.ethEngine.updateBlockHeight(highestTxBlockHeight)
      }

      this.ethEngine.walletLocalDataDirty = true
      this.ethEngine.syncTracker.setHistoryRatios(syncedTokenIds, 1)

      // Update addressSync state:
      if (
        // Don't update address needs if the engine has not finished it's
        // initial sync.
        this.ethEngine.syncComplete
      ) {
        // Filter the txids that have been processed:
        const updatedNeedsTxIds = this.ethNeeds.addressSync.needsTxids.filter(
          txid => {
            const txidNormal = normalizeAddress(txid)
            const hasTxidBeenProcessed = [...tokenTxs.keys()].some(tokenId => {
              const safeTokenId = tokenId ?? ''
              const txIndex =
                this.ethEngine.txIdMap[safeTokenId][txidNormal] ?? -1
              const edgeTx =
                this.ethEngine.transactionList[safeTokenId][txIndex]
              return edgeTx?.blockHeight > 0
            })
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

  /**
   * Finds one decoy address by randomly selecting a block and finding
   * an eligible EOA address with transaction count in the specified range.
   * Returns null if no eligible address is found.
   */
  async findDecoyAddresses(
    decoyAddressConfig: DecoyAddressConfig,
    currentBlockHeight: number
  ): Promise<string[]> {
    try {
      // Randomly select a block number within the lookback range
      // Look back half the blockchain height, but cap at 1,000,000 blocks
      const lookbackBlocks = Math.min(
        Math.floor(currentBlockHeight / 2),
        1_000_000
      )
      const minBlock = Math.max(1, currentBlockHeight - lookbackBlocks)
      const maxBlock = currentBlockHeight - 1
      const randomBlockNumber =
        Math.floor(Math.random() * (maxBlock - minBlock + 1)) + minBlock
      const randomBlockNumberHex = '0x' + randomBlockNumber.toString(16)

      // Fetch block with transactions using first available RpcAdapter
      const blockResponseRaw = await this.multicastRpc('eth_getBlockByNumber', [
        randomBlockNumberHex,
        true
      ])
      const blockResponse = asBlockResponse(blockResponseRaw)
      const block = blockResponse.result.result

      if (block == null || block.transactions == null) {
        return []
      }

      // Extract unique addresses from transactions
      const addressSet = new Set<string>()
      for (const tx of block.transactions) {
        if (tx.from != null) {
          addressSet.add(normalizeAddress(tx.from))
        }
        if (tx.to != null) {
          addressSet.add(normalizeAddress(tx.to))
        }
      }

      const addresses = Array.from(addressSet)
      if (addresses.length === 0) {
        return []
      }

      // Batch all eth_getCode calls
      const codeRequests = addresses.map(addr => ({
        method: 'eth_getCode' as RpcMethod,
        params: [`0x${addr}`, 'latest']
      }))

      const codeResults = await this.batchMulticastRpc(codeRequests)
      const codeResponses = codeResults.result

      // Filter to EOAs only
      const eoaAddresses: string[] = []
      for (let i = 0; i < addresses.length; i++) {
        const code = codeResponses[i].result
        if (code === '0x' || code === '0x0') {
          eoaAddresses.push(addresses[i])
        }
      }

      if (eoaAddresses.length === 0) {
        return []
      }

      // Batch all eth_getTransactionCount calls for EOAs
      const nonceRequests = eoaAddresses.map(addr => ({
        method: 'eth_getTransactionCount' as RpcMethod,
        params: [`0x${addr}`, 'latest']
      }))

      const nonceResultsRaw = await this.batchMulticastRpc(nonceRequests)
      const nonceResults = asNonceResponses(nonceResultsRaw)
      const nonceResponses = nonceResults.result

      // Filter by transaction count
      const eligibleAddresses: string[] = []

      const minTxCount = decoyAddressConfig.minTransactionCount
      const maxTxCount = decoyAddressConfig.maxTransactionCount

      for (let i = 0; i < eoaAddresses.length; i++) {
        try {
          const nonceHex = nonceResponses[i].result
          const transactionCount = parseInt(nonceHex, 16)

          if (
            transactionCount >= minTxCount &&
            transactionCount <= maxTxCount
          ) {
            eligibleAddresses.push(`0x${eoaAddresses[i]}`)
          }
        } catch (e: any) {
          this.ethEngine.warn(
            `Error processing transaction count for address ${
              eoaAddresses[i]
            }: ${String(e)}`
          )
          continue
        }
      }

      return eligibleAddresses
    } catch (e: any) {
      this.ethEngine.warn(`Error generating decoy addresses: ${String(e)}`)
      return []
    }
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

const asBlockResponse = asObject({
  result: asObject({
    result: asObject({
      transactions: asOptional(
        asArray(
          asObject({
            from: asString,
            to: asString
          })
        )
      )
    })
  })
})

const asNonceResponses = asObject({
  result: asArray(
    asObject({
      result: asString
    })
  )
})
