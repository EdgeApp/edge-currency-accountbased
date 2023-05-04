import { EdgeCurrencyInfo, EdgeTokenMap } from 'edge-core-js/types'

import { makeOuterPlugin } from '../../common/innerPlugin'
import { makeMetaTokens } from '../../common/tokenHelpers'
import type { EthereumTools } from '../ethPlugin'
import type { EthereumFees, EthereumNetworkInfo } from '../ethTypes'

const builtinTokens: EdgeTokenMap = {
  '3355df6d4c9c3035724fd0e3914de96a5a83aaf4': {
    currencyCode: 'USDC',
    displayName: 'USD Coin',
    denominations: [{ name: 'USDC', multiplier: '1000000' }],
    networkLocation: {
      contractAddress: '0x3355df6D4c9C3035724Fd0e3914dE96A5a83aaf4'
    }
  }
}

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
      regularTransaction: '461552',
      tokenTransaction: '461552',
      minGasLimit: '461552'
    },
    gasPrice: {
      lowFee: '1000000001',
      standardFeeLow: '40000000001',
      standardFeeHigh: '300000000001',
      standardFeeLowAmount: '100000000000000000',
      standardFeeHighAmount: '10000000000000000000',
      highFee: '40000000001',
      minGasPrice: '10000000'
    },
    minPriorityFee: '2000000000'
  }
}

const networkInfo: EthereumNetworkInfo = {
  rpcServers: ['https://mainnet.era.zksync.io'],
  evmScanApiServers: [],
  blockcypherApiServers: [],
  blockbookServers: [],
  uriNetworks: ['zksync'],
  ercTokenStandard: 'ERC20',
  chainParams: {
    chainId: 324,
    name: 'zkSync'
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
  pluginMnemonicKeyName: 'zksyncMnemonic',
  pluginRegularKeyName: 'zksyncKey',
  ethGasStationUrl: null,
  defaultNetworkFees
}

const defaultSettings: any = {
  customFeeSettings: ['gasLimit', 'gasPrice'],
  otherSettings: {
    chainParams: networkInfo.chainParams,
    ercTokenStandard: networkInfo.ercTokenStandard
  }
}

export const currencyInfo: EdgeCurrencyInfo = {
  // Basic currency information:
  currencyCode: 'ETH',
  displayName: 'zkSync',
  pluginId: 'zksync',
  walletType: 'wallet:zksync',
  memoType: 'hex',

  canReplaceByFee: true,
  defaultSettings,

  addressExplorer: 'https://explorer.zksync.io/address/%s',
  transactionExplorer: 'https://explorer.zksync.io/tx/%s',

  denominations: [
    // An array of Objects of the possible denominations for this currency
    {
      name: 'ETH',
      multiplier: '1000000000000000000',
      symbol: 'Ξ'
    }
  ],
  metaTokens: makeMetaTokens(builtinTokens) // Deprecated
}

export const zksync = makeOuterPlugin<EthereumNetworkInfo, EthereumTools>({
  builtinTokens,
  currencyInfo,
  networkInfo,

  async getInnerPlugin() {
    return await import('../ethPlugin')
  }
})
