import { EdgeCurrencyInfo, EdgeTokenMap } from 'edge-core-js/types'

import { makeOuterPlugin } from '../../common/innerPlugin'
import { makeMetaTokens } from '../../common/tokenHelpers'
import type { EthereumTools } from '../ethPlugin'
import type { EthereumFees, EthereumNetworkInfo } from '../ethTypes'

const builtinTokens: EdgeTokenMap = {
  '2ad7868ca212135c6119fd7ad1ce51cfc5702892': {
    currencyCode: 'USDT',
    displayName: 'Tether',
    denominations: [{ name: 'USDT', multiplier: '1000000' }],
    networkLocation: {
      contractAddress: '0x2ad7868ca212135c6119fd7ad1ce51cfc5702892'
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
  rpcServers: ['https://mainnet.ethereumpow.org'],

  evmScanApiServers: [
    // TODO:
  ],
  blockcypherApiServers: [],
  blockbookServers: [],
  uriNetworks: ['ethereumpow'],
  ercTokenStandard: 'ERC20',
  chainParams: {
    chainId: 10001,
    name: 'ETHW-mainnet'
  },
  supportsEIP1559: true,
  hdPathCoinType: 60,
  checkUnconfirmedTransactions: false,
  iosAllowedTokens: {},
  blockchairApiServers: [],
  alethioApiServers: [],
  alethioCurrencies: null,
  amberdataRpcServers: [],
  amberdataApiServers: [],
  amberDataBlockchainId: '',
  pluginMnemonicKeyName: 'ethereumpowMnemonic',
  pluginRegularKeyName: 'ethereumpowKey',
  ethGasStationUrl: null,
  defaultNetworkFees
}

const defaultSettings: any = {
  customFeeSettings: ['gasLimit', 'gasPrice'],
  otherSettings: { ...networkInfo }
}

export const currencyInfo: EdgeCurrencyInfo = {
  // Basic currency information:
  currencyCode: 'ETHW',
  displayName: 'EthereumPoW',
  pluginId: 'ethereumpow',
  walletType: 'wallet:ethereumpow',
  memoType: 'hex',

  canReplaceByFee: true,
  defaultSettings,

  addressExplorer: 'https://www.oklink.com/en/ethw/address/%s',
  transactionExplorer: 'https://www.oklink.com/en/ethw/tx/%s',

  denominations: [
    // An array of Objects of the possible denominations for this currency
    {
      name: 'ETHW',
      multiplier: '1000000000000000000',
      symbol: 'Ξ'
    },
    {
      name: 'mETHW',
      multiplier: '1000000000000000',
      symbol: 'mΞ'
    }
  ],
  metaTokens: makeMetaTokens(builtinTokens) // Deprecated
}

export const ethereumpow = makeOuterPlugin<EthereumNetworkInfo, EthereumTools>({
  builtinTokens,
  currencyInfo,
  networkInfo,

  async getInnerPlugin() {
    return await import('../ethPlugin')
  }
})
