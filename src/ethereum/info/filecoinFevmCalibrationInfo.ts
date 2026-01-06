import { EdgeCurrencyInfo } from 'edge-core-js/types'

import { makeOuterPlugin } from '../../common/innerPlugin'
import type { EthereumTools } from '../EthereumTools'
import {
  asEthereumInfoPayload,
  EthereumFees,
  EthereumInfoPayload,
  EthereumNetworkInfo
} from '../ethereumTypes'
import { evmCustomFeeTemplate, evmMemoOptions } from './ethereumCommonInfo'

const networkFees: EthereumFees = {
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
  addressQueryLookbackBlocks: 4, // 2 minutes
  networkAdapterConfigs: [
    {
      type: 'rpc',
      servers: [
        'https://api.calibration.node.glif.io/rpc/v0',
        'https://lb.drpc.org/ogrpc?network=filecoin-calibration&dkey={{drpcApiKey}}'
      ]
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
  pluginMnemonicKeyName: 'filecoinfevmcalibrationMnemonic',
  pluginRegularKeyName: 'filecoinfevmcalibrationKey',
  evmGasStationUrl: null,
  networkFees,
  decoyAddressConfig: {
    count: 5,
    minTransactionCount: 10,
    maxTransactionCount: 100
  }
}

const currencyInfo: EdgeCurrencyInfo = {
  currencyCode: 'tFIL',
  evmChainId: 314159,
  customFeeTemplate: evmCustomFeeTemplate,
  // customTokenTemplate: evmCustomTokenTemplate,
  assetDisplayName: 'Filecoin FEVM (Calibration Testnet)',
  chainDisplayName: 'Filecoin FEVM (Calibration Testnet)',
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

  usesChangeServer: true,

  // Deprecated:
  displayName: 'Filecoin FEVM (Calibration Testnet)'
}

export const filecoinfevmcalibration = makeOuterPlugin<
  EthereumNetworkInfo,
  EthereumTools,
  EthereumInfoPayload
>({
  currencyInfo,
  asInfoPayload: asEthereumInfoPayload,
  networkInfo,

  async getInnerPlugin() {
    return await import('../EthereumTools')
  }
})
