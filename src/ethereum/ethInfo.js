/* global */
// @flow

import type {
  EdgeCorePluginOptions,
  EdgeCurrencyInfo
} from 'edge-core-js/types'

import { imageServerUrl } from '../common/utils'
import { makeEthereumBasedPluginInner } from './ethPlugin'
import type { EthereumSettings } from './ethTypes.js'

const defaultNetworkFees = {
  default: {
    gasLimit: {
      regularTransaction: '21000',
      tokenTransaction: '200000'
    },
    gasPrice: {
      lowFee: '1000000001',
      standardFeeLow: '40000000001',
      standardFeeHigh: '300000000001',
      standardFeeLowAmount: '100000000000000000',
      standardFeeHighAmount: '10000000000000000000',
      highFee: '40000000001'
    }
  },
  '1983987abc9837fbabc0982347ad828': {
    gasLimit: {
      regularTransaction: '21002',
      tokenTransaction: '37124'
    },
    gasPrice: {
      lowFee: '1000000002',
      standardFeeLow: '40000000002',
      standardFeeHigh: '300000000002',
      standardFeeLowAmount: '200000000000000000',
      standardFeeHighAmount: '20000000000000000000',
      highFee: '40000000002'
    }
  },
  '2983987abc9837fbabc0982347ad828': {
    gasLimit: {
      regularTransaction: '21002',
      tokenTransaction: '37124'
    }
  }
}

const otherSettings: EthereumSettings = {
  etherscanApiServers: [
    'https://api.etherscan.io'
    // 'https://blockscout.com/eth/mainnet' // not reliable enough...
  ],
  blockcypherApiServers: ['https://api.blockcypher.com'],
  superethServers: ['https://supereth1.edgesecure.co:8443'],
  infuraServers: ['https://mainnet.infura.io/v3'],
  isNestedInfuraParams: false,
  infuraNeedProjectId: true,
  uriNetworks: ['ethereum', 'ether'],
  ercTokenStandard: 'ERC20',
  chainId: 1,
  hdPathCoinType: 60,
  checkUnconfirmedTransactions: true,
  iosAllowedTokens: {
    REP: true,
    WINGS: true,
    HUR: true,
    IND: true,
    USDT: true,
    AGLD: true
  },
  blockchairApiServers: ['https://api.blockchair.com'],
  alethioApiServers: ['https://api.aleth.io/v1'],
  alethioCurrencies: {
    // object or null
    native: 'ether',
    token: 'token'
  },
  amberdataRpcServers: ['https://rpc.web3api.io'],
  amberdataApiServers: ['https://web3api.io/api/v2'],
  amberDataBlockchainId: '1c9c969065fcd1cf', // ETH mainnet
  pluginMnemonicKeyName: 'ethereumMnemonic',
  pluginRegularKeyName: 'ethereumKey',
  ethGasStationUrl: 'https://www.ethgasstation.info/json/ethgasAPI.json',
  defaultNetworkFees
}

const defaultSettings: any = {
  customFeeSettings: ['gasLimit', 'gasPrice'],
  otherSettings
}

