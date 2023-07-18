import { EdgeCurrencyInfo } from 'edge-core-js/types'

import { makeOuterPlugin } from '../common/innerPlugin'
import { fioRegApiErrorCodes } from './fioError'
import type { FioTools } from './FioTools'
import { FioNetworkInfo, fioOtherMethodNames } from './fioTypes'

const networkInfo: FioNetworkInfo = {
  apiUrls: [
    'https://fio.eu.eosamsterdam.net/v1/',
    'https://fio.eosdac.io/v1/',
    'https://fio.eosrio.io/v1/',
    // 'https://fio.acherontrading.com/v1/', running v3.2.0
    'https://fio.eos.barcelona/v1/',
    'https://api.fio.alohaeos.com/v1/',
    // 'https://fio.greymass.com/v1/', // offline
    'https://fio.eosargentina.io/v1/',
    'https://fio.cryptolions.io/v1/',
    'https://api.fio.currencyhub.io/v1/',
    'https://fio.eostribe.io/v1/',
    // 'https://api.fio.greeneosio.com/v1/', running v3.2.0
    'https://api.fio.services/v1/',
    'https://fio.eosusa.news/v1/',
    // 'https://fio-api.eosiomadrid.io/v1/', constant 403 errors
    'https://fio.eosphere.io/v1/'
  ],
  historyNodeUrls: [
    'https://fio.eosphere.io/v1/',
    'https://api.fio.detroitledger.tech/v1/',
    'https://api.fiosweden.org/v1/',
    'https://fio.blockpane.com/v1/',
    'https://fio.greymass.com/v1/'
  ],
  fioRegApiUrl: 'https://reg.fioprotocol.io/public-api/',
  fioDomainRegUrl: 'https://reg.fioprotocol.io/domain/',
  fioAddressRegUrl: 'https://reg.fioprotocol.io/address/',
  fioStakingApyUrl: 'https://fioprotocol.io/staking',
  defaultRef: 'edge',
  fallbackRef: 'edge',
  freeAddressRef: 'edgefree',
  errorCodes: fioRegApiErrorCodes,
  balanceCurrencyCodes: {
    // TODO: Remove these currencyCodes in favor of adding a dedicated locked balances field to the API
    staked: 'FIO:STAKED',
    locked: 'FIO:LOCKED'
  },
  chainId: '21dcae42c0182200e93f954a074011f9048a7624c6fe81d3c9541a614a88bd1c'
}

export const currencyInfo: EdgeCurrencyInfo = {
  // Basic currency information:
  currencyCode: 'FIO',
  displayName: 'FIO',
  pluginId: 'fio',
  walletType: 'wallet:fio',

  defaultSettings: { ...networkInfo },

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
  metaTokens: [], // Deprecated

  unsafeSyncNetwork: true
}

export const fio = makeOuterPlugin<FioNetworkInfo, FioTools>({
  currencyInfo,
  networkInfo,
  otherMethodNames: fioOtherMethodNames,

  async getInnerPlugin() {
    return await import(
      /* webpackChunkName: "fio" */
      './FioTools'
    )
  }
})
