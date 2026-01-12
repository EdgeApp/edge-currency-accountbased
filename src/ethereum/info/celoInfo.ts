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
  '765de816845861e75a25fca122bb6898b8b1282a': {
    currencyCode: 'CUSD',
    displayName: 'Celo Dollar',
    denominations: [{ name: 'CUSD', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x765DE816845861e75A25fCA122bb6898B8B1282a'
    }
  },
  d8763cba276a3738e6de85b4b3bf5fded6d6ca73: {
    currencyCode: 'CEUR',
    displayName: 'Celo Euro',
    denominations: [{ name: 'CEUR', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73'
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
      lowFee: '25000000000',
      standardFeeLow: '27000000000',
      standardFeeHigh: '30000000000',
      standardFeeLowAmount: '100000000000000000',
      standardFeeHighAmount: '10000000000000000000',
      highFee: '50000000000',
      minGasPrice: '25000000000'
    },
    minPriorityFee: '25000000000'
  }
}

const networkInfo: EthereumNetworkInfo = {
  addressQueryLookbackBlocks: 24, // 2 minutes
  networkAdapterConfigs: [
    {
      type: 'rpc',
      servers: [
        'https://forno.celo.org',
        'https://rpc.ankr.com/celo',
        'https://celo-mainnet-rpc.allthatnode.com',
        'https://lb.drpc.org/ogrpc?network=celo&dkey={{drpcApiKey}}'
      ],
      ethBalCheckerContract: '0x726391B6cA41761c4c332aa556Cf804A50279b52'
    },
    {
      type: 'evmscan',
      gastrackerSupport: false,
      servers: ['https://api.etherscan.io', 'https://explorer.celo.org/mainnet']
    }
  ],
  uriNetworks: ['celo'],
  ercTokenStandard: 'ERC20',
  chainParams: {
    chainId: 42220,
    name: 'Celo Mainnet'
  },
  hdPathCoinType: 52752,
  pluginMnemonicKeyName: 'celoMnemonic',
  pluginRegularKeyName: 'celoKey',
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
  currencyCode: 'CELO',
  evmChainId: 42220,
  customFeeTemplate: evmCustomFeeTemplate,
  customTokenTemplate: evmCustomTokenTemplate,
  assetDisplayName: 'Celo',
  chainDisplayName: 'Celo',
  memoOptions: evmMemoOptions,
  pluginId: 'celo',
  walletType: 'wallet:celo',

  // Explorers:
  addressExplorer: 'https://explorer.celo.org/address/%s',
  transactionExplorer: 'https://explorer.celo.org/tx/%s',

  denominations: [
    {
      name: 'CELO',
      multiplier: '1000000000000000000',
      symbol: 'CELO'
    }
  ],

  usesChangeServer: true,

  // Deprecated:
  defaultSettings: makeEvmDefaultSettings(networkInfo),
  displayName: 'Celo',
  metaTokens: makeMetaTokens(builtinTokens)
}

export const celo = makeOuterPlugin<
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
