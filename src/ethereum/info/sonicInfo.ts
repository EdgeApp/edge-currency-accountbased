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
      servers: ['https://rpc.soniclabs.com'],
      ethBalCheckerContract: '0x726391B6cA41761c4c332aa556Cf804A50279b52'
    },
    {
      type: 'evmscan',
      gastrackerSupport: true,
      servers: ['https://api.etherscan.io', 'https://api.sonicscan.org']
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
  displayName: 'Sonic'
}

export const sonic = makeOuterPlugin<
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
