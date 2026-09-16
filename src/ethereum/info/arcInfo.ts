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

// Addresses from Arc's published contract list, each confirmed against the
// contract's own name, symbol and decimals. USDC at 0x3600…0000 is not listed:
// it is the native balance seen through an ERC-20 interface, so as a token it
// would show the same money twice.
export const builtinTokens: EdgeTokenMap = {
  bef5f6d51cb62b58e6a8f77868681825c6fe21c1: {
    currencyCode: 'EURC',
    displayName: 'EURC',
    denominations: [{ name: 'EURC', multiplier: '1000000' }],
    networkLocation: {
      contractAddress: '0xbEf5f6d51CB62b58e6A8f77868681825C6fe21c1'
    }
  },
  '171a4217b86a807a64eb94757db6849fb4bdbaa0': {
    currencyCode: 'cirBTC',
    displayName: 'Circle Wrapped Bitcoin',
    denominations: [{ name: 'cirBTC', multiplier: '100000000' }],
    networkLocation: {
      contractAddress: '0x171A4217b86A807A64eB94757Db6849fb4bDbAA0'
    }
  }
}

// Fees are in USDC wei (18 decimals). The base fee holds near 20 gwei, about
// $0.0004 for a plain transfer, and most blocks tip a few gwei.
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
      lowFee: '20000000001',
      standardFeeLow: '22000000001',
      standardFeeHigh: '30000000001',
      standardFeeLowAmount: '100000000000000000',
      standardFeeHighAmount: '10000000000000000000',
      highFee: '40000000001',
      minGasPrice: '20000000000'
    },
    minPriorityFee: '1000000000'
  }
}

const networkInfo: EthereumNetworkInfo = {
  // Blocks arrive about every 0.5s, so this is the usual ~2 minute overlap
  addressQueryLookbackBlocks: 240,
  networkAdapterConfigs: [
    {
      // History source. Both this adapter and `evmscan` below add the native
      // ERC-20 interface's transfers, which neither reports as native value.
      type: 'alchemy',
      servers: ['https://arc-mainnet.g.alchemy.com/v2/{{alchemyApiKey}}']
    },
    {
      type: 'rpc',
      servers: [
        'https://rpc.mainnet.arc.io',
        'https://rpc.drpc.mainnet.arc.io',
        'https://rpc.quicknode.mainnet.arc.io',
        'https://arc-mainnet.g.alchemy.com/v2/{{alchemyApiKey}}'
      ]
    },
    {
      // History fallback, and the only source in a build without an Alchemy
      // key. Etherscan V2 serves chain 5042.
      type: 'evmscan',
      servers: ['https://api.etherscan.io']
    }
  ],
  nativeErc20Interface: {
    contractAddress: '0x3600000000000000000000000000000000000000',
    multiplier: '1000000'
  },
  uriNetworks: ['arc'],
  ercTokenStandard: 'ERC20',
  chainParams: {
    chainId: 5042,
    name: 'Arc'
  },
  supportsEIP1559: true,
  hdPathCoinType: 60,
  pluginMnemonicKeyName: 'arcMnemonic',
  pluginRegularKeyName: 'arcKey',
  evmGasStationUrl: null,
  networkFees
}

export const currencyInfo: EdgeCurrencyInfo = {
  canReplaceByFee: true,
  currencyCode: 'USDC',
  evmChainId: 5042,
  customFeeTemplate: evmCustomFeeTemplate,
  customTokenTemplate: evmCustomTokenTemplate,
  chainDisplayName: 'Arc',
  assetDisplayName: 'USD Coin',
  memoOptions: evmMemoOptions,
  pluginId: 'arc',
  walletType: 'wallet:arc',

  // Explorers:
  addressExplorer: 'https://arc.etherscan.io/address/%s',
  transactionExplorer: 'https://arc.etherscan.io/tx/%s',

  denominations: [
    {
      name: 'USDC',
      multiplier: '1000000000000000000',
      symbol: 'USDC'
    }
  ],

  usesChangeServer: true,

  // Deprecated:
  defaultSettings: makeEvmDefaultSettings(networkInfo),
  displayName: 'Arc',
  metaTokens: makeMetaTokens(builtinTokens)
}

export const arc = makeOuterPlugin<
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
