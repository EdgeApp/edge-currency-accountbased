import { EdgeCurrencyInfo, EdgeTokenMap } from 'edge-core-js/types'

import { makeOuterPlugin } from '../../common/innerPlugin'
import { makeMetaTokens } from '../../common/tokenHelpers'
import type { EthereumTools } from '../EthereumTools'
import type { EthereumFees, EthereumNetworkInfo } from '../ethereumTypes'

const builtinTokens: EdgeTokenMap = {
  e9e7cea3dedca5984780bafc599bd69add087d56: {
    currencyCode: 'BUSD',
    displayName: 'Binance USD',
    denominations: [{ name: 'BUSD', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56'
    }
  },
  '8ac76a51cc950d9822d68b83fe1ad97b32cd580d': {
    currencyCode: 'USDC',
    displayName: 'USD Coin',
    denominations: [{ name: 'USDC', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d'
    }
  }
}

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

const networkInfo: EthereumNetworkInfo = {
  rpcServers: [
    'https://rpc.ankr.com/bsc',
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
  otherSettings: { ...networkInfo }
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
  metaTokens: makeMetaTokens(builtinTokens) // Deprecated
}

export const binancesmartchain = makeOuterPlugin<
  EthereumNetworkInfo,
  EthereumTools
>({
  builtinTokens,
  currencyInfo,
  networkInfo,

  async getInnerPlugin() {
    return await import('../EthereumTools')
  }
})
