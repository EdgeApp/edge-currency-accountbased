import { EdgeCorePluginOptions, EdgeCurrencyInfo } from 'edge-core-js/types'

import { makeEthereumBasedPluginInner } from '../ethPlugin'
import { EthereumFees, EthereumSettings } from '../ethTypes'

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

const otherSettings: EthereumSettings = {
  rpcServers: [
    'https://kovan.poa.network',
    'https://eth-kovan.alchemyapi.io',
    'https://kovan.infura.io/v3'
  ],

  evmScanApiServers: ['https://api-kovan.etherscan.io'],
  blockcypherApiServers: [],
  blockbookServers: [],
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
  blockchairApiServers: [],
  alethioApiServers: [],
  alethioCurrencies: {
    // object or null
    native: 'ether',
    token: 'token'
  },
  amberdataRpcServers: [],
  amberdataApiServers: [],
  amberDataBlockchainId: '',
  pluginMnemonicKeyName: 'kovanMnemonic',
  pluginRegularKeyName: 'kovanKey',
  ethGasStationUrl: 'https://www.ethgasstation.info/json/ethgasAPI.json',
  defaultNetworkFees
}

const defaultSettings: any = {
  customFeeSettings: ['gasLimit', 'gasPrice'],
  otherSettings
}

export const currencyInfo: EdgeCurrencyInfo = {
  // Basic currency information:
  currencyCode: 'KOV',
  displayName: 'Kovan Testnet',
  pluginId: 'kovan',
  walletType: 'wallet:kovan',
  memoType: 'hex',

  canReplaceByFee: true,
  defaultSettings,

  addressExplorer: 'https://etherscan.io/address/%s',
  transactionExplorer: 'https://etherscan.io/tx/%s',

  denominations: [
    // An array of Objects of the possible denominations for this currency
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
  metaTokens: [
    {
      currencyCode: 'AAVE',
      currencyName: 'Aave',
      denominations: [
        {
          name: 'AAVE',
          multiplier: '1000000000000000000'
        }
      ],
      contractAddress: '0xb597cd8d3217ea6477232f9217fa70837ff667af'
    },
    {
      currencyCode: 'AMPL',
      currencyName: 'Ampleforth',
      denominations: [
        {
          name: 'AMPL',
          multiplier: '1000000000'
        }
      ],
      contractAddress: '0x3e0437898a5667a4769b1ca5a34aab1ae7e81377'
    },
    {
      currencyCode: 'BUSD',
      currencyName: 'Binance USD',
      denominations: [
        {
          name: 'BUSD',
          multiplier: '1000000000000000000'
        }
      ],
      contractAddress: '0x4c6e1efc12fdfd568186b7baec0a43fffb4bcccf'
    },
    {
      currencyCode: 'ENJ',
      currencyName: 'Enjin Coin',
      denominations: [
        {
          name: 'ENJ',
          multiplier: '1000000000000000000'
        }
      ],
      contractAddress: '0xc64f90cd7b564d3ab580eb20a102a8238e218be2'
    },
    {
      currencyCode: 'sUSD',
      currencyName: 'Synth sUSD',
      denominations: [
        {
          name: 'sUSD',
          multiplier: '1000000000000000000'
        }
      ],
      contractAddress: '0x99b267b9d96616f906d53c26decf3c5672401282'
    },
    {
      currencyCode: 'LINK',
      currencyName: 'ChainLink',
      denominations: [
        {
          name: 'LINK',
          multiplier: '1000000000000000000'
        }
      ],
      contractAddress: '0xAD5ce863aE3E4E9394Ab43d4ba0D80f419F61789'
    },
    {
      currencyCode: 'MANA',
      currencyName: 'Decentraland',
      denominations: [
        {
          name: 'MANA',
          multiplier: '1000000000000000000'
        }
      ],
      contractAddress: '0x738dc6380157429e957d223e6333dc385c85fec7'
    },
    {
      currencyCode: 'TUSD',
      currencyName: 'TrueUSD',
      denominations: [
        {
          name: 'TUSD',
          multiplier: '1000000000000000000'
        }
      ],
      contractAddress: '0x016750ac630f711882812f24dba6c95b9d35856d'
    },
    {
      currencyCode: 'SNX',
      currencyName: 'Synthetix',
      denominations: [
        {
          name: 'SNX',
          multiplier: '1000000000000000000'
        }
      ],
      contractAddress: '0x7fdb81b0b8a010dd4ffc57c3fecbf145ba8bd947'
    },
    {
      currencyCode: 'REN',
      currencyName: 'Republic Token',
      denominations: [
        {
          name: 'REN',
          multiplier: '1000000000000000000'
        }
      ],
      contractAddress: '0x5eebf65a6746eed38042353ba84c8e37ed58ac6f'
    },
    {
      currencyCode: 'MKR',
      currencyName: 'Maker',
      denominations: [
        {
          name: 'MKR',
          multiplier: '1000000000000000000'
        }
      ],
      contractAddress: '0x61e4cae3da7fd189e52a4879c7b8067d7c2cc0fa'
    },
    {
      currencyCode: 'YFI',
      currencyName: 'yearn.finance',
      denominations: [
        {
          name: 'YFI',
          multiplier: '1000000000000000000'
        }
      ],
      contractAddress: '0xb7c325266ec274feb1354021d27fa3e3379d840d'
    },
    {
      currencyCode: 'ZRX',
      currencyName: 'ZRX',
      denominations: [
        {
          name: 'ZRX',
          multiplier: '1000000000000000000'
        }
      ],
      contractAddress: '0xd0d76886cf8d952ca26177eb7cfdf83bad08c00c'
    },

    {
      currencyCode: 'DAI',
      currencyName: 'Dai Stablecoin',
      denominations: [
        {
          name: 'DAI',
          multiplier: '1000000000000000000'
        }
      ],
      contractAddress: '0xff795577d9ac8bd7d90ee22b6c1703490b6512fd'
    },
    {
      currencyCode: 'USDC',
      currencyName: 'USD Coin',
      denominations: [
        {
          name: 'USDC',
          multiplier: '1000000'
        }
      ],
      contractAddress: '0xe22da380ee6b445bb8273c81944adeb6e8450422'
    },
    {
      currencyCode: 'USDT',
      currencyName: 'Tether',
      denominations: [
        {
          name: 'USDT',
          multiplier: '1000000'
        }
      ],
      contractAddress: '0x13512979ade267ab5100878e2e0f485b568328a4'
    },
    {
      currencyCode: 'WETH',
      currencyName: 'Wrapped ETH',
      denominations: [
        {
          name: 'WETH',
          multiplier: '1000000000000000000'
        }
      ],
      contractAddress: '0xd0a1e359811322d97991e03f863a0c30c2cf029c'
    },
    {
      currencyCode: 'WBTC',
      currencyName: 'Wrapped Bitcoin',
      denominations: [
        {
          name: 'WBTC',
          multiplier: '100000000'
        }
      ],
      contractAddress: '0xD1B98B6607330172f1D991521145A22BCe793277'
    }
  ]
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const makeKovanPlugin = (opts: EdgeCorePluginOptions) => {
  return makeEthereumBasedPluginInner(opts, currencyInfo)
}
