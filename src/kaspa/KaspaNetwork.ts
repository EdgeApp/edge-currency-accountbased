import { EdgeTransaction } from 'edge-core-js/types'

import { PluginEnvironment } from '../common/innerPlugin'
import { KaspaNetworkInfo } from './kaspaTypes'
import { KaspaRpcAdapter, KaspaRpcAdapterConfig } from './networkAdapters/KaspaRpcAdapter'
import { KaspaRestAdapter, KaspaRestAdapterConfig } from './networkAdapters/KaspaRestAdapter'
import {
  BroadcastResults,
  ConnectionChangeHandler,
  KaspaBalanceResult,
  KaspaTx,
  KaspaNetworkUpdate
} from './networkAdapters/types'

type KaspaNetworkAdapterConfig = KaspaRpcAdapterConfig | KaspaRestAdapterConfig



export class KaspaNetwork {
  adapters: Array<KaspaRpcAdapter | KaspaRestAdapter>
  env: PluginEnvironment<KaspaNetworkInfo>

  constructor(
    env: PluginEnvironment<KaspaNetworkInfo>,
    adapterConfigs: KaspaNetworkAdapterConfig[]
  ) {
    this.env = env
    this.adapters = []

    for (const config of adapterConfigs) {
      switch (config.type) {
        case 'kaspa-rpc':
          this.adapters.push(new KaspaRpcAdapter(env, config))
          break
        case 'kaspa-rest':
          this.adapters.push(new KaspaRestAdapter(env, config))
          break
        default:
          throw new Error(`Unknown adapter type: ${(config as any).type}`)
      }
    }
  }

  async broadcast(tx: EdgeTransaction): Promise<BroadcastResults> {
    const errors: Error[] = []

    for (const adapter of this.adapters) {
      if (adapter.broadcast == null) continue

      try {
        return await adapter.broadcast(tx)
             } catch (error) {
         console.warn(`Broadcast failed for ${adapter.config.type}:`, error)
         errors.push(error as Error)
       }
    }

    if (errors.length > 0) {
      throw new Error(`All broadcast attempts failed: ${errors.map(e => e.message).join(', ')}`)
    }

    throw new Error('No broadcast adapters available')
  }

  connect(cb?: ConnectionChangeHandler): void {
    let connectedCount = 0
    const totalAdapters = this.adapters.length

    if (totalAdapters === 0) {
      if (cb != null) cb(true)
      return
    }

    const connectionHandler = (isConnected: boolean): void => {
      if (isConnected) {
        connectedCount++
      }

      // Consider connected if at least one adapter is connected
      if (cb != null) cb(connectedCount > 0)
    }

    for (const adapter of this.adapters) {
      adapter.connect(connectionHandler)
    }
  }

  disconnect(): void {
    for (const adapter of this.adapters) {
      adapter.disconnect()
    }
  }

  async multicastRpc(
    method: 'fetchBlockheight' | 'fetchBalance' | 'fetchTxs',
    params: any[]
  ): Promise<KaspaNetworkUpdate> {
    const errors: Error[] = []

    for (const adapter of this.adapters) {
      try {
        switch (method) {
          case 'fetchBlockheight':
            return await adapter.fetchBlockheight()
          case 'fetchBalance':
            return await adapter.fetchBalance(params[0])
          case 'fetchTxs':
            return await adapter.fetchTxs(params[0], params[1])
        }
      } catch (error) {
        console.warn(`${method} failed for ${adapter.config.type}:`, error)
        errors.push(error as Error)
      }
    }

    if (errors.length > 0) {
      throw new Error(`All ${method} attempts failed: ${errors.map(e => e.message).join(', ')}`)
    }

    throw new Error(`No ${method} adapters available`)
  }

  async fetchBlockheight(): Promise<KaspaNetworkUpdate> {
    return await this.multicastRpc('fetchBlockheight', [])
  }

  async fetchBalance(address: string): Promise<KaspaNetworkUpdate> {
    return await this.multicastRpc('fetchBalance', [address])
  }

  async fetchTxs(addresses: string[], startBlock?: number): Promise<KaspaNetworkUpdate> {
    return await this.multicastRpc('fetchTxs', [addresses, startBlock])
  }
}