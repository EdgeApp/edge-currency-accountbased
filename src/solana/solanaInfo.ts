import { EdgeCurrencyInfo, EdgeTokenMap } from 'edge-core-js/types'

import { makeOuterPlugin } from '../common/innerPlugin'
import {
  createTokenIdFromContractAddress,
  makeMetaTokens
} from '../common/tokenHelpers'
import type { SolanaTools } from './SolanaTools'
import {
  asSolanaInfoPayload,
  SolanaInfoPayload,
  SolanaNetworkInfo
} from './solanaTypes'

const tokenPublicKey = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
const token2022PublicKey = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'

const builtinTokens: EdgeTokenMap = {
  '7atgF8KQo4wJrD5ATGX7t1V2zVvykPJbFfNeVf1icFv1': {
    currencyCode: '$CWIF',
    displayName: 'catwifhat',
    denominations: [{ name: '$CWIF', multiplier: '100' }],
    networkLocation: {
      contractAddress: '7atgF8KQo4wJrD5ATGX7t1V2zVvykPJbFfNeVf1icFv1',
      tokenProgram: token2022PublicKey
    }
  },
  bioJ9JTqW62MLz7UKHU69gtKhPpGi1BQhccj2kmSvUJ: {
    currencyCode: 'BIO',
    displayName: 'BIO',
    denominations: [{ name: 'BIO', multiplier: '1000000000' }],
    networkLocation: {
      contractAddress: 'bioJ9JTqW62MLz7UKHU69gtKhPpGi1BQhccj2kmSvUJ',
      tokenProgram: token2022PublicKey
    }
  },
  DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263: {
    currencyCode: 'BONK',
    displayName: 'Bonk',
    denominations: [{ name: 'BONK', multiplier: '100000' }],
    networkLocation: {
      contractAddress: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
      tokenProgram: tokenPublicKey
    }
  },
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
    currencyCode: 'RNDR',
    displayName: 'Render Token',
    denominations: [{ name: 'RNDR', multiplier: '100000000' }],
    networkLocation: {
      contractAddress: 'rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof'
    }
  },
  '4geJykZY92d2mZk8zgWDrKoz4BDcSjp7DJdNvH8GoH5f': {
    currencyCode: 'BOBBY',
    displayName: 'Kennedy Memecoin',
    denominations: [{ name: 'BOBBY', multiplier: '100000000' }],
    networkLocation: {
      contractAddress: '4geJykZY92d2mZk8zgWDrKoz4BDcSjp7DJdNvH8GoH5f'
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
  },
  '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs': {
    currencyCode: 'WETH',
    displayName: 'Wrapped Ether (Wormhole)',
    denominations: [{ name: 'WETH', multiplier: '100000000' }],
    networkLocation: {
      contractAddress: '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs'
    }
  },
  '3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh': {
    currencyCode: 'WBTC',
    displayName: 'Wrapped BTC (Wormhole)',
    denominations: [{ name: 'WBTC', multiplier: '100000000' }],
    networkLocation: {
      contractAddress: '3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh'
    }
  },
  So11111111111111111111111111111111111111112: {
    currencyCode: 'WSOL',
    displayName: 'Wrapped SOL',
    denominations: [{ name: 'WSOL', multiplier: '1000000000' }],
    networkLocation: {
      contractAddress: 'So11111111111111111111111111111111111111112'
    }
  },
  mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So: {
    currencyCode: 'MSOL',
    displayName: 'Marinade staked SOL',
    denominations: [{ name: 'MSOL', multiplier: '1000000000' }],
    networkLocation: {
      contractAddress: 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So'
    }
  },
  DriFtupJYLTosbwoN8koMbEYSx54aFAVLddWsbksjwg7: {
    currencyCode: 'DRIFT',
    displayName: 'DRIFT',
    denominations: [{ name: 'DRIFT', multiplier: '1000000' }],
    networkLocation: {
      contractAddress: 'DriFtupJYLTosbwoN8koMbEYSx54aFAVLddWsbksjwg7'
    }
  },
  JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN: {
    currencyCode: 'JUP',
    displayName: 'Jupiter',
    denominations: [{ name: 'JUP', multiplier: '1000000' }],
    networkLocation: {
      contractAddress: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN'
    }
  },
  jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL: {
    currencyCode: 'JTO',
    displayName: 'JITO',
    denominations: [{ name: 'JTO', multiplier: '1000000000' }],
    networkLocation: {
      contractAddress: 'jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL'
    }
  },
  bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1: {
    currencyCode: 'BSOL',
    displayName: 'BlazeStake',
    denominations: [{ name: 'BSOL', multiplier: '1000000000' }],
    networkLocation: {
      contractAddress: 'bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1'
    }
  },
  BKipkearSqAUdNKa1WDstvcMjoPsSKBuNyvKDQDDu9WE: {
    currencyCode: 'HAWK',
    displayName: 'Hawksight',
    denominations: [{ name: 'HAWK', multiplier: '1000000' }],
    networkLocation: {
      contractAddress: 'BKipkearSqAUdNKa1WDstvcMjoPsSKBuNyvKDQDDu9WE'
    }
  },
  J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn: {
    currencyCode: 'JITOSOL',
    displayName: 'Jito Staked SOL',
    denominations: [{ name: 'JITOSOL', multiplier: '1000000000' }],
    networkLocation: {
      contractAddress: 'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn'
    }
  },
  '7Q2afV64in6N6SeZsAAB81TJzwDoD6zpqmHkzi9Dcavn': {
    currencyCode: 'JSOL',
    displayName: 'JPool Staked SOL',
    denominations: [{ name: 'JSOL', multiplier: '1000000000' }],
    networkLocation: {
      contractAddress: '7Q2afV64in6N6SeZsAAB81TJzwDoD6zpqmHkzi9Dcavn'
    }
  },
  MangoCzJ36AjZyKwVj3VnYU4GTonjfVEnJmvvWaxLac: {
    currencyCode: 'MNGO',
    displayName: 'Mango',
    denominations: [{ name: 'MNGO', multiplier: '1000000' }],
    networkLocation: {
      contractAddress: 'MangoCzJ36AjZyKwVj3VnYU4GTonjfVEnJmvvWaxLac'
    }
  },
  '9TE7ebz1dsFo1uQ2T4oYAKSm39Y6fWuHrd6Uk6XaiD16': {
    currencyCode: 'MIMO',
    displayName: 'Million Monke',
    denominations: [{ name: 'MIMO', multiplier: '1000000000' }],
    networkLocation: {
      contractAddress: '9TE7ebz1dsFo1uQ2T4oYAKSm39Y6fWuHrd6Uk6XaiD16'
    }
  }
}

const networkInfo: SolanaNetworkInfo = {
  rpcNodes: [
    'https://api.mainnet-beta.solana.com',
    // 'https://solana-mainnet.rpc.grove.city/v1/{{poktPortalApiKey}}', // fails to return some transactions
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
  displayName: 'Solana',
  metaTokens: makeMetaTokens(builtinTokens)
}

export const solana = makeOuterPlugin<
  SolanaNetworkInfo,
  SolanaTools,
  SolanaInfoPayload
>({
  currencyInfo,
  asInfoPayload: asSolanaInfoPayload,
  createTokenId: createTokenIdFromContractAddress,
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
