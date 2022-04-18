/* global */
// @flow

import type {
  EdgeCorePluginOptions,
  EdgeCurrencyInfo
} from 'edge-core-js/types'

import { makeEthereumBasedPluginInner } from '../ethPlugin'
import type { EthereumFees, EthereumSettings } from '../ethTypes.js'

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
    'https://polished-empty-cloud.fantom.quiknode.pro',
    'https://rpc.ftm.tools'
  ],
  evmScanApiServers: ['https://api.ftmscan.com'],
  blockcypherApiServers: [],
  blockbookServers: [],
  uriNetworks: ['fantom'],
  ercTokenStandard: 'ERC20',
  chainParams: {
    chainId: 250,
    name: 'Fantom Opera'
  },
  hdPathCoinType: 60,
  supportsEIP1559: true,
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

  canReplaceByFee: true,
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
      contractAddress: '0x049d68029688eabf473097a2fc38ef61633a3c7a'
    },
    {
      currencyCode: 'FBTC',
      currencyName: 'Frapped Bitcoin',
      denominations: [
        {
          name: 'FBTC',
          multiplier: '1000000000000000000'
        }
      ],
      contractAddress: '0xe1146b9ac456fcbb60644c36fd3f868a9072fc6e'
    },
    {
      currencyCode: 'USDC',
      currencyName: 'USD Coin',
      denominations: [
        {
          name: 'USDC',
          multiplier: '1000000'
        }
      ],
      contractAddress: '0x04068da6c83afcfa0e13ba15a6696662335d5b75'
    },
    {
      currencyCode: 'FETH',
      currencyName: 'Frapped Ethereum',
      denominations: [
        {
          name: 'FETH',
          multiplier: '1000000000000000000'
        }
      ],
      contractAddress: '0x658b0c7613e890ee50b8c4bc6a3f41ef411208ad'
    },
    {
      currencyCode: 'WFTM',
      currencyName: 'Wrapped Fantom',
      denominations: [
        {
          name: 'WFTM',
          multiplier: '1000000000000000000'
        }
      ],
      contractAddress: '0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83'
    },
    {
      currencyCode: 'BOO',
      currencyName: 'SpookyToken',
      denominations: [
        {
          name: 'BOO',
          multiplier: '1000000000000000000'
        }
      ],
      contractAddress: '0x841fad6eae12c286d1fd18d1d525dffa75c7effe'
    },
    {
      currencyCode: 'xBOO',
      currencyName: 'Boo MirrorWorld',
      denominations: [
        {
          name: 'xBOO',
          multiplier: '1000000000000000000'
        }
      ],
      contractAddress: '0xa48d959AE2E88f1dAA7D5F611E01908106dE7598'
    },
    {
      currencyCode: 'MAI',
      currencyName: 'miMATIC',
      denominations: [
        {
          name: 'MAI',
          multiplier: '1000000000000000000'
        }
      ],
      contractAddress: '0xfB98B335551a418cD0737375a2ea0ded62Ea213b'
    },
    {
      currencyCode: 'TOMB',
      currencyName: 'Tomb',
      denominations: [
        {
          name: 'TOMB',
          multiplier: '1000000000000000000'
        }
      ],
      contractAddress: '0x6c021Ae822BEa943b2E66552bDe1D2696a53fbB7'
    },
    {
      currencyCode: 'TBOND',
      currencyName: 'Tomb Bonds',
      denominations: [
        {
          name: 'TBOND',
          multiplier: '1000000000000000000'
        }
      ],
      contractAddress: '0x24248CD1747348bDC971a5395f4b3cd7feE94ea0'
    },
    {
      currencyCode: 'TSHARE',
      currencyName: 'Tomb Shares',
      denominations: [
        {
          name: 'TSHARE',
          multiplier: '1000000000000000000'
        }
      ],
      contractAddress: '0x4cdf39285d7ca8eb3f090fda0c069ba5f4145b37'
    }
  ]
}

export const makeFantomPlugin = (opts: EdgeCorePluginOptions) => {
  return makeEthereumBasedPluginInner(opts, currencyInfo)
}
