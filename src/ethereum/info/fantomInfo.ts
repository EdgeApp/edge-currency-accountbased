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
    currencyCode: 'AVAX',
    displayName: 'Avalanche',
    denominations: [{ name: 'AVAX', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x511d35c52a3c244e7b8bd92c0c297755fbd89212'
    }
  },
  '1b6382dbdea11d97f24495c9a90b7c88469134a4': {
    currencyCode: 'AXLUSDC',
    displayName: 'Axelar Wrapped USDC',
    denominations: [{ name: 'AXLUSDC', multiplier: '1000000' }],
    networkLocation: {
      contractAddress: '0x1B6382DBDEa11d97f24495C9A90b7c88469134a4'
    }
  },
  d226392c23fb3476274ed6759d4a478db3197d82: {
    currencyCode: 'AXLUSDT',
    displayName: 'Axelar Wrapped USDT',
    denominations: [{ name: 'AXLUSDT', multiplier: '1000000' }],
    networkLocation: {
      contractAddress: '0xd226392C23fb3476274ED6759D4a478db3197d82'
    }
  },
  fe7eda5f2c56160d406869a8aa4b2f365d544c7b: {
    currencyCode: 'AXLETH',
    displayName: 'Axelar Wrapped ETH',
    denominations: [{ name: 'AXLETH', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0xfe7eDa5F2c56160d406869A8aA4B2F365d544C7B'
    }
  },
  '448d59b4302ab5d2dadf9611bed9457491926c8e': {
    currencyCode: 'AXLWBTC',
    displayName: 'Axelar Wrapped WBTC',
    denominations: [{ name: 'AXLWBTC', multiplier: '100000000' }],
    networkLocation: {
      contractAddress: '0x448d59B4302aB5d2dadf9611bED9457491926c8e'
    }
  },
  d67de0e0a0fd7b15dc8348bb9be742f3c5850454: {
    currencyCode: 'BNB',
    displayName: 'Binance',
    denominations: [{ name: 'BNB', multiplier: '1000000000000000000' }],
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
    currencyCode: 'BTC',
    displayName: 'Bitcoin',
    denominations: [{ name: 'BTC', multiplier: '100000000' }],
    networkLocation: {
      contractAddress: '0x321162cd933e2be498cd2267a90534a804051b11'
    }
  },
  '1e4f97b9f9f913c46f1632781732927b9019c68b': {
    currencyCode: 'CRV',
    displayName: 'Curve',
    denominations: [{ name: 'CRV', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x1e4f97b9f9f913c46f1632781732927b9019c68b'
    }
  },
  '8d11ec38a3eb5e956b052f67da8bdc9bef8abf3e': {
    currencyCode: 'DAI',
    displayName: 'DAI Stablecoin',
    denominations: [{ name: 'DAI', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x8d11ec38a3eb5e956b052f67da8bdc9bef8abf3e'
    }
  },
  '74b23882a30290451a17c44f4f05243b6b58c76d': {
    currencyCode: 'ETH',
    displayName: 'Ethereum',
    denominations: [{ name: 'ETH', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x74b23882a30290451a17c44f4f05243b6b58c76d'
    }
  },
  e1146b9ac456fcbb60644c36fd3f868a9072fc6e: {
    currencyCode: 'FBTC',
    displayName: 'Frapped Bitcoin',
    denominations: [{ name: 'FBTC', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0xe1146b9ac456fcbb60644c36fd3f868a9072fc6e'
    }
  },
  '658b0c7613e890ee50b8c4bc6a3f41ef411208ad': {
    currencyCode: 'FETH',
    displayName: 'Frapped Ethereum',
    denominations: [{ name: 'FETH', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x658b0c7613e890ee50b8c4bc6a3f41ef411208ad'
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
  '049d68029688eabf473097a2fc38ef61633a3c7a': {
    currencyCode: 'FUSDT',
    displayName: 'Frapped Tether',
    denominations: [{ name: 'FUSDT', multiplier: '1000000' }],
    networkLocation: {
      contractAddress: '0x049d68029688eabf473097a2fc38ef61633a3c7a'
    }
  },
  '5f0456f728e2d59028b4f5b8ad8c604100724c6a': {
    currencyCode: 'L3USD',
    displayName: 'L3USD',
    denominations: [{ name: 'L3USD', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x5f0456f728e2d59028b4f5b8ad8c604100724c6a'
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
  b3654dc3d10ea7645f8319668e8f54d2574fbdc8: {
    currencyCode: 'LINK',
    displayName: 'Chainlink',
    denominations: [{ name: 'LINK', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0xb3654dc3d10ea7645f8319668e8f54d2574fbdc8'
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
  '66eed5ff1701e6ed8470dc391f05e27b1d0657eb': {
    currencyCode: 'MPX',
    displayName: 'MPX',
    denominations: [{ name: 'MPX', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x66eEd5FF1701E6ed8470DC391F05e27B1d0657eb'
    }
  },
  '24248cd1747348bdc971a5395f4b3cd7fee94ea0': {
    currencyCode: 'TBOND',
    displayName: 'Tomb Bonds',
    denominations: [{ name: 'TBOND', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x24248CD1747348bDC971a5395f4b3cd7feE94ea0'
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
        'https://fantom-mainnet.rpc.grove.city/v1/{{poktPortalApiKey}}',
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
  networkFees
}

const currencyInfo: EdgeCurrencyInfo = {
  canReplaceByFee: true,
  currencyCode: 'FTM',
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
