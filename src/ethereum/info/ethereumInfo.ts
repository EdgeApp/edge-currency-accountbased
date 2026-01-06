import { EdgeCurrencyInfo } from 'edge-core-js/types'

import { makeOuterPlugin } from '../../common/innerPlugin'
import type { EthereumTools } from '../EthereumTools'
import {
  asEthereumInfoPayload,
  EthereumFees,
  EthereumInfoPayload,
  EthereumNetworkInfo,
  ethOtherMethodNames
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
  },
  '1983987abc9837fbabc0982347ad828': {
    baseFee: undefined,
    baseFeeMultiplier: undefined,
    // @ts-expect-error
    gasLimit: {
      regularTransaction: '21002',
      tokenTransaction: '37124'
    },
    // @ts-expect-error
    gasPrice: {
      lowFee: '1000000002',
      standardFeeLow: '40000000002',
      standardFeeHigh: '300000000002',
      standardFeeLowAmount: '200000000000000000',
      standardFeeHighAmount: '20000000000000000000',
      highFee: '40000000002'
    },
    minPriorityFee: undefined
  },
  '2983987abc9837fbabc0982347ad828': {
    baseFee: undefined,
    baseFeeMultiplier: undefined,
    // @ts-expect-error
    gasLimit: {
      regularTransaction: '21002',
      tokenTransaction: '37124'
    },
    gasPrice: undefined,
    minPriorityFee: undefined
  }
}

// Exported for fee provider test
const networkInfo: EthereumNetworkInfo = {
  addressQueryLookbackBlocks: 8, // 2 minutes
  networkAdapterConfigs: [
    {
      type: 'rpc',
      servers: [
        'https://eth-mainnet.g.alchemy.com/v2/{{alchemyApiKey}}',
        'https://mainnet.infura.io/v3/{{infuraProjectId}}',
        'https://rpc.ankr.com/eth',
        'https://eth.api.pocket.network',
        'https://cloudflare-eth.com',
        'https://lb.drpc.org/ogrpc?network=ethereum&dkey={{drpcApiKey}}',
        'https://ethereum-mainnet.gateway.tatum.io',
        'https://eth.llamarpc.com',
        'https://eth.blockrazor.xyz',
        'https://ethereum-rpc.publicnode.com'
      ],
      ethBalCheckerContract: '0xb1f8e55c7f64d203c1400b9d8555d050f94adf39'
    },
    {
      type: 'amberdata-rpc',
      amberdataBlockchainId: '1c9c969065fcd1cf', // ETH mainnet
      servers: ['https://rpc.web3api.io']
    },
    {
      type: 'evmscan',
      gastrackerSupport: true,
      servers: ['https://api.etherscan.io']
    },
    {
      type: 'blockbook',
      servers: [
        'https://ethbook.guarda.co',
        'https://eth1.trezor.io',
        'https://eth2.trezor.io'
      ]
    },
    {
      type: 'blockbook-ws',
      connections: [
        // {
        //   url: 'wss://eth-blockbook.nownodes.io/wss',
        //   keyType: 'nowNodesApiKey'
        // },
        { url: 'wss://eth1.trezor.io/websocket' },
        { url: 'wss://eth2.trezor.io/websocket' }
      ]
    },
    {
      type: 'blockchair',
      servers: ['https://api.blockchair.com']
    },
    {
      type: 'blockcypher',
      servers: ['https://api.blockcypher.com']
    }
  ],

  uriNetworks: ['ethereum', 'ether'],
  ercTokenStandard: 'ERC20',
  chainParams: {
    chainId: 1,
    name: 'Ethereum Mainnet'
  },
  decoyAddressConfig: {
    count: 5,
    minTransactionCount: 10,
    maxTransactionCount: 100
  },
  supportsEIP1559: true,
  hdPathCoinType: 60,
  pluginMnemonicKeyName: 'ethereumMnemonic',
  pluginRegularKeyName: 'ethereumKey',
  evmGasStationUrl: null,
  networkFees
}

export const currencyInfo: EdgeCurrencyInfo = {
  canReplaceByFee: true,
  currencyCode: 'ETH',
  evmChainId: 1,
  customFeeTemplate: evmCustomFeeTemplate,
  customTokenTemplate: evmCustomTokenTemplate,
  assetDisplayName: 'Ethereum',
  chainDisplayName: 'Ethereum',
  memoOptions: evmMemoOptions,
  pluginId: 'ethereum',
  walletType: 'wallet:ethereum',

  // Explorers:
  addressExplorer: 'https://etherscan.io/address/%s',
  transactionExplorer: 'https://etherscan.io/tx/%s',

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
  displayName: 'Ethereum'
}

export const ethereum = makeOuterPlugin<
  EthereumNetworkInfo,
  EthereumTools,
  EthereumInfoPayload
>({
  asInfoPayload: asEthereumInfoPayload,
  currencyInfo,
  networkInfo,
  otherMethodNames: ethOtherMethodNames,

  async getInnerPlugin() {
    return await import(
      /* webpackChunkName: "ethereum" */
      '../EthereumTools'
    )
  }
})

if (process.env.npm_lifecycle_event === 'test') {
  module.exports = { ...module.exports, currencyInfo }
}
