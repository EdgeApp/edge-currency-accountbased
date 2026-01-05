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
  '754704bc059f8c67012fed69bc8a327a5aafb603': {
    currencyCode: 'USDC',
    displayName: 'USD Coin',
    denominations: [{ name: 'USDC', multiplier: '1000000' }],
    networkLocation: {
      contractAddress: '0x754704Bc059F8C67012fEd69BC8A327a5aafb603'
    }
  },
  e7cd86e13ac4309349f30b3435a9d337750fc82d: {
    currencyCode: 'USDT',
    displayName: 'Tether USD',
    denominations: [{ name: 'USDT', multiplier: '1000000' }],
    networkLocation: {
      contractAddress: '0xe7cd86e13AC4309349F30B3435a9d337750fC82D'
    }
  },
  ee8c0e9f1bffb4eb878d8f15f368a02a35481242: {
    currencyCode: 'WETH',
    displayName: 'Wrapped Ether',
    denominations: [{ name: 'WETH', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0xEE8c0E9f1BFFb4Eb878d8f15f368A02a35481242'
    }
  },
  '0555e30da8f98308edb960aa94c0db47230d2b9c': {
    currencyCode: 'WBTC',
    displayName: 'Wrapped Bitcoin',
    denominations: [{ name: 'WBTC', multiplier: '100000000' }],
    networkLocation: {
      contractAddress: '0x0555E30da8f98308EdB960aa94C0Db47230d2B9c'
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
  displayName: 'Monad',
  metaTokens: makeMetaTokens(builtinTokens)
}

export const monad = makeOuterPlugin<
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
