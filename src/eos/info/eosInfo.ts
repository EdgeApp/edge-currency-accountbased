import { EdgeCurrencyInfo } from 'edge-core-js/types'

import { makeOuterPlugin } from '../../common/innerPlugin'
import type { EosTools } from '../EosTools'
import {
  asEosInfoPayload,
  EosInfoPayload,
  EosNetworkInfo,
  eosOtherMethodNames
} from '../eosTypes'
import { eosCustomTokenTemplate, eosMemoOptions } from './eosCommonInfo'

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
  powerUpServers: ['https://api.eospowerup.io/freePowerup'],
  uriProtocol: 'eos'
}

export const eosCurrencyInfo: EdgeCurrencyInfo = {
  currencyCode: 'EOS',
  customTokenTemplate: eosCustomTokenTemplate,
  displayName: 'EOS',
  memoOptions: eosMemoOptions,
  pluginId: 'eos',
  unsafeBroadcastTx: true,
  walletType: 'wallet:eos',

  // Explorers:
  addressExplorer: 'https://bloks.io/account/%s',
  transactionExplorer: 'https://bloks.io/transaction/%s',

  denominations: [
    {
      name: 'EOS',
      multiplier: '10000',
      symbol: 'E'
    }
  ]
}

export const eos = makeOuterPlugin<EosNetworkInfo, EosTools, EosInfoPayload>({
  currencyInfo: eosCurrencyInfo,
  asInfoPayload: asEosInfoPayload,
  networkInfo: eosNetworkInfo,
  otherMethodNames: eosOtherMethodNames,

  async getInnerPlugin() {
    return await import(
      /* webpackChunkName: "eos" */
      '../EosTools'
    )
  }
})
