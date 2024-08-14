import { EdgeCurrencyInfo, EdgeTokenMap } from 'edge-core-js/types'

import { makeOuterPlugin } from '../../common/innerPlugin'
import { makeMetaTokens } from '../../common/tokenHelpers'
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
  e9e7cea3dedca5984780bafc599bd69add087d56: {
    currencyCode: 'BUSD',
    displayName: 'Binance USD',
    denominations: [{ name: 'BUSD', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56'
    }
  },
  '8ac76a51cc950d9822d68b83fe1ad97b32cd580d': {
    currencyCode: 'USDC',
    displayName: 'USD Coin',
    denominations: [{ name: 'USDC', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d'
    }
  },
  '55d398326f99059ff775485246999027b3197955': {
    currencyCode: 'BSC-USD',
    displayName: 'Binance-Peg BSC-USD',
    denominations: [{ name: 'BSC-USD', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x55d398326f99059fF775485246999027B3197955'
    }
  },
  ba2ae424d960c26247dd6c32edc70b295c744c43: {
    currencyCode: 'DOGE',
    displayName: 'Binance-Peg Dogecoin Token',
    denominations: [{ name: 'DOGE', multiplier: '100000000' }],
    networkLocation: {
      contractAddress: '0xbA2aE424d960c26247Dd6c32edC70B295c744C43'
    }
  },
  '7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c': {
    currencyCode: 'BTCB',
    displayName: 'Bitcoin BEP2',
    denominations: [{ name: 'BTCB', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c'
    }
  },
  '2170ed0880ac9a755fd29b2688956bd959f933f8': {
    currencyCode: 'ETH',
    displayName: 'Binance-Peg Ethereum Token',
    denominations: [{ name: 'ETH', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8'
    }
  },
  '40af3827f39d0eacbf4a168f8d4ee67c121d11c9': {
    currencyCode: 'TUSD',
    displayName: 'TrueUSD',
    denominations: [{ name: 'TUSD', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x40af3827F39D0EAcBF4A168f8D4ee67c121D11c9'
    }
  },
  '7083609fce4d1d8dc0c979aab8c869ea2c873402': {
    currencyCode: 'DOT',
    displayName: 'Binance-Peg Polkadot Token',
    denominations: [{ name: 'DOT', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x7083609fCE4d1d8Dc0C979AAb8c869Ea2C873402'
    }
  },
  bb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c: {
    currencyCode: 'WBNB',
    displayName: 'Wrapped BNB',
    denominations: [{ name: 'BNB', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'
    }
  },
  f8a0bf9cf54bb92f17374d9e9a321e6a111a51bd: {
    currencyCode: 'LINK',
    displayName: 'Binance-Peg ChainLink Token',
    denominations: [{ name: 'LINK', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0xF8A0BF9cF54Bb92F17374d9e9A321E6a111a51bD'
    }
  },
  fb6115445bff7b52feb98650c87f44907e58f802: {
    currencyCode: 'AAVE',
    displayName: 'Binance-Peg Aave Token',
    denominations: [{ name: 'AAVE', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0xfb6115445Bff7b52FeB98650C87f44907E58f802'
    }
  },
  cc42724c6683b7e57334c4e856f4c9965ed682bd: {
    currencyCode: 'MATIC',
    displayName: 'Matic Token',
    denominations: [{ name: 'MATIC', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0xCC42724C6683B7E57334c4E856f4c9965ED682bD'
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
  }
}

const networkInfo: EthereumNetworkInfo = {
  networkAdapterConfigs: [
    {
      type: 'rpc',
      servers: [
        'https://rpc.ankr.com/bsc',
        'https://bsc-dataseed.binance.org',
        'https://bsc-dataseed1.defibit.io',
        'https://bsc-dataseed1.ninicoin.io',
        'https://lb.drpc.org/ogrpc?network=bsc&dkey={{drpcApiKey}}'
      ],
      ethBalCheckerContract: '0x2352c63A83f9Fd126af8676146721Fa00924d7e4'
    },
    { type: 'evmscan', servers: ['https://api.bscscan.com'] }
  ],
  uriNetworks: ['smartchain'],
  ercTokenStandard: 'ERC20',
  chainParams: {
    chainId: 56,
    name: 'Binance Smart Chain'
  },
  hdPathCoinType: 60,
  amberDataBlockchainId: '', // ETH mainnet
  pluginMnemonicKeyName: 'binancesmartchainMnemonic',
  pluginRegularKeyName: 'binancesmartchainKey',
  ethGasStationUrl: null,
  networkFees
}

const currencyInfo: EdgeCurrencyInfo = {
  canReplaceByFee: true,
  currencyCode: 'BNB',
  customFeeTemplate: evmCustomFeeTemplate,
  customTokenTemplate: evmCustomTokenTemplate,
  displayName: 'BNB Smart Chain',
  memoOptions: evmMemoOptions,
  pluginId: 'binancesmartchain',
  walletType: 'wallet:binancesmartchain',

  // Explorers:
  addressExplorer: 'https://bscscan.com/address/%s',
  transactionExplorer: 'https://bscscan.com/tx/%s',

  denominations: [
    {
      name: 'BNB',
      multiplier: '1000000000000000000',
      symbol: 'BNB'
    }
  ],

  // Deprecated:
  defaultSettings: makeEvmDefaultSettings(networkInfo),
  metaTokens: makeMetaTokens(builtinTokens)
}

export const binancesmartchain = makeOuterPlugin<
  EthereumNetworkInfo,
  EthereumTools,
  EthereumInfoPayload
>({
  builtinTokens,
  currencyInfo,
  asInfoPayload: asEthereumInfoPayload,
  networkInfo,

  async getInnerPlugin() {
    return await import('../EthereumTools')
  }
})
