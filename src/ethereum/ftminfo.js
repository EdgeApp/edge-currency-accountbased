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
  }
}

const otherSettings: EthereumSettings = {
  rpcServers: ['https://rpcapi.fantom.network'],
  etherscanApiServers: ['https://api.ftmscan.com/'],
  blockcypherApiServers: [],
  blockbookServers: [],
  uriNetworks: ['fantom'],
  ercTokenStandard: 'ERC20',
  chainId: 250,
  hdPathCoinType: 60,
  checkUnconfirmedTransactions: false,
  iosAllowedTokens: {},
  blockchairApiServers: [],
  alethioApiServers: [],
  alethioCurrencies: null, // object or null
  amberdataRpcServers: [],
  amberdataApiServers: [],
  amberDataBlockchainId: '', // ETH mainnet
  pluginMnemonicKeyName: 'fantomMnemonic',
  pluginRegularKeyName: 'fantomKey',
  ethGasStationUrl: null,
  defaultNetworkFees
}

const defaultSettings: any = {
  customFeeSettings: ['gasLimit', 'gasPrice'],
  otherSettings
}

export const currencyInfo: EdgeCurrencyInfo = {
  // Basic currency information:
  currencyCode: 'FTM',
  displayName: 'Fantom',
  pluginId: 'fantom',
  walletType: 'wallet:fantom',

  defaultSettings,

  addressExplorer: 'https://ftmscan.com/address/%s',
  transactionExplorer: 'https://ftmscan.com/tx/%s',

  denominations: [
    // An array of Objects of the possible denominations for this currency
    {
      name: 'FTM',
      multiplier: '1000000000000000000',
      symbol: 'F'
    }
  ],
  symbolImage: `${imageServerUrl}/fantom-logo-solo-64.png`,
  symbolImageDarkMono: `${imageServerUrl}/fantom-logo-solo-64.png`,
  metaTokens: [
    // Array of objects describing the supported metatokens
    {
      currencyCode: 'FUSDT',
      currencyName: 'Frapped Tether',
      denominations: [
        {
          name: 'FUSDT',
          multiplier: '1000000'
        }
      ],
      contractAddress: '0x049d68029688eabf473097a2fc38ef61633a3c7a',
      symbolImage: `${imageServerUrl}/fusdt-logo-solo-64.png`
    }
  ]
}

export const makeFantomPlugin = (opts: EdgeCorePluginOptions) => {
  return makeEthereumBasedPluginInner(opts, currencyInfo)
}
