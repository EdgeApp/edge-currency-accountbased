import { EdgeCurrencyInfo } from 'edge-core-js/types'

import { makeOuterPlugin } from '../common/innerPlugin'
import type { TronTools } from './TronTools'
import {
  asTronInfoPayload,
  TronInfoPayload,
  TronNetworkInfo
} from './tronTypes'

const networkInfo: TronNetworkInfo = {
  tronApiServers: ['https://api.trongrid.io'],
  tronNodeServers: [
    'https://rpc.ankr.com/http/tron',
    'https://rpc.coinsdo.net/trx-api',
    'http://3.225.171.164:8090',
    'http://52.53.189.99:8090',
    'http://18.196.99.16:8090',
    'http://34.253.187.192:8090',
    // 'http://52.56.56.149:8090',
    // 'http://35.180.51.163:8090',
    'http://54.252.224.209:8090',
    // 'http://18.228.15.36:8090',
    // 'http://52.15.93.92:8090',
    // 'http://34.220.77.106:8090',
    // 'http://13.127.47.162:8090',
    // 'http://13.124.62.58:8090',
    // 'http://35.182.229.162:8090',
    // 'http://18.209.42.127:8090',
    'http://3.218.137.187:8090',
    'http://34.237.210.82:8090'
  ],
  defaultDerivationPath: "m/44'/195'/0'/0/0", // Default for initial release was "m/44'/195'/0'/0",
  defaultFeeLimit: 1000000000, // TODO: 1000 TRX. Should probably update.
  defaultFreezeDurationInDays: 3,
  trc20BalCheckerContract: 'TN8RtFXeQZyFHGmH1iiSRm5r4CRz1yWkCf'
}

const currencyInfo: EdgeCurrencyInfo = {
  currencyCode: 'TRX',
  assetDisplayName: 'Tron',
  chainDisplayName: 'Tron',
  pluginId: 'tron',
  walletType: 'wallet:tron',

  // Explorers:
  addressExplorer: 'https://tronscan.org/#/address/%s',
  transactionExplorer: 'https://tronscan.org/#/transaction/%s',

  customTokenTemplate: [
    {
      displayName: 'Contract Address',
      key: 'contractAddress',
      type: 'string'
    }
  ],
  denominations: [
    {
      name: 'TRX',
      multiplier: '1000000',
      symbol: 'T'
    }
  ],

  // https://developers.tron.network/v3.7/docs/how-to-build-a-transaction-locally
  memoOptions: [{ type: 'text', memoName: 'note' }],

  // Deprecated:
  displayName: 'Tron'
}

export const tron = makeOuterPlugin<
  TronNetworkInfo,
  TronTools,
  TronInfoPayload
>({
  currencyInfo,
  asInfoPayload: asTronInfoPayload,
  networkInfo,

  async getInnerPlugin() {
    return await import(
      /* webpackChunkName: "tron" */
      './TronTools'
    )
  }
})
