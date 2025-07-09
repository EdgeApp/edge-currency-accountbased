import { makePeriodicTask, PeriodicTask } from '../common/periodicTask'
import { asyncWaterfall, promiseAny } from '../common/promiseUtils'
import { KaspaEngine } from './KaspaEngine'
import {
  KaspaNetworkInfo,
  KaspaNetworkUpdate,
  KaspaRpcMethod
} from './kaspaTypes'
import { KaspaApiAdapter } from './networkAdapters/KaspaApiAdapter'
import { KaspaRpcAdapter } from './networkAdapters/KaspaRpcAdapter'

interface NetworkAdapter {
  fetchUtxos: (address: string) => Promise<KaspaNetworkUpdate>
  fetchTransactions: (address: string) => Promise<KaspaNetworkUpdate>
  fetchBlockHeight: () => Promise<KaspaNetworkUpdate>
  broadcastTx: (signedTx: string) => Promise<{ txid: string }>
  multicastRpc?: (method: KaspaRpcMethod, params: any[]) => Promise<any>
}

export class KaspaNetwork {
  kaspaEngine: KaspaEngine
  networkAdapters: NetworkAdapter[]
  blockHeightTask: PeriodicTask

  constructor(kaspaEngine: KaspaEngine) {
    this.kaspaEngine = kaspaEngine
    this.networkAdapters = this.buildNetworkAdapters(kaspaEngine.networkInfo)

    this.blockHeightTask = makePeriodicTask(
      async () =>
        await this.fetchBlockHeight().then(_networkUpdate => {
          /// TODO process networkUpdate
        }),
      20000, // 20 seconds
      {
        onError: error => {
          this.kaspaEngine.log.warn('fetchBlockHeight error:', error)
        }
      }
    )
  }

  buildNetworkAdapters(networkInfo: KaspaNetworkInfo): NetworkAdapter[] {
    const adapters: NetworkAdapter[] = []

    // Add Kaspa API adapters
    for (const server of networkInfo.kaspaApiServers) {
      adapters.push(new KaspaApiAdapter(this.kaspaEngine, server))
    }

    // Add RPC adapters if available
    for (const server of networkInfo.rpcServers) {
      adapters.push(new KaspaRpcAdapter(this.kaspaEngine, server))
    }

    return adapters
  }

  async fetchUtxos(address: string): Promise<KaspaNetworkUpdate> {
    const promises = this.networkAdapters.map(
      adapter => async () => await adapter.fetchUtxos(address)
    )

    return await asyncWaterfall(promises)
  }

  async fetchTransactions(address: string): Promise<KaspaNetworkUpdate> {
    const promises = this.networkAdapters.map(
      adapter => async () => await adapter.fetchTransactions(address)
    )

    return await asyncWaterfall(promises)
  }

  fetchBlockHeight = async (): Promise<KaspaNetworkUpdate> => {
    const promises = this.networkAdapters.map(
      adapter => async () => await adapter.fetchBlockHeight()
    )

    try {
      const result = await asyncWaterfall(promises)

      if (
        result.blockHeight != null &&
        result.blockHeight > this.kaspaEngine.walletLocalData.blockHeight
      ) {
        this.kaspaEngine.walletLocalData.blockHeight = result.blockHeight
        this.kaspaEngine.walletLocalDataDirty = true
        this.kaspaEngine.currencyEngineCallbacks.onBlockHeightChanged(
          result.blockHeight
        )
      }

      return result
    } catch (error) {
      this.kaspaEngine.log.warn(
        'All network adapters failed for fetchBlockHeight:',
        error
      )
      throw error
    }
  }

  async broadcastTx(signedTx: string): Promise<{ txid: string }> {
    // Try all adapters in parallel for broadcasting
    const promises = this.networkAdapters.map(
      async adapter => await adapter.broadcastTx(signedTx)
    )

    return await promiseAny(promises)
  }

  async multicastRpc(method: KaspaRpcMethod, params: any[]): Promise<any> {
    const adapters = this.networkAdapters.filter(
      adapter => adapter.multicastRpc != null
    )

    if (adapters.length === 0) {
      throw new Error('No RPC adapters available')
    }

    const promises = adapters.map(
      adapter => async () => await adapter.multicastRpc!(method, params)
    )

    return await asyncWaterfall(promises)
  }

  start(): void {
    this.blockHeightTask.start()
  }

  stop(): void {
    this.blockHeightTask.stop()
  }
}
