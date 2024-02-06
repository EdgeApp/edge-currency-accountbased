import { EdgeCurrencyInfo, EdgeTokenMap } from 'edge-core-js/types'

import { makeOuterPlugin } from '../../common/innerPlugin'
import { makeMetaTokens } from '../../common/tokenHelpers'
import type { EthereumTools } from '../EthereumTools'
import type { EthereumFees, EthereumNetworkInfo } from '../ethereumTypes'
import { evmMemoOptions } from './ethereumCommonInfo'

const builtinTokens: EdgeTokenMap = {}

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

const networkInfo: EthereumNetworkInfo = {
  networkAdapterConfigs: [
    {
      type: 'rpc',
      servers: [
        'https://eth-ropsten.alchemyapi.io/v2/-{{alchemyApiKey}}',
        'https://ropsten.infura.io/v3/{{infuraProjectId}}'
      ]
    },
    {
      type: 'evmscan',
      servers: ['https://api-ropsten.etherscan.io']
    },
    {
      type: 'blockbook',
      servers: ['https://ropsten1.trezor.io', 'https://ropsten2.trezor.io']
    }
  ],

  uriNetworks: ['ethereum', 'ether'],
  ercTokenStandard: 'ERC20',
  chainParams: {
    chainId: 3,
    name: 'Ropsten'
  },
  supportsEIP1559: true,
  hdPathCoinType: 60,
  alethioCurrencies: {
    // object or null
    native: 'ether',
    token: 'token'
  },
  amberDataBlockchainId: '',
  pluginMnemonicKeyName: 'ropstenMnemonic',
  pluginRegularKeyName: 'ropstenKey',
  ethGasStationUrl: 'https://www.ethgasstation.info/json/ethgasAPI.json',
  defaultNetworkFees
}

const defaultSettings: any = {
  customFeeSettings: ['gasLimit', 'gasPrice'],
  otherSettings: { ...networkInfo }
}

const currencyInfo: EdgeCurrencyInfo = {
  canReplaceByFee: true,
  currencyCode: 'ROP',
  displayName: 'Ropsten Testnet',
  memoOptions: evmMemoOptions,
  pluginId: 'ropsten',
  walletType: 'wallet:ropsten',

  // Explorers:
  addressExplorer: 'https://etherscan.io/address/%s',
  transactionExplorer: 'https://etherscan.io/tx/%s',

  denominations: [
    {
      name: 'ROP',
      multiplier: '1000000000000000000',
      symbol: 'R'
    },
    {
      name: 'mROP',
      multiplier: '1000000000000000',
      symbol: 'mR'
    }
  ],

  // Deprecated:
  defaultSettings,
  memoType: 'hex',
  metaTokens: makeMetaTokens(builtinTokens)
}

export const ropsten = makeOuterPlugin<EthereumNetworkInfo, EthereumTools>({
  builtinTokens,
  currencyInfo,
  networkInfo,

  async getInnerPlugin() {
    return await import('../EthereumTools')
  }
})
