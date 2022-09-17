/* global */
// @flow

import type {
  EdgeCorePluginOptions,
  EdgeCurrencyInfo
} from 'edge-core-js/types'

import { makeEthereumBasedPluginInner } from '../ethPlugin'
import type { EthereumFees, EthereumSettings } from '../ethTypes.js'

// Fees are in Wei
const defaultNetworkFees: EthereumFees = {
  default: {
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

const otherSettings: EthereumSettings = {
  rpcServers: [
    'https://rpc-mumbai.matic.today/',
    'https://rpc-mumbai.maticvigil.com',
    'https://matic-mumbai.chainstacklabs.com'
  ],
  evmScanApiServers: ['https://api-testnet.polygonscan.com/'],
  blockcypherApiServers: [],
  blockbookServers: [],
  uriNetworks: ['mumbai'],
  ercTokenStandard: 'ERC20',
  chainParams: {
    chainId: 80001,
    name: 'MATIC Testnet'
  },
  supportsEIP1559: true,
  hdPathCoinType: 60,
  checkUnconfirmedTransactions: false,
  iosAllowedTokens: {},
  blockchairApiServers: [],
  alethioApiServers: [],
  alethioCurrencies: null, // object or null
  amberdataRpcServers: [],
  amberdataApiServers: [],
  amberDataBlockchainId: '',
  pluginMnemonicKeyName: 'mumbaiMnemonic',
  pluginRegularKeyName: 'mumbaiKey',
  ethGasStationUrl: '',
  defaultNetworkFees
}

const defaultSettings: any = {
  customFeeSettings: ['gasLimit', 'gasPrice'],
  otherSettings
}

export const currencyInfo: EdgeCurrencyInfo = {
  // Basic currency information:
  currencyCode: 'MUMBAI',
  displayName: 'Mumbai',
  pluginId: 'mumbai', // matching mnemonic here
  walletType: 'wallet:mumbai',

  canReplaceByFee: true,
  defaultSettings,

  addressExplorer: 'https://mumbai.polygonscan.com/address/%s',
  transactionExplorer: 'https://mumbai.polygonscan.com/tx/%s',

  denominations: [
    // An array of Objects of the possible denominations for this currency
    {
      name: 'MUMBAI',
      multiplier: '1000000000000000000',
      symbol: 'MUMBAI'
    },
    {
      name: 'mMUMBAI',
      multiplier: '1000000000000000',
      symbol: 'mMUMBAI'
    }
  ],
  metaTokens: [
    {
      currencyCode: 'USDC-AAVE',
      currencyName: 'USD Coin (AAVE)',
      denominations: [
        {
          name: 'USDC',
          multiplier: '1000000'
        }
      ],
      contractAddress: '0x9aa7fec87ca69695dd1f879567ccf49f3ba417e2'
    },
    {
      currencyCode: 'USDC',
      currencyName: 'USD Coin',
      denominations: [
        {
          name: 'USDC',
          multiplier: '1000000'
        }
      ],
      contractAddress: '0xe11a86849d99f524cac3e7a0ec1241828e332c62'
    },
    {
      currencyCode: 'USDC-WYRE',
      currencyName: 'USD Coin',
      denominations: [
        {
          name: 'USDC',
          multiplier: '1000000'
        }
      ],
      contractAddress: '0xe6b8a5CF854791412c1f6EFC7CAf629f5Df1c747'
    },
    {
      currencyCode: 'DAI',
      currencyName: 'Dai Stablecoin',
      denominations: [
        {
          name: 'DAI',
          multiplier: '1000000000000000000'
        }
      ],
      contractAddress: '0x9a753f0f7886c9fbf63cf59d0d4423c5eface95b'
    },
    {
      currencyCode: 'USDT',
      currencyName: 'Tether',
      denominations: [
        {
          name: 'USDT',
          multiplier: '1000000'
        }
      ],
      contractAddress: '0x21c561e551638401b937b03fe5a0a0652b99b7dd'
    },
    {
      currencyCode: 'AAVE',
      currencyName: 'Aave',
      denominations: [
        {
          name: 'AAVE',
          multiplier: '1000000000000000000'
        }
      ],
      contractAddress: '0x0ab1917a0cf92cdcf7f7b637eac3a46bbbe41409'
    },
    {
      currencyCode: 'WBTC',
      currencyName: 'Wrapped Bitcoin',
      denominations: [
        {
          name: 'WBTC',
          multiplier: '100000000'
        }
      ],
      contractAddress: '0x85e44420b6137bbc75a85cab5c9a3371af976fde'
    },
    {
      currencyCode: 'WETH',
      currencyName: 'Wrapped ETH',
      denominations: [
        {
          name: 'WETH',
          multiplier: '1000000000000000000'
        }
      ],
      contractAddress: '0xd575d4047f8c667e064a4ad433d04e25187f40bb'
    },
    {
      currencyCode: 'WMATIC',
      currencyName: 'Wrapped WMATIC',
      denominations: [
        {
          name: 'WMATIC',
          multiplier: '1000000000000000000'
        }
      ],
      contractAddress: '0xb685400156cf3cbe8725958deaa61436727a30c3'
    },
    {
      currencyCode: 'LINK',
      currencyName: 'Chainlink',
      denominations: [
        {
          name: 'LINK',
          multiplier: '1000000000000000000'
        }
      ],
      contractAddress: '0xd9e7e5dd6e122dde11244e14a60f38aba93097f2'
    }
  ]
}

export const makeMumbaiPlugin = (opts: EdgeCorePluginOptions) => {
  return makeEthereumBasedPluginInner(opts, currencyInfo)
}
