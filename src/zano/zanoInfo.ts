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
  },
  '93da681503353509367e241cda3234299dedbbad9ec851de31e900490807bf0c': {
    currencyCode: 'ETHx',
    displayName: 'Ethereum',
    denominations: [
      {
        name: 'ETHx',
        multiplier: '1000000'
      }
    ],
    networkLocation: {
      contractAddress:
        '93da681503353509367e241cda3234299dedbbad9ec851de31e900490807bf0c'
    }
  },
  '6ca3fa07f1b6a75b6e195d2918c32228765968b54ea691c75958affa1c4073fb': {
    currencyCode: 'BNBx',
    displayName: 'Binance Coin',
    denominations: [
      {
        name: 'BNBx',
        multiplier: '1000000'
      }
    ],
    networkLocation: {
      contractAddress:
        '6ca3fa07f1b6a75b6e195d2918c32228765968b54ea691c75958affa1c4073fb'
    }
  },
  '24819c4b65786c3ac424e05d9ef4ab212de6222cc73bc5c4b012df5a3107eea4': {
    currencyCode: 'DAIx',
    displayName: 'Dai Stablecoin',
    denominations: [
      {
        name: 'DAIx',
        multiplier: '1000000'
      }
    ],
    networkLocation: {
      contractAddress:
        '24819c4b65786c3ac424e05d9ef4ab212de6222cc73bc5c4b012df5a3107eea4'
    }
  },
  '3de9ad7243afa49e0ade6839e97a9f10a527c4958ece2fc9cb1b87a44032167d': {
    currencyCode: 'BCHx',
    displayName: 'Bitcoin Cash',
    denominations: [
      {
        name: 'BCHx',
        multiplier: '100000000'
      }
    ],
    networkLocation: {
      contractAddress:
        '3de9ad7243afa49e0ade6839e97a9f10a527c4958ece2fc9cb1b87a44032167d'
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