export const currencyInfo: EdgeCurrencyInfo = {
  // Basic currency information:
  currencyCode: 'ETH',
  displayName: 'Ethereum',
  pluginName: 'ethereum',
  walletType: 'wallet:ethereum',

  defaultSettings,

  addressExplorer: 'https://etherscan.io/address/%s',
  transactionExplorer: 'https://etherscan.io/tx/%s',

  denominations: [
    // An array of Objects of the possible denominations for this currency
    {
      name: 'ETH',
      multiplier: '1000000000000000000',
      symbol: 'Ξ'
    },
    {
      name: 'mETH',
      multiplier: '1000000000000000',
      symbol: 'mΞ'
    }
  ],
  symbolImage: `${imageServerUrl}/ethereum-logo-solo-64.png`,
  symbolImageDarkMono: `${imageServerUrl}/ethereum-logo-solo-64.png`,
  metaTokens: [
    // Array of objects describing the supported metatokens
    {
      currencyCode: 'REP',
      currencyName: 'Augur',
      denominations: [
        {
          name: 'REP',
          multiplier: '1000000000000000000'
        }
      ],
      contractAddress: '0x1985365e9f78359a9B6AD760e32412f4a445E862',
      symbolImage: `${imageServerUrl}/augur-logo-solo-64.png`
    },
    {
      currencyCode: 'HERC',
      currencyName: 'Hercules',
      denominations: [
        {
          name: 'HERC',
          multiplier: '1000000000000000000'
        }
      ],
      contractAddress: '0x2e91E3e54C5788e9FdD6A181497FDcEa1De1bcc1',
      symbolImage: `${imageServerUrl}/herc-logo-solo-64.png`
    },
    {
      currencyCode: 'AGLD',
      currencyName: 'Anthem Gold',
      denominations: [
        {
          name: 'AGLD',
          multiplier: '1000000000'
        }
      ],
      contractAddress: '0xd668dab892f1b702a6b9ee01342508b14d4e62c5',
      symbolImage: `${imageServerUrl}/agld-logo-solo-64.png`
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
      contractAddress: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
      symbolImage: `${imageServerUrl}/dai-logo-solo-64.png`
    },
    {
      currencyCode: 'SAI',
      currencyName: 'Sai Stablecoin',
      denominations: [
        {
          name: 'SAI',
          multiplier: '1000000000000000000'
        }
      ],
      contractAddress: '0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359',
      symbolImage: `${imageServerUrl}/sai-logo-solo-64.png`
    },
    {
      currencyCode: 'WINGS',
      currencyName: 'Wings',
      denominations: [
        {
          name: 'WINGS',
          multiplier: '1000000000000000000'
        }
      ],
      contractAddress: '0x667088b212ce3d06a1b553a7221E1fD19000d9aF',
      symbolImage: `${imageServerUrl}/wings-logo-solo-64.png`
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
      contractAddress: '0xdac17f958d2ee523a2206206994597c13d831ec7',
      symbolImage: `${imageServerUrl}/tether-logo-solo-64.png`
    },
    {
      currencyCode: 'IND',
      currencyName: 'Indorse',
      denominations: [
        {
          name: 'IND',
          multiplier: '1000000000000000000'
        }
      ],
      contractAddress: '0xf8e386EDa857484f5a12e4B5DAa9984E06E73705',
      symbolImage: `${imageServerUrl}/indorse-logo-solo-64.png`
    },
    {
      currencyCode: 'HUR',
      currencyName: 'Hurify',
      denominations: [
        {
          name: 'HUR',
          multiplier: '1000000000000000000'
        }
      ],
      contractAddress: '0xCDB7eCFd3403Eef3882c65B761ef9B5054890a47',
      symbolImage: `${imageServerUrl}/hur-logo-solo-64.png`
    },
    {
      currencyCode: 'ANT',
      currencyName: 'Aragon',
      denominations: [
        {
          name: 'ANT',
          multiplier: '1000000000000000000'
        }
      ],
      contractAddress: '0x960b236A07cf122663c4303350609A66A7B288C0',
      symbolImage: `${imageServerUrl}/aragon-logo-solo-64.png`
    },
    {
      currencyCode: 'BAT',
      currencyName: 'Basic Attention Token',
      denominations: [
        {
          name: 'BAT',
          multiplier: '1000000000000000000'
        }
      ],
      contractAddress: '0x0D8775F648430679A709E98d2b0Cb6250d2887EF',
      symbolImage: `${imageServerUrl}/basic-attention-token-logo-solo-64.png`
    },
    {
      currencyCode: 'BNT',
      currencyName: 'Bancor',
      denominations: [
        {
          name: 'BNT',
          multiplier: '1000000000000000000'
        }
      ],
      contractAddress: '0x1F573D6Fb3F13d689FF844B4cE37794d79a7FF1C',
      symbolImage: `${imageServerUrl}/bancor-logo-solo-64.png`
    },
    {
      currencyCode: 'GNT',
      currencyName: 'Golem',
      denominations: [
        {
          name: 'GNT',
          multiplier: '1000000000000000000'
        }
      ],
      contractAddress: '0xa74476443119A942dE498590Fe1f2454d7D4aC0d',
      symbolImage: `${imageServerUrl}/golem-logo-solo-64.png`
    },
    {
      currencyCode: 'KNC',
      currencyName: 'Kyber Network',
      denominations: [
        {
          name: 'KNC',
          multiplier: '1000000000000000000'
        }
      ],
      contractAddress: '0xdd974D5C2e2928deA5F71b9825b8b646686BD200',
      symbolImage: `${imageServerUrl}/kyber-network-logo-solo-64.png`
    },
    {
      currencyCode: 'POLY',
      currencyName: 'Polymath Network',
      denominations: [
        {
          name: 'POLY',
          multiplier: '1000000000000000000'
        }
      ],
      contractAddress: '0x9992eC3cF6A55b00978cdDF2b27BC6882d88D1eC',
      symbolImage: `${imageServerUrl}/polymath-network-logo-solo-64.png`
    },
    {
      currencyCode: 'STORJ',
      currencyName: 'Storj',
      denominations: [
        {
          name: 'STORJ',
          multiplier: '100000000'
        }
      ],
      contractAddress: '0xB64ef51C888972c908CFacf59B47C1AfBC0Ab8aC',
      symbolImage: `${imageServerUrl}/storj-logo-solo-64.png`
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
      contractAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      symbolImage: `${imageServerUrl}/usd-coin-logo-solo-64.png`
    },
    {
      currencyCode: 'USDS',
      currencyName: 'StableUSD',
      denominations: [
        {
          name: 'USDS',
          multiplier: '1000000'
        }
      ],
      contractAddress: '0xA4Bdb11dc0a2bEC88d24A3aa1E6Bb17201112eBe',
      symbolImage: `${imageServerUrl}/stableusd-logo-solo-64.png`
    },
    {
      currencyCode: 'TUSD',
      currencyName: 'TrueUSD',
      denominations: [
        {
          name: 'TUSD',
          multiplier: '1000000000000000000'
        }
      ],
      contractAddress: '0x0000000000085d4780B73119b644AE5ecd22b376',
      symbolImage: `${imageServerUrl}/trueusd-logo-solo-64.png`
    },
    {
      currencyCode: 'ZRX',
      currencyName: '0x',
      denominations: [
        {
          name: 'ZRX',
          multiplier: '1000000000000000000'
        }
      ],
      contractAddress: '0xE41d2489571d322189246DaFA5ebDe1F4699F498',
      symbolImage: `${imageServerUrl}/0x-logo-solo-64.png`
    },
    {
      currencyCode: 'GNO',
      currencyName: 'Gnosis',
      denominations: [
        {
          name: 'GNO',
          multiplier: '1000000000000000000'
        }
      ],
      contractAddress: '0x6810e776880C02933D47DB1b9fc05908e5386b96',
      symbolImage: `${imageServerUrl}/gnosis-logo-solo-64.png`
    },
    {
      currencyCode: 'OMG',
      currencyName: 'OmiseGO',
      denominations: [
        {
          name: 'OMG',
          multiplier: '1000000000000000000'
        }
      ],
      contractAddress: '0xd26114cd6EE289AccF82350c8d8487fedB8A0C07',
      symbolImage: `${imageServerUrl}/omisego-logo-solo-64.png`
    },
    {
      currencyCode: 'NMR',
      currencyName: 'Numeraire',
      denominations: [
        {
          name: 'NMR',
          multiplier: '1000000000000000000'
        }
      ],
      contractAddress: '0x1776e1F26f98b1A5dF9cD347953a26dd3Cb46671',
      symbolImage: `${imageServerUrl}/numeraire-logo-solo-64.png`
    },
    {
      currencyCode: 'MKR',
      currencyName: 'Maker',
      denominations: [
        {
          name: 'MKR',
          multiplier: '1000000000000000000'
        }
      ],
      contractAddress: '0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2',
      symbolImage: `${imageServerUrl}/maker-logo-solo-64.png`
    },
    {
      currencyCode: 'GUSD',
      currencyName: 'Gemini Dollar',
      denominations: [
        {
          name: 'GUSD',
          multiplier: '100'
        }
      ],
      contractAddress: '0x056fd409e1d7a124bd7017459dfea2f387b6d5cd',
      symbolImage: `${imageServerUrl}/gemini-dollar-logo-solo-64.png`
    },
    {
      currencyCode: 'PAX',
      currencyName: 'Paxos',
      denominations: [
        {
          name: 'PAX',
          multiplier: '1000000000000000000'
        }
      ],
      contractAddress: '0x8e870d67f660d95d5be530380d0ec0bd388289e1',
      symbolImage: `${imageServerUrl}/paxos-logo-solo-64.png`
    },
    {
      currencyCode: 'SALT',
      currencyName: 'SALT',
      denominations: [
        {
          name: 'SALT',
          multiplier: '100000000'
        }
      ],
      contractAddress: '0x4156D3342D5c385a87D264F90653733592000581',
      symbolImage: `${imageServerUrl}/salt-logo-solo-64.png`
    },
    {
      currencyCode: 'MANA',
      currencyName: 'Decentraland',
      denominations: [
        {
          name: 'MANA',
          multiplier: '1000000000000000000'
        }
      ],
      contractAddress: '0x0F5D2fB29fb7d3CFeE444a200298f468908cC942',
      symbolImage: `${imageServerUrl}/decentraland-logo-solo-64.png`
    },
    {
      currencyCode: 'NEXO',
      currencyName: 'Nexo',
      denominations: [
        {
          name: 'NEXO',
          multiplier: '1000000000000000000'
        }
      ],
      contractAddress: '0xb62132e35a6c13ee1ee0f84dc5d40bad8d815206',
      symbolImage: `${imageServerUrl}/nexo-logo-solo-64.png`
    },
    {
      currencyCode: 'FUN',
      currencyName: 'FunFair',
      denominations: [
        {
          name: 'FUN',
          multiplier: '100000000'
        }
      ],
      contractAddress: '0x419D0d8BdD9aF5e606Ae2232ed285Aff190E711b',
      symbolImage: `${imageServerUrl}/funfair-logo-solo-64.png`
    },
    {
      currencyCode: 'KIN',
      currencyName: 'Kin',
      denominations: [
        {
          name: 'KIN',
          multiplier: '1000000000000000000'
        }
      ],
      contractAddress: '0x818Fc6C2Ec5986bc6E2CBf00939d90556aB12ce5',
      symbolImage: `${imageServerUrl}/kin-logo-solo-64.png`
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
      contractAddress: '0x514910771af9ca656af840dff83e8264ecf986ca',
      symbolImage: `${imageServerUrl}/chainlink-logo-solo-64.png`
    },
    {
      currencyCode: 'BRZ',
      currencyName: 'BRZ Token',
      denominations: [
        {
          name: 'BRZ',
          multiplier: '10000'
        }
      ],
      contractAddress: '0x420412E765BFa6d85aaaC94b4f7b708C89be2e2B',
      symbolImage: `${imageServerUrl}/brz-logo-solo-64.png`
    },
    {
      currencyCode: 'CREP',
      currencyName: 'Compound Augur',
      denominations: [
        {
          name: 'CREP',
          multiplier: '100000000'
        }
      ],
      contractAddress: '0x158079ee67fce2f58472a96584a73c7ab9ac95c1',
      symbolImage: `${imageServerUrl}/crep-logo-solo-64.png`
    },
    {
      currencyCode: 'CUSDC',
      currencyName: 'Compound USDC',
      denominations: [
        {
          name: 'CUSDC',
          multiplier: '100000000'
        }
      ],
      contractAddress: '0x39aa39c021dfbae8fac545936693ac917d5e7563',
      symbolImage: `${imageServerUrl}/cusdc-logo-solo-64.png`
    },
    {
      currencyCode: 'CETH',
      currencyName: 'Compound ETH',
      denominations: [
        {
          name: 'CETH',
          multiplier: '100000000'
        }
      ],
      contractAddress: '0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5',
      symbolImage: `${imageServerUrl}/ceth-logo-solo-64.png`
    },
    {
      currencyCode: 'CBAT',
      currencyName: 'Compound BAT',
      denominations: [
        {
          name: 'CBAT',
          multiplier: '100000000'
        }
      ],
      contractAddress: '0x6c8c6b02e7b2be14d4fa6022dfd6d75921d90e4e',
      symbolImage: `${imageServerUrl}/cbat-logo-solo-64.png`
    },
    {
      currencyCode: 'CZRX',
      currencyName: 'Compound ZRX',
      denominations: [
        {
          name: 'CZRX',
          multiplier: '100000000'
        }
      ],
      contractAddress: '0xb3319f5d18bc0d84dd1b4825dcde5d5f7266d407',
      symbolImage: `${imageServerUrl}/czrx-logo-solo-64.png`
    },
    {
      currencyCode: 'CWBTC',
      currencyName: 'Compound WBTC',
      denominations: [
        {
          name: 'CWBTC',
          multiplier: '100000000'
        }
      ],
      contractAddress: '0xc11b1268c1a384e55c48c2391d8d480264a3a7f4',
      symbolImage: `${imageServerUrl}/cwbtc-logo-solo-64.png`
    },
    {
      currencyCode: 'CSAI',
      currencyName: 'Compound SAI',
      denominations: [
        {
          name: 'CSAI',
          multiplier: '100000000'
        }
      ],
      contractAddress: '0xf5dce57282a584d2746faf1593d3121fcac444dc',
      symbolImage: `${imageServerUrl}/csai-logo-solo-64.png`
    },
    {
      currencyCode: 'CDAI',
      currencyName: 'Compound DAI',
      denominations: [
        {
          name: 'CDAI',
          multiplier: '100000000'
        }
      ],
      contractAddress: '0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643',
      symbolImage: `${imageServerUrl}/cdai-logo-solo-64.png`
    },
    {
      currencyCode: 'ETHBNT',
      currencyName: 'BNT Smart Token Relay',
      denominations: [
        {
          name: 'ETHBNT',
          multiplier: '1000000000000000000'
        }
      ],
      contractAddress: '0xb1CD6e4153B2a390Cf00A6556b0fC1458C4A5533',
      symbolImage: `${imageServerUrl}/bancor-logo-solo-64.png`
    },
    {
      currencyCode: 'MET',
      currencyName: 'Metronome',
      denominations: [
        {
          name: 'MET',
          multiplier: '1000000000000000000'
        }
      ],
      contractAddress: '0xa3d58c4e56fedcae3a7c43a725aee9a71f0ece4e',
      symbolImage: `${imageServerUrl}/met-logo-solo-64.png`
    }
  ]
}

export const makeEthereumPlugin = (opts: EdgeCorePluginOptions) => {
  return makeEthereumBasedPluginInner(opts, currencyInfo)
}
