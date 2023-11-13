import { EdgeCurrencyInfo, EdgeTokenMap } from 'edge-core-js/types'

import { makeOuterPlugin } from '../../common/innerPlugin'
import { EthereumTools } from '../EthereumTools'
import { EthereumFees, EthereumNetworkInfo } from '../ethereumTypes'

const builtinTokens: EdgeTokenMap = {}

const defaultNetworkFees: EthereumFees = {
  default: {
    baseFeeMultiplier: undefined,
    gasLimit: {
      regularTransaction: '7569963',
      tokenTransaction: '7569963',
      minGasLimit: '7569963'
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

export const networkInfo: EthereumNetworkInfo = {
  networkAdapterConfigs: [
    {
      type: 'rpc',
      servers: ['https://api.node.glif.io/']
    },
    {
      type: 'filfox',
      servers: ['https://filfox.info/api/v1']
    }
  ],
  uriNetworks: ['filecoin'],
  ercTokenStandard: 'ERC20',
  chainParams: {
    chainId: 314,
    name: 'Filecoin'
  },
  hdPathCoinType: 461,
  feeUpdateFrequencyMs: 20000,
  supportsEIP1559: true,
  checkUnconfirmedTransactions: false,
  iosAllowedTokens: {},
  alethioCurrencies: null, // object or null
  amberDataBlockchainId: '', // ETH mainnet
  pluginMnemonicKeyName: 'filecoinfevmMnemonic',
  pluginRegularKeyName: 'filecoinfevmKey',
  ethGasStationUrl: null,
  defaultNetworkFees
}

export const currencyInfo: EdgeCurrencyInfo = {
  currencyCode: 'FIL',
  displayName: 'Filecoin FEVM',
  pluginId: 'filecoinfevm',
  requiredConfirmations: 900,
  walletType: 'wallet:filecoinfevm',

  // Explorers:
  addressExplorer: 'https://filfox.info/en/address/%s',
  transactionExplorer: 'https://filfox.info/en/message/%s',

  denominations: [
    {
      name: 'FIL',
      multiplier: '1000000000000000000',
      symbol: '⨎'
    },
    {
      name: 'milliFIL',
      multiplier: '1000000000000000',
      symbol: 'm⨎'
    },
    {
      name: 'microFIL',
      multiplier: '1000000000000',
      symbol: 'µ⨎'
    },
    {
      name: 'nanoFIL',
      multiplier: '1000000000',
      symbol: 'n⨎'
    },
    {
      name: 'picoFIL',
      multiplier: '1000000',
      symbol: 'p⨎'
    },
    {
      name: 'femtoFIL',
      multiplier: '1000',
      symbol: 'f⨎'
    },
    {
      name: 'attoFIL',
      multiplier: '1',
      symbol: 'a⨎'
    }
  ],

  // Deprecated:
  defaultSettings: {},
  metaTokens: []
}

export const filecoinfevm = makeOuterPlugin<EthereumNetworkInfo, EthereumTools>(
  {
    builtinTokens,
    currencyInfo,
    networkInfo,

    async getInnerPlugin() {
      return await import('../EthereumTools')
    }
  }
)
