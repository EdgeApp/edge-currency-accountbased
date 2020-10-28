/* global */
// @flow

import { type EdgeCurrencyInfo } from 'edge-core-js/types'

import { imageServerUrl } from '../common/utils'

const defaultSettings: any = {
  apiUrls: [
    'https://fio.eu.eosamsterdam.net/v1/',
    'https://fio.eosdac.io/v1/',
    'http://fioapi.nodeone.io:6881/v1/',
    'https://fio.eosphere.io/v1/',
    'https://fio.eosrio.io/v1/',
    'https://fio.acherontrading.com/v1/',
    'https://fio.eos.barcelona/v1/',
    'https://api.fio.eosdetroit.io/v1/',
    'https://fio.zenblocks.io/v1/',
    'https://api.fio.alohaeos.com/v1/',
    'https://fio.greymass.com/v1/',
    'https://fio.eosusa.news/v1/',
    'https://fio.eosargentina.io/v1/',
    'https://fio.cryptolions.io/v1/',
    'https://fio-mainnet.eosblocksmith.io/v1/',
    'https://api.fio.currencyhub.io/v1/',
    'https://fio.eoscannon.io/v1/',
    'https://fio.eosdublin.io/v1/',
    'https://api.fiosweden.org/v1/',
    'https://fio.maltablock.org/v1/'
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
  freeAddressRef: 'edgefree',
  errorCodes: {
    INVALID_FIO_ADDRESS: 'INVALID_FIO_ADDRESS',
    FIO_ADDRESS_IS_NOT_EXIST: 'FIO_ADDRESS_IS_NOT_EXIST',
    FIO_DOMAIN_IS_NOT_EXIST: 'FIO_DOMAIN_IS_NOT_EXIST',
    IS_DOMAIN_PUBLIC_ERROR: 'IS_DOMAIN_PUBLIC_ERROR',
    FIO_ADDRESS_IS_NOT_LINKED: 'FIO_ADDRESS_IS_NOT_LINKED'
  }
}

export const currencyInfo: EdgeCurrencyInfo = {
  // Basic currency information:
  currencyCode: 'FIO',
  displayName: 'FIO',
  pluginId: 'fio',
  walletType: 'wallet:fio',

  defaultSettings,

  addressExplorer: 'https://fio.bloks.io/key/%s',
  transactionExplorer: 'https://fio.bloks.io/transaction/%s',

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
