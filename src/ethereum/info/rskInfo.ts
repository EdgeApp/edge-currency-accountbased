import { EdgeCurrencyInfo, EdgeTokenMap } from 'edge-core-js/types'

import { makeOuterPlugin } from '../../common/innerPlugin'
import { makeMetaTokens } from '../../common/tokenHelpers'
import type { EthereumTools } from '../EthereumTools'
import type { EthereumFees, EthereumNetworkInfo } from '../ethereumTypes'
import { evmMemoOptions } from './ethereumCommonInfo'

const builtinTokens: EdgeTokenMap = {
  '2acc95758f8b5f583470ba265eb685a8f45fc9d5': {
    currencyCode: 'RIF',
    displayName: 'RIF Token',
    denominations: [{ name: 'RIF', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x2acc95758f8b5f583470ba265eb685a8f45fc9d5'
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
      lowFee: '59240000',
      standardFeeLow: '59240000', // TODO: check this values
      standardFeeHigh: '59240000',
      standardFeeLowAmount: '59240000',
      standardFeeHighAmount: '59240000',
      highFee: '59240000',
      minGasPrice: '59240000'
    },
    minPriorityFee: undefined
  }
}

const networkInfo: EthereumNetworkInfo = {
  rpcServers: ['https://public-node.rsk.co'],
  evmScanApiServers: ['https://blockscout.com/rsk/mainnet'],
  blockcypherApiServers: [],
  blockbookServers: [],
  blockchairApiServers: [],
  alethioApiServers: [],
  alethioCurrencies: null,
  amberdataRpcServers: [],
  amberdataApiServers: [],
  amberDataBlockchainId: '', // Only used for ETH right now
  uriNetworks: ['rsk', 'rbtc'],
  ercTokenStandard: 'RRC20',
  chainParams: {
    chainId: 30,
    name: 'Rootstock Mainnet'
  },
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
  otherSettings: { ...networkInfo }
}

export const currencyInfo: EdgeCurrencyInfo = {
  canReplaceByFee: true,
  currencyCode: 'RBTC',
  displayName: 'Rootstock',
  memoOptions: evmMemoOptions,
  pluginId: 'rsk',
  walletType: 'wallet:rsk',

  // Explorers:
  addressExplorer: 'https://explorer.rsk.co/address/%s',
  transactionExplorer: 'https://explorer.rsk.co/tx/%s',

  denominations: [
    {
      name: 'RBTC',
      multiplier: '1000000000000000000',
      symbol: 'RBTC'
    }
  ],

  // Deprecated:
  defaultSettings,
  memoType: 'hex',
  metaTokens: makeMetaTokens(builtinTokens)
}

export const rsk = makeOuterPlugin<EthereumNetworkInfo, EthereumTools>({
  builtinTokens,
  currencyInfo,
  networkInfo,

  async getInnerPlugin() {
    return await import('../EthereumTools')
  }
})
