import { EdgeCurrencyInfo, EdgeTokenMap } from 'edge-core-js/types'

import { makeOuterPlugin } from '../../common/innerPlugin'
import type { CosmosTools } from '../CosmosTools'
import { asCosmosInfoPayload, CosmosNetworkInfo } from '../cosmosTypes'
import { cosmosCustomTokenTemplate } from './cosmosCommonInfo'

// https://midgard.ninerealms.com/v2/pools
const builtinTokens: EdgeTokenMap = {
  avaxavax: {
    currencyCode: 'AVAX',
    displayName: 'Synth AVAX/AVAX',
    denominations: [{ name: 'AVAX', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: 'avax/avax'
    }
  },
  bchbch: {
    currencyCode: 'BCH',
    displayName: 'Synth BCH/BCH',
    denominations: [{ name: 'BCH', multiplier: '100000000' }],
    networkLocation: {
      contractAddress: 'bch/bch'
    }
  },
  bscbnb: {
    currencyCode: 'BNB',
    displayName: 'Synth BSC/BNB',
    denominations: [{ name: 'BNB', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: 'bsc/bnb'
    }
  },
  btcbtc: {
    currencyCode: 'BTC',
    displayName: 'Synth BTC/BTC',
    denominations: [{ name: 'BTC', multiplier: '100000000' }],
    networkLocation: {
      contractAddress: 'btc/btc'
    }
  },
  dogedoge: {
    currencyCode: 'DOGE',
    displayName: 'Synth DOGE/DOGE',
    denominations: [{ name: 'DOGE', multiplier: '100000000' }],
    networkLocation: {
      contractAddress: 'doge/doge'
    }
  },
  etheth: {
    currencyCode: 'ETH',
    displayName: 'Synth ETH/ETH',
    denominations: [{ name: 'ETH', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: 'eth/eth'
    }
  },
  gaiaatom: {
    currencyCode: 'ATOM',
    displayName: 'Synth GAIA/ATOM',
    denominations: [{ name: 'ATOM', multiplier: '1000000' }],
    networkLocation: {
      contractAddress: 'gaia/atom'
    }
  },
  ltcltc: {
    currencyCode: 'LTC',
    displayName: 'Synth LTC/LTC',
    denominations: [{ name: 'LTC', multiplier: '100000000' }],
    networkLocation: {
      contractAddress: 'ltc/ltc'
    }
  }
}

const networkInfo: CosmosNetworkInfo = {
  bech32AddressPrefix: 'thor',
  bip39Path: `m/44'/931'/0'/0/0`,
  chainInfo: {
    chainId: 'thorchain-mainnet-v1',
    url: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/thorchain/chain.json'
  },
  defaultTransactionFeeUrl: {
    url: 'https://thornode.ninerealms.com/thorchain/network',
    headers: { 'x-client-id': '{{ninerealmsClientId}}' }
  },
  nativeDenom: 'rune',
  pluginMnemonicKeyName: 'thorchainruneMnemonic',
  rpcNode: {
    url: 'https://rpc.ninerealms.com',
    headers: { 'x-client-id': '{{ninerealmsClientId}}' }
  },
  archiveNode: {
    url: 'https://rpc-v1.ninerealms.com',
    headers: { 'x-client-id': '{{ninerealmsClientId}}' }
  }
}

const currencyInfo: EdgeCurrencyInfo = {
  currencyCode: 'RUNE',
  customTokenTemplate: cosmosCustomTokenTemplate,
  displayName: 'THORChain',
  pluginId: 'thorchainrune',
  walletType: 'wallet:thorchainrune',

  // Explorers:
  addressExplorer: 'https://viewblock.io/thorchain/address/%s',
  transactionExplorer: 'https://viewblock.io/thorchain/tx/%s',

  denominations: [
    {
      name: 'RUNE',
      multiplier: '100000000',
      symbol: 'ᚱ'
    }
  ],

  memoOptions: [{ type: 'text', maxLength: 250 }]
}

export const thorchainrune = makeOuterPlugin<CosmosNetworkInfo, CosmosTools>({
  builtinTokens,
  currencyInfo,
  infoPayloadCleaner: asCosmosInfoPayload,
  networkInfo,

  checkEnvironment() {
    if (global.BigInt == null) {
      throw new Error('Thorchain requires BigInt support')
    }
  },

  async getInnerPlugin() {
    return await import(
      /* webpackChunkName: "thorchainrune" */
      '../CosmosTools'
    )
  }
})
