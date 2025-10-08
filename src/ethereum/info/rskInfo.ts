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
  '2acc95758f8b5f583470ba265eb685a8f45fc9d5': {
    currencyCode: 'RIF',
    displayName: 'RIF Token',
    denominations: [{ name: 'RIF', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x2acc95758f8b5f583470ba265eb685a8f45fc9d5'
    }
  },
  '3a15461d8ae0f0fb5fa2629e9da7d66a794a6e37': {
    currencyCode: 'USDRIF',
    displayName: 'RIF US Dollar',
    denominations: [{ name: 'USDRIF', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x3a15461d8ae0f0fb5fa2629e9da7d66a794a6e37'
    }
  },
  e700691da7b9851f2f35f8b8182c69c53ccad9db: {
    currencyCode: 'DOC',
    displayName: 'Dollar On Chain',
    denominations: [{ name: 'DOC', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0xe700691da7b9851f2f35f8b8182c69c53ccad9db'
    }
  },
  '779ded0c9e1022225f8e0630b35a9b54be713736': {
    currencyCode: 'USD₮0',
    displayName: 'USD₮0',
    denominations: [{ name: 'USD₮0', multiplier: '1000000' }],
    networkLocation: {
      contractAddress: '0x779ded0c9e1022225f8e0630b35a9b54be713736'
    }
  },
  '74c9f2b00581f1b11aa7ff05aa9f608b7389de67': {
    currencyCode: 'USDC.e',
    displayName: 'Bridged USDC (Stargate)',
    denominations: [{ name: 'USDC.e', multiplier: '1000000' }],
    networkLocation: {
      contractAddress: '0x74c9f2b00581f1b11aa7ff05aa9f608b7389de67'
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
  addressQueryLookbackBlocks: 4, // ~2 minutes
  networkAdapterConfigs: [
    {
      type: 'rpc',
      servers: [
        'https://public-node.rsk.co',
        'https://lb.drpc.org/ogrpc?network=rootstock&dkey={{drpcApiKey}}'
      ]
    },
    {
      type: 'evmscan',
      gastrackerSupport: false,
      servers: ['https://blockscout.com/rsk/mainnet']
    }
  ],
  uriNetworks: ['rsk', 'rbtc'],
  ercTokenStandard: 'RRC20',
  chainParams: {
    chainId: 30,
    name: 'Rootstock Mainnet'
  },
  hdPathCoinType: 137,
  pluginMnemonicKeyName: 'rskMnemonic',
  pluginRegularKeyName: 'rskKey',
  evmGasStationUrl: null,
  networkFees
}

const currencyInfo: EdgeCurrencyInfo = {
  canReplaceByFee: true,
  currencyCode: 'RBTC',
  customFeeTemplate: evmCustomFeeTemplate,
  customTokenTemplate: evmCustomTokenTemplate,
  assetDisplayName: 'Rootstock',
  chainDisplayName: 'Rootstock',
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

  usesChangeServer: true,

  // Deprecated:
  defaultSettings: makeEvmDefaultSettings(networkInfo),
  displayName: 'Rootstock',
  metaTokens: makeMetaTokens(builtinTokens)
}

export const rsk = makeOuterPlugin<
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
