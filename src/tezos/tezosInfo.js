// @flow
import { type EdgeCurrencyInfo } from 'edge-core-js/types'

import { type TezosSettings } from './tezosTypes.js'

const otherSettings: TezosSettings = {
  // Testnet (alphanet):
  // tezosRpcNodes: [
  //   'https://rpcalpha.tzbeta.net',
  //   'https://alphanet-node.tzscan.io',
  //   'https://alphanet.tezrpc.me'
  // ],
  // tezosApiServers: [
  //   'https://api.alphanet.tzscan.io',
  //   'http://node1.nyc.tezos.org.sg:8091'
  // ]

  // Mainnet:
  tezosRpcNodes: [
    'https://rpc.tzbeta.net',
    //  'https://teznode.letzbake.com',
    'https://mainnet.tezrpc.me'
  ],
  tezosApiServers: ['https://api.tzkt.io']
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
  pluginId: 'tezos',
  walletType: 'wallet:tezos',

  defaultSettings,

  addressExplorer: 'https://tzstats.com/%s',
  transactionExplorer: 'https://tzstats.com/%s',

  denominations: [
    // An array of Objects of the possible denominations for this currency
    {
      name: 'XTZ',
      multiplier: '1000000',
      symbol: 't'
    }
  ],
  metaTokens: []
}
