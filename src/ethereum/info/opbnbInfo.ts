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

const builtinTokens: EdgeTokenMap = {
  '9e5aac1ba1a2e6aed6b32689dfcf62a509ca96f3': {
    currencyCode: 'USDT',
    displayName: 'Tether USD',
    denominations: [{ name: 'USDT', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x9e5aac1ba1a2e6aed6b32689dfcf62a509ca96f3'
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
  addressQueryLookbackBlocks: 60, // ~2 minutes
  networkAdapterConfigs: [
    {
      type: 'rpc',
      servers: [
        'https://opbnb-rpc.publicnode.com',
        'https://opbnb.api.pocket.network'
      ],
      ethBalCheckerContract: '0x726391B6cA41761c4c332aa556Cf804A50279b52'
    },
    {
      type: 'evmscan',
      gastrackerSupport: true,
      servers: ['https://api.etherscan.io'] // MUST use etherscan v2 API instead of opbnbscan for opBNB
    }
  ],
  uriNetworks: ['opbnb'],
  ercTokenStandard: 'ERC20',
  chainParams: {
    chainId: 204,
    name: 'opBNB'
  },
  optimismRollup: true,
  supportsEIP1559: true,
  hdPathCoinType: 60,
  pluginMnemonicKeyName: 'opbnbMnemonic',
  pluginRegularKeyName: 'opbnbKey',
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
  currencyCode: 'BNB',
  evmChainId: 204,
  customFeeTemplate: evmCustomFeeTemplate,
  customTokenTemplate: evmCustomTokenTemplate,
  chainDisplayName: 'opBNB',
  assetDisplayName: 'BNB',
  memoOptions: evmMemoOptions,
  pluginId: 'opbnb',
  walletType: 'wallet:opbnb',

  // Explorers:
  addressExplorer: 'https://opbnbscan.com/address/%s',
  transactionExplorer: 'https://opbnbscan.com/tx/%s',

  denominations: [
    {
      name: 'BNB',
      multiplier: '1000000000000000000',
      symbol: 'BNB'
    }
  ],

  usesChangeServer: true,

  // Deprecated:
  defaultSettings: makeEvmDefaultSettings(networkInfo),
  displayName: 'opBNB',
  metaTokens: makeMetaTokens(builtinTokens)
}

export const opbnb = makeOuterPlugin<
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
