import { EdgeCurrencyInfo, EdgeTokenMap } from 'edge-core-js/types'

import { makeOuterPlugin } from '../../common/innerPlugin'
import { makeMetaTokens } from '../../common/tokenHelpers'
import type { EthereumTools } from '../EthereumTools'
import type { EthereumFees, EthereumNetworkInfo } from '../ethereumTypes'
import { evmMemoOptions } from './ethereumCommonInfo'

const builtinTokens: EdgeTokenMap = {
  '833589fcd6edb6e08f4c7c32d4f71b54bda02913': {
    currencyCode: 'USDC',
    displayName: 'USD Coin',
    denominations: [{ name: 'USDC', multiplier: '1000000' }],
    networkLocation: {
      contractAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
    }
  }
}

// Fees are in Wei
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
      minGasPrice: '100000'
    },
    minPriorityFee: '2000000000'
  }
}

const networkInfo: EthereumNetworkInfo = {
  networkAdapterConfigs: [
    {
      type: 'rpc',
      servers: [
        'https://base-mainnet.public.blastapi.io',
        'https://rpc.ankr.com/base'
      ],
      ethBalCheckerContract: '0x3ba5A41eA17fd4950a641a057dC0bEb8E8ff1521'
    },
    {
      type: 'evmscan',
      servers: ['https://api.basescan.org']
    },
    {
      type: 'blockchair',
      servers: ['https://api.blockchair.com']
    }
  ],
  uriNetworks: ['base'],
  ercTokenStandard: 'ERC20',
  chainParams: {
    chainId: 8453,
    name: 'Base'
  },
  optimismRollup: true,
  hdPathCoinType: 60,
  alethioCurrencies: null, // object or null
  amberDataBlockchainId: '',
  pluginMnemonicKeyName: 'baseMnemonic',
  pluginRegularKeyName: 'baseKey',
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
  displayName: 'Base',
  memoOptions: evmMemoOptions,
  pluginId: 'base',
  walletType: 'wallet:base',

  // Explorers:
  addressExplorer: 'https://basescan.org/address/%s',
  transactionExplorer: 'https://basescan.org/tx/%s',

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

export const base = makeOuterPlugin<EthereumNetworkInfo, EthereumTools>({
  builtinTokens,
  currencyInfo,
  networkInfo,

  async getInnerPlugin() {
    return await import('../EthereumTools')
  }
})
