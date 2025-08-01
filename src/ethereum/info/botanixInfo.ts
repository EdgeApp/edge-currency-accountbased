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

const builtinTokens: EdgeTokenMap = {}

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
  addressQueryLookbackBlocks: 36, // 2 minutes
  networkAdapterConfigs: [
    {
      type: 'rpc',
      servers: ['https://rpc.botanixlabs.com']
    },
    {
      type: 'evmscan',
      gastrackerSupport: true,
      servers: [
        'https://api.routescan.io/v2/network/mainnet/evm/3637/etherscan'
      ]
    }
  ],
  uriNetworks: [],
  ercTokenStandard: 'ERC20',
  chainParams: {
    chainId: 3637,
    name: 'BTC'
  },
  optimismRollup: false,
  supportsEIP1559: true,
  feeAlgorithm: {
    type: 'eth_feeHistory',
    blocksToAnalyze: 12 // 2 minutes
  },
  hdPathCoinType: 60,
  pluginMnemonicKeyName: 'botanixMnemonic',
  pluginRegularKeyName: 'botanixKey',
  evmGasStationUrl: null,
  networkFees
}

const currencyInfo: EdgeCurrencyInfo = {
  canReplaceByFee: true,
  currencyCode: 'BTC',
  customFeeTemplate: evmCustomFeeTemplate,
  customTokenTemplate: evmCustomTokenTemplate,
  assetDisplayName: 'BTC',
  chainDisplayName: 'Botanix',
  memoOptions: evmMemoOptions,
  pluginId: 'botanix',
  walletType: 'wallet:botanix',

  // Explorers:
  addressExplorer: 'https://botanixscan.io/address/%s',
  transactionExplorer: 'https://botanixscan.io/tx/%s',

  denominations: [
    {
      name: 'BTC',
      multiplier: '1000000000000000000',
      symbol: '₿'
    }
  ],

  // Deprecated:
  defaultSettings: makeEvmDefaultSettings(networkInfo),
  displayName: 'Botanix Bitcoin',
  metaTokens: makeMetaTokens(builtinTokens)
}

export const botanix = makeOuterPlugin<
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
