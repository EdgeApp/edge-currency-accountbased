import { EdgeCurrencyInfo, EdgeTokenMap } from 'edge-core-js/types'

import { makeOuterPlugin } from '../common/innerPlugin'
import type { HyperCoreTools } from './HyperCoreTools'
import {
  asHyperCoreInfoPayload,
  HyperCoreInfoPayload,
  HyperCoreNetworkInfo
} from './hypercoreTypes'

/**
 * Keyed by HyperCore token id, without the 0x. `name` and `index` are what the
 * API uses to address a token; both are fixed when the token is deployed.
 */
const builtinTokens: EdgeTokenMap = {
  '6d1e7cde53ba9467b783cb7c530ce054': {
    currencyCode: 'USDC',
    denominations: [{ multiplier: '100000000', name: 'USDC' }],
    displayName: 'USD Coin',
    networkLocation: {
      contractAddress: '0x6d1e7cde53ba9467b783cb7c530ce054',
      name: 'USDC',
      index: 0
    }
  },
  '25faedc3f054130dbb4e4203aca63567': {
    currencyCode: 'USD₮0',
    denominations: [{ multiplier: '100000000', name: 'USD₮0' }],
    displayName: 'USD₮0',
    networkLocation: {
      contractAddress: '0x25faedc3f054130dbb4e4203aca63567',
      name: 'USDT0',
      index: 268
    }
  },
  '2e6d84f2d7ca82e6581e03523e4389f7': {
    currencyCode: 'USDE',
    denominations: [{ multiplier: '100000000', name: 'USDE' }],
    displayName: 'USDe',
    networkLocation: {
      contractAddress: '0x2e6d84f2d7ca82e6581e03523e4389f7',
      name: 'USDE',
      index: 235
    }
  },
  '54e00a5988577cb0b0c9ab0cb6ef7f4b': {
    currencyCode: 'USDH',
    denominations: [{ multiplier: '100000000', name: 'USDH' }],
    displayName: 'USDH',
    networkLocation: {
      contractAddress: '0x54e00a5988577cb0b0c9ab0cb6ef7f4b',
      name: 'USDH',
      index: 360
    }
  },
  '88102bea0bbad5f301f6e9e4dacdf979': {
    currencyCode: 'FEUSD',
    denominations: [{ multiplier: '100000000', name: 'FEUSD' }],
    displayName: 'Felix USD',
    networkLocation: {
      contractAddress: '0x88102bea0bbad5f301f6e9e4dacdf979',
      name: 'FEUSD',
      index: 241
    }
  },
  '8f254b963e8468305d409b33aa137c67': {
    currencyCode: 'UBTC',
    denominations: [{ multiplier: '10000000000', name: 'UBTC' }],
    displayName: 'Unit Bitcoin',
    networkLocation: {
      contractAddress: '0x8f254b963e8468305d409b33aa137c67',
      name: 'UBTC',
      index: 197
    }
  },
  e1edd30daaf5caac3fe63569e24748da: {
    currencyCode: 'UETH',
    denominations: [{ multiplier: '1000000000', name: 'UETH' }],
    displayName: 'Unit Ethereum',
    networkLocation: {
      contractAddress: '0xe1edd30daaf5caac3fe63569e24748da',
      name: 'UETH',
      index: 221
    }
  },
  '49b67c39f5566535de22b29b0e51e685': {
    currencyCode: 'USOL',
    denominations: [{ multiplier: '100000000', name: 'USOL' }],
    displayName: 'Unit Solana',
    networkLocation: {
      contractAddress: '0x49b67c39f5566535de22b29b0e51e685',
      name: 'USOL',
      index: 254
    }
  },
  fd61ec89811ba3cf2ae12d0ed8ef1afd: {
    currencyCode: 'XAUT0',
    denominations: [{ multiplier: '100000000', name: 'XAUT0' }],
    displayName: 'Tether Gold',
    networkLocation: {
      contractAddress: '0xfd61ec89811ba3cf2ae12d0ed8ef1afd',
      name: 'XAUT0',
      index: 297
    }
  },
  c1fb593aeffbeb02f85e0308e9956a90: {
    currencyCode: 'PURR',
    denominations: [{ multiplier: '100000', name: 'PURR' }],
    displayName: 'Purr',
    networkLocation: {
      contractAddress: '0xc1fb593aeffbeb02f85e0308e9956a90',
      name: 'PURR',
      index: 1
    }
  },
  bc8a22f25703a03101630ce6b09f4baa: {
    currencyCode: 'KHYPE',
    denominations: [{ multiplier: '100000000', name: 'KHYPE' }],
    displayName: 'Kinetiq Staked HYPE',
    networkLocation: {
      contractAddress: '0xbc8a22f25703a03101630ce6b09f4baa',
      name: 'KHYPE',
      index: 121
    }
  },
  '244d19a8576a492f44ee19622f4104e4': {
    currencyCode: 'STHYPE',
    denominations: [{ multiplier: '100000000', name: 'STHYPE' }],
    displayName: 'Staked HYPE',
    networkLocation: {
      contractAddress: '0x244d19a8576a492f44ee19622f4104e4',
      name: 'STHYPE',
      index: 119
    }
  },
  '7650808198966e4285687d3deb556ccc': {
    currencyCode: 'UFART',
    denominations: [{ multiplier: '1000000', name: 'UFART' }],
    displayName: 'Unit Fartcoin',
    networkLocation: {
      contractAddress: '0x7650808198966e4285687d3deb556ccc',
      name: 'UFART',
      index: 269
    }
  },
  '544e60f98a36d7b22c0fb5824b84f795': {
    currencyCode: 'UPUMP',
    denominations: [{ multiplier: '1000000', name: 'UPUMP' }],
    displayName: 'Unit Pump Fun',
    networkLocation: {
      contractAddress: '0x544e60f98a36d7b22c0fb5824b84f795',
      name: 'UPUMP',
      index: 299
    }
  },
  '593494b6af79172fa983a0cf1c88e0e0': {
    currencyCode: 'UENA',
    denominations: [{ multiplier: '1000000', name: 'UENA' }],
    displayName: 'Unit Ethena',
    networkLocation: {
      contractAddress: '0x593494b6af79172fa983a0cf1c88e0e0',
      name: 'UENA',
      index: 338
    }
  },
  '2c54c60600e1d786b2dfc139a38a5a99': {
    currencyCode: 'UXPL',
    denominations: [{ multiplier: '1000000', name: 'UXPL' }],
    displayName: 'Unit Plasma',
    networkLocation: {
      contractAddress: '0x2c54c60600e1d786b2dfc139a38a5a99',
      name: 'UXPL',
      index: 343
    }
  },
  '1765b5a9ec8fc3cdbc209c63cac68e86': {
    currencyCode: 'HPENGU',
    denominations: [{ multiplier: '100000000', name: 'HPENGU' }],
    displayName: 'Pudgy Penguins',
    networkLocation: {
      contractAddress: '0x1765b5a9ec8fc3cdbc209c63cac68e86',
      name: 'HPENGU',
      index: 292
    }
  }
}

