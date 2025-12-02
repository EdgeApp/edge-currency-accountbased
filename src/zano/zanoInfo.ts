import { EdgeCurrencyInfo, EdgeTokenMap } from 'edge-core-js/types'

import { makeOuterPlugin } from '../common/innerPlugin'
import { makeMetaTokens } from '../common/tokenHelpers'
import type { ZanoTools } from './ZanoTools'
import {
  asZanoInfoPayload,
  createZanoTokenId,
  ZanoInfoPayload,
  ZanoNetworkInfo
} from './zanoTypes'

const builtinTokens: EdgeTokenMap = {
  f5413f195b3347a3822ea6100e4db70f10b34ea0b22822af0ba15258d139fb71: {
    currencyCode: 'TALLY',
    displayName: 'Tally Note',
    denominations: [
      {
        name: 'TALLY',
        multiplier: '1000000'
      }
    ],
    networkLocation: {
      contractAddress:
        'f5413f195b3347a3822ea6100e4db70f10b34ea0b22822af0ba15258d139fb71' // Asset ID
    }
  },
  '040a180aca4194a158c17945dd115db42086f6f074c1f77838621a4927fffa91': {
    currencyCode: 'BTCx',
    displayName: 'Bitcoin',
    denominations: [
      {
        name: 'BTCx',
        multiplier: '100000000'
      }
    ],
    networkLocation: {
      contractAddress:
        '040a180aca4194a158c17945dd115db42086f6f074c1f77838621a4927fffa91'
    }
  }
}

const networkInfo: ZanoNetworkInfo = {
  nativeAssetId:
    'd6329b5b1f7c0805b5c345f4957554002a2f557845f64d7645dae0e051a6498a',
  walletRpcAddress: 'http://37.27.100.59:10500'
}

const currencyInfo: EdgeCurrencyInfo = {
  currencyCode: 'ZANO',
  assetDisplayName: 'Zano',
  chainDisplayName: 'Zano',
  pluginId: 'zano',
  walletType: 'wallet:zano',
  requiredConfirmations: 10,

  // Explorers:
  addressExplorer: '',
  transactionExplorer: 'https://explorer.zano.org/transaction/%s',

  customFeeTemplate: [
    {
      displayName: 'Fee',
      key: 'fee',
      type: 'string'
    }
  ],
  customTokenTemplate: [
    {
      displayName: 'Asset ID',
      key: 'contractAddress',
      type: 'string'
    }
  ],
  denominations: [
    {
      name: 'ZANO',
      multiplier: '1000000000000',
      symbol: ''
    }
  ],

  memoOptions: [
    { type: 'hex', memoName: 'paymentId', maxBytes: 32 },
    { type: 'text', memoName: 'comment', maxLength: 1000 }
  ],
  multipleMemos: true,

  unsafeSyncNetwork: true,

  // Deprecated:
  defaultSettings: { customFeeSettings: ['fee'] },
  displayName: 'Zano',
  metaTokens: makeMetaTokens(builtinTokens)
}

export const zano = makeOuterPlugin<
  ZanoNetworkInfo,
  ZanoTools,
  ZanoInfoPayload
>({
  builtinTokens,
  createTokenId: createZanoTokenId,
  currencyInfo,
  asInfoPayload: asZanoInfoPayload,
  networkInfo,

  async getInnerPlugin() {
    return await import(
      /* webpackChunkName: "zano" */
      './ZanoTools'
    )
  }
})
