import { asBoolean, asJSON, asMaybe, asObject, asString } from 'cleaners'
import WebSocket from 'isomorphic-ws'

import { makePeriodicTask, PeriodicTask } from '../../common/periodicTask'
import { pickRandomOne } from '../../common/utils'
import { EthereumEngine } from '../EthereumEngine'
import { EthereumInitOptions } from '../ethereumTypes'
import { NetworkAdapter } from './types'

export interface BlockbookWsAdapterConfig {
  type: 'blockbook-ws'
  connections: BlockbookWsAdapterConnection[]
}

export interface BlockbookWsAdapterConnection {
  url: string
  keyType?: Extract<keyof EthereumInitOptions, 'nowNodesApiKey'>
}

type StandardWebSocket = InstanceType<typeof window.WebSocket>

//
// Blockbook Types
//

interface BlockbookSubscription {
  callback: (txid?: string) => void
  message: BlockbookMessage
}
interface BlockbookMessage {
  id: string
  method: string
  params: any
}

const asBlockbookSubscribeSuccessMessage = asJSON(
  asObject({
    id: asString,
    data: asObject({
      subscribed: asBoolean
    })
  })
)
const asBlockbookAddressUpdateMessage = asJSON(
  asObject({
    id: asString,
    data: asObject({
      address: asString,
      // Only the txid is necessary for address syndication
      tx: asObject({ txid: asString })
    })
  })
)

//
// Constants
//

const KEEP_ALIVE_MS = 50000 // interval at which we keep the connection alive
const BACKOFF_MIN_MS = 60000 // 1000
const BACKOFF_MAX_MS = 60000

//
// Adapter
//

export class BlockbookWsAdapter extends NetworkAdapter<BlockbookWsAdapterConfig> {
  broadcast = null
  fetchBlockheight = null
  fetchNonce = null
  fetchTokenBalance = null
  fetchTokenBalances = null
  fetchTxs = null
  getBaseFeePerGas = null
  multicastRpc = null

  private ws?: StandardWebSocket
  private readonly servers: BlockbookWsAdapterConnection[]
  private readonly subscriptions: Map<string, BlockbookSubscription> = new Map()
  private isConnected: Promise<boolean> = Promise.resolve(false)
  private readonly pingTask: PeriodicTask
  private reconnectTries: number = 0
  pingIntervalId: NodeJS.Timer | undefined

  constructor(engine: EthereumEngine, config: BlockbookWsAdapterConfig) {
    super(engine, config)
    if (config.connections.length === 0) {
      throw new Error('At least one URL must be provided')
    }
    this.servers = config.connections
    this.pingTask = makePeriodicTask(this.ping, KEEP_ALIVE_MS)
  }

  connect = (): void => {
    const wsUrl = this.getWsUrl()
    // @ts-expect-error
    const ws: StandardWebSocket = new WebSocket(wsUrl)

    // Set the WebSocket instance
    this.ws = ws

    this.isConnected = new Promise(resolve => {
      const connectionFailure = (): void => {
        ws.removeEventListener('open', connectionSuccess)
        console.error('WebSocket connection failed')
        resolve(false)
      }
      const connectionSuccess = (): void => {
        ws.removeEventListener('error', connectionFailure)
        console.log('WebSocket connection succeeded')
        resolve(true)
      }
      ws.addEventListener('error', connectionFailure)
      ws.addEventListener('open', connectionSuccess)

      // Connection success:
      ws.addEventListener('open', () => {
        this.reconnectTries = 0
        this.pingTask.start()
      })

      // Connection failure:
      ws.addEventListener('error', () => {
        const delay = this.backoffInterval()
        console.warn(
          `WebSocket connection closed do to error. Retrying in ${delay}ms`
        )
        setTimeout(() => this.reconnect(), delay)
      })

      // Connection message:
      ws.addEventListener('message', (event: MessageEvent<string>) => {
        let message

        // Subscribe success message:
        if (
          (message = asMaybe(asBlockbookSubscribeSuccessMessage)(event.data)) !=
          null
        ) {
          if (!message.data.subscribed) return
          const subscription = this.subscriptions.get(message.id)
          if (subscription == null) return
          subscription.callback()
        }

        // Address update message:
        if (
          (message = asMaybe(asBlockbookAddressUpdateMessage)(event.data)) !=
          null
        ) {
          const subscription = this.subscriptions.get(message.id)
          if (subscription == null) return
          subscription.callback(message.data.tx.txid)
        }
      })
    })
  }

  disconnect = (): void => {
    this.ws?.close()
    this.isConnected = Promise.resolve(false)
    this.pingTask.stop()
    this.subscriptions.clear()
  }

  subscribeAddressSync = async (
    address: string,
    callback: (txid?: string) => void
  ): Promise<void> => {
    const message = {
      id: `subscribeAddress_${address}`,
      method: 'subscribeAddresses',
      params: {
        addresses: [address]
      }
    }

    if (this.subscriptions.has(message.id)) {
      console.warn(`Already subscribed to address ${address}`)
      return
    }

    this.subscriptions.set(message.id, {
      callback,
      message
    })
    await this.sendMessage(message)
  }

  private backoffInterval(): number {
    return Math.min(
      BACKOFF_MIN_MS * 1.5 ** ++this.reconnectTries,
      BACKOFF_MAX_MS
    )
  }

  private getWsUrl(): string {
    let servers = [...this.servers]

    while (servers.length > 0) {
      const server = pickRandomOne(this.servers)

      if (server.keyType != null) {
        const apiKey = this.ethEngine.initOptions[server.keyType]

        // Check for missing API key
        if (apiKey == null) {
          console.warn(
            `Missing '${server.keyType}' API key for '${server.url}'`
          )
          // Avoid using this server again
          servers = servers.filter(s => s !== server)
          // Try another server
          continue
        }

        // Add key to the end of the URL path
        return server.url.replace(/\/*$/, '/' + apiKey)
      }

      return server.url
    }

    throw new Error('No valid URL found')
  }

  private readonly ping = async (): Promise<void> => {
    const message: BlockbookMessage = {
      id: 'ping',
      method: 'ping',
      params: undefined
    }
    await this.sendMessage(message)
  }

  private reconnect(): void {
    this.connect()
    this.isConnected
      .then(async isConnected => {
        if (isConnected) await this.resubscribe()
      })
      .catch(error => console.error(`Resubscribe failed`, error))
  }

  private readonly resubscribe = async (): Promise<void> => {
    for (const [, subscription] of this.subscriptions) {
      await this.sendMessage(subscription.message)
    }
  }

  private readonly sendMessage = async (
    message: BlockbookMessage
  ): Promise<void> => {
    if (!(await this.isConnected)) return
    this.ws?.send(JSON.stringify(message))
  }
}
