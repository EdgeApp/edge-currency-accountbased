import { EdgeCurrencyInfo } from 'edge-core-js/types'

import { makeOuterPlugin } from '../common/innerPlugin'
import type { FilecoinTools } from './FilecoinTools'
import { asFilecoinInfoPayload, FilecoinNetworkInfo } from './filecoinTypes'

const networkInfo: FilecoinNetworkInfo = {
  filfoxUrl: 'https://calibration.filfox.info/api/v1',
  filscanUrl: 'https://api-cali.filscan.io/api/v1',
  hdPathCoinType: 461,
  networkPrefix: 'Testnet',
  rpcNode: {
    networkName: 'Calibration',
    url: 'https://api.calibration.node.glif.io/'
  }
}

const currencyInfo: EdgeCurrencyInfo = {
  currencyCode: 'tFIL',
  displayName: 'Filecoin Testnet (Calibration)',
  pluginId: 'calibration',
  requiredConfirmations: 900,
  unsafeBroadcastTx: true,
  walletType: 'wallet:calibration',

  // Explorers:
  addressExplorer: 'https://calibration.filfox.info/en/address/%s',
  transactionExplorer: 'https://calibration.filfox.info/en/message/%s',

  denominations: [
    {
      name: 'tFIL',
      multiplier: '1000000000000000000',
      symbol: '⨎'
    },
    {
      name: 'milliFIL',
      multiplier: '1000000000000000',
      symbol: 'm⨎'
    },
    {
      name: 'microFIL',
      multiplier: '1000000000000',
      symbol: 'µ⨎'
    },
    {
      name: 'nanoFIL',
      multiplier: '1000000000',
      symbol: 'n⨎'
    },
    {
      name: 'picoFIL',
      multiplier: '1000000',
      symbol: 'p⨎'
    },
    {
      name: 'femtoFIL',
      multiplier: '1000',
      symbol: 'f⨎'
    },
    {
      name: 'attoFIL',
      multiplier: '1',
      symbol: 'a⨎'
    }
  ]
}

export const calibration = makeOuterPlugin<FilecoinNetworkInfo, FilecoinTools>({
  currencyInfo,
  asInfoPayload: asFilecoinInfoPayload,
  networkInfo,

  checkEnvironment: () => {
    if (global.BigInt == null) {
      throw new Error('Filecoin requires BigInt support')
    }
  },

  async getInnerPlugin() {
    return await import(
      /* webpackChunkName: "filecoin" */
      './FilecoinTools'
    )
  }
})
