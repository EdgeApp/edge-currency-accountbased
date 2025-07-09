import { EdgeCurrencyInfo, EdgeTokenMap } from 'edge-core-js/types'

import { makeOuterPlugin } from '../../common/innerPlugin'
import { createEvmTokenId, makeMetaTokens } from '../../common/tokenHelpers'
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

const networkFees: EthereumFees = {
  default: {
    baseFee: undefined,
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
    baseFee: undefined,
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
    baseFee: undefined,
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
  addressQueryLookbackBlocks: 9, // ~2 minutes
  networkAdapterConfigs: [
    {
      type: 'rpc',
      servers: [
        'https://etc.rivet.link',
        'https://geth-de.etc-network.info',
        'https://geth-at.etc-network.info',
        'https://etc.etcdesktop.com'
      ],
      ethBalCheckerContract: '0xfC701A6b65e1BcF59fb3BDbbe5cb41f35FC7E009'
    },
    {
      type: 'evmscan',
      servers: ['https://etc.blockscout.com']
    },
    {
      type: 'blockbook',
      servers: ['https://etcbook.guarda.co', 'https://etc1.trezor.io']
    }
  ],
  uriNetworks: ['ethereumclassic', 'etherclass'],
  ercTokenStandard: 'ERC20',
  chainParams: {
    chainId: 61,
    name: 'Ethereum Classic'
  },
  hdPathCoinType: 61,
  pluginMnemonicKeyName: 'ethereumclassicMnemonic',
  pluginRegularKeyName: 'ethereumclassicKey',
  evmGasStationUrl: null,
  networkFees
}

const currencyInfo: EdgeCurrencyInfo = {
  canReplaceByFee: true,
  currencyCode: 'ETC',
  customFeeTemplate: evmCustomFeeTemplate,
  customTokenTemplate: evmCustomTokenTemplate,
  assetDisplayName: 'Ethereum Classic',
  chainDisplayName: 'Ethereum Classic',
  memoOptions: evmMemoOptions,
  pluginId: 'ethereumclassic',
  walletType: 'wallet:ethereumclassic',

  // Explorers:
  addressExplorer: 'https://blockscout.com/etc/mainnet/address/%s',
  transactionExplorer: 'https://blockscout.com/etc/mainnet/tx/%s',

  denominations: [
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

  usesChangeServer: true,

  // Deprecated:
  defaultSettings: makeEvmDefaultSettings(networkInfo),
  displayName: 'Ethereum Classic',
  metaTokens: makeMetaTokens(builtinTokens)
}

export const ethereumclassic = makeOuterPlugin<
  EthereumNetworkInfo,
  EthereumTools,
  EthereumInfoPayload
>({
  builtinTokens,
  currencyInfo,
  asInfoPayload: asEthereumInfoPayload,
  createTokenId: createEvmTokenId,
  networkInfo,

  async getInnerPlugin() {
    return await import('../EthereumTools')
  }
})
