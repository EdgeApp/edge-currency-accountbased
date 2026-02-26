import { EdgeCurrencyInfo } from 'edge-core-js/types'

import { makeOuterPlugin } from '../common/innerPlugin'
import type { SolanaTools } from './SolanaTools'
import {
  asSolanaInfoPayload,
  SolanaInfoPayload,
  SolanaNetworkInfo
} from './solanaTypes'

const tokenPublicKey = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
const token2022PublicKey = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'

const networkInfo: SolanaNetworkInfo = {
  rpcNodes: [
    'https://api.mainnet-beta.solana.com',

    'https://solana.api.pocket.network',
    'https://mainnet.helius-rpc.com/?api-key={{heliusApiKey}}'
  ],
  rpcNodesArchival: [
    'https://api.mainnet-beta.solana.com',
    // 'https://solana-mainnet.g.alchemy.com/v2/{{alchemyApiKey}}',
    'https://mainnet.helius-rpc.com/?api-key={{heliusApiKey}}'
  ],
  stakedConnectionRpcNodes: [
    'https://staked.helius-rpc.com?api-key={{heliusApiKey}}'
  ],
  basePriorityFee: 50000,
  commitment: 'confirmed', // confirmed is faster, finalized is safer. Even faster processed is unsupported for tx querys
  txQueryLimit: 1000, // RPC default is 1000
  derivationPath: "m/44'/501'/0'/0'",
  memoPublicKey: 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr',
  tokenPublicKey,
  token2022PublicKey,
  associatedTokenPublicKey: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'
}

const currencyInfo: EdgeCurrencyInfo = {
  currencyCode: 'SOL',
  assetDisplayName: 'Solana',
  chainDisplayName: 'Solana',
  pluginId: 'solana',
  walletType: 'wallet:solana',

  // Explorers:
  addressExplorer: 'https://explorer.solana.com/address/%s',
  transactionExplorer: 'https://explorer.solana.com/tx/%s',

  customFeeTemplate: [
    {
      displayName: 'Micro Lamports',
      key: 'microLamports',
      type: 'string'
    }
  ],
  customTokenTemplate: [
    {
      displayName: 'Token Address',
      key: 'contractAddress',
      type: 'string'
    },
    {
      displayName: 'Token Program Address',
      key: 'tokenProgram',
      type: 'string'
    }
  ],
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
  defaultSettings: { customFeeSettings: ['microLamports'] },
  displayName: 'Solana'
}

export const solana = makeOuterPlugin<
  SolanaNetworkInfo,
  SolanaTools,
  SolanaInfoPayload
>({
  currencyInfo,
  asInfoPayload: asSolanaInfoPayload,
  networkInfo,

  checkEnvironment: () => {
    if (global.BigInt == null) {
      throw new Error('Solana requires bigint support')
    }
  },

  async getInnerPlugin() {
    return await import(
      /* webpackChunkName: "solana" */
      './SolanaTools'
    )
  }
})
