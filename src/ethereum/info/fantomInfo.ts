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
    baseFeeMultiplier: undefined,
    gasLimit: {
      regularTransaction: '21000',
      tokenTransaction: '200000',
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
    minPriorityFee: undefined
  }
}

// Exported for fee provider test
const networkInfo: EthereumNetworkInfo = {
  addressQueryLookbackBlocks: 60, // 2 minutes
  networkAdapterConfigs: [
    {
      type: 'rpc',
      servers: [
        'https://fantom.api.pocket.network',
        'https://polished-empty-cloud.fantom.quiknode.pro/{{quiknodeApiKey}}/',
        'https://rpc.ankr.com/fantom',
        'https://rpc.ftm.tools',
        'https://lb.drpc.org/ogrpc?network=fantom&dkey={{drpcApiKey}}'
      ],
      ethBalCheckerContract: '0x07f697424abe762bb808c109860c04ea488ff92b'
    },
    {
      type: 'evmscan',
      gastrackerSupport: false,
      servers: ['https://ftmscout.com/']
    }
  ],
  uriNetworks: ['fantom'],
  ercTokenStandard: 'ERC20',
  chainParams: {
    chainId: 250,
    name: 'Fantom Opera'
  },
  hdPathCoinType: 60,
  feeUpdateFrequencyMs: 60000,
  supportsEIP1559: true,
  pluginMnemonicKeyName: 'fantomMnemonic',
  pluginRegularKeyName: 'fantomKey',
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
  currencyCode: 'FTM',
  evmChainId: 250,
  customFeeTemplate: evmCustomFeeTemplate,
  customTokenTemplate: evmCustomTokenTemplate,
  assetDisplayName: 'Fantom',
  chainDisplayName: 'Fantom',
  memoOptions: evmMemoOptions,
  pluginId: 'fantom',
  walletType: 'wallet:fantom',

  // Explorers:
  addressExplorer: 'https://explorer.fantom.network/address/%s',
  transactionExplorer: 'https://explorer.fantom.network/transactions/%s',

  denominations: [
    {
      name: 'FTM',
      multiplier: '1000000000000000000',
      symbol: 'F'
    }
  ],

  usesChangeServer: true,

  // Deprecated:
  defaultSettings: makeEvmDefaultSettings(networkInfo),
  displayName: 'Fantom'
}

export const fantom = makeOuterPlugin<
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

if (process.env.npm_lifecycle_event === 'test') {
  module.exports = { ...module.exports, currencyInfo, networkInfo }
}
