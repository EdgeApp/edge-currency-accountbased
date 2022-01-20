/* global */
// @flow

import { type EdgeCurrencyInfo } from 'edge-core-js/types'

import { FIO_REQUESTS_TYPES } from './fioConst'

const defaultSettings: any = {
  apiUrls: [
    'https://testnet.fioprotocol.io:443/v1/',
    'https://testnet.fioprotocol.io:443/v1/',
    'https://testnet.fioprotocol.io:443/v1/'
  ],
  historyNodeUrls: ['https://fiotestnet.greymass.com/v1/'],
  fioRegApiUrl: 'https://reg.fio.dev/public-api/',
  fioDomainRegUrl: 'https://reg.fio.dev/domain/',
  fioAddressRegUrl: 'https://reg.fio.dev/address/',
  fioStakingApyUrl: '',
  defaultRef: 'edge',
  fallbackRef: 'edge',
  freeAddressRef: 'edgefree',
  errorCodes: {
    INVALID_FIO_ADDRESS: 'INVALID_FIO_ADDRESS',
    ALREADY_REGISTERED: 'ALREADY_REGISTERED',
    FIO_ADDRESS_IS_NOT_EXIST: 'FIO_ADDRESS_IS_NOT_EXIST',
    FIO_DOMAIN_IS_NOT_EXIST: 'FIO_DOMAIN_IS_NOT_EXIST',
    FIO_DOMAIN_IS_NOT_PUBLIC: 'FIO_DOMAIN_IS_NOT_PUBLIC',
    IS_DOMAIN_PUBLIC_ERROR: 'IS_DOMAIN_PUBLIC_ERROR',
    FIO_ADDRESS_IS_NOT_LINKED: 'FIO_ADDRESS_IS_NOT_LINKED',
    SERVER_ERROR: 'SERVER_ERROR'
  },
  fioRequestsTypes: FIO_REQUESTS_TYPES,
  balanceCurrencyCodes: {
    staked: 'FIO:STAKED',
    available: 'FIO:AVAILABLE',
    locked: 'FIO:LOCKED',
    accrued: 'FIO:ACCRUED'
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
  metaTokens: []
}
