/* global */

import { EdgeCorePluginOptions, EdgeCurrencyInfo } from 'edge-core-js/types'

import { makeEthereumBasedPluginInner } from '../ethPlugin'
import { EthereumFees, EthereumSettings } from '../ethTypes'

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
  rpcServers: ['https://forno.celo.org'],
  evmScanApiServers: ['https://explorer.celo.org/api'],
  blockcypherApiServers: [],
  blockbookServers: [],
  uriNetworks: ['celo'],
  ercTokenStandard: 'ERC20',
  chainParams: {
    chainId: 42220,
    name: 'Celo Mainnet'
  },
  hdPathCoinType: 52752,
  checkUnconfirmedTransactions: false,
  iosAllowedTokens: {},
  blockchairApiServers: [],
  alethioApiServers: [],
  alethioCurrencies: null, // object or null
  amberdataRpcServers: [],
  amberdataApiServers: [],
  amberDataBlockchainId: '',
  pluginMnemonicKeyName: 'celoMnemonic',
  pluginRegularKeyName: 'celoKey',
  ethGasStationUrl: null,
  defaultNetworkFees
}

const defaultSettings: any = {
  customFeeSettings: ['gasLimit', 'gasPrice'],
  otherSettings
}

export const currencyInfo: EdgeCurrencyInfo = {
  // Basic currency information:
  currencyCode: 'CELO',
  displayName: 'Celo',
  pluginId: 'celo',
  walletType: 'wallet:celo',
  memoType: 'hex',

  canReplaceByFee: true,
  defaultSettings,

  addressExplorer: 'https://explorer.celo.org/address/%s',
  transactionExplorer: 'https://explorer.celo.org/tx/%s',

  denominations: [
    // An array of Objects of the possible denominations for this currency
    {
      name: 'CELO',
      multiplier: '1000000000000000000',
      symbol: 'CELO'
    }
  ],
  metaTokens: [
    {
      currencyCode: 'CUSD',
      currencyName: 'Celo Dollar',
      denominations: [
        {
          name: 'CUSD',
          multiplier: '1000000000000000000'
        }
      ],
      contractAddress: '0x765DE816845861e75A25fCA122bb6898B8B1282a'
    },
    {
      currencyCode: 'CEUR',
      currencyName: 'Celo Euro',
      denominations: [
        {
          name: 'CEUR',
          multiplier: '1000000000000000000'
        }
      ],
      contractAddress: '0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73'
    }
  ]
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const makeCeloPlugin = (opts: EdgeCorePluginOptions) => {
  return makeEthereumBasedPluginInner(opts, currencyInfo)
}
