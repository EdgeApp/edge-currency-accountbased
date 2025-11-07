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

const builtinTokens: EdgeTokenMap = {}

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
      servers: [
        'https://ethereum-sepolia.blockpi.network/v1/rpc/public',
        'https://1rpc.io/sepolia',
        'https://eth-sepolia.api.onfinality.io/public',
        'https://gateway.tenderly.co/public/sepolia',
        'https://sepolia.gateway.tenderly.co',
        'https://public.stackup.sh/api/v1/node/ethereum-sepolia',
        'https://eth-sepolia-public.unifra.io',
        'https://rpc-sepolia.rockx.com',
        'https://ethereum-sepolia.rpc.subquery.network/public',
        'https://eth-sepolia.public.blastapi.io',
        'https://sepolia.drpc.org',
        'https://ethereum-sepolia-rpc.publicnode.com',
        'https://api.zan.top/node/v1/eth/sepolia/public',
        'https://endpoints.omniatech.io/v1/eth/sepolia/public',
        'https://rpc.sepolia.org',
        'https://rpc2.sepolia.org',
        'https://lb.drpc.org/ogrpc?network=sepolia&dkey={{drpcApiKey}}'
      ],
      ethBalCheckerContract: '0xBfbCed302deD369855fc5f7668356e123ca4B329'
    },
    {
      type: 'evmscan',
      gastrackerSupport: true,
      servers: ['https://api.etherscan.io'],
      version: 2
    }
  ],

  uriNetworks: ['ethereum', 'ether'],
  ercTokenStandard: 'ERC20',
  chainParams: {
    chainId: 11155111,
    name: 'Sepolia'
  },
  supportsEIP1559: true,
  hdPathCoinType: 60,
  pluginMnemonicKeyName: 'sepoliaMnemonic',
  pluginRegularKeyName: 'sepoliaKey',
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
  currencyCode: 'ETH',
  evmChainId: 11155111,
  customFeeTemplate: evmCustomFeeTemplate,
  customTokenTemplate: evmCustomTokenTemplate,
  chainDisplayName: 'Sepolia Testnet',
  assetDisplayName: 'Sepolia Testnet',
  memoOptions: evmMemoOptions,
  pluginId: 'sepolia',
  walletType: 'wallet:sepolia',

  // Explorers:
  addressExplorer: 'https://sepolia.etherscan.io/address/%s',
  transactionExplorer: 'https://sepolia.etherscan.io/tx/%s',

  denominations: [
    {
      name: 'ETH',
      multiplier: '1000000000000000000',
      symbol: 'Ξ'
    },
    {
      name: 'mETH',
      multiplier: '1000000000000000',
      symbol: 'mΞ'
    }
  ],

  usesChangeServer: true,

  // Deprecated:
  defaultSettings: makeEvmDefaultSettings(networkInfo),
  displayName: 'Sepolia Testnet',
  metaTokens: makeMetaTokens(builtinTokens)
}

export const sepolia = makeOuterPlugin<
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
