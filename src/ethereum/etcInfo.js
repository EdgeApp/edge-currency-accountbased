/* global */
// @flow

import type {
  EdgeCorePluginOptions,
  EdgeCurrencyInfo
} from 'edge-core-js/types'

import { imageServerUrl } from '../common/utils'
import { makeEthereumBasedPluginInner } from './ethPlugin'
import type { EthereumSettings } from './ethTypes.js'

const defaultNetworkFees = {
  default: {
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
    }
  },
  '1983987abc9837fbabc0982347ad828': {
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
    }
  },
  '2983987abc9837fbabc0982347ad828': {
    gasLimit: {
      regularTransaction: '21002',
      tokenTransaction: '37124'
    }
  }
}

const otherSettings: EthereumSettings = {
  rpcServers: ['https://www.ethercluster.com/etc'],
  etherscanApiServers: ['https://blockscout.com/etc/mainnet'],
  blockcypherApiServers: [],
  blockbookServers: [],
  uriNetworks: ['ethereumclassic', 'etherclass'],
  ercTokenStandard: 'ERC20',
  chainId: 61,
  hdPathCoinType: 61,
  checkUnconfirmedTransactions: false,
  iosAllowedTokens: {},
  blockchairApiServers: [],
  alethioApiServers: [],
  alethioCurrencies: null, // object or null
  amberdataRpcServers: [],
  amberdataApiServers: [],
  amberDataBlockchainId: '', // ETH mainnet
  pluginMnemonicKeyName: 'ethereumclassicMnemonic',
  pluginRegularKeyName: 'ethereumclassicKey',
  ethGasStationUrl: null,
  defaultNetworkFees
}

const defaultSettings: any = {
  customFeeSettings: ['gasLimit', 'gasPrice'],
  otherSettings
}

export const currencyInfo: EdgeCurrencyInfo = {
  // Basic currency information:
  currencyCode: 'ETC',
  displayName: 'Ethereum Classic',
  pluginId: 'ethereumclassic',
  walletType: 'wallet:ethereumclassic',

  defaultSettings,

  addressExplorer: 'https://blockscout.com/etc/mainnet/address/%s',
  transactionExplorer: 'https://blockscout.com/etc/mainnet/tx/%s',

  denominations: [
    // An array of Objects of the possible denominations for this currency
    {
      name: 'ETC',
      multiplier: '1000000000000000000',
      symbol: 'Ξ'
    },
    {
      name: 'mETC',
      multiplier: '1000000000000000',
      symbol: 'mΞ'
    }
  ],
  symbolImage: `${imageServerUrl}/ethereum-classic-logo-solo-64.png`,
  symbolImageDarkMono: `${imageServerUrl}/ethereum-classic-logo-solo-64.png`,
  metaTokens: [
    // Array of objects describing the supported metatokens
  ]
}

export const makeEthereumClassicPlugin = (opts: EdgeCorePluginOptions) => {
  return makeEthereumBasedPluginInner(opts, currencyInfo)
}
