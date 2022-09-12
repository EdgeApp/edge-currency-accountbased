/* global */


import {
  EdgeCorePluginOptions,
  EdgeCurrencyInfo
} from 'edge-core-js/types'

import { makeEthereumBasedPluginInner } from '../ethPlugin'
import { EthereumFees, EthereumSettings } from '../ethTypes'

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
    baseFeeMultiplier: undefined,
    gasLimit: {
      regularTransaction: '21002',
      tokenTransaction: '37124'
    },
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
    baseFeeMultiplier: undefined,
    gasLimit: {
      regularTransaction: '21002',
      tokenTransaction: '37124'
    },
    gasPrice: undefined,
    minPriorityFee: undefined
  }
}

const otherSettings: EthereumSettings = {
  rpcServers: ['http://localhost:8545'],

  evmScanApiServers: [],
  blockcypherApiServers: [],
  blockbookServers: [],
  uriNetworks: ['ethereum', 'ether'],
  ercTokenStandard: 'ERC20',
  chainParams: {
    chainId: 42,
    name: 'ethereum'
  },
  supportsEIP1559: true,
  hdPathCoinType: 60,
  checkUnconfirmedTransactions: true,
  iosAllowedTokens: {
    REP: true,
    WINGS: true,
    HUR: true,
    IND: true,
    USDT: true
  },
  blockchairApiServers: [],
  alethioApiServers: [],
  alethioCurrencies: {
    // object or null
    native: 'ether',
    token: 'token'
  },
  amberdataRpcServers: [],
  amberdataApiServers: [],
  amberDataBlockchainId: '',
  pluginMnemonicKeyName: 'ethDevMnemonic',
  pluginRegularKeyName: 'ethDevKey',
  ethGasStationUrl: 'https://www.ethgasstation.info/json/ethgasAPI.json',
  defaultNetworkFees
}

const defaultSettings: any = {
  customFeeSettings: ['gasLimit', 'gasPrice'],
  otherSettings
}

export const currencyInfo: EdgeCurrencyInfo = {
  // Basic currency information:
  currencyCode: 'ETH',
  displayName: 'Dev Ethereum',
  pluginId: 'ethDev',
  walletType: 'wallet:ethDev',
  memoType: 'hex',

  canReplaceByFee: true,
  defaultSettings,

  addressExplorer: 'https://etherscan.io/address/%s',
  transactionExplorer: 'https://etherscan.io/tx/%s',

  denominations: [
    // An array of Objects of the possible denominations for this currency
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
  metaTokens: [
    {
      currencyCode: 'DAI',
      currencyName: 'Dai Stablecoin',
      denominations: [
        {
          name: 'DAI',
          multiplier: '1000000000000000000'
        }
      ],
      contractAddress: '0xff795577d9ac8bd7d90ee22b6c1703490b6512fd'
    },
    {
      currencyCode: 'WETH',
      currencyName: 'Wrapped ETH',
      denominations: [
        {
          name: 'WETH',
          multiplier: '1000000000000000000'
        }
      ],
      contractAddress: '0xd0a1e359811322d97991e03f863a0c30c2cf029c'
    },
    {
      currencyCode: 'WBTC',
      currencyName: 'Wrapped Bitcoin',
      denominations: [
        {
          name: 'WBTC',
          multiplier: '100000000'
        }
      ],
      contractAddress: '0xD1B98B6607330172f1D991521145A22BCe793277'
    }
  ]
}

export const makeEthDevPlugin = (opts: EdgeCorePluginOptions) => {
  return makeEthereumBasedPluginInner(opts, currencyInfo)
}
