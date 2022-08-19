import { EdgeCurrencyInfo, EdgeTokenMap } from 'edge-core-js/types'

import { makeOuterPlugin } from '../../common/innerPlugin'
import { makeMetaTokens } from '../../common/tokenHelpers'
import type { EthereumTools } from '../EthereumTools'
import {
  asEthereumInfoPayload,
  EthereumFees,
  EthereumNetworkInfo
} from '../ethereumTypes'
import {
  evmCustomFeeTemplate,
  evmCustomTokenTemplate,
  evmMemoOptions,
  makeEvmDefaultSettings
} from './ethereumCommonInfo'

const builtinTokens: EdgeTokenMap = {
  '9aa7fec87ca69695dd1f879567ccf49f3ba417e2': {
    currencyCode: 'USDC-AAVE',
    displayName: 'USD Coin (AAVE)',
    denominations: [
      {
        name: 'USDC',
        multiplier: '1000000'
      }
    ],
    networkLocation: {
      contractAddress: '0x9aa7fec87ca69695dd1f879567ccf49f3ba417e2'
    }
  },
  e11a86849d99f524cac3e7a0ec1241828e332c62: {
    currencyCode: 'USDC',
    displayName: 'USD Coin',
    denominations: [
      {
        name: 'USDC',
        multiplier: '1000000'
      }
    ],
    networkLocation: {
      contractAddress: '0xe11a86849d99f524cac3e7a0ec1241828e332c62'
    }
  },
  e6b8a5cf854791412c1f6efc7caf629f5df1c747: {
    currencyCode: 'USDC-WYRE',
    displayName: 'USD Coin',
    denominations: [
      {
        name: 'USDC',
        multiplier: '1000000'
      }
    ],
    networkLocation: {
      contractAddress: '0xe6b8a5CF854791412c1f6EFC7CAf629f5Df1c747'
    }
  },
  '9a753f0f7886c9fbf63cf59d0d4423c5eface95b': {
    currencyCode: 'DAI',
    displayName: 'Dai Stablecoin',
    denominations: [
      {
        name: 'DAI',
        multiplier: '1000000000000000000'
      }
    ],
    networkLocation: {
      contractAddress: '0x9a753f0f7886c9fbf63cf59d0d4423c5eface95b'
    }
  },
  '21c561e551638401b937b03fe5a0a0652b99b7dd': {
    currencyCode: 'USDT',
    displayName: 'Tether',
    denominations: [
      {
        name: 'USDT',
        multiplier: '1000000'
      }
    ],
    networkLocation: {
      contractAddress: '0x21c561e551638401b937b03fe5a0a0652b99b7dd'
    }
  },
  '0ab1917a0cf92cdcf7f7b637eac3a46bbbe41409': {
    currencyCode: 'AAVE',
    displayName: 'Aave',
    denominations: [
      {
        name: 'AAVE',
        multiplier: '1000000000000000000'
      }
    ],
    networkLocation: {
      contractAddress: '0x0ab1917a0cf92cdcf7f7b637eac3a46bbbe41409'
    }
  },
  '85e44420b6137bbc75a85cab5c9a3371af976fde': {
    currencyCode: 'WBTC',
    displayName: 'Wrapped Bitcoin',
    denominations: [
      {
        name: 'WBTC',
        multiplier: '100000000'
      }
    ],
    networkLocation: {
      contractAddress: '0x85e44420b6137bbc75a85cab5c9a3371af976fde'
    }
  },
  d575d4047f8c667e064a4ad433d04e25187f40bb: {
    currencyCode: 'WETH',
    displayName: 'Wrapped ETH',
    denominations: [
      {
        name: 'WETH',
        multiplier: '1000000000000000000'
      }
    ],
    networkLocation: {
      contractAddress: '0xd575d4047f8c667e064a4ad433d04e25187f40bb'
    }
  },
  b685400156cf3cbe8725958deaa61436727a30c3: {
    currencyCode: 'WMATIC',
    displayName: 'Wrapped WMATIC',
    denominations: [
      {
        name: 'WMATIC',
        multiplier: '1000000000000000000'
      }
    ],
    networkLocation: {
      contractAddress: '0xb685400156cf3cbe8725958deaa61436727a30c3'
    }
  },
  d9e7e5dd6e122dde11244e14a60f38aba93097f2: {
    currencyCode: 'LINK',
    displayName: 'Chainlink',
    denominations: [
      {
        name: 'LINK',
        multiplier: '1000000000000000000'
      }
    ],
    networkLocation: {
      contractAddress: '0xd9e7e5dd6e122dde11244e14a60f38aba93097f2'
    }
  }
}

// Fees are in Wei
const defaultNetworkFees: EthereumFees = {
  default: {
    baseFee: undefined,
    baseFeeMultiplier: undefined,
    gasLimit: {
      regularTransaction: '21000',
      tokenTransaction: '300000',
      minGasLimit: '21000'
    },
    gasPrice: {
      lowFee: '30000000001',
      standardFeeLow: '36000000000',
      standardFeeHigh: '100000000000',
      standardFeeLowAmount: '100000000000000000',
      standardFeeHighAmount: '10000000000000000000',
      highFee: '216000000000',
      minGasPrice: '30000000000'
    },
    minPriorityFee: undefined
  }
}

const networkInfo: EthereumNetworkInfo = {
  networkAdapterConfigs: [
    {
      type: 'rpc',
      servers: [
        'https://rpc-mumbai.matic.today/',
        'https://rpc-mumbai.maticvigil.com',
        'https://matic-mumbai.chainstacklabs.com'
      ]
    },
    {
      type: 'evmscan',
      servers: ['https://api-testnet.polygonscan.com/']
    }
  ],
  uriNetworks: ['mumbai'],
  ercTokenStandard: 'ERC20',
  chainParams: {
    chainId: 80001,
    name: 'MATIC Testnet'
  },
  supportsEIP1559: true,
  hdPathCoinType: 60,
  amberDataBlockchainId: '',
  pluginMnemonicKeyName: 'mumbaiMnemonic',
  pluginRegularKeyName: 'mumbaiKey',
  ethGasStationUrl: '',
  defaultNetworkFees
}

export const currencyInfo: EdgeCurrencyInfo = {
  canReplaceByFee: true,
  currencyCode: 'MUMBAI',
  customFeeTemplate: evmCustomFeeTemplate,
  customTokenTemplate: evmCustomTokenTemplate,
  displayName: 'Mumbai',
  memoOptions: evmMemoOptions,
  pluginId: 'mumbai',
  walletType: 'wallet:mumbai',

  // Explorers:
  addressExplorer: 'https://mumbai.polygonscan.com/address/%s',
  transactionExplorer: 'https://mumbai.polygonscan.com/tx/%s',

  denominations: [
    {
      name: 'MUMBAI',
      multiplier: '1000000000000000000',
      symbol: 'MUMBAI'
    },
    {
      name: 'mMUMBAI',
      multiplier: '1000000000000000',
      symbol: 'mMUMBAI'
    }
  ],

  // Deprecated:
  defaultSettings: makeEvmDefaultSettings(networkInfo),
  metaTokens: makeMetaTokens(builtinTokens)
}

export const mumbai = makeOuterPlugin<EthereumNetworkInfo, EthereumTools>({
  builtinTokens,
  currencyInfo,
  infoPayloadCleaner: asEthereumInfoPayload,
  networkInfo,

  async getInnerPlugin() {
    return await import('../EthereumTools')
  }
})
