import { EdgeTransaction } from 'edge-core-js/types'

import { PluginEnvironment } from '../../common/innerPlugin'
import { KaspaNetworkInfo } from '../kaspaTypes'
import {
  BroadcastResults,
  ConnectionChangeHandler,
  KaspaNetworkUpdate
} from './types'

export interface KaspaRestAdapterConfig {
  type: 'kaspa-rest'
  servers: string[]
}

export class KaspaRestAdapter {
  env: PluginEnvironment<KaspaNetworkInfo>
  config: KaspaRestAdapterConfig

  constructor(
    env: PluginEnvironment<KaspaNetworkInfo>,
    config: KaspaRestAdapterConfig
  ) {
    this.env = env
    this.config = config
  }

  broadcast = async (tx: EdgeTransaction): Promise<BroadcastResults> => {
    const result = await this.serialServers(async server => {
      try {
        const response = await this.env.io.fetch(`${server}/transaction`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            rawTransaction: tx.signedTx
          })
        })

        if (!response.ok) {
          this.throwError(response, 'broadcast', server)
        }

        const json = await response.json()
        return this.broadcastResponseHandler(json, server, tx)
      } catch (error) {
        this.logError('broadcast', error as Error)
        throw error
      }
    })

    return { result }
  }

  connect = (cb?: ConnectionChangeHandler): void => {
    // REST adapters don't maintain persistent connections
    if (cb != null) cb(true)
  }

  disconnect = (): void => {
    // No cleanup needed for REST
  }

  fetchBlockheight = async (): Promise<KaspaNetworkUpdate> => {
    return await this.parallelServers(async server => {
      try {
        const response = await this.env.io.fetch(`${server}/info`)
        
        if (!response.ok) {
          this.throwError(response, 'fetchBlockheight', server)
        }

        const json = await response.json()
        return {
          blockHeight: json.blockHeight || json.virtualDaaScore || 0,
          server
        }
      } catch (error) {
        this.logError('fetchBlockheight', error as Error)
        throw error
      }
    }, 'fetchBlockheight')
  }

  fetchBalance = async (address: string): Promise<KaspaNetworkUpdate> => {
    return await this.parallelServers(async server => {
      try {
        const response = await this.env.io.fetch(`${server}/address/${address}/balance`)
        
        if (!response.ok) {
          this.throwError(response, 'fetchBalance', server)
        }

        const json = await response.json()
        
        return {
          balanceResults: [{
            address,
            balance: json.balance?.toString() || '0',
            currencyCode: 'KAS'
          }],
          server
        }
      } catch (error) {
        this.logError('fetchBalance', error as Error)
        throw error
      }
    }, 'fetchBalance')
  }

  fetchTxs = async (
    addresses: string[],
    startBlock?: number
  ): Promise<KaspaNetworkUpdate> => {
    return await this.parallelServers(async server => {
      try {
        const transactions: any[] = []
        
        for (const address of addresses) {
          const url = `${server}/address/${address}/transactions${
            startBlock ? `?startBlock=${startBlock}` : ''
          }`
          
          const response = await this.env.io.fetch(url)
          
          if (!response.ok) {
            this.throwError(response, 'fetchTxs', server)
          }

          const json = await response.json()
          if (json.transactions) {
            transactions.push(...json.transactions)
          }
        }

        return {
          txs: transactions.map(tx => ({
            txid: tx.txid || tx.transactionId || tx.hash,
            date: tx.timestamp ? new Date(tx.timestamp * 1000).toISOString() : new Date().toISOString(),
            blockHeight: tx.blockHeight || tx.blockDaaScore || 0,
                         ourReceiveAddresses: addresses.filter(addr => 
               tx.outputs?.some((output: any) => output.address === addr)
             ),
             nativeAmount: tx.outputs
               ?.filter((output: any) => addresses.some(address => output.address === address))
               ?.reduce((sum: string, output: any) => {
                 const currentSum = parseInt(sum, 10)
                 const outputAmount = parseInt(output.value || output.amount || '0', 10)
                 return (currentSum + outputAmount).toString()
               }, '0') || '0',
            networkFee: tx.fee?.toString() || '0',
            signedTx: tx.raw || tx.rawTransaction || '',
            otherParams: {
              fromAddress: tx.inputs?.[0]?.address || '',
              toAddress: tx.outputs?.[0]?.address || ''
            }
          })),
          server
        }
      } catch (error) {
        this.logError('fetchTxs', error as Error)
        throw error
      }
    }, 'fetchTxs')
  }
}