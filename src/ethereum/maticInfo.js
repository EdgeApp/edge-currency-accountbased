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
    baseFeeMultiplier: undefined,
    gasLimit: {
      regularTransaction: '21000',
      tokenTransaction: '200000',
      minGasLimit: '21000'
    },
    gasPrice: {
      lowFee: '1000000001',
      standardFeeLow: '36000000000',
      standardFeeHigh: '216000000000',
      standardFeeLowAmount: '100000000000000000',
      standardFeeHighAmount: '10000000000000000000',
      highFee: '36000000000',
      minGasPrice: '3000000000'
    },
    minPriorityFee: undefined
  }
}

const otherSettings: EthereumSettings = {
  rpcServers: ['https://rpc-mainnet.maticvigil.com'],
  etherscanApiServers: ['https://api.polygonscan.com'],
  blockcypherApiServers: [],
  blockbookServers: [],
  uriNetworks: ['polygon'],
  ercTokenStandard: 'ERC20',
  chainParams: {
    chainId: 137,
    name: 'MATIC Mainnet'
  },
  hdPathCoinType: 60,
  checkUnconfirmedTransactions: false,
  iosAllowedTokens: {},
  blockchairApiServers: [],
  alethioApiServers: [],
  alethioCurrencies: null, // object or null
  amberdataRpcServers: [],
  amberdataApiServers: [],
  amberDataBlockchainId: '',
  pluginMnemonicKeyName: 'polygonMnemonic',
  pluginRegularKeyName: 'polygonKey',
  ethGasStationUrl: 'https://gasstation-mainnet.matic.network/',
  defaultNetworkFees
}

const defaultSettings: any = {
  customFeeSettings: ['gasLimit', 'gasPrice'],
  otherSettings
}

export const currencyInfo: EdgeCurrencyInfo = {
  // Basic currency information:
  currencyCode: 'MATIC',
  displayName: 'Polygon',
  pluginId: 'polygon', // matching mnemonic here
  walletType: 'wallet:polygon',

  defaultSettings,

  addressExplorer: 'https://polygonscan.com/address/%s',
  transactionExplorer: 'https://polygonscan.com/tx/%s',

  denominations: [
    // An array of Objects of the possible denominations for this currency
    {
      name: 'MATIC',
      multiplier: '1000000000000000000',
      symbol: 'MATIC'
    },
    {
      name: 'mMATIC',
      multiplier: '1000000000000000',
      symbol: 'mMATIC'
    }
  ],
  metaTokens: []
}

export const makePolygonPlugin = (opts: EdgeCorePluginOptions) => {
  return makeEthereumBasedPluginInner(opts, currencyInfo)
}
