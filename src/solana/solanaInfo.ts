import { EdgeCurrencyInfo, EdgeTokenMap } from 'edge-core-js/types'

import { makeOuterPlugin } from '../common/innerPlugin'
import { makeMetaTokens } from '../common/tokenHelpers'
import type { SolanaTools } from './SolanaTools'
import type { SolanaNetworkInfo } from './solanaTypes'

const builtinTokens: EdgeTokenMap = {
  kshrEkxuc7zPAvLxvabxoERKxK6BfariPcjBoiHvM7B: {
    currencyCode: 'GMT',
    displayName: 'STEPN',
    denominations: [{ name: 'GMT', multiplier: '1000000000' }],
    networkLocation: {
      contractAddress: 'kshrEkxuc7zPAvLxvabxoERKxK6BfariPcjBoiHvM7B'
    }
  },
  CWE8jPTUYhdCTZYWPTe1o5DFqfdjzWKc9WKz6rSjQUdG: {
    currencyCode: 'LINK',
    displayName: 'Wrapped Chainlink',
    denominations: [{ name: 'LINK', multiplier: '1000000' }],
    networkLocation: {
      contractAddress: 'CWE8jPTUYhdCTZYWPTe1o5DFqfdjzWKc9WKz6rSjQUdG'
    }
  },
  HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3: {
    currencyCode: 'PYTH',
    displayName: 'Pyth Network',
    denominations: [{ name: 'PYTH', multiplier: '1000000' }],
    networkLocation: {
      contractAddress: 'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3'
    }
  },
  rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof: {
    currencyCode: 'RENDER',
    displayName: 'Render Token',
    denominations: [{ name: 'RENDER', multiplier: '100000000' }],
    networkLocation: {
      contractAddress: 'rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof'
    }
  },
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: {
    currencyCode: 'USDC',
    displayName: 'USD Coin',
    denominations: [{ name: 'USDC', multiplier: '1000000' }],
    networkLocation: {
      contractAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
    }
  },
  Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: {
    currencyCode: 'USDT',
    displayName: 'Tether',
    denominations: [{ name: 'USDT', multiplier: '1000000' }],
    networkLocation: {
      contractAddress: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'
    }
  }
}

const networkInfo: SolanaNetworkInfo = {
  rpcNodes: [
    'https://api.mainnet-beta.solana.com',
    'https://solana-mainnet.gateway.pokt.network/v1/lb/{{poktPortalApiKey}}' // fails to return some transactions
  ],
  commitment: 'confirmed', // confirmed is faster, finalized is safer. Even faster processed is unsupported for tx querys
  txQueryLimit: 1000, // RPC default is 1000
  derivationPath: "m/44'/501'/0'/0'",
  memoPublicKey: 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr',
  tokenPublicKey: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
  associatedTokenPublicKey: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'
}

const currencyInfo: EdgeCurrencyInfo = {
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
  metaTokens: makeMetaTokens(builtinTokens)
}

export const solana = makeOuterPlugin<SolanaNetworkInfo, SolanaTools>({
  currencyInfo,
  networkInfo,
  builtinTokens,

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
