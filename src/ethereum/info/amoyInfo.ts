import { EdgeCurrencyInfo, EdgeTokenMap } from 'edge-core-js/types'

import { makeOuterPlugin } from '../../common/innerPlugin'
import { makeMetaTokens } from '../../common/tokenHelpers'
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

const networkFees: EthereumFees = {
  default: {
    baseFee: undefined,
    baseFeeMultiplier: undefined,
    gasLimit: {
      regularTransaction: '21000',
      tokenTransaction: '300000',
      minGasLimit: '21000'
    },
    gasPrice: {
      lowFee: '30000000001',
      standardFeeLow: '36000000000',
      standardFeeHigh: '100000000000',
      standardFeeLowAmount: '100000000000000000',
      standardFeeHighAmount: '10000000000000000000',
      highFee: '216000000000',
      minGasPrice: '30000000000'
    },
    minPriorityFee: undefined
  }
}

const networkInfo: EthereumNetworkInfo = {
  addressQueryLookbackBlocks: 4, // 2 minutes
  networkAdapterConfigs: [
    {
      type: 'rpc',
      servers: [
        'https://polygon-amoy.blockpi.network/v1/rpc/public',
        'https://rpc.ankr.com/polygon_amoy',
        'https://polygon-amoy-bor-rpc.publicnode.com',
        'https://rpc-amoy.polygon.technology',
        'https://polygon-amoy.drpc.org',
        'https://api.tatum.io/v3/blockchain/node/polygon-amoy',
        'https://lb.drpc.org/ogrpc?network=polygon-amoy&dkey={{drpcApiKey}}'
      ]
    },
    {
      type: 'evmscan',
      gastrackerSupport: true,
      servers: ['https://api-amoy.polygonscan.com/']
    }
  ],
  uriNetworks: ['amoy'],
  ercTokenStandard: 'ERC20',
  chainParams: {
    chainId: 80002,
    name: 'Amoy Testnet'
  },
  supportsEIP1559: true,
  hdPathCoinType: 966,
  pluginMnemonicKeyName: 'amoyMnemonic',
  pluginRegularKeyName: 'amoyKey',
  evmGasStationUrl: null,
  networkFees,
  decoyAddressConfig: {
    count: 5,
    minTransactionCount: 10,
    maxTransactionCount: 100
  }
}

export const currencyInfo: EdgeCurrencyInfo = {
  canReplaceByFee: true,
  currencyCode: 'POL',
  evmChainId: 80002,
  customFeeTemplate: evmCustomFeeTemplate,
  customTokenTemplate: evmCustomTokenTemplate,
  chainDisplayName: 'Amoy Testnet',
  assetDisplayName: 'Amoy Testnet',
  memoOptions: evmMemoOptions,
  pluginId: 'amoy',
  walletType: 'wallet:amoy',

  // Explorers:
  addressExplorer: 'https://amoy.polygonscan.com/address/%s',
  transactionExplorer: 'https://amoy.polygonscan.com/tx/%s',

  denominations: [
    {
      name: 'POL',
      multiplier: '1000000000000000000',
      symbol: 'POL'
    },
    {
      name: 'mPOL',
      multiplier: '1000000000000000',
      symbol: 'mPOL'
    }
  ],

  usesChangeServer: true,

  // Deprecated:
  defaultSettings: makeEvmDefaultSettings(networkInfo),
  displayName: 'Amoy Testnet',
  metaTokens: makeMetaTokens(builtinTokens)
}

export const amoy = makeOuterPlugin<
  EthereumNetworkInfo,
  EthereumTools,
  EthereumInfoPayload
>({
  builtinTokens,
  currencyInfo,
  asInfoPayload: asEthereumInfoPayload,
  networkInfo,

  async getInnerPlugin() {
    return await import('../EthereumTools')
  }
})
