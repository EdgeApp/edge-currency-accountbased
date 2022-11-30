import { EdgeCorePluginOptions, EdgeCurrencyInfo } from 'edge-core-js/types'

import { makeEthereumBasedPluginInner } from '../ethPlugin'
import { EthereumFees, EthereumSettings } from '../ethTypes'

const defaultNetworkFees: EthereumFees = {
  default: {
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

const otherSettings: EthereumSettings = {
  rpcServers: [
    'https://polished-empty-cloud.fantom.quiknode.pro',
    'https://rpc.ftm.tools'
  ],
  evmScanApiServers: ['https://api.ftmscan.com'],
  blockcypherApiServers: [],
  blockbookServers: [],
  uriNetworks: ['fantom'],
  ercTokenStandard: 'ERC20',
  chainParams: {
    chainId: 250,
    name: 'Fantom Opera'
  },
  hdPathCoinType: 60,
  feeUpdateFrequencyMs: 60000,
  supportsEIP1559: true,
  checkUnconfirmedTransactions: false,
  iosAllowedTokens: {},
  blockchairApiServers: [],
  alethioApiServers: [],
  alethioCurrencies: null, // object or null
  amberdataRpcServers: [],
  amberdataApiServers: [],
  amberDataBlockchainId: '', // ETH mainnet
  pluginMnemonicKeyName: 'fantomMnemonic',
  pluginRegularKeyName: 'fantomKey',
  ethGasStationUrl: null,
  defaultNetworkFees
}

const defaultSettings: any = {
  customFeeSettings: ['gasLimit', 'gasPrice'],
  otherSettings
}

export const currencyInfo: EdgeCurrencyInfo = {
  // Basic currency information:
  currencyCode: 'FTM',
  displayName: 'Fantom',
  pluginId: 'fantom',
  walletType: 'wallet:fantom',
  memoType: 'hex',

  canReplaceByFee: true,
  defaultSettings,

  addressExplorer: 'https://ftmscan.com/address/%s',
  transactionExplorer: 'https://ftmscan.com/tx/%s',

  denominations: [
    // An array of Objects of the possible denominations for this currency
    {
      name: 'FTM',
      multiplier: '1000000000000000000',
      symbol: 'F'
    }
  ],
  metaTokens: [
    // Array of objects describing the supported metatokens
    {
      currencyCode: 'AVAX',
      currencyName: 'Avalanche',
      denominations: [
        {
          name: 'AVAX',
          multiplier: '1000000000000000000'
        }
      ],
      contractAddress: '0x511d35c52a3c244e7b8bd92c0c297755fbd89212'
    },
    {
      currencyCode: 'BNB',
      currencyName: 'Binance',
      denominations: [
        {
          name: 'BNB',
          multiplier: '1000000000000000000'
        }
      ],
      contractAddress: '0xd67de0e0a0fd7b15dc8348bb9be742f3c5850454'
    },
    {
      currencyCode: 'BOO',
      currencyName: 'SpookyToken',
      denominations: [
        {
          name: 'BOO',
          multiplier: '1000000000000000000'
        }
      ],
      contractAddress: '0x841fad6eae12c286d1fd18d1d525dffa75c7effe'
    },
    {
      currencyCode: 'BTC',
      currencyName: 'Bitcoin',
      denominations: [
        {
          name: 'BTC',
          multiplier: '100000000'
        }
      ],
      contractAddress: '0x321162cd933e2be498cd2267a90534a804051b11'
    },
    {
      currencyCode: 'CRV',
      currencyName: 'Curve',
      denominations: [
        {
          name: 'CRV',
          multiplier: '1000000000000000000'
        }
      ],
      contractAddress: '0x1e4f97b9f9f913c46f1632781732927b9019c68b'
    },
    {
      currencyCode: 'DAI',
      currencyName: 'DAI Stablecoin',
      denominations: [
        {
          name: 'DAI',
          multiplier: '1000000000000000000'
        }
      ],
      contractAddress: '0x8d11ec38a3eb5e956b052f67da8bdc9bef8abf3e'
    },
    {
      currencyCode: 'ETH',
      currencyName: 'Ethereum',
      denominations: [
        {
          name: 'ETH',
          multiplier: '1000000000000000000'
        }
      ],
      contractAddress: '0x74b23882a30290451a17c44f4f05243b6b58c76d'
    },
    {
      currencyCode: 'FBTC',
      currencyName: 'Frapped Bitcoin',
      denominations: [
        {
          name: 'FBTC',
          multiplier: '1000000000000000000'
        }
      ],
      contractAddress: '0xe1146b9ac456fcbb60644c36fd3f868a9072fc6e'
    },
    {
      currencyCode: 'FETH',
      currencyName: 'Frapped Ethereum',
      denominations: [
        {
          name: 'FETH',
          multiplier: '1000000000000000000'
        }
      ],
      contractAddress: '0x658b0c7613e890ee50b8c4bc6a3f41ef411208ad'
    },
    {
      currencyCode: 'FUSD',
      currencyName: 'Fantom USD',
      denominations: [
        {
          name: 'FUSD',
          multiplier: '1000000000000000000'
        }
      ],
      contractAddress: '0xad84341756bf337f5a0164515b1f6f993d194e1f'
    },
    {
      currencyCode: 'FUSDT',
      currencyName: 'Frapped Tether',
      denominations: [
        {
          name: 'FUSDT',
          multiplier: '1000000'
        }
      ],
      contractAddress: '0x049d68029688eabf473097a2fc38ef61633a3c7a'
    },
    {
      currencyCode: 'L3USD',
      currencyName: 'L3USD',
      denominations: [{ name: 'L3USD', multiplier: '1000000000000000000' }],
      contractAddress: '0x5f0456f728e2d59028b4f5b8ad8c604100724c6a'
    },
    {
      currencyCode: 'LIF3',
      currencyName: 'LIF3',
      denominations: [
        {
          name: 'LIF3',
          multiplier: '1000000000000000000'
        }
      ],
      contractAddress: '0xbf60e7414ef09026733c1e7de72e7393888c64da'
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
      contractAddress: '0xb3654dc3d10ea7645f8319668e8f54d2574fbdc8'
    },
    {
      currencyCode: 'LSHARE',
      currencyName: 'LIF3 LSHARE',
      denominations: [
        {
          name: 'LSHARE',
          multiplier: '1000000000000000000'
        }
      ],
      contractAddress: '0xcbe0ca46399af916784cadf5bcc3aed2052d6c45'
    },
    {
      currencyCode: 'MAI',
      currencyName: 'miMATIC',
      denominations: [
        {
          name: 'MAI',
          multiplier: '1000000000000000000'
        }
      ],
      contractAddress: '0xfB98B335551a418cD0737375a2ea0ded62Ea213b'
    },
    {
      currencyCode: 'MIM',
      currencyName: 'Magic Internet Money',
      denominations: [
        {
          name: 'MIM',
          multiplier: '1000000000000000000'
        }
      ],
      contractAddress: '0x82f0b8b456c1a451378467398982d4834b6829c1'
    },
    {
      currencyCode: 'TBOND',
      currencyName: 'Tomb Bonds',
      denominations: [
        {
          name: 'TBOND',
          multiplier: '1000000000000000000'
        }
      ],
      contractAddress: '0x24248CD1747348bDC971a5395f4b3cd7feE94ea0'
    },
    {
      currencyCode: 'TOMB',
      currencyName: 'Tomb',
      denominations: [
        {
          name: 'TOMB',
          multiplier: '1000000000000000000'
        }
      ],
      contractAddress: '0x6c021Ae822BEa943b2E66552bDe1D2696a53fbB7'
    },
    {
      currencyCode: 'TREEB',
      currencyName: 'Retreeb',
      denominations: [
        {
          name: 'TREEB',
          multiplier: '1000000000000000000'
        }
      ],
      contractAddress: '0xc60d7067dfbc6f2caf30523a064f416a5af52963'
    },
    {
      currencyCode: 'TSHARE',
      currencyName: 'Tomb Shares',
      denominations: [
        {
          name: 'TSHARE',
          multiplier: '1000000000000000000'
        }
      ],
      contractAddress: '0x4cdf39285d7ca8eb3f090fda0c069ba5f4145b37'
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
      contractAddress: '0x04068da6c83afcfa0e13ba15a6696662335d5b75'
    },
    {
      currencyCode: 'WFTM',
      currencyName: 'Wrapped Fantom',
      denominations: [
        {
          name: 'WFTM',
          multiplier: '1000000000000000000'
        }
      ],
      contractAddress: '0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83'
    },
    {
      currencyCode: 'xBOO',
      currencyName: 'Boo MirrorWorld',
      denominations: [
        {
          name: 'xBOO',
          multiplier: '1000000000000000000'
        }
      ],
      contractAddress: '0xa48d959AE2E88f1dAA7D5F611E01908106dE7598'
    },
    {
      currencyCode: 'ZOO',
      currencyName: 'Zookeeper',
      denominations: [
        {
          name: 'ZOO',
          multiplier: '1'
        }
      ],
      contractAddress: '0x09e145a1d53c0045f41aeef25d8ff982ae74dd56'
    }
  ]
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const makeFantomPlugin = (opts: EdgeCorePluginOptions) => {
  return makeEthereumBasedPluginInner(opts, currencyInfo)
}
