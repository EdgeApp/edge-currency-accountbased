/**
 * Created by Kylan on 2020-02-14
 */
/* global fetch */
// @flow

import {
  type EdgeCorePluginOptions,
  type EdgeCurrencyInfo
} from 'edge-core-js/types'

import { imageServerUrl } from '../common/utils'
import { makeEosBasedPluginInner } from './eosBasedPlugin'
import { type EosJsConfig, type EosSettings } from './eosTypes'

// ----EOSIO MAIN NET----
export const eosJsConfig: EosJsConfig = {
  chainId: 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906', // eosio main net
  keyProvider: [],
  httpEndpoint: '', // main net
  fetch: fetch,
  verbose: false // verbose logging such as API activity
}

const otherSettings: EosSettings = {
  eosActivationServers: [
    'https://eos-pay-sf2.edgesecure.co',
    'http://38.75.137.119:3873' // Account.TelosCrew.com
  ],
  eosHyperionNodes: ['https://api.eossweden.org'],
  eosNodes: [
    'https://api.redpacketeos.com',
    'https://api.eoseoul.io',
    'https://api.eoslaomao.com',
    'https://eos-api.b1.run',
    'https://mainnet.eoscannon.io',
    'https://api.eos.wiki',
    'https://mainnet.eosio.sg',
    'https://eos.newdex.one',
    'https://api.bitmars.one',
    'https://node1.zbeos.com',
    'https://pubnode.eosrapid.com',
    'https://api.eosbeijing.one',
    'https://api.eosn.io',
    'https://eosapi.hoo.com',
    'https://eos-api.inbex.com',
    'https://api.bp.lambda.im',
    'https://eos.eoscafeblock.com',
    'https://publicapi-mainnet.eosauthority.com',
    'https://mainnet.eoscanada.com',
    'https://api.eos.education',
    'https://api.eosargentina.io',
    'https://api.acroeos.one',
    'https://api.eostitan.com',
    'https://eos-mainnet.ecoboost.app',
    'https://bp.dexeos.io',
    'https://hapi.eosrio.io',
    'https://eu.eosdac.io',
    'https://bp.cryptolions.io',
    'https://eos.greymass.com',
    'https://api-emlg.eosnairobi.io:8089',
    'https://api.eoscleaner.com',
    'https://mainnet.libertyblock.io:7777',
    'https://mainnet.genereos.io',
    'https://api.jeda.one',
    'https://node1.eosphere.io',
    'https://api.sheos.org',
    'https://eos-mainnet.eosblocksmith.io:443',
    'https://api-mainnet.eosgravity.com',
    'https://api.tokenika.io',
    'https://api.eostribe.io',
    'https://node1.eosvibes.io',
    'https://api.eosdetroit.io',
    'https://eospublic.chainrift.com',
    'https://eosapi.blockmatrix.network',
    'https://node.eosflare.io'
  ],
  eosFuelServers: ['https://eos.greymass.com']
}

const defaultSettings: any = {
  otherSettings
}

export const eosCurrencyInfo: EdgeCurrencyInfo = {
  // Basic currency information:
  currencyCode: 'EOS',
  displayName: 'EOS',
  pluginName: 'eos',
  walletType: 'wallet:eos',

  defaultSettings,

  addressExplorer: 'https://eospark.com/account/%s',
  transactionExplorer: 'https://eospark.com/tx/%s',

  denominations: [
    // An array of Objects of the possible denominations for this currency
    {
      name: 'EOS',
      multiplier: '10000',
      symbol: 'E'
    }
  ],
  symbolImage: `${imageServerUrl}/eos-logo-solo-64.png`,
  symbolImageDarkMono: `${imageServerUrl}/eos-logo-solo-64.png`,
  metaTokens: []
}

export const makeEosPlugin = (opts: EdgeCorePluginOptions) => {
  return makeEosBasedPluginInner(opts, eosCurrencyInfo, eosJsConfig)
}
