import { EdgeCurrencyInfo } from 'edge-core-js/types'

import { makeOuterPlugin } from '../common/innerPlugin'
import type { TezosTools } from './TezosTools'
import { asTezosInfoPayload, TezosNetworkInfo } from './tezosTypes'

const networkInfo: TezosNetworkInfo = {
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
    'https://prod.tcinfra.net/rpc/mainnet/',
    'https://mainnet.ecadinfra.com/'

    // These nodes are broken / questionable:
    // 'https://teznode.letzbake.com',
    // 'https://rpc.tzbeta.net',
    // 'https://mainnet.tezrpc.me'
  ],
  tezosApiServers: ['https://api.tzkt.io'],

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

const currencyInfo: EdgeCurrencyInfo = {
  currencyCode: 'XTZ',
  displayName: 'Tezos',
  pluginId: 'tezos',
  walletType: 'wallet:tezos',

  // Explorers:
  addressExplorer: 'https://tzstats.com/%s',
  transactionExplorer: 'https://tzstats.com/%s',

  denominations: [
    {
      name: 'XTZ',
      multiplier: '1000000',
      symbol: 't'
    }
  ],

  // No memo support:
  memoOptions: []
}

export const tezos = makeOuterPlugin<TezosNetworkInfo, TezosTools>({
  currencyInfo,
  asInfoPayload: asTezosInfoPayload,
  networkInfo,

  async getInnerPlugin() {
    return await import(
      /* webpackChunkName: "tezos" */
      './TezosTools'
    )
  }
})
