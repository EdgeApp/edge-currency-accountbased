import { EdgeCurrencyInfo } from 'edge-core-js/types'

import { makeOuterPlugin } from '../common/innerPlugin'
import { fioRegApiErrorCodes } from './fioError'
import type { FioTools } from './FioTools'
import {
  asFioInfoPayload,
  FioInfoPayload,
  FioNetworkInfo,
  fioOtherMethodNames
} from './fioTypes'

const networkInfo: FioNetworkInfo = {
  apiUrls: [
    'https://fio.eosdac.io/v1/',
    'https://api.fio.alohaeos.com/v1/',
    'https://fio.eosargentina.io/v1/',
    'https://api.fio.currencyhub.io/v1/',
    'https://api.fio.services/v1/',
    'https://fio.eosphere.io/v1/',
    'https://fio.blockpane.com/v1/'
  ],
  historyNodeUrls: [
    'https://fio.eosphere.io/v1/',
    'https://api.fio.detroitledger.tech/v1/',
    'https://api.fiosweden.org/v1/',
    'https://fio.blockpane.com/v1/'
  ],
  fioRegApiUrl: 'https://reg.fioprotocol.io/public-api/',
  fioDomainRegUrl: 'https://reg.fioprotocol.io/domain/',
  fioAddressRegUrl: 'https://reg.fioprotocol.io/address/',
  fioStakingApyUrl: 'https://fioprotocol.io/staking',
  defaultRef: 'edge',
  fallbackRef: 'edge',
  freeAddressRef: 'edgefree',
  errorCodes: fioRegApiErrorCodes,
  chainId: '21dcae42c0182200e93f954a074011f9048a7624c6fe81d3c9541a614a88bd1c'
}

const currencyInfo: EdgeCurrencyInfo = {
  currencyCode: 'FIO',
  assetDisplayName: 'FIO',
  chainDisplayName: 'FIO',
  pluginId: 'fio',
  unsafeSyncNetwork: true,
  walletType: 'wallet:fio',

  // Explorers:
  addressExplorer: 'https://fio.bloks.io/key/%s',
  transactionExplorer: 'https://fio.bloks.io/transaction/%s',

  denominations: [
    {
      name: 'FIO',
      multiplier: '1000000000',
      symbol: 'ᵮ'
    }
  ],

  // No memo support:
  memoOptions: [],

  // Deprecated, but secretly used by edge-react-gui:
  defaultSettings: {
    errorCodes: networkInfo.errorCodes,
    defaultRef: networkInfo.defaultRef,
    fallbackRef: networkInfo.fallbackRef,
    fioAddressRegUrl: networkInfo.fioAddressRegUrl,
    freeAddressRef: networkInfo.freeAddressRef
  },
  displayName: 'FIO'
}

export const fio = makeOuterPlugin<FioNetworkInfo, FioTools, FioInfoPayload>({
  currencyInfo,
  asInfoPayload: asFioInfoPayload,
  networkInfo,
  otherMethodNames: fioOtherMethodNames,

  async getInnerPlugin() {
    return await import(
      /* webpackChunkName: "fio" */
      './FioTools'
    )
  }
})
