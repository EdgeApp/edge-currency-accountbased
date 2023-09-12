import { EdgeCurrencyInfo } from 'edge-core-js/types'

import { makeOuterPlugin } from '../common/innerPlugin'
import type { SolanaTools } from './SolanaTools'
import type { SolanaNetworkInfo } from './solanaTypes'

const networkInfo: SolanaNetworkInfo = {
  rpcNodes: [
    // 'https://solana-api.projectserum.com', // Doesn't have full history
    'https://ssc-dao.genesysgo.net',
    'https://api.mainnet-beta.solana.com'
  ],
  commitment: 'confirmed', // confirmed is faster, finalized is safer. Even faster processed is unsupported for tx querys
  txQueryLimit: 1000, // RPC default is 1000
  derivationPath: "m/44'/501'/0'/0'",
  memoPublicKey: 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'
}

export const currencyInfo: EdgeCurrencyInfo = {
  currencyCode: 'SOL',
  displayName: 'Solana',
  pluginId: 'solana',
  walletType: 'wallet:solana',

  // Explorers:
  addressExplorer: 'https://explorer.solana.com/address/%s',
  transactionExplorer: 'https://explorer.solana.com/tx/%s',

  denominations: [
    {
      name: 'SOL',
      multiplier: '1000000000',
      symbol: '◎'
    }
  ],

  // https://spl.solana.com/memo
  memoOptions: [{ type: 'text', memoName: 'memo', maxLength: 32 }],

  // Deprecated:
  defaultSettings: {},
  memoType: 'text',
  metaTokens: []
}

export const solana = makeOuterPlugin<SolanaNetworkInfo, SolanaTools>({
  currencyInfo,
  networkInfo,

  async getInnerPlugin() {
    return await import(
      /* webpackChunkName: "solana" */
      './SolanaTools'
    )
  }
})
