/* global */
// @flow

import type {
  EdgeCorePluginOptions,
  EdgeCurrencyInfo
} from 'edge-core-js/types'

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
      lowFee: '59240000',
      standardFeeLow: '59240000', // TODO: check this values
      standardFeeHigh: '59240000',
      standardFeeLowAmount: '59240000',
      standardFeeHighAmount: '59240000',
      highFee: '59240000',
      minGasPrice: '59240000'
    }
  }
}

const otherSettings: EthereumSettings = {
  rpcServers: ['https://public-node.rsk.co'],
  etherscanApiServers: ['https://blockscout.com/rsk/mainnet'],
  blockcypherApiServers: [],
  blockbookServers: [],
  blockchairApiServers: [],
  alethioApiServers: [],
  alethioCurrrencies: null,
  amberdataRpcServers: [],
  amberdataApiServers: [],
  amberDataBlockchainId: '', // Only used for ETH right now
  uriNetworks: ['rsk', 'rbtc'],
  ercTokenStandard: 'RRC20',
  chainId: 30,
  checkUnconfirmedTransactions: false,
  iosAllowedTokens: { RIF: true },
  hdPathCoinType: 137,
  pluginMnemonicKeyName: 'rskMnemonic',
  pluginRegularKeyName: 'rskKey',
  ethGasStationUrl: null,
  defaultNetworkFees
}

const defaultSettings: any = {
  customFeeSettings: ['gasLimit', 'gasPrice'],
  otherSettings
}

export const currencyInfo: EdgeCurrencyInfo = {
  // Basic currency information:
  currencyCode: 'RBTC',
  displayName: 'RSK',
  pluginId: 'rsk',
  walletType: 'wallet:rsk',

  defaultSettings,

  addressExplorer: 'https://explorer.rsk.co/address/%s',
  transactionExplorer: 'https://explorer.rsk.co/tx/%s',

  denominations: [
    // An array of Objects of the possible denominations for this currency
    {
      name: 'RBTC',
      multiplier: '1000000000000000000',
      symbol: 'RBTC'
    }
  ],
  metaTokens: [
    // Array of objects describing the supported metatokens
    {
      currencyCode: 'RIF',
      currencyName: 'RIF Token',
      denominations: [
        {
          name: 'RIF',
          multiplier: '1000000000000000000'
        }
      ],
      contractAddress: '0x2acc95758f8b5f583470ba265eb685a8f45fc9d5'
    }
  ]
}
export const makeRskPlugin = (opts: EdgeCorePluginOptions) => {
  return makeEthereumBasedPluginInner(opts, currencyInfo)
}
