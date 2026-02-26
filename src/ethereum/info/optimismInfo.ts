import { EdgeCurrencyInfo } from 'edge-core-js/types'

import { makeOuterPlugin } from '../../common/innerPlugin'
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
        'https://mainnet.optimism.io',
        'https://rpc.ankr.com/optimism',
        'https://lb.drpc.org/ogrpc?network=optimism&dkey={{drpcApiKey}}'
      ],
      ethBalCheckerContract: '0xb1c568e9c3e6bdaf755a60c7418c269eb11524fc'
    },
    {
      type: 'evmscan',
      gastrackerSupport: true,
      servers: ['https://api.etherscan.io']
    }
  ],
  uriNetworks: ['optimism'],
  ercTokenStandard: 'ERC20',
  chainParams: {
    chainId: 10,
    name: 'Optimism'
  },
  optimismRollup: true,
  supportsEIP1559: true,
  hdPathCoinType: 60,
  pluginMnemonicKeyName: 'optimismMnemonic',
  pluginRegularKeyName: 'optimismKey',
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
  currencyCode: 'ETH',
  evmChainId: 10,
  customFeeTemplate: evmCustomFeeTemplate,
  customTokenTemplate: evmCustomTokenTemplate,
  chainDisplayName: 'Optimism',
  assetDisplayName: 'Ethereum',
  memoOptions: evmMemoOptions,
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

  usesChangeServer: true,

  // Deprecated:
  defaultSettings: makeEvmDefaultSettings(networkInfo),
  displayName: 'Optimism'
}

export const optimism = makeOuterPlugin<
  EthereumNetworkInfo,
  EthereumTools,
  EthereumInfoPayload
>({
  currencyInfo,
  asInfoPayload: asEthereumInfoPayload,
  networkInfo,

  async getInnerPlugin() {
    return await import('../EthereumTools')
  }
})
