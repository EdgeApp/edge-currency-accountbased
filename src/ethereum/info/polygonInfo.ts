import { EdgeCurrencyInfo } from 'edge-core-js/types'

import { makeOuterPlugin } from '../../common/innerPlugin'
import type { EthereumTools } from '../EthereumTools'
import {
  asEthereumInfoPayload,
  EthereumFees,
  EthereumInfoPayload,
  EthereumNetworkInfo
} from '../ethereumTypes'
import {
  evmCustomFeeTemplate,
  evmCustomTokenTemplate,
  evmMemoOptions,
  makeEvmDefaultSettings
} from './ethereumCommonInfo'

// Fees are in Wei
const networkFees: EthereumFees = {
  default: {
    baseFee: undefined,
    baseFeeMultiplier: undefined,
    gasLimit: {
      regularTransaction: '21000',
      tokenTransaction: '300000',
      minGasLimit: '21000'
    },
    gasPrice: {
      lowFee: '30000000001',
      standardFeeLow: '36000000000',
      standardFeeHigh: '100000000000',
      standardFeeLowAmount: '100000000000000000',
      standardFeeHighAmount: '10000000000000000000',
      highFee: '216000000000',
      minGasPrice: '30000000000'
    },
    minPriorityFee: undefined
  }
}

const networkInfo: EthereumNetworkInfo = {
  addressQueryLookbackBlocks: 60, // 2 minutes
  networkAdapterConfigs: [
    {
      type: 'rpc',
      servers: [
        'https://polygon-rpc.com/',
        'https://rpc.polycat.finance',
        'https://rpc-mainnet.maticvigil.com',
        'https://matic-mainnet.chainstacklabs.com',
        'https://rpc.ankr.com/polygon',
        'https://poly.api.pocket.network',
        'https://rpc-mainnet.matic.quiknode.pro/{{quiknodeApiKey}}/',
        'https://lb.drpc.org/ogrpc?network=polygon&dkey={{drpcApiKey}}'
      ],
      ethBalCheckerContract: '0x2352c63A83f9Fd126af8676146721Fa00924d7e4'
    },
    {
      type: 'evmscan',
      gastrackerSupport: true,
      servers: ['https://api.etherscan.io', 'https://api.polygonscan.com']
    }
  ],
  uriNetworks: ['polygon'],
  ercTokenStandard: 'ERC20',
  chainParams: {
    chainId: 137,
    name: 'MATIC Mainnet'
  },
  supportsEIP1559: true,
  hdPathCoinType: 60,
  pluginMnemonicKeyName: 'polygonMnemonic',
  pluginRegularKeyName: 'polygonKey',
  evmGasStationUrl: 'https://gasstation.polygon.technology/v2',
  feeUpdateFrequencyMs: 60000, // 1 minute (default is 10 minutes)
  networkFees,
  decoyAddressConfig: {
    count: 5,
    minTransactionCount: 10,
    maxTransactionCount: 100
  }
}

const currencyInfo: EdgeCurrencyInfo = {
  canReplaceByFee: true,
  currencyCode: 'POL',
  evmChainId: 137,
  customFeeTemplate: evmCustomFeeTemplate,
  customTokenTemplate: evmCustomTokenTemplate,
  assetDisplayName: 'Polygon',
  chainDisplayName: 'Polygon',
  memoOptions: evmMemoOptions,
  pluginId: 'polygon', // matching mnemonic here
  walletType: 'wallet:polygon',

  // Explorers:
  addressExplorer: 'https://polygonscan.com/address/%s',
  transactionExplorer: 'https://polygonscan.com/tx/%s',

  denominations: [
    {
      name: 'POL',
      multiplier: '1000000000000000000',
      symbol: 'POL'
    },
    {
      name: 'mPOL',
      multiplier: '1000000000000000',
      symbol: 'mPOL'
    }
  ],

  usesChangeServer: true,

  // Deprecated:
  defaultSettings: makeEvmDefaultSettings(networkInfo),
  displayName: 'Polygon'
}

export const polygon = makeOuterPlugin<
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
