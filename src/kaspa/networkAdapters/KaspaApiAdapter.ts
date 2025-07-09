import { KaspaEngine } from '../KaspaEngine'
import {
  asKaspaBalanceResponse,
  asKaspaTransactionsResponse,
  asKaspaUtxosResponse,
  KaspaNetworkUpdate,
  KaspaUtxo
} from '../kaspaTypes'

export interface KaspaApiAdapterConfig {
  type: 'api'
  servers: string[]
}

export class KaspaApiAdapter {
  kaspaEngine: KaspaEngine
  baseUrl: string

  constructor(kaspaEngine: KaspaEngine, baseUrl: string) {
    this.kaspaEngine = kaspaEngine
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
  }

  async fetchUtxos(address: string): Promise<KaspaNetworkUpdate> {
    try {
      const url = `${this.baseUrl}/addresses/${address}/utxos`
      const response = await this.kaspaEngine.fetchCors(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch UTXOs: ${response.status}`)
      }

      const data = await response.json()
      const clean = asKaspaUtxosResponse(data)

      // Transform API response to our UTXO format
      const utxos: KaspaUtxo[] = clean.entries.map(entry => ({
        transactionId: entry.outpoint.transactionId,
        index: entry.outpoint.index,
        amount: entry.utxoEntry.amount,
        scriptPublicKey: {
          scriptPublicKey: entry.utxoEntry.scriptPublicKey
        },
        blockDaaScore: parseInt(entry.utxoEntry.blockDaaScore)
      }))

      // Also fetch balance
      const balanceUpdate = await this.fetchBalance(address)

      return {
        utxos,
        balances: balanceUpdate.balances,
        server: this.baseUrl
      }
    } catch (error: any) {
      this.kaspaEngine.log.warn(
        `KaspaApiAdapter fetchUtxos error: ${error.message}`
      )
      throw error
    }
  }

  async fetchBalance(address: string): Promise<KaspaNetworkUpdate> {
    try {
      const url = `${this.baseUrl}/addresses/${address}/balance`
      const response = await this.kaspaEngine.fetchCors(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch balance: ${response.status}`)
      }

      const data = await response.json()
      const clean = asKaspaBalanceResponse(data)

      return {
        balances: {
          [address]: clean.balance
        },
        server: this.baseUrl
      }
    } catch (error: any) {
      this.kaspaEngine.log.warn(
        `KaspaApiAdapter fetchBalance error: ${error.message}`
      )
      throw error
    }
  }

  async fetchTransactions(address: string): Promise<KaspaNetworkUpdate> {
    try {
      const url = `${this.baseUrl}/addresses/${address}/transactions`
      const response = await this.kaspaEngine.fetchCors(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch transactions: ${response.status}`)
      }

      const data = await response.json()
      const clean = asKaspaTransactionsResponse(data)

      return {
        transactions: clean.transactions,
        server: this.baseUrl
      }
    } catch (error: any) {
      this.kaspaEngine.log.warn(
        `KaspaApiAdapter fetchTransactions error: ${error.message}`
      )
      throw error
    }
  }

  async fetchBlockHeight(): Promise<KaspaNetworkUpdate> {
    try {
      const url = `${this.baseUrl}/info/virtual-daa-score`
      const response = await this.kaspaEngine.fetchCors(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch block height: ${response.status}`)
      }

      const data = await response.json()

      // Kaspa uses DAA score instead of traditional block height
      const daaScore = data.virtualDaaScore ?? 0

      // Update otherData with DAA score
      if (this.kaspaEngine.otherData != null) {
        this.kaspaEngine.otherData.virtualDaaScore = daaScore
        this.kaspaEngine.walletLocalDataDirty = true
      }

      return {
        blockHeight: daaScore,
        server: this.baseUrl
      }
    } catch (error: any) {
      this.kaspaEngine.log.warn(
        `KaspaApiAdapter fetchBlockHeight error: ${error.message}`
      )
      throw error
    }
  }

  async broadcastTx(signedTx: string): Promise<{ txid: string }> {
    try {
      const url = `${this.baseUrl}/transactions/submit`
      const response = await this.kaspaEngine.fetchCors(url, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          transaction: signedTx
        })
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`Failed to broadcast transaction: ${error}`)
      }

      const data = await response.json()

      return {
        txid: data.transactionId
      }
    } catch (error: any) {
      this.kaspaEngine.log.warn(
        `KaspaApiAdapter broadcastTx error: ${error.message}`
      )
      throw error
    }
  }
}
