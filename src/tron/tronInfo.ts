import { EdgeCurrencyInfo, EdgeTokenMap } from 'edge-core-js/types'

import { makeOuterPlugin } from '../common/innerPlugin'
import { makeMetaTokens } from '../common/tokenHelpers'
import type { TronTools } from './tronPlugin'
import type { TronNetworkInfo } from './tronTypes'

const builtinTokens: EdgeTokenMap = {
  TPYmHEhy5n8TCEfYGqW2rPxsghSfzghPDn: {
    currencyCode: 'USDD',
    displayName: 'Decentralized USD',
    denominations: [{ name: 'USDD', multiplier: '1000000000000000000' }],
    networkLocation: { contractAddress: 'TPYmHEhy5n8TCEfYGqW2rPxsghSfzghPDn' }
  },

  TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t: {
    currencyCode: 'USDT',
    displayName: 'Tether',
    denominations: [{ name: 'USDT', multiplier: '1000000' }],
    networkLocation: { contractAddress: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t' }
  },

  TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8: {
    currencyCode: 'USDC',
    displayName: 'USD Coin',
    denominations: [{ name: 'USDC', multiplier: '1000000' }],
    networkLocation: { contractAddress: 'TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8' }
  },

  TNUC9Qb1rRpS5CbWLmNMxXBjyFoydXjWFR: {
    currencyCode: 'WTRX',
    displayName: 'Wrapped TRX',
    denominations: [{ name: 'WTRX', multiplier: '1000000' }],
    networkLocation: { contractAddress: 'TNUC9Qb1rRpS5CbWLmNMxXBjyFoydXjWFR' }
  },

  TUpMhErZL2fhh4sVNULAbNKLokS4GjC1F4: {
    currencyCode: 'TUSD',
    displayName: 'TrueUSD',
    denominations: [{ name: 'TUSD', multiplier: '1000000000000000000' }],
    networkLocation: { contractAddress: 'TUpMhErZL2fhh4sVNULAbNKLokS4GjC1F4' }
  },

  TAFjULxiVgT4qWk6UZwjqwZXTSaGaqnVp4: {
    currencyCode: 'BTT',
    displayName: 'BitTorrent',
    denominations: [{ name: 'BTT', multiplier: '1000000000000000000' }],
    networkLocation: { contractAddress: 'TAFjULxiVgT4qWk6UZwjqwZXTSaGaqnVp4' }
  },

  TCFLL5dx5ZJdKnWuesXxi1VPwjLVmWZZy9: {
    currencyCode: 'JST',
    displayName: 'JUST',
    denominations: [{ name: 'JST', multiplier: '1000000000000000000' }],
    networkLocation: { contractAddress: 'TCFLL5dx5ZJdKnWuesXxi1VPwjLVmWZZy9' }
  },

  TLa2f6VPqDgRE67v1736s7bJ8Ray5wYjU7: {
    currencyCode: 'WIN',
    displayName: 'WINkLink',
    denominations: [{ name: 'WIN', multiplier: '1000000' }],
    networkLocation: { contractAddress: 'TLa2f6VPqDgRE67v1736s7bJ8Ray5wYjU7' }
  },

  TFczxzPhnThNSqr5by8tvxsdCFRRz6cPNq: {
    currencyCode: 'NFT',
    displayName: 'APENFT',
    denominations: [{ name: 'NFT', multiplier: '1000000' }],
    networkLocation: { contractAddress: 'TFczxzPhnThNSqr5by8tvxsdCFRRz6cPNq' }
  },

  TSSMHYeV2uE9qYH95DqyoCuNCzEL1NvU3S: {
    currencyCode: 'SUN',
    displayName: 'SUN',
    denominations: [{ name: 'SUN', multiplier: '1000000000000000000' }],
    networkLocation: { contractAddress: 'TSSMHYeV2uE9qYH95DqyoCuNCzEL1NvU3S' }
  },

  TMwFHYXLJaRUPeW6421aqXL4ZEzPRFGkGT: {
    currencyCode: 'USDJ',
    displayName: 'JUST Stablecoin',
    denominations: [{ name: 'USDJ', multiplier: '1000000000000000000' }],
    networkLocation: { contractAddress: 'TMwFHYXLJaRUPeW6421aqXL4ZEzPRFGkGT' }
  }
}

export const networkInfo: TronNetworkInfo = {
  tronApiServers: ['https://api.trongrid.io'],
  tronNodeServers: [
    'http://3.225.171.164:8090',
    'http://52.53.189.99:8090',
    'http://18.196.99.16:8090',
    'http://34.253.187.192:8090',
    'http://52.56.56.149:8090',
    'http://35.180.51.163:8090',
    'http://54.252.224.209:8090',
    'http://18.228.15.36:8090',
    'http://52.15.93.92:8090',
    'http://34.220.77.106:8090',
    'http://13.127.47.162:8090',
    'http://13.124.62.58:8090',
    'http://35.182.229.162:8090',
    'http://18.209.42.127:8090',
    'http://3.218.137.187:8090',
    'http://34.237.210.82:8090'
  ],
  defaultDerivationPath: "m/44'/195'/0'/0/0", // Default for initial release was "m/44'/195'/0'/0",
  defaultFeeLimit: 1000000000 // TODO: 1000 TRX. Should probably update.
}

export const currencyInfo: EdgeCurrencyInfo = {
  // Basic currency information:
  currencyCode: 'TRX',
  displayName: 'Tron',
  pluginId: 'tron',
  walletType: 'wallet:tron',

  defaultSettings: {},

  memoType: 'text',

  addressExplorer: 'https://tronscan.org/#/address/%s',
  transactionExplorer: 'https://tronscan.org/#/transaction/%s',

  denominations: [
    // An array of Objects of the possible denominations for this currency
    {
      name: 'TRX',
      multiplier: '1000000',
      symbol: 'T'
    }
  ],

  metaTokens: makeMetaTokens(builtinTokens) // Deprecated
}

export const tron = makeOuterPlugin<TronNetworkInfo, TronTools>({
  builtinTokens,
  currencyInfo,
  networkInfo,

  async getInnerPlugin() {
    return await import(
      /* webpackChunkName: "tron" */
      './tronPlugin'
    )
  }
})
