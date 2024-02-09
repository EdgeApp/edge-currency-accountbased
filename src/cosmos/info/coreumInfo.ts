import type { Chain } from '@chain-registry/types'
import { EdgeCurrencyInfo, EdgeTokenMap } from 'edge-core-js/types'

import { makeOuterPlugin } from '../../common/innerPlugin'
import { makeMetaTokens } from '../../common/tokenHelpers'
import type { CosmosTools } from '../CosmosTools'
import type { CosmosNetworkInfo } from '../cosmosTypes'
import data from '../info/chain-json/coreum.json'

const builtinTokens: EdgeTokenMap = {
  'usara-core1r9gc0rnxnzpq33u82f44aufgdwvyxv4wyepyck98m9v2pxua6naqr8h03z': {
    currencyCode: 'SARA',
    displayName: 'Pulsara',
    denominations: [{ name: 'SARA', multiplier: '1000000' }],
    networkLocation: {
      contractAddress:
        'usara-core1r9gc0rnxnzpq33u82f44aufgdwvyxv4wyepyck98m9v2pxua6naqr8h03z'
    }
  },
  'ibc/e1e3674a0e4e1ef9c69646f9af8d9497173821826074622d831bab73ccb99a2d': {
    currencyCode: 'USDC',
    displayName: 'USDC from Noble',
    denominations: [{ name: 'USDC', multiplier: '1000000' }],
    networkLocation: {
      contractAddress:
        'ibc/E1E3674A0E4E1EF9C69646F9AF8D9497173821826074622D831BAB73CCB99A2D'
    }
  },
  'ibc/13b2c536bb057ac79d5616b8ea1b9540ec1f2170718caff6f0083c966fffed0b': {
    currencyCode: 'OSMO',
    displayName: 'Osmosis',
    denominations: [{ name: 'OSMO', multiplier: '1000000' }],
    networkLocation: {
      contractAddress:
        'ibc/13B2C536BB057AC79D5616B8EA1B9540EC1F2170718CAFF6F0083C966FFFED0B'
    }
  },
  'ibc/45c001a5ae212d09879be4627c45b64d5636086285590d5145a51e18e9d16722': {
    currencyCode: 'ATOM',
    displayName: 'Cosmos Hub',
    denominations: [{ name: 'ATOM', multiplier: '1000000' }],
    networkLocation: {
      contractAddress:
        'ibc/45C001A5AE212D09879BE4627C45B64D5636086285590D5145A51E18E9D16722'
    }
  },
  'ibc/64ada1661e3c1a4293e3bb15d5bd13012d0db3d9002c117c30d7c429a32f4d51': {
    currencyCode: 'GRAV',
    displayName: 'Gravity Bridge',
    denominations: [{ name: 'GRAV', multiplier: '1000000' }],
    networkLocation: {
      contractAddress:
        'ibc/64ADA1661E3C1A4293E3BB15D5BD13012D0DB3D9002C117C30D7C429A32F4D51'
    }
  },
  'ibc/ab305490f17eccae3f2b0398a572e0efb3af394b90c3a1663da28c1f0869f624': {
    currencyCode: 'KUJI',
    displayName: 'Kujira',
    denominations: [{ name: 'KUJI', multiplier: '1000000' }],
    networkLocation: {
      contractAddress:
        'ibc/AB305490F17ECCAE3F2B0398A572E0EFB3AF394B90C3A1663DA28C1F0869F624'
    }
  },
  'ibc/6d42727c323c8af2821966c83e0708f0c17fb0b0de38ba5e4d23f2ee7c0e9ddc': {
    currencyCode: 'BAND',
    displayName: 'Band Protocol',
    denominations: [{ name: 'BAND', multiplier: '1000000' }],
    networkLocation: {
      contractAddress:
        'ibc/6D42727C323C8AF2821966C83E0708F0C17FB0B0DE38BA5E4D23F2EE7C0E9DDC'
    }
  },
  'ibc/078eaf11288a47609fd894070ca8a1bfcebd9e08745ea7030f95d7adee2e22ca': {
    currencyCode: 'EVMOS',
    displayName: 'Evmos',
    denominations: [{ name: 'EVMOS', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress:
        'ibc/078EAF11288A47609FD894070CA8A1BFCEBD9E08745EA7030F95D7ADEE2E22CA'
    }
  },
  'ibc/3e35008738ac049c9c1a1e37f785e947a8daa9811b3ea3b25580664294056151': {
    currencyCode: 'AXL',
    displayName: 'Axelar',
    denominations: [{ name: 'AXL', multiplier: '1000000' }],
    networkLocation: {
      contractAddress:
        'ibc/3E35008738AC049C9C1A1E37F785E947A8DAA9811B3EA3B25580664294056151'
    }
  },
  'ibc/81bd95b0890b8d0130755e8338cf4aa48c7cbbd149c1d66ec9f9b62afae5c4f3': {
    currencyCode: 'SEI',
    displayName: 'Sei Network',
    denominations: [{ name: 'SEI', multiplier: '1000000' }],
    networkLocation: {
      contractAddress:
        'ibc/81BD95B0890B8D0130755E8338CF4AA48C7CBBD149C1D66EC9F9B62AFAE5C4F3'
    }
  },
  'ibc/12b178a885fc6891e0e09e1fb013973c5632b7093ce52d8f33b32e76e3bb6ea1': {
    currencyCode: 'KAVA',
    displayName: 'Kava',
    denominations: [{ name: 'KAVA', multiplier: '1000000' }],
    networkLocation: {
      contractAddress:
        'ibc/12B178A885FC6891E0E09E1FB013973C5632B7093CE52D8F33B32E76E3BB6EA1'
    }
  },
  'ibc/6c00e4aa0cc7618370f81f7378638ae6c48eff8c9203ce1c2357012b440ebdb7': {
    currencyCode: 'USDT',
    displayName: 'USDT from Kava',
    denominations: [{ name: 'USDT', multiplier: '1000000' }],
    networkLocation: {
      contractAddress:
        'ibc/6C00E4AA0CC7618370F81F7378638AE6C48EFF8C9203CE1C2357012B440EBDB7'
    }
  },
  'ibc/f8ca5236869f819bc006eef088e67889a26e4140339757878f0f4e229cdda858': {
    currencyCode: 'DYDX',
    displayName: 'dYdX',
    denominations: [{ name: 'DYDX', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress:
        'ibc/F8CA5236869F819BC006EEF088E67889A26E4140339757878F0F4E229CDDA858'
    }
  }
}

const networkInfo: CosmosNetworkInfo = {
  bech32AddressPrefix: 'core',
  bip39Path: `m/44'/990'/0'/0/0`,
  chainInfo: {
    data: data as Chain,
    name: 'coreum',
    url: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/coreum/chain.json'
  },
  nativeDenom: 'ucore',
  pluginMnemonicKeyName: 'coreumMnemonic',
  rpcNode: {
    url: 'https://full-node.mainnet-1.coreum.dev:26657',
    headers: {}
  },
  archiveNode: {
    url: 'https://full-node.mainnet-1.coreum.dev:26657',
    headers: {}
  }
}

const currencyInfo: EdgeCurrencyInfo = {
  currencyCode: 'COREUM',
  displayName: 'Coreum',
  pluginId: 'coreum',
  walletType: 'wallet:coreum',

  // Explorers:
  addressExplorer: 'https://explorer.coreum.com/coreum/accounts/%s',
  transactionExplorer: 'https://explorer.coreum.com/coreum/transactions/%s',

  denominations: [
    {
      name: 'COREUM',
      multiplier: '1000000',
      symbol: ''
    }
  ],

  memoOptions: [{ type: 'text', maxLength: 250 }],

  // Deprecated:
  defaultSettings: {},
  memoMaxLength: 250,
  memoType: 'text',
  metaTokens: makeMetaTokens(builtinTokens)
}

export const coreum = makeOuterPlugin<CosmosNetworkInfo, CosmosTools>({
  builtinTokens,
  currencyInfo,
  networkInfo,

  checkEnvironment() {
    if (global.BigInt == null) {
      throw new Error('Coreum requires BigInt support')
    }
  },

  async getInnerPlugin() {
    return await import(
      /* webpackChunkName: "coreum" */
      '../CosmosTools'
    )
  }
})
