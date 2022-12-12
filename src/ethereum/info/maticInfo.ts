import { EdgeCurrencyInfo } from 'edge-core-js/types'

import { makeOuterPlugin } from '../../common/innerPlugin'
import type { EthereumTools } from '../ethPlugin'
import { EthereumFees, EthereumSettings } from '../ethTypes'

// Fees are in Wei
const defaultNetworkFees: EthereumFees = {
  default: {
    baseFeemultiplier: undefined,
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
    'https://polygon-rpc.com/',
    'https://rpc.polycat.finance',
    'https://rpc-mainnet.maticvigil.com',
    'https://matic-mainnet.chainstacklabs.com',
    'https://rpc-mainnet.matic.quiknode.pro'
  ],
  evmScanApiServers: ['https://api.polygonscan.com'],
  blockcypherApiServers: [],
  blockbookServers: [],
  uriNetworks: ['polygon'],
  ercTokenStandard: 'ERC20',
  chainParams: {
    chainId: 137,
    name: 'MATIC Mainnet'
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
  pluginMnemonicKeyName: 'polygonMnemonic',
  pluginRegularKeyName: 'polygonKey',
  ethGasStationUrl: 'https://gasstation-mainnet.matic.network/',
  defaultNetworkFees
}

const defaultSettings: any = {
  customFeeSettings: ['gasLimit', 'gasPrice'],
  otherSettings
}

export const currencyInfo: EdgeCurrencyInfo = {
  // Basic currency information:
  currencyCode: 'MATIC',
  displayName: 'Polygon',
  pluginId: 'polygon', // matching mnemonic here
  walletType: 'wallet:polygon',
  memoType: 'hex',

  canReplaceByFee: true,
  defaultSettings,

  addressExplorer: 'https://polygonscan.com/address/%s',
  transactionExplorer: 'https://polygonscan.com/tx/%s',

  denominations: [
    // An array of Objects of the possible denominations for this currency
    {
      name: 'MATIC',
      multiplier: '1000000000000000000',
      symbol: 'MATIC'
    },
    {
      name: 'mMATIC',
      multiplier: '1000000000000000',
      symbol: 'mMATIC'
    }
  ],
  metaTokens: [
    {
    contractAddress: "0xd6df932a45c0f255f85145f286ea0b292b21c90b",
    currencyCode: "AAVE",
    currencyName: "Aave",
    denominations: [
        {
        multiplier: "1000000000000000000",
        name: "AAVE"
        }
      ]
    },
    {
    contractAddress: "0x3BA4c387f786bFEE076A58914F5Bd38d668B42c3",
    currencyCode: "BNB",
    currencyName: "Binance",
    denominations: [
        {
        multiplier: "1000000000000000000",
        name: "BNB"
        }
      ]
    },
    {
    contractAddress: "0xdab529f40e671a1d4bf91361c21bf9f0c9712ab7",
    currencyCode: "BUSD",
    currencyName: "Binance USD",
    denominations: [
        {
        multiplier: "1000000000000000000",
        name: "BUSD"
        }
      ]
    },
    {
    contractAddress: "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063",
    currencyCode: "DAI",
    currencyName: "Dai Stablecoin",
    denominations: [
        {
        multiplier: "1000000000000000000",
        name: "DAI"
        }
      ]
    },
    {
    contractAddress: "0xc9c1c1c20b3658f8787cc2fd702267791f224ce1",
    currencyCode: "FTM",
    currencyName: "Fantom",
    denominations: [
        {
        multiplier: "1000000000000000000",
        name: "FTM"
        }
      ]
    },
    {
    contractAddress: "0x53e0bca35ec356bd5dddfebbd1fc0fd03fabad39",
    currencyCode: "LINK",
    currencyName: "Chainlink",
    denominations: [
        {
        multiplier: "1000000000000000000",
        name: "LINK"
        }
      ]
    },
    {
    contractAddress: "0xa1c57f48f0deb89f569dfbe6e2b7f46d33606fd4",
    currencyCode: "MANA",
    currencyName: "Decentraland",
    denominations: [
        {
        multiplier: "1000000000000000000",
        name: "MANA"
        }
      ]
    },
    {
    contractAddress: "0x6f7C932e7684666C9fd1d44527765433e01fF61d",
    currencyCode: "MKR",
    currencyName: "Maker",
    denominations: [
        {
        multiplier: "1000000000000000000",
        name: "MKR"
        }
      ]
    },
    {
    contractAddress: "0x2e1ad108ff1d8c782fcbbb89aad783ac49586756",
    currencyCode: "TUSD",
    currencyName: "TrueUSD",
    denominations: [
        {
        multiplier: "1000000000000000000",
        name: "TUSD"
        }
      ]
    },
    {
    contractAddress: "0xb33eaad8d922b1083446dc23f610c2567fb5180f",
    currencyCode: "UNI",
    currencyName: "Uniswap",
    denominations: [
        {
        multiplier: "1000000000000000000",
        name: "UNI"
        }
      ]
    },
    {
    contractAddress: "0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
    currencyCode: "USDC",
    currencyName: "USD Coin",
    denominations: [
        {
        multiplier: "1000000",
        name: "USDC"
        }
      ]
    },
    {
    contractAddress: "0xc2132d05d31c914a87c6611c10748aeb04b58e8f",
    currencyCode: "USDT",
    currencyName: "Tether",
    denominations: [
        {
        multiplier: "1000000",
        name: "USDT"
        }
      ]
    },
    {
    contractAddress: "0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6",
    currencyCode: "WBTC",
    currencyName: "Wrapped Bitcoin",
    denominations: [
        {
        multiplier: "100000000",
        name: "WBTC"
        }
      ]
    },
    {
    contractAddress: "0x7ceb23fd6bc0add59e62ac25578270cff1b9f619",
    currencyCode: "WETH",
    currencyName: "Wrapped ETH",
    denominations: [
        {
        multiplier: "1000000000000000000",
        name: "WETH"
        }
      ]
    },
    {
    contractAddress: "0xda537104d6a5edd53c6fbba9a898708e465260b6",
    currencyCode: "YFI",
    currencyName: "Yearn Finance",
    denominations: [
        {
        multiplier: "1000000000000000000",
        name: "YFI"
        }
      ]
    }
  ]
}

export const polygon = makeOuterPlugin<{}, EthereumTools>({
  currencyInfo,
  networkInfo: {},

  async getInnerPlugin() {
    return await import('../ethPlugin')
  }
})
