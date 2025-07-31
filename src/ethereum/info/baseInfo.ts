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
  '833589fcd6edb6e08f4c7c32d4f71b54bda02913': {
    currencyCode: 'USDC',
    displayName: 'USD Coin',
    denominations: [{ name: 'USDC', multiplier: '1000000' }],
    networkLocation: {
      contractAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
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
  addressQueryLookbackBlocks: 60, // 2 minutes
  networkAdapterConfigs: [
    {
      type: 'rpc',
      servers: [
        'https://base-mainnet.public.blastapi.io',
        'https://rpc.ankr.com/base',
        'https://lb.drpc.org/ogrpc?network=base&dkey={{drpcApiKey}}'
      ],
      ethBalCheckerContract: '0x3ba5A41eA17fd4950a641a057dC0bEb8E8ff1521'
    },
    {
      type: 'evmscan',
      gastrackerSupport: true,
      servers: ['https://api.etherscan.io', 'https://api.basescan.org']
    },
    {
      type: 'blockchair',
      servers: ['https://api.blockchair.com']
    }
  ],
  uriNetworks: ['base'],
  ercTokenStandard: 'ERC20',
  chainParams: {
    chainId: 8453,
    name: 'Base'
  },
  optimismRollup: true,
  hdPathCoinType: 60,
  pluginMnemonicKeyName: 'baseMnemonic',
  pluginRegularKeyName: 'baseKey',
  evmGasStationUrl: null,
  networkFees
}

const currencyInfo: EdgeCurrencyInfo = {
  canReplaceByFee: true,
  currencyCode: 'ETH',
  customFeeTemplate: evmCustomFeeTemplate,
  customTokenTemplate: evmCustomTokenTemplate,
  chainDisplayName: 'Base',
  assetDisplayName: 'Ethereum',
  memoOptions: evmMemoOptions,
  pluginId: 'base',
  walletType: 'wallet:base',

  // Explorers:
  addressExplorer: 'https://basescan.org/address/%s',
  transactionExplorer: 'https://basescan.org/tx/%s',

  denominations: [
    {
      name: 'ETH',
      multiplier: '1000000000000000000',
      symbol: 'Ξ'
    }
  ],

  usesChangeServer: true,

  // Deprecated:
  defaultSettings: makeEvmDefaultSettings(networkInfo),
  displayName: 'Base',
  metaTokens: makeMetaTokens(builtinTokens)
}

export const base = makeOuterPlugin<
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
