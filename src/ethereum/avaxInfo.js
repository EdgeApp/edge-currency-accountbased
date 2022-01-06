/* global */
// @flow

import type {
  EdgeCorePluginOptions,
  EdgeCurrencyInfo
} from 'edge-core-js/types'

import { makeEthereumBasedPluginInner } from './ethPlugin'
import type { EthereumFees, EthereumSettings } from './ethTypes.js'

// Fees are in Wei
const defaultNetworkFees: EthereumFees = {
  default: {
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

const otherSettings: EthereumSettings = {
  rpcServers: ['https://api.avax.network/ext/bc/C/rpc'],
  etherscanApiServers: ['https://api.snowtrace.io'],
  blockcypherApiServers: [],
  blockbookServers: [],
  uriNetworks: ['avalanche'],
  ercTokenStandard: 'ERC20',
  chainParams: {
    chainId: 43114,
    name: 'AVAX Mainnet'
  },
  hdPathCoinType: 9000,
  checkUnconfirmedTransactions: false,
  iosAllowedTokens: {},
  blockchairApiServers: [],
  alethioApiServers: [],
  alethioCurrencies: null, // object or null
  amberdataRpcServers: [],
  amberdataApiServers: [],
  amberDataBlockchainId: '',
  pluginMnemonicKeyName: 'avalancheMnemonic',
  pluginRegularKeyName: 'avalancheKey',
  ethGasStationUrl: null,
  defaultNetworkFees
}

const defaultSettings: any = {
  customFeeSettings: ['gasLimit', 'gasPrice'],
  otherSettings
}

export const currencyInfo: EdgeCurrencyInfo = {
  // Basic currency information:
  currencyCode: 'AVAX',
  displayName: 'Avalanche',
  pluginId: 'avalanche', // matching mnemonic here
  walletType: 'wallet:avalanche',

  defaultSettings,

  addressExplorer: 'https://snowtrace.io/address/%s',
  transactionExplorer: 'https://snowtrace.io/tx/%s',

  denominations: [
    // An array of Objects of the possible denominations for this currency
    {
      name: 'AVAX',
      multiplier: '1000000000000000000',
      symbol: 'AVAX'
    }
  ],
  metaTokens: []
}

export const makeAvalanchePlugin = (opts: EdgeCorePluginOptions) => {
  return makeEthereumBasedPluginInner(opts, currencyInfo)
}
