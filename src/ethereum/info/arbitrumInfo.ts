import { EdgeCurrencyInfo, EdgeTokenMap } from 'edge-core-js/types'

import { makeOuterPlugin } from '../../common/innerPlugin'
import { createEvmTokenId, makeMetaTokens } from '../../common/tokenHelpers'
import { EthereumTools } from '../EthereumTools'
import {
  asEthereumInfoPayload,
  EthereumFees,
  EthereumInfoPayload,
  EthereumNetworkInfo
} from '../ethereumTypes'
import {
  evmCustomFeeTemplate,
  evmCustomTokenTemplate,
  evmMemoOptions,
  makeEvmDefaultSettings
} from './ethereumCommonInfo'

const builtinTokens: EdgeTokenMap = {
  af88d065e77c8cc2239327c5edb3a432268e5831: {
    currencyCode: 'USDC',
    displayName: 'USD Coin',
    denominations: [{ name: 'USDC', multiplier: '1000000' }],
    networkLocation: {
      contractAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
    }
  },
  ff970a61a04b1ca14834a43f5de4533ebddb5cc8: {
    currencyCode: 'USDC.e',
    displayName: 'USD Coin',
    denominations: [{ name: 'USDC.e', multiplier: '1000000' }],
    networkLocation: {
      contractAddress: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8'
    }
  },
  fd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9: {
    currencyCode: 'USDT',
    displayName: 'Tether',
    denominations: [{ name: 'USDT', multiplier: '1000000' }],
    networkLocation: {
      contractAddress: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'
    }
  },
  f97f4df75117a78c1a5a0dbb814af92458539fb4: {
    currencyCode: 'LINK',
    displayName: 'Chainlink',
    denominations: [{ name: 'LINK', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0xf97f4df75117a78c1A5a0DBb814Af92458539FB4'
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
  fa7f8980b0f1e64a2062791cc3b0871572f1f7f0: {
    currencyCode: 'UNI',
    displayName: 'Uniswap',
    denominations: [{ name: 'UNI', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0'
    }
  },
  '912ce59144191c1204e64559fe8253a0e49e6548': {
    currencyCode: 'ARB',
    displayName: 'Arbitrum',
    denominations: [{ name: 'ARB', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x912CE59144191C1204E64559FE8253a0e49E6548'
    }
  },
  '4d15a3a2286d883af0aa1b3f21367843fac63e07': {
    currencyCode: 'TUSD',
    displayName: 'TrueUSD',
    denominations: [{ name: 'TUSD', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x4D15a3A2286D883AF0AA1B3f21367843FAc63E07'
    }
  },
  '2f2a2543b76a4166549f7aab2e75bef0aefc5b0f': {
    currencyCode: 'WBTC',
    displayName: 'Wrapped BTC',
    denominations: [{ name: 'WBTC', multiplier: '100000000' }],
    networkLocation: {
      contractAddress: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f'
    }
  },
  fc5a1a6eb076a2c7ad06ed22c90d7e710e35ad0a: {
    currencyCode: 'GMX',
    displayName: 'GMX',
    denominations: [{ name: 'GMX', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a'
    }
  },
  '82af49447d8a07e3bd95bd0d56f35241523fbab1': {
    currencyCode: 'WETH',
    displayName: 'Wrapped Ether',
    denominations: [{ name: 'WETH', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1'
    }
  }
}

const networkFees: EthereumFees = {
  default: {
    baseFee: undefined,
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
    minPriorityFee: '100000000' // 0.1 Gwei
  }
}

// Exported for fee provider test
const networkInfo: EthereumNetworkInfo = {
  addressQueryLookbackBlocks: 480, // 2 minutes
  networkAdapterConfigs: [
    {
      type: 'rpc',
      servers: [
        'https://arb1.arbitrum.io/rpc',
        'https://arbitrum-one.public.blastapi.io',
        'https://rpc.ankr.com/arbitrum',
        'https://arbitrum-one.rpc.grove.city/v1/lb/{{poktPortalApiKey}}',
        'https://lb.drpc.org/ogrpc?network=arbitrum&dkey={{drpcApiKey}}'
      ],
      ethBalCheckerContract: '0x151E24A486D7258dd7C33Fb67E4bB01919B7B32c'
    },
    {
      type: 'evmscan',
      servers: ['https://api.arbiscan.io']
    },
    {
      type: 'blockchair',
      servers: ['https://api.blockchair.com']
    }
  ],

  uriNetworks: ['arbitrum'],
  ercTokenStandard: 'ERC20',
  chainParams: {
    chainId: 42161,
    name: 'Arbitrum One'
  },
  arbitrumRollupParams: {
    nodeInterfaceAddress: '0x00000000000000000000000000000000000000C8'
  },
  hdPathCoinType: 60,
  amberDataBlockchainId: '',
  pluginMnemonicKeyName: 'arbitrumMnemonic',
  pluginRegularKeyName: 'arbitrumKey',
  ethGasStationUrl: null,
  networkFees,
  supportsEIP1559: true
}

const currencyInfo: EdgeCurrencyInfo = {
  canReplaceByFee: true,
  currencyCode: 'ETH',
  customFeeTemplate: evmCustomFeeTemplate,
  customTokenTemplate: evmCustomTokenTemplate,
  chainDisplayName: 'Arbitrum One',
  assetDisplayName: 'Ethereum',
  memoOptions: evmMemoOptions,
  pluginId: 'arbitrum',
  walletType: 'wallet:arbitrum',

  // Explorers:
  addressExplorer: 'https://arbiscan.io/address/%s',
  transactionExplorer: 'https://arbiscan.io/tx/%s',

  denominations: [
    {
      name: 'ETH',
      multiplier: '1000000000000000000',
      symbol: 'Ξ'
    }
  ],

  // Deprecated:
  defaultSettings: makeEvmDefaultSettings(networkInfo),
  displayName: 'Arbitrum One',
  metaTokens: makeMetaTokens(builtinTokens)
}

export const arbitrum = makeOuterPlugin<
  EthereumNetworkInfo,
  EthereumTools,
  EthereumInfoPayload
>({
  builtinTokens,
  currencyInfo,
  asInfoPayload: asEthereumInfoPayload,
  createTokenId: createEvmTokenId,
  networkInfo,

  async getInnerPlugin() {
    return await import('../EthereumTools')
  }
})
