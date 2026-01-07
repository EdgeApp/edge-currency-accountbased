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
  '2ad7868ca212135c6119fd7ad1ce51cfc5702892': {
    currencyCode: 'USDT',
    displayName: 'Tether',
    denominations: [{ name: 'USDT', multiplier: '1000000' }],
    networkLocation: {
      contractAddress: '0x2ad7868ca212135c6119fd7ad1ce51cfc5702892'
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
  addressQueryLookbackBlocks: 8, // 2 minutes
  networkAdapterConfigs: [
    {
      type: 'rpc',
      servers: ['https://mainnet.ethereumpow.org'],
      // Same address as Ethereum mainnet since ETHW is an Ethereum fork
      ethBalCheckerContract: '0xb1f8e55c7f64d203c1400b9d8555d050f94adf39'
    },
    {
      type: 'evmscan',
      gastrackerSupport: true,
      servers: [
        // TODO:
      ]
    }
  ],

  uriNetworks: ['ethereumpow'],
  ercTokenStandard: 'ERC20',
  chainParams: {
    chainId: 10001,
    name: 'ETHW-mainnet'
  },
  supportsEIP1559: true,
  hdPathCoinType: 60,
  pluginMnemonicKeyName: 'ethereumpowMnemonic',
  pluginRegularKeyName: 'ethereumpowKey',
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
  currencyCode: 'ETHW',
  evmChainId: 10001,
  customFeeTemplate: evmCustomFeeTemplate,
  customTokenTemplate: evmCustomTokenTemplate,
  assetDisplayName: 'EthereumPoW',
  chainDisplayName: 'EthereumPoW',
  memoOptions: evmMemoOptions,
  pluginId: 'ethereumpow',
  walletType: 'wallet:ethereumpow',

  // Explorers:
  addressExplorer: 'https://www.oklink.com/en/ethw/address/%s',
  transactionExplorer: 'https://www.oklink.com/en/ethw/tx/%s',

  denominations: [
    {
      name: 'ETHW',
      multiplier: '1000000000000000000',
      symbol: 'Ξ'
    },
    {
      name: 'mETHW',
      multiplier: '1000000000000000',
      symbol: 'mΞ'
    }
  ],

  usesChangeServer: true,

  // Deprecated:
  defaultSettings: makeEvmDefaultSettings(networkInfo),
  displayName: 'EthereumPoW',
  metaTokens: makeMetaTokens(builtinTokens)
}

export const ethereumpow = makeOuterPlugin<
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
