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
  a320d9f65ec992eff38622c63627856382db726c: {
    currencyCode: 'HFUN',
    displayName: 'Hypurr Fun',
    denominations: [
      {
        name: 'HFUN',
        multiplier: '1000000000000000000',
        symbol: 'HFUN'
      }
    ],
    networkLocation: {
      contractAddress: '0xa320D9f65ec992EfF38622c63627856382Db726c'
    }
  },
  '1ecd15865d7f8019d546f76d095d9c93cc34edfa': {
    currencyCode: 'LIQD',
    displayName: 'LiquidLaunch',
    denominations: [
      {
        name: 'LiquidLaunch',
        multiplier: '1000000000000000000',
        symbol: 'LIQD'
      }
    ],
    networkLocation: {
      contractAddress: '0x1Ecd15865D7F8019D546f76d095d9c93cc34eDFa'
    }
  },
  '1bee6762f0b522c606dc2ffb106c0bb391b2e309': {
    currencyCode: 'PiP',
    displayName: 'PiP',
    denominations: [
      {
        name: 'PiP',
        multiplier: '1000000000000000000',
        symbol: 'PiP'
      }
    ],
    networkLocation: {
      contractAddress: '0x1bEe6762F0B522c606DC2Ffb106C0BB391b2E309'
    }
  },
  '9b498c3c8a0b8cd8ba1d9851d40d186f1872b44e': {
    currencyCode: 'PURR',
    displayName: 'Purr',
    denominations: [
      {
        name: 'PURR',
        multiplier: '1000000000000000000',
        symbol: 'PURR'
      }
    ],
    networkLocation: {
      contractAddress: '0x9b498C3c8A0b8CD8BA1D9851d40D186F1872b44E'
    }
  },
  b8ce59fc3717ada4c02eadf9682a9e934f625ebb: {
    currencyCode: 'USD₮0',
    displayName: 'USD₮0',
    denominations: [
      {
        name: 'USD₮0',
        multiplier: '1000000000000000000',
        symbol: 'USD₮0'
      }
    ],
    networkLocation: {
      contractAddress: '0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb'
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
  addressQueryLookbackBlocks: 120, // 2 minutes
  networkAdapterConfigs: [
    {
      type: 'rpc',
      servers: [
        'https://rpc.hyperliquid.xyz/evm',
        'https://rpc.hypurrscan.io',
        'https://hyperliquid-json-rpc.stakely.io',
        'https://hyperliquid-json-rpc.stakely.io'
      ]
    },
    {
      type: 'evmscan',
      gastrackerSupport: true,
      servers: [
        'https://api.routescan.io/v2/network/mainnet/evm/999/etherscan/api'
      ],
      version: 1
    }
  ],
  uriNetworks: [],
  ercTokenStandard: 'ERC20',
  chainParams: {
    chainId: 999,
    name: 'HYPE'
  },
  optimismRollup: false,
  supportsEIP1559: true,
  hdPathCoinType: 60,
  pluginMnemonicKeyName: 'hyperevmMnemonic',
  pluginRegularKeyName: 'hyperevmKey',
  evmGasStationUrl: null,
  networkFees
}

const currencyInfo: EdgeCurrencyInfo = {
  canReplaceByFee: true,
  currencyCode: 'HYPE',
  evmChainId: 999,
  customFeeTemplate: evmCustomFeeTemplate,
  customTokenTemplate: evmCustomTokenTemplate,
  assetDisplayName: 'HYPE',
  chainDisplayName: 'HYPE',
  memoOptions: evmMemoOptions,
  pluginId: 'hyperevm',
  walletType: 'wallet:hyperevm',

  // Explorers:
  addressExplorer: 'https://hyperevmscan.io/address/%s',
  transactionExplorer: 'https://hyperevmscan.io/tx/%s',

  denominations: [
    {
      name: 'HYPE',
      multiplier: '1000000000000000000',
      symbol: 'HYPE'
    }
  ],

  // Deprecated:
  defaultSettings: makeEvmDefaultSettings(networkInfo),
  displayName: 'HyperEVM',
  metaTokens: makeMetaTokens(builtinTokens)
}

export const hyperevm = makeOuterPlugin<
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
