import { EdgeCurrencyInfo, EdgeTokenMap } from 'edge-core-js/types'

import { makeOuterPlugin } from '../../common/innerPlugin'
import { createEvmTokenId, makeMetaTokens } from '../../common/tokenHelpers'
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
  a1077a294dde1b09bb078844df40758a5d0f9a27: {
    currencyCode: 'WPLS',
    displayName: 'Wrapped Pulse',
    denominations: [{ name: 'WPLS', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0xA1077a294dDE1B09bB078844df40758a5D0f9a27'
    }
  }
}

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
      servers: ['https://rpc.pulsechain.com/']
    },
    {
      type: 'evmscan',
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
  amberDataBlockchainId: '',
  pluginMnemonicKeyName: 'pulsechainMnemonic',
  pluginRegularKeyName: 'pulsechainKey',
  ethGasStationUrl: null,
  networkFees
}

const currencyInfo: EdgeCurrencyInfo = {
  canReplaceByFee: true,
  currencyCode: 'PLS',
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

  // Deprecated:
  defaultSettings: makeEvmDefaultSettings(networkInfo),
  displayName: 'PulseChain',
  metaTokens: makeMetaTokens(builtinTokens)
}

export const pulsechain = makeOuterPlugin<
  EthereumNetworkInfo,
  EthereumTools,
  EthereumInfoPayload
>({
  builtinTokens,
  currencyInfo,
  asInfoPayload: asEthereumInfoPayload,
  createTokenId: createEvmTokenId,
  networkInfo,

  async getInnerPlugin() {
    return await import('../EthereumTools')
  }
})
