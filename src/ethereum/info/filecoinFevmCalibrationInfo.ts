import { EdgeCurrencyInfo, EdgeTokenMap } from 'edge-core-js/types'

import { makeOuterPlugin } from '../../common/innerPlugin'
import { makeMetaTokens } from '../../common/tokenHelpers'
import { EthereumTools } from '../EthereumTools'
import { EthereumFees, EthereumNetworkInfo } from '../ethereumTypes'
import { evmCustomFeeTemplate, evmMemoOptions } from './ethereumCommonInfo'

const builtinTokens: EdgeTokenMap = {
  '8c97f94b2cdbf7dc0098057334d9908c4dc0a885': {
    currencyCode: 'iFIL',
    displayName: 'iFIL Inifinity Pool',
    denominations: [{ name: 'iFIL', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x8c97F94b2cDbF7Dc0098057334d9908C4dC0a885'
    }
  },
  ac26a4ab9cf2a8c5dbab6fb4351ec0f4b07356c4: {
    currencyCode: 'WFIL',
    displayName: 'Wrapped FIL',
    denominations: [{ name: 'wFIL', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0xaC26a4Ab9cF2A8c5DBaB6fb4351ec0F4b07356c4'
    }
  }
}

const defaultNetworkFees: EthereumFees = {
  default: {
    baseFee: undefined,
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

const networkInfo: EthereumNetworkInfo = {
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
  amberDataBlockchainId: '', // ETH mainnet
  pluginMnemonicKeyName: 'filecoinfevmcalibrationMnemonic',
  pluginRegularKeyName: 'filecoinfevmcalibrationKey',
  ethGasStationUrl: null,
  defaultNetworkFees
}

const currencyInfo: EdgeCurrencyInfo = {
  currencyCode: 'tFIL',
  customFeeTemplate: evmCustomFeeTemplate,
  displayName: 'Filecoin FEVM (Calibration Testnet)',
  memoOptions: evmMemoOptions,
  pluginId: 'filecoinfevmcalibration',
  requiredConfirmations: 900,
  walletType: 'wallet:filecoinfevmcalibration',

  // Explorers:
  addressExplorer: 'https://calibration.filfox.info/en/address/%s',
  transactionExplorer: 'https://calibration.filfox.info/en/message/%s',

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
  metaTokens: makeMetaTokens(builtinTokens)
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
