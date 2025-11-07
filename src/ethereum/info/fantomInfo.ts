import { EdgeCurrencyInfo, EdgeTokenMap } from 'edge-core-js/types'

import { makeOuterPlugin } from '../../common/innerPlugin'
import { createEvmTokenId, makeMetaTokens } from '../../common/tokenHelpers'
import type { EthereumTools } from '../EthereumTools'
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
  '511d35c52a3c244e7b8bd92c0c297755fbd89212': {
    currencyCode: 'WAVAX',
    displayName: 'Wrapped Avalanche',
    denominations: [{ name: 'WAVAX', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x511d35c52a3c244e7b8bd92c0c297755fbd89212'
    }
  },
  d67de0e0a0fd7b15dc8348bb9be742f3c5850454: {
    currencyCode: 'WBNB',
    displayName: 'Wrapped Binance',
    denominations: [{ name: 'WBNB', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0xd67de0e0a0fd7b15dc8348bb9be742f3c5850454'
    }
  },
  '841fad6eae12c286d1fd18d1d525dffa75c7effe': {
    currencyCode: 'BOO',
    displayName: 'SpookyToken',
    denominations: [{ name: 'BOO', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x841fad6eae12c286d1fd18d1d525dffa75c7effe'
    }
  },
  '321162cd933e2be498cd2267a90534a804051b11': {
    currencyCode: 'WBTC',
    displayName: 'Wrapped Bitcoin',
    denominations: [{ name: 'WBTC', multiplier: '100000000' }],
    networkLocation: {
      contractAddress: '0x321162cd933e2be498cd2267a90534a804051b11'
    }
  },
  '8d11ec38a3eb5e956b052f67da8bdc9bef8abf3e': {
    currencyCode: 'DAI',
    displayName: 'DAI (Bridged)',
    denominations: [{ name: 'DAI', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x8d11ec38a3eb5e956b052f67da8bdc9bef8abf3e'
    }
  },
  '74b23882a30290451a17c44f4f05243b6b58c76d': {
    currencyCode: 'WETH',
    displayName: 'Wrapped Ethereum',
    denominations: [{ name: 'WETH', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x74b23882a30290451a17c44f4f05243b6b58c76d'
    }
  },
  ad84341756bf337f5a0164515b1f6f993d194e1f: {
    currencyCode: 'FUSD',
    displayName: 'Fantom USD',
    denominations: [{ name: 'FUSD', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0xad84341756bf337f5a0164515b1f6f993d194e1f'
    }
  },
  bf60e7414ef09026733c1e7de72e7393888c64da: {
    currencyCode: 'LIF3',
    displayName: 'LIF3',
    denominations: [{ name: 'LIF3', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0xbf60e7414ef09026733c1e7de72e7393888c64da'
    }
  },
  cbe0ca46399af916784cadf5bcc3aed2052d6c45: {
    currencyCode: 'LSHARE',
    displayName: 'LIF3 LSHARE',
    denominations: [{ name: 'LSHARE', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0xcbe0ca46399af916784cadf5bcc3aed2052d6c45'
    }
  },
  fb98b335551a418cd0737375a2ea0ded62ea213b: {
    currencyCode: 'MAI',
    displayName: 'miMATIC',
    denominations: [{ name: 'MAI', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0xfB98B335551a418cD0737375a2ea0ded62Ea213b'
    }
  },
  '82f0b8b456c1a451378467398982d4834b6829c1': {
    currencyCode: 'MIM',
    displayName: 'Magic Internet Money',
    denominations: [{ name: 'MIM', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x82f0b8b456c1a451378467398982d4834b6829c1'
    }
  },
  '6c021ae822bea943b2e66552bde1d2696a53fbb7': {
    currencyCode: 'TOMB',
    displayName: 'Tomb',
    denominations: [{ name: 'TOMB', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x6c021Ae822BEa943b2E66552bDe1D2696a53fbB7'
    }
  },
  c60d7067dfbc6f2caf30523a064f416a5af52963: {
    currencyCode: 'TREEB',
    displayName: 'Retreeb',
    denominations: [{ name: 'TREEB', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0xc60d7067dfbc6f2caf30523a064f416a5af52963'
    }
  },
  '4cdf39285d7ca8eb3f090fda0c069ba5f4145b37': {
    currencyCode: 'TSHARE',
    displayName: 'Tomb Shares',
    denominations: [{ name: 'TSHARE', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x4cdf39285d7ca8eb3f090fda0c069ba5f4145b37'
    }
  },
  '04068da6c83afcfa0e13ba15a6696662335d5b75': {
    currencyCode: 'USDC-M',
    displayName: 'Multichain Bridged USDC',
    denominations: [{ name: 'USDC-M', multiplier: '1000000' }],
    networkLocation: {
      contractAddress: '0x04068da6c83afcfa0e13ba15a6696662335d5b75'
    }
  },
  '21be370d5312f44cb42ce377bc9b8a0cef1a4c83': {
    currencyCode: 'WFTM',
    displayName: 'Wrapped Fantom',
    denominations: [{ name: 'WFTM', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83'
    }
  },
  a48d959ae2e88f1daa7d5f611e01908106de7598: {
    currencyCode: 'xBOO',
    displayName: 'Boo MirrorWorld',
    denominations: [{ name: 'xBOO', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0xa48d959AE2E88f1dAA7D5F611E01908106dE7598'
    }
  },
  '09e145a1d53c0045f41aeef25d8ff982ae74dd56': {
    currencyCode: 'ZOO',
    displayName: 'Zookeeper',
    denominations: [{ name: 'ZOO', multiplier: '1' }],
    networkLocation: {
      contractAddress: '0x09e145a1d53c0045f41aeef25d8ff982ae74dd56'
    }
  }
}

const networkFees: EthereumFees = {
  default: {
    baseFee: undefined,
    baseFeeMultiplier: undefined,
    gasLimit: {
      regularTransaction: '21000',
      tokenTransaction: '200000',
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
    minPriorityFee: undefined
  }
}

// Exported for fee provider test
const networkInfo: EthereumNetworkInfo = {
  addressQueryLookbackBlocks: 60, // 2 minutes
  networkAdapterConfigs: [
    {
      type: 'rpc',
      servers: [
        'https://fantom.api.pocket.network',
        'https://polished-empty-cloud.fantom.quiknode.pro/{{quiknodeApiKey}}/',
        'https://rpc.ankr.com/fantom',
        'https://rpc.ftm.tools',
        'https://lb.drpc.org/ogrpc?network=fantom&dkey={{drpcApiKey}}'
      ],
      ethBalCheckerContract: '0x07f697424abe762bb808c109860c04ea488ff92b'
    },
    {
      type: 'evmscan',
      gastrackerSupport: false,
      servers: ['https://ftmscout.com/']
    }
  ],
  uriNetworks: ['fantom'],
  ercTokenStandard: 'ERC20',
  chainParams: {
    chainId: 250,
    name: 'Fantom Opera'
  },
  hdPathCoinType: 60,
  feeUpdateFrequencyMs: 60000,
  supportsEIP1559: true,
  pluginMnemonicKeyName: 'fantomMnemonic',
  pluginRegularKeyName: 'fantomKey',
  evmGasStationUrl: null,
  networkFees,
  decoyAddressConfig: {
    count: 5,
    minTransactionCount: 10,
    maxTransactionCount: 100
  }
}

const currencyInfo: EdgeCurrencyInfo = {
  canReplaceByFee: true,
  currencyCode: 'FTM',
  evmChainId: 250,
  customFeeTemplate: evmCustomFeeTemplate,
  customTokenTemplate: evmCustomTokenTemplate,
  assetDisplayName: 'Fantom',
  chainDisplayName: 'Fantom',
  memoOptions: evmMemoOptions,
  pluginId: 'fantom',
  walletType: 'wallet:fantom',

  // Explorers:
  addressExplorer: 'https://explorer.fantom.network/address/%s',
  transactionExplorer: 'https://explorer.fantom.network/transactions/%s',

  denominations: [
    {
      name: 'FTM',
      multiplier: '1000000000000000000',
      symbol: 'F'
    }
  ],

  usesChangeServer: true,

  // Deprecated:
  defaultSettings: makeEvmDefaultSettings(networkInfo),
  displayName: 'Fantom',
  metaTokens: makeMetaTokens(builtinTokens)
}

export const fantom = makeOuterPlugin<
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

if (process.env.npm_lifecycle_event === 'test') {
  module.exports = { ...module.exports, currencyInfo, networkInfo }
}
