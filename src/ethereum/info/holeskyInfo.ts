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
  '94373a4919b3240d86ea41593d5eba789fef3848': {
    currencyCode: 'WETH',
    displayName: 'Wrapped Ethereum',
    denominations: [{ name: 'WETH', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x94373a4919B3240D86eA41593D5eBa789FEF3848'
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
  addressQueryLookbackBlocks: 9, // ~2 minutes
  networkAdapterConfigs: [
    {
      type: 'rpc',
      servers: [
        'https://holesky-fullnode-testnet.rpc.grove.city/v1/{{poktPortalApiKey}}',
        'https://eth-holesky.alchemyapi.io/v2/{{alchemyApiKey}}',
        'https://holesky.infura.io/v3/{{infuraProjectId}}',
        'https://1rpc.io/holesky',
        'https://ethereum-holesky-rpc.publicnode.com',
        'https://ethereum-holesky.blockpi.network/v1/rpc/public',
        'https://holesky.drpc.org',
        'https://rpc-holesky.rockx.com',
        'https://endpoints.omniatech.io/v1/eth/holesky/public',
        'https://lb.drpc.org/ogrpc?network=holesky&dkey={{drpcApiKey}}'
      ],
      ethBalCheckerContract: '0xf4C055E8760C6e66301C2e2F12b85567a9A50841'
    },
    {
      type: 'evmscan',
      servers: ['https://api.etherscan.io']
    }
  ],

  uriNetworks: ['ethereum', 'ether'],
  ercTokenStandard: 'ERC20',
  chainParams: {
    chainId: 17000,
    name: 'Holesky'
  },
  supportsEIP1559: true,
  hdPathCoinType: 60,
  amberDataBlockchainId: '',
  pluginMnemonicKeyName: 'holeskyMnemonic',
  pluginRegularKeyName: 'holeskyKey',
  evmGasStationUrl: null,
  networkFees
}

const currencyInfo: EdgeCurrencyInfo = {
  canReplaceByFee: true,
  currencyCode: 'ETH',
  customFeeTemplate: evmCustomFeeTemplate,
  customTokenTemplate: evmCustomTokenTemplate,
  chainDisplayName: 'Holesky Testnet',
  assetDisplayName: 'Holesky Testnet',
  memoOptions: evmMemoOptions,
  pluginId: 'holesky',
  walletType: 'wallet:holesky',

  // Explorers:
  addressExplorer: 'https://holesky.etherscan.io/address/%s',
  transactionExplorer: 'https://holesky.etherscan.io/tx/%s',

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

  // Deprecated:
  defaultSettings: makeEvmDefaultSettings(networkInfo),
  displayName: 'Holesky Testnet',
  metaTokens: makeMetaTokens(builtinTokens)
}

export const holesky = makeOuterPlugin<
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
