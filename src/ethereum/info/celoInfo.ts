import { EdgeCurrencyInfo, EdgeTokenMap } from 'edge-core-js/types'

import { makeOuterPlugin } from '../../common/innerPlugin'
import { makeMetaTokens } from '../../common/tokenHelpers'
import type { EthereumTools } from '../EthereumTools'
import type { EthereumFees, EthereumNetworkInfo } from '../ethereumTypes'
import {
  evmCustomFeeTemplate,
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
  networkAdapterConfigs: [
    {
      type: 'rpc',
      servers: [
        'https://forno.celo.org',
        'https://rpc.ankr.com/celo',
        'https://celo-mainnet-rpc.allthatnode.com'
      ]
    },
    { type: 'evmscan', servers: ['https://explorer.celo.org/mainnet'] }
  ],
  uriNetworks: ['celo'],
  ercTokenStandard: 'ERC20',
  chainParams: {
    chainId: 42220,
    name: 'Celo Mainnet'
  },
  hdPathCoinType: 52752,
  amberDataBlockchainId: '',
  pluginMnemonicKeyName: 'celoMnemonic',
  pluginRegularKeyName: 'celoKey',
  ethGasStationUrl: null,
  defaultNetworkFees
}

const currencyInfo: EdgeCurrencyInfo = {
  canReplaceByFee: true,
  currencyCode: 'CELO',
  customFeeTemplate: evmCustomFeeTemplate,
  displayName: 'Celo',
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

  // Deprecated:
  defaultSettings: makeEvmDefaultSettings(networkInfo),
  metaTokens: makeMetaTokens(builtinTokens)
}

export const celo = makeOuterPlugin<EthereumNetworkInfo, EthereumTools>({
  builtinTokens,
  currencyInfo,
  networkInfo,

  async getInnerPlugin() {
    return await import('../EthereumTools')
  }
})
