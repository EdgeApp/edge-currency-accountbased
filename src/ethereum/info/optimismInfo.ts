import { EdgeCurrencyInfo, EdgeTokenMap } from 'edge-core-js/types'

import { makeOuterPlugin } from '../../common/innerPlugin'
import { makeMetaTokens } from '../../common/tokenHelpers'
import type { EthereumTools } from '../EthereumTools'
import type { EthereumFees, EthereumNetworkInfo } from '../ethereumTypes'

const builtinTokens: EdgeTokenMap = {
  '4200000000000000000000000000000000000006': {
    currencyCode: 'WETH',
    displayName: 'Wrapped ETH',
    denominations: [{ name: 'WETH', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x4200000000000000000000000000000000000006'
    }
  },
  '3c8b650257cfb5f272f799f5e2b4e65093a11a05': {
    currencyCode: 'VELO',
    displayName: 'Velodrome',
    denominations: [{ name: 'VELO', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x3c8B650257cFb5f272f799F5e2b4e65093a11a05'
    }
  },
  '4200000000000000000000000000000000000042': {
    currencyCode: 'OP',
    displayName: 'Optimism',
    denominations: [{ name: 'OP', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x4200000000000000000000000000000000000042'
    }
  },
  '94b008aa00579c1307b0ef2c499ad98a8ce58e58': {
    currencyCode: 'USDT',
    displayName: 'Tether',
    denominations: [{ name: 'USDT', multiplier: '1000000' }],
    networkLocation: {
      contractAddress: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58'
    }
  },
  '7f5c764cbc14f9669b88837ca1490cca17c31607': {
    currencyCode: 'USDC',
    displayName: 'USD Coin',
    denominations: [{ name: 'USDC', multiplier: '1000000' }],
    networkLocation: {
      contractAddress: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607'
    }
  },
  da10009cbd5d07dd0cecc66161fc93d7c9000da1: {
    currencyCode: 'DAI',
    displayName: 'Dai Stablecoin',
    denominations: [{ name: 'DAI', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
    }
  },
  '6fd9d7ad17242c41f7131d257212c54a0e816691': {
    currencyCode: 'UNI',
    displayName: 'Uniswap',
    denominations: [{ name: 'UNI', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x6fd9d7AD17242c41f7131d257212c54A0e816691'
    }
  },
  '68f180fcce6836688e9084f035309e29bf0a2095': {
    currencyCode: 'WBTC',
    displayName: 'Wrapped Bitcoin',
    denominations: [{ name: 'WBTC', multiplier: '100000000' }],
    networkLocation: {
      contractAddress: '0x68f180fcCe6836688e9084f035309E29Bf0A2095'
    }
  },
  '350a791bfc2c21f9ed5d10980dad2e2638ffa7f6': {
    currencyCode: 'LINK',
    displayName: 'Chainlink',
    denominations: [{ name: 'LINK', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x350a791Bfc2C21F9Ed5d10980Dad2e2638ffa7f6'
    }
  },
  fdb794692724153d1488ccdbe0c56c252596735f: {
    currencyCode: 'LDO',
    displayName: 'Lido DAO',
    denominations: [{ name: 'LDO', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0xFdb794692724153d1488CcdBE0C56c252596735F'
    }
  },
  '76fb31fb4af56892a25e32cfc43de717950c9278': {
    currencyCode: 'AAVE',
    displayName: 'Aave',
    denominations: [{ name: 'AAVE', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x76FB31fb4af56892A25e32cFC43De717950c9278'
    }
  },
  '2e3d870790dc77a83dd1d18184acc7439a53f475': {
    currencyCode: 'FRAX',
    displayName: 'Frax',
    denominations: [{ name: 'FRAX', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x2E3D870790dC77A83DD1d18184Acc7439A53f475'
    }
  },
  bfc044a234e45412ecfec2cd6aae2dd0c083a7cd: {
    currencyCode: 'CRV',
    displayName: 'Curve DAO',
    denominations: [{ name: 'CRV', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0xbfC044a234E45412eCfeC2Cd6aAe2dd0C083a7cd'
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
      lowFee: '1000000001',
      standardFeeLow: '40000000001',
      standardFeeHigh: '300000000001',
      standardFeeLowAmount: '100000000000000000',
      standardFeeHighAmount: '10000000000000000000',
      highFee: '40000000001',
      minGasPrice: '100000'
    },
    minPriorityFee: '2000000000'
  }
}

const networkInfo: EthereumNetworkInfo = {
  rpcServers: ['https://mainnet.optimism.io', 'https://rpc.ankr.com/optimism'],
  evmScanApiServers: ['https://api-optimistic.etherscan.io'],
  blockcypherApiServers: [],
  blockbookServers: [],
  uriNetworks: ['optimism'],
  ercTokenStandard: 'ERC20',
  chainParams: {
    chainId: 10,
    name: 'Optimism'
  },
  l1RollupParams: {
    gasPriceL1Wei: '1000000000',
    gasPricel1BaseFeeMethod: '0x519b4bd3',
    maxGasPriceL1Multiplier: '1.25',
    fixedOverhead: '2100',
    dynamicOverhead: '1000000',
    oracleContractAddress: '0x420000000000000000000000000000000000000F',
    dynamicOverheadMethod:
      '0xf45e65d800000000000000000000000000000000000000000000000000000000'
  },
  hdPathCoinType: 60,
  checkUnconfirmedTransactions: false,
  iosAllowedTokens: {},
  blockchairApiServers: [],
  alethioApiServers: [],
  alethioCurrencies: null, // object or null
  amberdataRpcServers: [],
  amberdataApiServers: [],
  amberDataBlockchainId: '',
  pluginMnemonicKeyName: 'optimismMnemonic',
  pluginRegularKeyName: 'optimismKey',
  ethGasStationUrl: null,
  defaultNetworkFees
}

const defaultSettings: any = {
  customFeeSettings: ['gasLimit', 'gasPrice'],
  otherSettings: { ...networkInfo }
}

export const currencyInfo: EdgeCurrencyInfo = {
  canReplaceByFee: true,
  currencyCode: 'ETH',
  displayName: 'Optimism',
  pluginId: 'optimism',
  walletType: 'wallet:optimism',

  // Explorers:
  addressExplorer: 'https://optimistic.etherscan.io/address/%s',
  transactionExplorer: 'https://optimistic.etherscan.io/tx/%s',

  denominations: [
    {
      name: 'ETH',
      multiplier: '1000000000000000000',
      symbol: 'Ξ'
    }
  ],

  // Deprecated:
  defaultSettings,
  memoType: 'hex',
  metaTokens: makeMetaTokens(builtinTokens)
}

export const optimism = makeOuterPlugin<EthereumNetworkInfo, EthereumTools>({
  builtinTokens,
  currencyInfo,
  networkInfo,

  async getInnerPlugin() {
    return await import('../EthereumTools')
  }
})
