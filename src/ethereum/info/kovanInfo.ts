import { EdgeCurrencyInfo, EdgeTokenMap } from 'edge-core-js/types'

import { makeOuterPlugin } from '../../common/innerPlugin'
import { makeMetaTokens } from '../../common/tokenHelpers'
import type { EthereumTools } from '../EthereumTools'
import type { EthereumFees, EthereumNetworkInfo } from '../ethereumTypes'
import { evmMemoOptions } from './ethereumCommonInfo'

const builtinTokens: EdgeTokenMap = {
  b597cd8d3217ea6477232f9217fa70837ff667af: {
    currencyCode: 'AAVE',
    displayName: 'Aave',
    denominations: [{ name: 'AAVE', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0xb597cd8d3217ea6477232f9217fa70837ff667af'
    }
  },
  '3e0437898a5667a4769b1ca5a34aab1ae7e81377': {
    currencyCode: 'AMPL',
    displayName: 'Ampleforth',
    denominations: [{ name: 'AMPL', multiplier: '1000000000' }],
    networkLocation: {
      contractAddress: '0x3e0437898a5667a4769b1ca5a34aab1ae7e81377'
    }
  },
  '4c6e1efc12fdfd568186b7baec0a43fffb4bcccf': {
    currencyCode: 'BUSD',
    displayName: 'Binance USD',
    denominations: [{ name: 'BUSD', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x4c6e1efc12fdfd568186b7baec0a43fffb4bcccf'
    }
  },
  c64f90cd7b564d3ab580eb20a102a8238e218be2: {
    currencyCode: 'ENJ',
    displayName: 'Enjin Coin',
    denominations: [{ name: 'ENJ', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0xc64f90cd7b564d3ab580eb20a102a8238e218be2'
    }
  },
  '99b267b9d96616f906d53c26decf3c5672401282': {
    currencyCode: 'sUSD',
    displayName: 'Synth sUSD',
    denominations: [{ name: 'sUSD', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x99b267b9d96616f906d53c26decf3c5672401282'
    }
  },
  ad5ce863ae3e4e9394ab43d4ba0d80f419f61789: {
    currencyCode: 'LINK',
    displayName: 'ChainLink',
    denominations: [{ name: 'LINK', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0xAD5ce863aE3E4E9394Ab43d4ba0D80f419F61789'
    }
  },
  '738dc6380157429e957d223e6333dc385c85fec7': {
    currencyCode: 'MANA',
    displayName: 'Decentraland',
    denominations: [{ name: 'MANA', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x738dc6380157429e957d223e6333dc385c85fec7'
    }
  },
  '016750ac630f711882812f24dba6c95b9d35856d': {
    currencyCode: 'TUSD',
    displayName: 'TrueUSD',
    denominations: [{ name: 'TUSD', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x016750ac630f711882812f24dba6c95b9d35856d'
    }
  },
  '7fdb81b0b8a010dd4ffc57c3fecbf145ba8bd947': {
    currencyCode: 'SNX',
    displayName: 'Synthetix',
    denominations: [{ name: 'SNX', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x7fdb81b0b8a010dd4ffc57c3fecbf145ba8bd947'
    }
  },
  '5eebf65a6746eed38042353ba84c8e37ed58ac6f': {
    currencyCode: 'REN',
    displayName: 'Republic Token',
    denominations: [{ name: 'REN', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x5eebf65a6746eed38042353ba84c8e37ed58ac6f'
    }
  },
  '61e4cae3da7fd189e52a4879c7b8067d7c2cc0fa': {
    currencyCode: 'MKR',
    displayName: 'Maker',
    denominations: [{ name: 'MKR', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x61e4cae3da7fd189e52a4879c7b8067d7c2cc0fa'
    }
  },
  b7c325266ec274feb1354021d27fa3e3379d840d: {
    currencyCode: 'YFI',
    displayName: 'yearn.finance',
    denominations: [{ name: 'YFI', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0xb7c325266ec274feb1354021d27fa3e3379d840d'
    }
  },
  d0d76886cf8d952ca26177eb7cfdf83bad08c00c: {
    currencyCode: 'ZRX',
    displayName: 'ZRX',
    denominations: [{ name: 'ZRX', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0xd0d76886cf8d952ca26177eb7cfdf83bad08c00c'
    }
  },

  ff795577d9ac8bd7d90ee22b6c1703490b6512fd: {
    currencyCode: 'DAI',
    displayName: 'Dai Stablecoin',
    denominations: [{ name: 'DAI', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0xff795577d9ac8bd7d90ee22b6c1703490b6512fd'
    }
  },
  e22da380ee6b445bb8273c81944adeb6e8450422: {
    currencyCode: 'USDC',
    displayName: 'USD Coin',
    denominations: [{ name: 'USDC', multiplier: '1000000' }],
    networkLocation: {
      contractAddress: '0xe22da380ee6b445bb8273c81944adeb6e8450422'
    }
  },
  '13512979ade267ab5100878e2e0f485b568328a4': {
    currencyCode: 'USDT',
    displayName: 'Tether',
    denominations: [{ name: 'USDT', multiplier: '1000000' }],
    networkLocation: {
      contractAddress: '0x13512979ade267ab5100878e2e0f485b568328a4'
    }
  },
  d0a1e359811322d97991e03f863a0c30c2cf029c: {
    currencyCode: 'WETH',
    displayName: 'Wrapped ETH',
    denominations: [{ name: 'WETH', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0xd0a1e359811322d97991e03f863a0c30c2cf029c'
    }
  },
  d1b98b6607330172f1d991521145a22bce793277: {
    currencyCode: 'WBTC',
    displayName: 'Wrapped Bitcoin',
    denominations: [{ name: 'WBTC', multiplier: '100000000' }],
    networkLocation: {
      contractAddress: '0xD1B98B6607330172f1D991521145A22BCe793277'
    }
  }
}

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
      lowFee: '1000000001',
      standardFeeLow: '40000000001',
      standardFeeHigh: '300000000001',
      standardFeeLowAmount: '100000000000000000',
      standardFeeHighAmount: '10000000000000000000',
      highFee: '40000000001',
      minGasPrice: '1000000000'
    },
    minPriorityFee: '2000000000'
  },
  '1983987abc9837fbabc0982347ad828': {
    baseFeeMultiplier: undefined,
    // @ts-expect-error
    gasLimit: {
      regularTransaction: '21002',
      tokenTransaction: '37124'
    },
    // @ts-expect-error
    gasPrice: {
      lowFee: '1000000002',
      standardFeeLow: '40000000002',
      standardFeeHigh: '300000000002',
      standardFeeLowAmount: '200000000000000000',
      standardFeeHighAmount: '20000000000000000000',
      highFee: '40000000002'
    },
    minPriorityFee: undefined
  },
  '2983987abc9837fbabc0982347ad828': {
    baseFeeMultiplier: undefined,
    // @ts-expect-error
    gasLimit: {
      regularTransaction: '21002',
      tokenTransaction: '37124'
    },
    gasPrice: undefined,
    minPriorityFee: undefined
  }
}

const networkInfo: EthereumNetworkInfo = {
  networkAdapterConfigs: [
    {
      type: 'rpc',
      servers: [
        'https://kovan.poa.network',
        'https://eth-kovan.alchemyapi.io/v2/-{{alchemyApiKey}}',
        'https://kovan.infura.io/v3/{{infuraProjectId}}'
      ]
    },
    {
      type: 'evmscan',
      servers: ['https://api-kovan.etherscan.io']
    }
  ],
  uriNetworks: ['ethereum', 'ether'],
  ercTokenStandard: 'ERC20',
  chainParams: {
    chainId: 42,
    name: 'Kovan'
  },
  supportsEIP1559: true,
  hdPathCoinType: 60,
  checkUnconfirmedTransactions: true,
  iosAllowedTokens: {
    REP: true,
    WINGS: true,
    HUR: true,
    IND: true,
    USDT: true
  },
  alethioCurrencies: {
    // object or null
    native: 'ether',
    token: 'token'
  },
  amberDataBlockchainId: '',
  pluginMnemonicKeyName: 'kovanMnemonic',
  pluginRegularKeyName: 'kovanKey',
  ethGasStationUrl: 'https://www.ethgasstation.info/json/ethgasAPI.json',
  defaultNetworkFees
}

const defaultSettings: any = {
  customFeeSettings: ['gasLimit', 'gasPrice'],
  otherSettings: { ...networkInfo }
}

const currencyInfo: EdgeCurrencyInfo = {
  canReplaceByFee: true,
  currencyCode: 'KOV',
  displayName: 'Kovan Testnet',
  memoOptions: evmMemoOptions,
  pluginId: 'kovan',
  walletType: 'wallet:kovan',

  // Explorers:
  addressExplorer: 'https://etherscan.io/address/%s',
  transactionExplorer: 'https://etherscan.io/tx/%s',

  denominations: [
    {
      name: 'KOV',
      multiplier: '1000000000000000000',
      symbol: 'K'
    },
    {
      name: 'mKOV',
      multiplier: '1000000000000000',
      symbol: 'mK'
    }
  ],

  // Deprecated:
  defaultSettings,
  memoType: 'hex',
  metaTokens: makeMetaTokens(builtinTokens)
}

export const kovan = makeOuterPlugin<EthereumNetworkInfo, EthereumTools>({
  builtinTokens,
  currencyInfo,
  networkInfo,

  async getInnerPlugin() {
    return await import('../EthereumTools')
  }
})
