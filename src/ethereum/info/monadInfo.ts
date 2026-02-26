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
  addressQueryLookbackBlocks: 300,
  networkAdapterConfigs: [
    {
      type: 'rpc',
      servers: [
        'https://monad.rpc.blxrbdn.com',
        'https://rpc2.monad.xyz',
        'https://monad-mainnet.drpc.org'
      ],
      ethBalCheckerContract: '0x726391B6cA41761c4c332aa556Cf804A50279b52'
    },
    {
      type: 'evmscan',
      gastrackerSupport: true,
      servers: ['https://api.etherscan.io']
    }
  ],
  uriNetworks: ['monad'],
  ercTokenStandard: 'ERC20',
  chainParams: {
    chainId: 143,
    name: 'Monad'
  },
  supportsEIP1559: true,
  hdPathCoinType: 60,
  pluginMnemonicKeyName: 'monadMnemonic',
  pluginRegularKeyName: 'monadKey',
  evmGasStationUrl: null,
  networkFees
}

const currencyInfo: EdgeCurrencyInfo = {
  canReplaceByFee: true,
  currencyCode: 'MON',
  evmChainId: 143,
  customFeeTemplate: evmCustomFeeTemplate,
  customTokenTemplate: evmCustomTokenTemplate,
  assetDisplayName: 'Monad',
  chainDisplayName: 'Monad',
  memoOptions: evmMemoOptions,
  pluginId: 'monad',
  walletType: 'wallet:monad',

  // Explorers:
  addressExplorer: 'https://monadvision.com/address/%s',
  transactionExplorer: 'https://monadvision.com/tx/%s',

  denominations: [
    {
      name: 'MON',
      multiplier: '1000000000000000000',
      symbol: 'MON'
    }
  ],

  usesChangeServer: true,

  // Deprecated:
  defaultSettings: makeEvmDefaultSettings(networkInfo),
  displayName: 'Monad'
}

export const monad = makeOuterPlugin<
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
