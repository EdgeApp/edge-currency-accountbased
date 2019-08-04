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
    'https://mainnet.tezrpc.me',
    'https://mainnet-node.tzscan.io',
    'https://tezos-rpc.nodes.polychainlabs.com'
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
  fee: {
    transaction: '1350',
    reveal: '1300',
    burn: '257000'
  },
  limit: {
    gas: '10600',
    storage: '277'
  }
}
export const currencyInfo: EdgeCurrencyInfo = {
  // Basic currency information:
  currencyCode: 'XTZ',
  displayName: 'Tezos',
  pluginName: 'tezos',
  walletType: 'wallet:tezos',

  defaultSettings,

  addressExplorer: 'https://tzscan.io/%s',
  transactionExplorer: 'https://tzscan.io/%s',

  denominations: [
    // An array of Objects of the possible denominations for this currency
    {
      name: 'XTZ',
      multiplier: '1000000',
      symbol: 'ꜩ'
    }
  ],
  symbolImage: `${imageServerUrl}/tezos-logo-solo-64.png`,
  symbolImageDarkMono: `${imageServerUrl}/tezos-logo-solo-64.png`,
  metaTokens: []
}
