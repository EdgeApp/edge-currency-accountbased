import { EdgeCurrencyInfo } from 'edge-core-js/types'

import { makeOuterPlugin } from '../../common/innerPlugin'
import { EthereumTools } from '../EthereumTools'
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
    minPriorityFee: '100000000' // 0.1 Gwei
  }
}

// Exported for fee provider test
const networkInfo: EthereumNetworkInfo = {
  addressQueryLookbackBlocks: 480, // 2 minutes
  networkAdapterConfigs: [
    {
      type: 'rpc',
      servers: [
        'https://arb1.arbitrum.io/rpc',
        'https://arbitrum-one.public.blastapi.io',
        'https://rpc.ankr.com/arbitrum',
        'https://arb-one.api.pocket.network',
        'https://lb.drpc.org/ogrpc?network=arbitrum&dkey={{drpcApiKey}}'
      ],
      ethBalCheckerContract: '0x151E24A486D7258dd7C33Fb67E4bB01919B7B32c'
    },
    {
      type: 'evmscan',
      gastrackerSupport: true,
      servers: ['https://api.etherscan.io', 'https://api.arbiscan.io']
    },
    {
      type: 'blockchair',
      servers: ['https://api.blockchair.com']
    }
  ],

  uriNetworks: ['arbitrum'],
  ercTokenStandard: 'ERC20',
  chainParams: {
    chainId: 42161,
    name: 'Arbitrum One'
  },
  arbitrumRollupParams: {
    nodeInterfaceAddress: '0x00000000000000000000000000000000000000C8'
  },
  hdPathCoinType: 60,
  pluginMnemonicKeyName: 'arbitrumMnemonic',
  pluginRegularKeyName: 'arbitrumKey',
  evmGasStationUrl: null,
  networkFees,
  supportsEIP1559: true,
  decoyAddressConfig: {
    count: 5,
    minTransactionCount: 10,
    maxTransactionCount: 100
  }
}

const currencyInfo: EdgeCurrencyInfo = {
  canReplaceByFee: true,
  currencyCode: 'ETH',
  evmChainId: 42161,
  customFeeTemplate: evmCustomFeeTemplate,
  customTokenTemplate: evmCustomTokenTemplate,
  chainDisplayName: 'Arbitrum One',
  assetDisplayName: 'Ethereum',
  memoOptions: evmMemoOptions,
  pluginId: 'arbitrum',
  walletType: 'wallet:arbitrum',

  // Explorers:
  addressExplorer: 'https://arbiscan.io/address/%s',
  transactionExplorer: 'https://arbiscan.io/tx/%s',

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
  displayName: 'Arbitrum One'
}

export const arbitrum = makeOuterPlugin<
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
