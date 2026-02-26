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
      minGasPrice: '1000000000'
    },
    minPriorityFee: '2000000000'
  }
}

const networkInfo: EthereumNetworkInfo = {
  addressQueryLookbackBlocks: 10, // 2 minutes
  networkAdapterConfigs: [
    {
      type: 'rpc',
      servers: ['https://rpc.pulsechain.com/'],
      // Same address as Ethereum mainnet since Pulsechain is an Ethereum fork
      ethBalCheckerContract: '0xb1f8e55c7f64d203c1400b9d8555d050f94adf39'
    },
    {
      type: 'evmscan',
      gastrackerSupport: false,
      servers: ['https://api.scan.pulsechain.com']
    },
    {
      type: 'pulsechain-scan',
      servers: ['https://api.scan.pulsechain.com']
    }
  ],
  uriNetworks: ['pulsechain'],
  ercTokenStandard: 'ERC20',
  chainParams: {
    chainId: 369,
    name: 'PulseChain'
  },
  supportsEIP1559: true,
  hdPathCoinType: 60,
  pluginMnemonicKeyName: 'pulsechainMnemonic',
  pluginRegularKeyName: 'pulsechainKey',
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
  currencyCode: 'PLS',
  evmChainId: 369,
  customFeeTemplate: evmCustomFeeTemplate,
  customTokenTemplate: evmCustomTokenTemplate,
  assetDisplayName: 'PulseChain',
  chainDisplayName: 'PulseChain',
  memoOptions: evmMemoOptions,
  pluginId: 'pulsechain',
  walletType: 'wallet:pulsechain',

  // Explorers:
  addressExplorer: 'https://scan.pulsechainfoundation.org/#/address/%s',
  transactionExplorer: 'https://scan.pulsechainfoundation.org/#/tx/%s',

  denominations: [
    {
      name: 'PLS',
      multiplier: '1000000000000000000',
      symbol: 'PLS'
    },
    {
      name: 'mPLS',
      multiplier: '1000000000000000',
      symbol: 'mPLS'
    }
  ],

  usesChangeServer: true,

  // Deprecated:
  defaultSettings: makeEvmDefaultSettings(networkInfo),
  displayName: 'PulseChain'
}

export const pulsechain = makeOuterPlugin<
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
