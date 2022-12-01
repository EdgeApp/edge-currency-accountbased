import { EdgeCurrencyInfo } from 'edge-core-js/types'

import { makeOuterPlugin } from '../../common/innerPlugin'
import type { EthereumTools } from '../ethPlugin'
import { EthereumFees, EthereumSettings } from '../ethTypes'

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
      standardFeeLow: '40000000001',
      standardFeeHigh: '300000000001',
      standardFeeLowAmount: '100000000000000000',
      standardFeeHighAmount: '10000000000000000000',
      highFee: '40000000001',
      minGasPrice: '1000000000'
    },
    minPriorityFee: undefined
  }
}

const otherSettings: EthereumSettings = {
  rpcServers: [
    'https://bsc-dataseed.binance.org',
    'https://bsc-dataseed1.defibit.io',
    'https://bsc-dataseed1.ninicoin.io'
  ],
  evmScanApiServers: ['https://api.bscscan.com'],
  blockcypherApiServers: [],
  blockbookServers: [],
  uriNetworks: ['smartchain'],
  ercTokenStandard: 'ERC20',
  chainParams: {
    chainId: 56,
    name: 'Binance Smart Chain'
  },
  hdPathCoinType: 60,
  checkUnconfirmedTransactions: false,
  iosAllowedTokens: {},
  blockchairApiServers: [],
  alethioApiServers: [],
  alethioCurrencies: null, // object or null
  amberdataRpcServers: [],
  amberdataApiServers: [],
  amberDataBlockchainId: '', // ETH mainnet
  pluginMnemonicKeyName: 'binancesmartchainMnemonic',
  pluginRegularKeyName: 'binancesmartchainKey',
  ethGasStationUrl: null,
  defaultNetworkFees
}

const defaultSettings: any = {
  customFeeSettings: ['gasLimit', 'gasPrice'],
  otherSettings
}

export const currencyInfo: EdgeCurrencyInfo = {
  // Basic currency information:
  currencyCode: 'BNB',
  displayName: 'BNB Smart Chain',
  pluginId: 'binancesmartchain',
  walletType: 'wallet:binancesmartchain',
  memoType: 'hex',

  canReplaceByFee: true,
  defaultSettings,

  addressExplorer: 'https://bscscan.com/address/%s',
  transactionExplorer: 'https://bscscan.com/tx/%s',

  denominations: [
    // An array of Objects of the possible denominations for this currency
    {
      name: 'BNB',
      multiplier: '1000000000000000000',
      symbol: 'BNB'
    }
  ],
  metaTokens: [
    // Array of objects describing the supported metatokens
  ]
}

export const binancesmartchain = makeOuterPlugin<{}, EthereumTools>({
  currencyInfo,
  networkInfo: {},

  async getInnerPlugin() {
    return await import('../ethPlugin')
  }
})
