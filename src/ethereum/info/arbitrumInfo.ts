import { EdgeCurrencyInfo, EdgeTokenMap } from 'edge-core-js/types'

import { makeOuterPlugin } from '../../common/innerPlugin'
import { makeMetaTokens } from '../../common/tokenHelpers'
import type { EthereumTools } from '../EthereumTools'
import type { EthereumFees, EthereumNetworkInfo } from '../ethereumTypes'
import { evmMemoOptions } from './ethereumCommonInfo'

const builtinTokens: EdgeTokenMap = {
  af88d065e77c8cc2239327c5edb3a432268e5831: {
    currencyCode: 'USDC',
    displayName: 'USD Coin',
    denominations: [{ name: 'USDC', multiplier: '1000000' }],
    networkLocation: {
      contractAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
    }
  },
  ff970a61a04b1ca14834a43f5de4533ebddb5cc8: {
    currencyCode: 'USDC.e',
    displayName: 'USD Coin',
    denominations: [{ name: 'USDC.e', multiplier: '1000000' }],
    networkLocation: {
      contractAddress: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8'
    }
  },
  fd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9: {
    currencyCode: 'USDT',
    displayName: 'Tether',
    denominations: [{ name: 'USDT', multiplier: '1000000' }],
    networkLocation: {
      contractAddress: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'
    }
  }
}

const defaultNetworkFees: EthereumFees = {
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

// Exported for fee provider test
const networkInfo: EthereumNetworkInfo = {
  networkAdapterConfigs: [
    {
      type: 'rpc',
      servers: [
        'https://arb1.arbitrum.io/rpc',
        'https://arbitrum-one.public.blastapi.io',
        'https://rpc.ankr.com/arbitrum',
        'https://arbitrum-one.rpc.grove.city/v1/lb/{{poktPortalApiKey}}'
      ],
      ethBalCheckerContract: '0x151E24A486D7258dd7C33Fb67E4bB01919B7B32c'
    },
    {
      type: 'evmscan',
      servers: ['https://api.arbiscan.io']
    },
    {
      type: 'blockchair',
      servers: ['https://api.blockchair.com']
    }
  ],

  uriNetworks: ['arbitrum'],
  ercTokenStandard: 'ERC20',
  chainParams: {
    chainId: 42161,
    name: 'Arbitrum One'
  },
  arbitrumRollupParams: {
    nodeInterfaceAddress: '0x00000000000000000000000000000000000000C8'
  },
  hdPathCoinType: 60,
  alethioCurrencies: null,
  amberDataBlockchainId: '',
  pluginMnemonicKeyName: 'arbitrumMnemonic',
  pluginRegularKeyName: 'arbitrumKey',
  ethGasStationUrl: null,
  defaultNetworkFees
}

const defaultSettings: any = {
  customFeeSettings: ['gasLimit', 'gasPrice'],
  otherSettings: { ...networkInfo }
}

const currencyInfo: EdgeCurrencyInfo = {
  canReplaceByFee: true,
  currencyCode: 'ETH',
  displayName: 'Arbitrum One',
  memoOptions: evmMemoOptions,
  pluginId: 'arbitrum',
  walletType: 'wallet:arbitrum',

  // Explorers:
  addressExplorer: 'https://arbiscan.io/address/%s',
  transactionExplorer: 'https://arbiscan.io/tx/%s',

  denominations: [
    {
      name: 'ETH',
      multiplier: '1000000000000000000',
      symbol: 'Ξ'
    }
  ],

  // Deprecated:
  defaultSettings,
  memoType: 'hex',
  metaTokens: makeMetaTokens(builtinTokens)
}

export const arbitrum = makeOuterPlugin<EthereumNetworkInfo, EthereumTools>({
  builtinTokens,
  currencyInfo,
  networkInfo,

  async getInnerPlugin() {
    return await import('../EthereumTools')
  }
})
