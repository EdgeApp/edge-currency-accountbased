// @flow
import { type EdgeCurrencyInfo } from 'edge-core-js/types'

import { imageServerUrl } from '../common/utils'
import { type TezosSettings } from './tezosTypes.js'

const otherSettings: TezosSettings = {
  /* Testnet (alphanet)
  tezosRpcNodes: [
    'https://rpcalpha.tzbeta.net',
    'https://alphanet-node.tzscan.io',
    'https://alphanet.tezrpc.me'
  ],
  tezosApiServers: [
    'https://api.alphanet.tzscan.io',
    'http://node1.nyc.tezos.org.sg:8091'
  ] */
  /* Mainnet */
  tezosRpcNodes: [
    'https://rpc.tulip.tools/mainnet',
    'https://mainnet.tezrpc.me',
    'https://mainnet-node.tzscan.io'
  ],
  tezosApiServers: [
    'https://api6.tzscan.io',
    'https://api1.tzscan.io',
    'https://api.tzbeta.net:8080',
    'http://node1.nyc.tezos.org.sg:8090',
    'https://api5.tzscan.io',
    'https://api2.tzscan.io',
    'https://api4.tzscan.io',
    'https://api3.tzscan.io'
  ]
}

const defaultSettings: any = {
  otherSettings,
  reveal: {
    defaultFee: '1269',
    gasLimit: '10000',
    storageLimit: '0'
  },
  transaction: {
    defaultFee: '1350',
    gasLimit: '10600',
    storageLimit: '277'
  },
  origination: {
    defaultFee: '1300',
    gasLimit: '10100',
    storageLimit: '277'
  },
  delegation: {
    defaultFee: '1300',
    gasLimit: '10100',
    storageLimit: '0'
  },
  burnFee: '257000'
}
export const currencyInfo: EdgeCurrencyInfo = {
  // Basic currency information:
  currencyCode: 'XTZ',
  displayName: 'Tezos',
  pluginName: 'tezos',
  walletType: 'wallet:tezos',
  supportsStaking: true,

  defaultSettings,

  addressExplorer: 'https://tzscan.io/%s',
  transactionExplorer: 'https://tzscan.io/%s',

  denominations: [
    // An array of Objects of the possible denominations for this currency
    {
      name: 'XTZ',
      multiplier: '1000000',
      symbol: 't'
    }
  ],
  symbolImage: `${imageServerUrl}/tezos-logo-solo-64.png`,
  symbolImageDarkMono: `${imageServerUrl}/tezos-logo-solo-64.png`,
  metaTokens: []
}
