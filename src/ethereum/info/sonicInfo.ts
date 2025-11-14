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
  '29219dd400f2bf60e5a23d13be72b486d4038894': {
    currencyCode: 'USDC.e',
    displayName: 'Bridged USDC (Sonic)',
    denominations: [{ name: 'USDC.e', multiplier: '1000000' }],
    networkLocation: {
      contractAddress: '0x29219dd400f2bf60e5a23d13be72b486d4038894'
    }
  },
  '6047828dc181963ba44974801ff68e538da5eaf9': {
    currencyCode: 'USDT',
    displayName: 'Bridged USDT (Sonic)',
    denominations: [{ name: 'USDT', multiplier: '1000000' }],
    networkLocation: {
      contractAddress: '0x6047828dc181963ba44974801ff68e538da5eaf9'
    }
  },
  '039e2fb66102314ce7b64ce5ce3e5183bc94ad38': {
    currencyCode: 'wS',
    displayName: 'Wrapped Sonic',
    denominations: [{ name: 'wS', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x039e2fb66102314ce7b64ce5ce3e5183bc94ad38'
    }
  },
  '3333b97138d4b086720b5ae8a7844b1345a33333': {
    currencyCode: 'SHADOW',
    displayName: 'Shadow',
    denominations: [{ name: 'SHADOW', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x3333b97138d4b086720b5ae8a7844b1345a33333'
    }
  },
  e5da20f15420ad15de0fa650600afc998bbe3955: {
    currencyCode: 'stS',
    displayName: 'Beets Staked Sonic',
    denominations: [{ name: 'stS', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0xe5da20f15420ad15de0fa650600afc998bbe3955'
    }
  },
  '2d0e0814e62d80056181f5cd932274405966e4f0': {
    currencyCode: 'BEETS',
    displayName: 'Beets',
    denominations: [{ name: 'BEETS', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x2d0e0814e62d80056181f5cd932274405966e4f0'
    }
  },
  '9fdbc3f8abc05fa8f3ad3c17d2f806c1230c4564': {
    currencyCode: 'GOGLZ',
    displayName: 'GOGGLES',
    denominations: [{ name: 'GOGLZ', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x9fdbc3f8abc05fa8f3ad3c17d2f806c1230c4564'
    }
  },
  '79bbf4508b1391af3a0f4b30bb5fc4aa9ab0e07c': {
    currencyCode: 'Anon',
    displayName: 'HeyAnon',
    denominations: [{ name: 'Anon', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x79bbf4508b1391af3a0f4b30bb5fc4aa9ab0e07c'
    }
  },
  '3333111a391cc08fa51353e9195526a70b333333': {
    currencyCode: 'x33',
    displayName: 'Shadow Liquid Staking Token',
    denominations: [{ name: 'x33', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x3333111a391cc08fa51353e9195526a70b333333'
    }
  },
  '50c42deacd8fc9773493ed674b675be577f2634b': {
    currencyCode: 'WETH',
    displayName: 'Wrapped Ether',
    denominations: [{ name: 'WETH', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x50c42deacd8fc9773493ed674b675be577f2634b'
    }
  },
  '0555e30da8f98308edb960aa94c0db47230d2b9c': {
    currencyCode: 'WBTC',
    displayName: 'Wrapped Bitcoin',
    denominations: [{ name: 'WBTC', multiplier: '100000000' }],
    networkLocation: {
      contractAddress: '0x0555e30da8f98308edb960aa94c0db47230d2b9c'
    }
  }
}

// Fees are in Wei
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
      lowFee: '1000000000',
      standardFeeLow: '3000000000',
      standardFeeHigh: '5000000000',
      standardFeeLowAmount: '100000000000000000',
      standardFeeHighAmount: '10000000000000000000',
      highFee: '10000000000',
      minGasPrice: '1000000000'
    },
    minPriorityFee: '1000000000'
  }
}

const networkInfo: EthereumNetworkInfo = {
  addressQueryLookbackBlocks: 300, // 2 minutes
  networkAdapterConfigs: [
    {
      type: 'rpc',
      servers: ['https://rpc.soniclabs.com']
    },
    {
      type: 'evmscan',
      gastrackerSupport: true,
      servers: [
        'https://api.etherscan.io/v2/api',
        'https://api.sonicscan.org/v2/api'
      ],
      version: 2
    }
  ],
  uriNetworks: ['sonic'],
  ercTokenStandard: 'ERC20',
  chainParams: {
    chainId: 146,
    name: 'Sonic Mainnet'
  },
  supportsEIP1559: true,
  hdPathCoinType: 60, // Using Ethereum's coin type as it's an EVM chain
  pluginMnemonicKeyName: 'sonicMnemonic',
  pluginRegularKeyName: 'sonicKey',
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
  currencyCode: 'S',
  evmChainId: 146,
  customFeeTemplate: evmCustomFeeTemplate,
  customTokenTemplate: evmCustomTokenTemplate,
  assetDisplayName: 'Sonic',
  chainDisplayName: 'Sonic',
  memoOptions: evmMemoOptions,
  pluginId: 'sonic',
  walletType: 'wallet:sonic',

  // Explorers:
  addressExplorer: 'https://sonicscan.org/address/%s',
  transactionExplorer: 'https://sonicscan.org/tx/%s',

  denominations: [
    {
      name: 'S',
      multiplier: '1000000000000000000',
      symbol: 'S'
    }
  ],

  usesChangeServer: true,

  // Deprecated:
  defaultSettings: makeEvmDefaultSettings(networkInfo),
  displayName: 'Sonic',
  metaTokens: makeMetaTokens(builtinTokens)
}

export const sonic = makeOuterPlugin<
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
