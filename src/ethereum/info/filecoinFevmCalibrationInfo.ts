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
      servers: ['https://api.calibration.node.glif.io/rpc/v0']
    },
    {
      type: 'filfox',
      servers: ['https://calibration.filfox.info/api/v1']
    }
  ],
  uriNetworks: ['filecoin'],
  ercTokenStandard: 'ERC20',
  chainParams: {
    chainId: 314159,
    name: 'Filecoin'
  },
  hdPathCoinType: 461,
  feeUpdateFrequencyMs: 20000,
  supportsEIP1559: true,
  checkUnconfirmedTransactions: false,
  iosAllowedTokens: {},
  alethioCurrencies: null, // object or null
  amberDataBlockchainId: '', // ETH mainnet
  pluginMnemonicKeyName: 'filecoinfevmcalibrationMnemonic',
  pluginRegularKeyName: 'filecoinfevmcalibrationKey',
  ethGasStationUrl: null,
  defaultNetworkFees
}

export const currencyInfo: EdgeCurrencyInfo = {
  currencyCode: 'tFIL',
  displayName: 'Filecoin FEVM (Calibration Testnet)',
  pluginId: 'filecoinfevmcalibration',
  requiredConfirmations: 900,
  walletType: 'wallet:filecoinfevmcalibration',

  // Explorers:
  addressExplorer: 'https://filfox.info/en/address/%s',
  transactionExplorer: 'https://filfox.info/en/message/%s',

  denominations: [
    {
      name: 'tFIL',
      multiplier: '1000000000000000000',
      symbol: '⨎'
    },
    {
      name: 'millitFIL',
      multiplier: '1000000000000000',
      symbol: 'm⨎'
    },
    {
      name: 'microtFIL',
      multiplier: '1000000000000',
      symbol: 'µ⨎'
    },
    {
      name: 'nanotFIL',
      multiplier: '1000000000',
      symbol: 'n⨎'
    },
    {
      name: 'picotFIL',
      multiplier: '1000000',
      symbol: 'p⨎'
    },
    {
      name: 'femtotFIL',
      multiplier: '1000',
      symbol: 'f⨎'
    },
    {
      name: 'attotFIL',
      multiplier: '1',
      symbol: 'a⨎'
    }
  ],

  // Deprecated:
  defaultSettings: {},
  metaTokens: []
}

export const filecoinfevmcalibration = makeOuterPlugin<
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
