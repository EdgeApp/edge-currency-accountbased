/* global */
// @flow

import { type EdgeCurrencyInfo } from 'edge-core-js/types'

import { imageServerUrl } from '../common/utils'

const defaultSettings: any = {
  apiUrls: [
    'https://fio.greymass.com:443/v1/',
    'https://fio.zenblocks.io:443/v1/',
    'https://api.fio.alohaeos.com:443/v1/',
    'https://fio-mainnet.eosblocksmith.io:443/v1/',
    'https://fio.eu.eosamsterdam.net:443/v1/',
    'https://fio.eosdac.io:443/v1/',
    'http://fioapi.nodeone.io:6881/v1/',
    'https://fio.acherontrading.com:443/v1/',
    'https://fio.eos.barcelona:443/v1/',
    'https://fio.eosusa.news:443/v1/',
    'https://fio.eosargentina.io:443/v1/',
    'https://api.fio.currencyhub.io:443/v1/',
    'https://fio.eoscannon.io:443/v1/',
    'https://fio.eossweden.org:443/v1/',
    'https://fio.maltablock.org:443/v1/',
    'https://api.fio.eosdetroit.io:443/v1/',
    'https://fio.eosdublin.io:443/v1/',
    'https://fio.eosphere.io:443/v1/',
    'https://fio.cryptolions.io:443/v1/'
  ],
  historyNodeUrls: [
    'https://fio.greymass.com/v1/',
    'http://api.fio.eosdetroit.io/v1/',
    'https://fio.greymass.com/v1/',
    'https://fio.eosphere.io/v1/',
    'https://fio.eossweden.org/v1/'
  ],
  fioRegApiUrl: 'https://reg.fioprotocol.io/public-api/',
  fioDomainRegUrl: 'https://reg.fioprotocol.io/domain/',
  fioAddressRegUrl: 'https://reg.fioprotocol.io/address/',
  defaultRef: 'edge',
  fallbackRef: 'edge',
  freeAddressRef: 'edgefree'
}

export const currencyInfo: EdgeCurrencyInfo = {
  // Basic currency information:
  currencyCode: 'FIO',
  displayName: 'FIO',
  pluginId: 'fio',
  walletType: 'wallet:fio',

  defaultSettings,

  addressExplorer: 'https://explorer.fioprotocol.io/pubkey/%s',
  transactionExplorer: 'https://explorer.fioprotocol.io/transaction/%s',

  denominations: [
    // An array of Objects of the possible denominations for this currency
    {
      name: 'FIO',
      multiplier: '1000000000',
      symbol: 'ᵮ'
    }
  ],
  symbolImage: `${imageServerUrl}/fio-logo-solo-64.png`,
  symbolImageDarkMono: `${imageServerUrl}/fio-logo-solo-64.png`,
  metaTokens: []
}
