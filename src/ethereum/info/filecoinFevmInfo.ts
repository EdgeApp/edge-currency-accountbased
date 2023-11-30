import { EdgeCurrencyInfo, EdgeTokenMap } from 'edge-core-js/types'

import { makeOuterPlugin } from '../../common/innerPlugin'
import { makeMetaTokens } from '../../common/tokenHelpers'
import { EthereumTools } from '../EthereumTools'
import { EthereumFees, EthereumNetworkInfo } from '../ethereumTypes'
import { evmMemoOptions } from './ethereumCommonInfo'

const builtinTokens: EdgeTokenMap = {
  '690908f7fa93afc040cfbd9fe1ddd2c2668aa0e0': {
    currencyCode: 'iFIL',
    displayName: 'iFIL Inifinity Pool',
    denominations: [{ name: 'iFIL', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x690908f7fa93afC040CFbD9fE1dDd2C2668Aa0e0'
    }
  },
  '60e1773636cf5e4a227d9ac24f20feca034ee25a': {
    currencyCode: 'WFIL',
    displayName: 'Wrapped FIL',
    denominations: [{ name: 'wFIL', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x60E1773636CF5E4A227d9AC24F20fEca034ee25A'
    }
  }
}

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
  memoOptions: evmMemoOptions,
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
  metaTokens: makeMetaTokens(builtinTokens)
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
