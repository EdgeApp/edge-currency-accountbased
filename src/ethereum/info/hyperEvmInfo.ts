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
  addressQueryLookbackBlocks: 120, // 2 minutes
  networkAdapterConfigs: [
    {
      type: 'rpc',
      servers: [
        'https://rpc.hyperliquid.xyz/evm',
        'https://rpc.hypurrscan.io',
        'https://hyperliquid-json-rpc.stakely.io',
        'https://hyperliquid-json-rpc.stakely.io'
      ]
    },
    {
      type: 'evmscan',
      gastrackerSupport: true,
      servers: ['https://api.routescan.io/v2/network/mainnet/evm/999/etherscan']
    }
  ],
  uriNetworks: [],
  ercTokenStandard: 'ERC20',
  chainParams: {
    chainId: 999,
    name: 'HYPE'
  },
  optimismRollup: false,
  supportsEIP1559: true,
  hdPathCoinType: 60,
  pluginMnemonicKeyName: 'hyperevmMnemonic',
  pluginRegularKeyName: 'hyperevmKey',
  evmGasStationUrl: null,
  networkFees
}

const currencyInfo: EdgeCurrencyInfo = {
  canReplaceByFee: true,
  currencyCode: 'HYPE',
  evmChainId: 999,
  customFeeTemplate: evmCustomFeeTemplate,
  customTokenTemplate: evmCustomTokenTemplate,
  assetDisplayName: 'HYPE',
  chainDisplayName: 'HYPE',
  memoOptions: evmMemoOptions,
  pluginId: 'hyperevm',
  walletType: 'wallet:hyperevm',

  // Explorers:
  addressExplorer: 'https://hyperevmscan.io/address/%s',
  transactionExplorer: 'https://hyperevmscan.io/tx/%s',

  denominations: [
    {
      name: 'HYPE',
      multiplier: '1000000000000000000',
      symbol: 'HYPE'
    }
  ],

  // Deprecated:
  defaultSettings: makeEvmDefaultSettings(networkInfo),
  displayName: 'HyperEVM'
}

export const hyperevm = makeOuterPlugin<
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
