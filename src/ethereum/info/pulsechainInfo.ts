import { EdgeCurrencyInfo, EdgeTokenMap } from 'edge-core-js/types'

import { makeOuterPlugin } from '../../common/innerPlugin'
import { makeMetaTokens } from '../../common/tokenHelpers'
import type { EthereumTools } from '../EthereumTools'
import type { EthereumFees, EthereumNetworkInfo } from '../ethereumTypes'

const builtinTokens: EdgeTokenMap = {
  a1077a294dde1b09bb078844df40758a5d0f9a27: {
    currencyCode: 'WPLS',
    displayName: 'Wrapped Pulse',
    denominations: [{ name: 'WPLS', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0xA1077a294dDE1B09bB078844df40758a5D0f9a27'
    }
  }
}

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
  }
}

const networkInfo: EthereumNetworkInfo = {
  rpcServers: ['https://rpc.pulsechain.com/'],
  evmScanApiServers: ['cors-https://scan.pulsechain.com'],
  blockcypherApiServers: [],
  blockbookServers: [],
  uriNetworks: ['pulsechain'],
  ercTokenStandard: 'ERC20',
  chainParams: {
    chainId: 369,
    name: 'PulseChain'
  },
  supportsEIP1559: true,
  hdPathCoinType: 60,
  checkUnconfirmedTransactions: false,
  iosAllowedTokens: {},
  blockchairApiServers: [],
  alethioApiServers: [],
  alethioCurrencies: null, // object or null
  amberdataRpcServers: [],
  amberdataApiServers: [],
  amberDataBlockchainId: '',
  pluginMnemonicKeyName: 'pulsechainMnemonic',
  pluginRegularKeyName: 'pulsechainKey',
  ethGasStationUrl: null,
  defaultNetworkFees
}

const defaultSettings: any = {
  customFeeSettings: ['gasLimit', 'gasPrice'],
  otherSettings: { ...networkInfo }
}

export const currencyInfo: EdgeCurrencyInfo = {
  // Basic currency information:
  currencyCode: 'PLS',
  displayName: 'PulseChain',
  pluginId: 'pulsechain',
  walletType: 'wallet:pulsechain',
  memoType: 'hex',

  canReplaceByFee: true,
  defaultSettings,

  addressExplorer: 'https://scan.pulsechain.com/address/%s',
  transactionExplorer: 'https://scan.pulsechain.com/tx/%s',

  denominations: [
    // An array of Objects of the possible denominations for this currency
    {
      name: 'PLS',
      multiplier: '1000000000000000000',
      symbol: 'PLS'
    },
    {
      name: 'mPLS',
      multiplier: '1000000000000000',
      symbol: 'mPLS'
    }
  ],
  metaTokens: makeMetaTokens(builtinTokens) // Deprecated
}

export const pulsechain = makeOuterPlugin<EthereumNetworkInfo, EthereumTools>({
  builtinTokens,
  currencyInfo,
  networkInfo,

  async getInnerPlugin() {
    return await import('../EthereumTools')
  }
})
