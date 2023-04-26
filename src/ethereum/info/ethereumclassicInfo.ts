import { EdgeCurrencyInfo, EdgeTokenMap } from 'edge-core-js/types'

import { makeOuterPlugin } from '../../common/innerPlugin'
import { makeMetaTokens } from '../../common/tokenHelpers'
import type { EthereumTools } from '../EthereumTools'
import type { EthereumFees, EthereumNetworkInfo } from '../ethereumTypes'

const builtinTokens: EdgeTokenMap = {
  '2c78f1b70ccf63cdee49f9233e9faa99d43aa07e': {
    currencyCode: 'DAI',
    displayName: 'Dai Stablecoin',
    denominations: [{ name: 'DAI', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x2c78f1b70ccf63cdee49f9233e9faa99d43aa07e'
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
  },
  '1983987abc9837fbabc0982347ad828': {
    baseFeeMultiplier: undefined,
    // @ts-expect-error
    gasLimit: {
      regularTransaction: '21002',
      tokenTransaction: '37124'
    },
    // @ts-expect-error
    gasPrice: {
      lowFee: '1000000002',
      standardFeeLow: '40000000002',
      standardFeeHigh: '300000000002',
      standardFeeLowAmount: '200000000000000000',
      standardFeeHighAmount: '20000000000000000000',
      highFee: '40000000002'
    },
    minPriorityFee: undefined
  },
  '2983987abc9837fbabc0982347ad828': {
    baseFeeMultiplier: undefined,
    // @ts-expect-error
    gasLimit: {
      regularTransaction: '21002',
      tokenTransaction: '37124'
    },
    gasPrice: undefined,
    minPriorityFee: undefined
  }
}

const networkInfo: EthereumNetworkInfo = {
  rpcServers: ['https://www.ethercluster.com/etc'],
  evmScanApiServers: ['https://blockscout.com/etc/mainnet'],
  blockcypherApiServers: [],
  blockbookServers: ['https://etcbook.guarda.co', 'https://etc1.trezor.io'],
  uriNetworks: ['ethereumclassic', 'etherclass'],
  ercTokenStandard: 'ERC20',
  chainParams: {
    chainId: 61,
    name: 'Ethereum Classic'
  },
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
  otherSettings: { ...networkInfo }
}

export const currencyInfo: EdgeCurrencyInfo = {
  // Basic currency information:
  currencyCode: 'ETC',
  displayName: 'Ethereum Classic',
  pluginId: 'ethereumclassic',
  walletType: 'wallet:ethereumclassic',
  memoType: 'hex',

  canReplaceByFee: true,
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
  metaTokens: makeMetaTokens(builtinTokens) // Deprecated
}

export const ethereumclassic = makeOuterPlugin<
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
