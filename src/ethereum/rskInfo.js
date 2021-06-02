/* global */
// @flow

import type {
  EdgeCorePluginOptions,
  EdgeCurrencyInfo
} from 'edge-core-js/types'

import { imageServerUrl } from './../common/utils.js'
import { makeEthereumBasedPluginInner } from './ethPlugin'
import type { EthereumSettings } from './ethTypes.js'

const defaultNetworkFees = {
  default: {
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
    }
  }
}

const otherSettings: EthereumSettings = {
  rpcServers: ['https://public-node.rsk.co'],
  etherscanApiServers: ['https://blockscout.com/rsk/mainnet'],
  blockcypherApiServers: [],
  blockbookServers: [],
  blockchairApiServers: [],
  alethioApiServers: [],
  alethioCurrrencies: null,
  amberdataRpcServers: [],
  amberdataApiServers: [],
  amberDataBlockchainId: '', // Only used for ETH right now
  uriNetworks: ['rsk', 'rbtc'],
  ercTokenStandard: 'RRC20',
  chainId: 30,
  checkUnconfirmedTransactions: false,
  iosAllowedTokens: {
    RIF: true,
    RDOC: true,
    DOC: true,
    BITP: true,
    RIFP: true,
    MOC: true
  },
  hdPathCoinType: 137,
  pluginMnemonicKeyName: 'rskMnemonic',
  pluginRegularKeyName: 'rskKey',
  ethGasStationUrl: null,
  defaultNetworkFees
}

const defaultSettings: any = {
  customFeeSettings: ['gasLimit', 'gasPrice'],
  otherSettings
}

export const currencyInfo: EdgeCurrencyInfo = {
  // Basic currency information:
  currencyCode: 'RBTC',
  displayName: 'RSK',
  pluginId: 'rsk',
  walletType: 'wallet:rsk',

  defaultSettings,

  addressExplorer: 'https://explorer.rsk.co/address/%s',
  transactionExplorer: 'https://explorer.rsk.co/tx/%s',

  denominations: [
    // An array of Objects of the possible denominations for this currency
    {
      name: 'RBTC',
      multiplier: '1000000000000000000',
      symbol: 'RBTC'
    }
  ],
  symbolImage: `${imageServerUrl}/rsk-logo-solo-64.png`, // TODO: add logo
  symbolImageDarkMono: `${imageServerUrl}/rsk-logo-solo-64.png`,
  metaTokens: [
    // Array of objects describing the supported metatokens
    {
      currencyCode: 'RIF',
      currencyName: 'RIF Token',
      denominations: [
        {
          name: 'RIF',
          multiplier: '1000000000000000000'
        }
      ],
      contractAddress: '0x2acc95758f8b5f583470ba265eb685a8f45fc9d5',
      symbolImage: `${imageServerUrl}/rif-logo-solo-64.png`
    },
    {
      currencyCode: 'RDOC',
      currencyName: 'RIF Dollar on Chain',
      denominations: [
        {
          name: 'RDOC',
          multiplier: '1000000000000000000'
        }
      ],
      contractAddress: '0x2d919f19d4892381d58edebeca66d5642cef1a1f',
      symbolImage: `${imageServerUrl}/rdoc-logo-solo-64.png`
    },
    {
      currencyCode: 'DOC',
      currencyName: 'Dollar on Chain',
      denominations: [
        {
          name: 'DOC',
          multiplier: '1000000000000000000'
        }
      ],
      contractAddress: '0xe700691da7b9851f2f35f8b8182c69c53ccad9db',
      symbolImage: `${imageServerUrl}/doc-logo-solo-64.png`
    },
    {
      currencyCode: 'BITP',
      currencyName: 'BitPRO',
      denominations: [
        {
          name: 'BITP',
          multiplier: '1000000000000000000'
        }
      ],
      contractAddress: '0x440cd83c160de5c96ddb20246815ea44c7abbca8',
      symbolImage: `${imageServerUrl}/bitp-logo-solo-64.png`
    },
    {
      currencyCode: 'RIFP',
      currencyName: 'RIFPro',
      denominations: [
        {
          name: 'RIFP',
          multiplier: '1000000000000000000'
        }
      ],
      contractAddress: '0xf4d27c56595ed59b66cc7f03cff5193e4bd74a61',
      symbolImage: `${imageServerUrl}/rifp-logo-solo-64.png`
    },
    {
      currencyCode: 'MOC',
      currencyName: 'MOC',
      denominations: [
        {
          name: 'MOC',
          multiplier: '1000000000000000000'
        }
      ],
      contractAddress: '0x9ac7fe28967b30e3a4e6e03286d715b42b453d10',
      symbolImage: `${imageServerUrl}/moc-logo-solo-64.png`
    }
  ]
}
export const makeRskPlugin = (opts: EdgeCorePluginOptions) => {
  return makeEthereumBasedPluginInner(opts, currencyInfo)
}
