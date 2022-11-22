import { EdgeCurrencyInfo } from 'edge-core-js/types'

import { TronSettings } from './tronTypes'

const otherSettings: TronSettings = {
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
  defaultFeeLimit: 1000000000 // TODO: 1000 TRX. Should probably update.
}

const defaultSettings: any = {
  otherSettings
}

export const currencyInfo: EdgeCurrencyInfo = {
  // Basic currency information:
  currencyCode: 'TRX',
  displayName: 'Tron',
  pluginId: 'tron',
  walletType: 'wallet:tron',

  defaultSettings,

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

  metaTokens: [
    {
      currencyCode: 'USDD',
      currencyName: 'Decentralized USD',
      denominations: [{ name: 'USDD', multiplier: '1000000000000000000' }],
      contractAddress: 'TPYmHEhy5n8TCEfYGqW2rPxsghSfzghPDn'
    },
    {
      currencyCode: 'USDT',
      currencyName: 'Tether',
      denominations: [{ name: 'USDT', multiplier: '1000000' }],
      contractAddress: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'
    },
    {
      currencyCode: 'USDC',
      currencyName: 'USD Coin',
      denominations: [{ name: 'USDC', multiplier: '1000000' }],
      contractAddress: 'TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8'
    },

    {
      currencyCode: 'WTRX',
      currencyName: 'Wrapped TRX',
      denominations: [{ name: 'WTRX', multiplier: '1000000' }],
      contractAddress: 'TNUC9Qb1rRpS5CbWLmNMxXBjyFoydXjWFR'
    },

    {
      currencyCode: 'TUSD',
      currencyName: 'TrueUSD',
      denominations: [{ name: 'TUSD', multiplier: '1000000000000000000' }],
      contractAddress: 'TUpMhErZL2fhh4sVNULAbNKLokS4GjC1F4'
    },

    {
      currencyCode: 'BTT',
      currencyName: 'BitTorrent',
      denominations: [{ name: 'BTT', multiplier: '1000000000000000000' }],
      contractAddress: 'TAFjULxiVgT4qWk6UZwjqwZXTSaGaqnVp4'
    },

    {
      currencyCode: 'JST',
      currencyName: 'JUST',
      denominations: [{ name: 'JST', multiplier: '1000000000000000000' }],
      contractAddress: 'TCFLL5dx5ZJdKnWuesXxi1VPwjLVmWZZy9'
    },

    {
      currencyCode: 'WIN',
      currencyName: 'WINkLink',
      denominations: [{ name: 'WIN', multiplier: '1000000' }],
      contractAddress: 'TLa2f6VPqDgRE67v1736s7bJ8Ray5wYjU7'
    },

    {
      currencyCode: 'NFT',
      currencyName: 'APENFT',
      denominations: [{ name: 'NFT', multiplier: '1000000' }],
      contractAddress: 'TFczxzPhnThNSqr5by8tvxsdCFRRz6cPNq'
    },

    {
      currencyCode: 'SUN',
      currencyName: 'SUN',
      denominations: [{ name: 'SUN', multiplier: '1000000000000000000' }],
      contractAddress: 'TSSMHYeV2uE9qYH95DqyoCuNCzEL1NvU3S'
    },

    {
      currencyCode: 'USDJ',
      currencyName: 'JUST Stablecoin',
      denominations: [{ name: 'USDJ', multiplier: '1000000000000000000' }],
      contractAddress: 'TMwFHYXLJaRUPeW6421aqXL4ZEzPRFGkGT'
    }
  ]
}
