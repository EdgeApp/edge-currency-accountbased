import { EdgeCurrencyInfo, JsonObject } from 'edge-core-js/types'

import { makeOuterPlugin } from '../common/innerPlugin'
import type { MoneroTools } from './MoneroTools'
import {
  EDGE_MONERO_LWS_SERVER,
  MoneroNetworkInfo,
  MoneroUserSettings
} from './moneroTypes'

const networkInfo: MoneroNetworkInfo = {
  networkType: 0
}

const defaultSettings: MoneroUserSettings = {
  enableCustomServers: false,
  moneroLightwalletServer: EDGE_MONERO_LWS_SERVER
}

export const currencyInfo: EdgeCurrencyInfo = {
  currencyCode: 'XMR',
  displayName: 'Monero',
  pluginId: 'monero',
  requiredConfirmations: 10,
  walletType: 'wallet:monero',

  addressExplorer: 'https://xmrchain.net/search?value=%s',
  transactionExplorer:
    'https://blockchair.com/monero/transaction/%s?from=edgeapp',

  denominations: [
    {
      name: 'XMR',
      multiplier: '1000000000000',
      symbol: 'ɱ'
    }
  ],

  defaultSettings,

  unsafeSyncNetwork: true,
  chainDisplayName: 'Monero',
  assetDisplayName: 'Monero'
}

export const monero = makeOuterPlugin<
  MoneroNetworkInfo,
  MoneroTools,
  JsonObject
>({
  currencyInfo,
  asInfoPayload: payload => payload,
  networkInfo,

  async getInnerPlugin() {
    return await import(
      /* webpackChunkName: "monero" */
      './MoneroTools'
    )
  }
})
