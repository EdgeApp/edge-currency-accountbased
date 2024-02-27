import { EdgeCurrencyInfo } from 'edge-core-js/types'

import { makeOuterPlugin } from '../../common/innerPlugin'
import type { CosmosTools } from '../CosmosTools'
import type { CosmosNetworkInfo } from '../cosmosTypes'

const networkInfo: CosmosNetworkInfo = {
  bech32AddressPrefix: 'axelar',
  bip39Path: `m/44'/118'/0'/0/0`,
  chainInfo: {
    chainId: 'axelar-dojo-1',
    url: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/axelar/chain.json'
  },
  nativeDenom: 'uaxl',
  pluginMnemonicKeyName: 'axelarMnemonic',
  rpcNode: {
    url: 'https://axelar-rpc.publicnode.com:443',
    headers: {}
  },
  archiveNode: {
    url: 'https://axelararchive-rpc.quickapi.com:443',
    headers: {}
  }
}

const currencyInfo: EdgeCurrencyInfo = {
  currencyCode: 'AXL',
  displayName: 'Axelar',
  pluginId: 'axelar',
  walletType: 'wallet:axelar',

  // Explorers:
  addressExplorer: 'https://www.mintscan.io/axelar/address/%s',
  transactionExplorer: 'https://www.mintscan.io/axelar/tx/%s',

  denominations: [
    {
      name: 'AXL',
      multiplier: '1000000',
      symbol: ''
    }
  ],

  memoOptions: [{ type: 'text', maxLength: 250 }],

  // Deprecated:
  defaultSettings: {},
  memoMaxLength: 250,
  memoType: 'text',
  metaTokens: []
}

export const axelar = makeOuterPlugin<CosmosNetworkInfo, CosmosTools>({
  currencyInfo,
  networkInfo,

  checkEnvironment() {
    if (global.BigInt == null) {
      throw new Error('Axelar requires BigInt support')
    }
  },

  async getInnerPlugin() {
    return await import(
      /* webpackChunkName: "axelar" */
      '../CosmosTools'
    )
  }
})
