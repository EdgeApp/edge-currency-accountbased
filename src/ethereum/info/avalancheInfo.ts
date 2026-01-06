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
      lowFee: '25000000000',
      standardFeeLow: '27000000000',
      standardFeeHigh: '30000000000',
      standardFeeLowAmount: '100000000000000000',
      standardFeeHighAmount: '10000000000000000000',
      highFee: '50000000000',
      minGasPrice: '25000000000'
    },
    minPriorityFee: '25000000000'
  }
}

const networkInfo: EthereumNetworkInfo = {
  addressQueryLookbackBlocks: 100, // 5 minutes
  networkAdapterConfigs: [
    {
      type: 'rpc',
      servers: [
        'https://api.avax.network/ext/bc/C/rpc',
        'https://rpc.ankr.com/avalanche',
        'https://lb.drpc.org/ogrpc?network=avalanche&dkey={{drpcApiKey}}'
      ],
      ethBalCheckerContract: '0xd023d153a0dfa485130ecfde2faa7e612ef94818'
    },
    {
      type: 'evmscan',
      gastrackerSupport: true,
      servers: [
        'https://api.etherscan.io',
        'https://api.avascan.info/v2/network/mainnet/evm/43114/etherscan',
        'https://api.snowscan.xyz'
      ]
    }
  ],
  uriNetworks: ['avalanche'],
  ercTokenStandard: 'ERC20',
  chainParams: {
    chainId: 43114,
    name: 'AVAX Mainnet'
  },
  supportsEIP1559: true,
  hdPathCoinType: 9000,
  pluginMnemonicKeyName: 'avalancheMnemonic',
  pluginRegularKeyName: 'avalancheKey',
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
  currencyCode: 'AVAX',
  evmChainId: 43114,
  customFeeTemplate: evmCustomFeeTemplate,
  customTokenTemplate: evmCustomTokenTemplate,
  assetDisplayName: 'Avalanche',
  chainDisplayName: 'Avalanche',
  memoOptions: evmMemoOptions,
  pluginId: 'avalanche', // matching mnemonic here
  walletType: 'wallet:avalanche',

  // Explorers:
  addressExplorer: 'https://avascan.info/blockchain/c/address/%s',
  transactionExplorer: 'https://avascan.info/blockchain/c/tx/%s',

  denominations: [
    {
      name: 'AVAX',
      multiplier: '1000000000000000000',
      symbol: 'AVAX'
    }
  ],

  usesChangeServer: true,

  // Deprecated:
  defaultSettings: makeEvmDefaultSettings(networkInfo),
  displayName: 'Avalanche'
}

export const avalanche = makeOuterPlugin<
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
