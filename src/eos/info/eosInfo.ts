import { EdgeCurrencyInfo } from 'edge-core-js/types'

import { makeOuterPlugin } from '../../common/innerPlugin'
import type { EosTools } from '../eosPlugin'
import type { EosNetworkInfo } from '../eosTypes'
import { eosOtherMethodNames } from '../eosTypes'

// ----EOSIO MAIN NET----
export const eosNetworkInfo: EosNetworkInfo = {
  chainId: 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906', // eosio main net

  eosActivationServers: ['https://eospay.edge.app'],
  eosHyperionNodes: ['https://api.eossweden.org'],
  eosNodes: [
    'https://api.eoseoul.io',
    'https://api.eoslaomao.com',
    'https://mainnet.eoscannon.io',
    'https://api.eos.wiki',
    'https://mainnet.eosio.sg',
    'https://eos.newdex.one',
    'https://api.bitmars.one',
    'https://node1.zbeos.com',
    'https://api.eosn.io'
  ],
  eosDfuseServers: ['https://eos.dfuse.eosnation.io'],
  uriProtocol: 'eos'
}

const denominations = [
  // An array of Objects of the possible denominations for this currency
  {
    name: 'EOS',
    multiplier: '10000',
    symbol: 'E'
  }
]

export const eosCurrencyInfo: EdgeCurrencyInfo = {
  // Basic currency information:
  currencyCode: 'EOS',
  displayName: 'EOS',
  pluginId: 'eos',
  walletType: 'wallet:eos',

  defaultSettings: {},

  memoMaxLength: 256,

  addressExplorer: 'https://bloks.io/account/%s',
  transactionExplorer: 'https://bloks.io/transaction/%s',

  denominations,
  metaTokens: [] // Deprecated
}

export const eos = makeOuterPlugin<EosNetworkInfo, EosTools>({
  currencyInfo: eosCurrencyInfo,
  networkInfo: eosNetworkInfo,
  otherMethodNames: eosOtherMethodNames,

  async getInnerPlugin() {
    return await import(
      /* webpackChunkName: "eos" */
      '../eosPlugin'
    )
  }
})
