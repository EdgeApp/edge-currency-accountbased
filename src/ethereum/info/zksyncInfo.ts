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
    gasLimit: undefined, // Limits must always be estimated by eth_estimateGas
    gasPrice: {
      lowFee: '1000000001',
      standardFeeLow: '40000000001',
      standardFeeHigh: '300000000001',
      standardFeeLowAmount: '100000000000000000',
      standardFeeHighAmount: '10000000000000000000',
      highFee: '40000000001',
      minGasPrice: '10000000'
    },
    minPriorityFee: '2000000000'
  }
}

const networkInfo: EthereumNetworkInfo = {
  addressQueryLookbackBlocks: 60, // ~2 minutes
  networkAdapterConfigs: [
    {
      type: 'rpc',
      servers: [
        'https://mainnet.era.zksync.io',
        'https://lb.drpc.org/ogrpc?network=zksync&dkey={{drpcApiKey}}'
      ],
      ethBalCheckerContract: '0xc0D6b7D8fFee371C4c17249A35cEB003D350d1a1'
    },
    {
      type: 'evmscan',
      gastrackerSupport: true,
      servers: [
        'https://api.etherscan.io',
        'https://block-explorer-api.mainnet.zksync.io',
        'https://api-era.zksync.network'
      ]
    }
  ],
  uriNetworks: ['zksync'],
  ercTokenStandard: 'ERC20',
  chainParams: {
    chainId: 324,
    name: 'zkSync'
  },
  hdPathCoinType: 60,
  pluginMnemonicKeyName: 'zksyncMnemonic',
  pluginRegularKeyName: 'zksyncKey',
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
  evmChainId: 324,
  customFeeTemplate: evmCustomFeeTemplate,
  customTokenTemplate: evmCustomTokenTemplate,
  chainDisplayName: 'zkSync',
  assetDisplayName: 'Ethereum',
  memoOptions: evmMemoOptions,
  pluginId: 'zksync',
  walletType: 'wallet:zksync',

  // Explorers:
  addressExplorer: 'https://explorer.zksync.io/address/%s',
  transactionExplorer: 'https://explorer.zksync.io/tx/%s',

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
  displayName: 'zkSync'
}

export const zksync = makeOuterPlugin<
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
