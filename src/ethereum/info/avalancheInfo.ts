import { EdgeCurrencyInfo, EdgeTokenMap } from 'edge-core-js/types'

import { makeOuterPlugin } from '../../common/innerPlugin'
import { makeMetaTokens } from '../../common/tokenHelpers'
import type { EthereumTools } from '../EthereumTools'
import type { EthereumFees, EthereumNetworkInfo } from '../ethereumTypes'

const builtinTokens: EdgeTokenMap = {
  '60781c2586d68229fde47564546784ab3faca982': {
    currencyCode: 'PNG',
    displayName: 'Pangolin',
    denominations: [{ name: 'PNG', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x60781C2586D68229fde47564546784ab3fACA982'
    }
  },
  e896cdeaac9615145c0ca09c8cd5c25bced6384c: {
    currencyCode: 'PEFI',
    displayName: 'Penguin Finance',
    denominations: [{ name: 'PEFI', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0xe896CDeaAC9615145c0cA09C8Cd5C25bced6384c'
    }
  },
  d1c3f94de7e5b45fa4edbba472491a9f4b166fc4: {
    currencyCode: 'XAVA',
    displayName: 'Avalaunch',
    denominations: [{ name: 'XAVA', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0xd1c3f94DE7e5B45fa4eDBBA472491a9f4B166FC4'
    }
  },
  d6070ae98b8069de6b494332d1a1a81b6179d960: {
    currencyCode: 'BIFI',
    displayName: 'Beefy Finance',
    denominations: [{ name: 'BIFI', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0xd6070ae98b8069de6B494332d1A1a81B6179D960'
    }
  },
  '264c1383ea520f73dd837f915ef3a732e204a493': {
    currencyCode: 'BNB',
    displayName: 'Binance',
    denominations: [{ name: 'BNB', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x264c1383EA520f73dd837F915ef3a732e204a493'
    }
  },
  '59414b3089ce2af0010e7523dea7e2b35d776ec7': {
    currencyCode: 'YAK',
    displayName: 'Yield Yak',
    denominations: [{ name: 'YAK', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x59414b3089ce2AF0010e7523Dea7E2b35d776ec7'
    }
  },
  '6e84a6216ea6dacc71ee8e6b0a5b7322eebc0fdd': {
    currencyCode: 'JOE',
    displayName: 'Joe Token',
    denominations: [{ name: 'JOE', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x6e84a6216eA6dACC71eE8E6b0a5B7322EEbC0fDd'
    }
  },
  '214db107654ff987ad859f34125307783fc8e387': {
    currencyCode: 'FXS',
    displayName: 'Frax Share',
    denominations: [{ name: 'FXS', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x214DB107654fF987AD859F34125307783fC8e387'
    }
  },
  '19860ccb0a68fd4213ab9d8266f7bbf05a8dde98': {
    currencyCode: 'BUSD.e',
    displayName: 'Binance USD',
    denominations: [{ name: 'BUSD.e', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x19860CCB0A68fd4213aB9D8266F7bBf05A8dDe98'
    }
  },
  d586e7f844cea2f87f50152665bcbc2c279d8d70: {
    currencyCode: 'DAI.e',
    displayName: 'Dai Stablecoin',
    denominations: [{ name: 'DAI.e', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0xd586E7F844cEa2F87f50152665BCbc2C279D8d70'
    }
  },
  '5947bb275c521040051d82396192181b413227a3': {
    currencyCode: 'LINK.e',
    displayName: 'ChainLink Token',
    denominations: [{ name: 'LINK.e', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x5947BB275c521040051D82396192181b413227A3'
    }
  },
  '8ebaf22b6f053dffeaf46f4dd9efa95d89ba8580': {
    currencyCode: 'UNI.e',
    displayName: 'Uniswap',
    denominations: [{ name: 'UNI.e', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x8eBAf22B6F053dFFeaf46f4Dd9eFA95D89ba8580'
    }
  },
  b97ef9ef8734c71904d8002f8b6bc66dd9c48a6e: {
    currencyCode: 'USDC',
    displayName: 'USD Coin',
    denominations: [{ name: 'USDC', multiplier: '1000000' }],
    networkLocation: {
      contractAddress: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E'
    }
  },
  a7d7079b0fead91f3e65f86e8915cb59c1a4c664: {
    currencyCode: 'USDC.e',
    displayName: 'USD Coin',
    denominations: [{ name: 'USDC.e', multiplier: '1000000' }],
    networkLocation: {
      contractAddress: '0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664'
    }
  },
  '9702230a8ea53601f5cd2dc00fdbc13d4df4a8c7': {
    currencyCode: 'USDT',
    displayName: 'Tether USD',
    denominations: [{ name: 'USDT', multiplier: '1000000' }],
    networkLocation: {
      contractAddress: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7'
    }
  },
  c7198437980c041c805a1edcba50c1ce5db95118: {
    currencyCode: 'USDT.e',
    displayName: 'Tether USD',
    denominations: [{ name: 'USDT.e', multiplier: '1000000' }],
    networkLocation: {
      contractAddress: '0xc7198437980c041c805A1EDcbA50c1Ce5db95118'
    }
  },
  '50b7545627a5162f82a992c33b87adc75187b218': {
    currencyCode: 'WBTC.e',
    displayName: 'Wrapped BTC',
    denominations: [{ name: 'WBTC.e', multiplier: '100000000' }],
    networkLocation: {
      contractAddress: '0x50b7545627a5162F82A992c33b87aDc75187B218'
    }
  }
}

// Fees are in Wei
const defaultNetworkFees: EthereumFees = {
  default: {
    baseFeeMultiplier: {
      lowFee: '1',
      standardFeeLow: '1.25',
      standardFeeHigh: '1.5',
      highFee: '1.75'
    },
    gasLimit: {
      regularTransaction: '21000',
      tokenTransaction: '300000',
      minGasLimit: '21000'
    },
    gasPrice: {
      lowFee: '25000000000',
      standardFeeLow: '27000000000',
      standardFeeHigh: '30000000000',
      standardFeeLowAmount: '100000000000000000',
      standardFeeHighAmount: '10000000000000000000',
      highFee: '50000000000',
      minGasPrice: '25000000000'
    },
    minPriorityFee: '25000000000'
  }
}

const networkInfo: EthereumNetworkInfo = {
  rpcServers: [
    'https://api.avax.network/ext/bc/C/rpc',
    'https://rpc.ankr.com/avalanche'
  ],
  evmScanApiServers: ['https://api.snowtrace.io'],
  blockcypherApiServers: [],
  blockbookServers: [],
  uriNetworks: ['avalanche'],
  ercTokenStandard: 'ERC20',
  chainParams: {
    chainId: 43114,
    name: 'AVAX Mainnet'
  },
  supportsEIP1559: true,
  hdPathCoinType: 9000,
  checkUnconfirmedTransactions: false,
  iosAllowedTokens: {},
  blockchairApiServers: [],
  alethioApiServers: [],
  alethioCurrencies: null, // object or null
  amberdataRpcServers: [],
  amberdataApiServers: [],
  amberDataBlockchainId: '',
  pluginMnemonicKeyName: 'avalancheMnemonic',
  pluginRegularKeyName: 'avalancheKey',
  ethGasStationUrl: null,
  defaultNetworkFees
}

const defaultSettings: any = {
  customFeeSettings: ['gasLimit', 'gasPrice'],
  otherSettings: { ...networkInfo }
}

export const currencyInfo: EdgeCurrencyInfo = {
  canReplaceByFee: true,
  currencyCode: 'AVAX',
  displayName: 'Avalanche',
  pluginId: 'avalanche', // matching mnemonic here
  walletType: 'wallet:avalanche',

  // Explorers:
  addressExplorer: 'https://snowtrace.io/address/%s',
  transactionExplorer: 'https://snowtrace.io/tx/%s',

  denominations: [
    {
      name: 'AVAX',
      multiplier: '1000000000000000000',
      symbol: 'AVAX'
    }
  ],

  // Deprecated:
  defaultSettings,
  memoType: 'hex',
  metaTokens: makeMetaTokens(builtinTokens)
}

export const avalanche = makeOuterPlugin<EthereumNetworkInfo, EthereumTools>({
  builtinTokens,
  currencyInfo,
  networkInfo,

  async getInnerPlugin() {
    return await import('../EthereumTools')
  }
})