const networkInfo: HyperCoreNetworkInfo = {
  apiServers: ['https://api.hyperliquid.xyz'],
  evmRpcServers: [
    'https://rpc.hyperliquid.xyz/evm',
    'https://rpc.hypurrscan.io',
    'https://hyperliquid-json-rpc.stakely.io'
  ],
  balanceCheckerContract: '0x708b4138130478BAB09636eC6a25AeEF3BaAf242',
  nativeToken: {
    contractAddress: '0x0d01dc56dcaaca66ad901c959b4011ec',
    name: 'HYPE',
    index: 150
  },
  activationFeeTokenIds: [
    '6d1e7cde53ba9467b783cb7c530ce054', // USDC
    '25faedc3f054130dbb4e4203aca63567', // USDT0
    '54e00a5988577cb0b0c9ab0cb6ef7f4b' // USDH
  ],
  activationFee: '1',
  hyperliquidChain: 'Mainnet',
  signatureChainId: '0xa4b1'
}

const currencyInfo: EdgeCurrencyInfo = {
  currencyCode: 'HYPE',
  assetDisplayName: 'HYPE',
  chainDisplayName: 'HyperCore',
  pluginId: 'hypercore',
  walletType: 'wallet:hypercore',

  // Explorers:
  addressExplorer: 'https://hypurrscan.io/address/%s',
  transactionExplorer: 'https://hypurrscan.io/tx/%s',

  customTokenTemplate: [
    {
      displayName: 'Token ID',
      key: 'contractAddress',
      type: 'string'
    }
  ],
  denominations: [
    {
      name: 'HYPE',
      multiplier: '100000000',
      symbol: 'HYPE'
    }
  ],

  // Deprecated:
  displayName: 'HyperCore'
}

export const hypercore = makeOuterPlugin<
  HyperCoreNetworkInfo,
  HyperCoreTools,
  HyperCoreInfoPayload
>({
  builtinTokens,
  currencyInfo,
  asInfoPayload: asHyperCoreInfoPayload,
  networkInfo,

  async getInnerPlugin() {
    return await import(
      /* webpackChunkName: "hypercore" */
      './HyperCoreTools'
    )
  }
})
