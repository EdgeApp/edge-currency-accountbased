import { fromBech32 } from '@cosmjs/encoding'
import { EncodeObject, Registry } from '@cosmjs/proto-signing'
import { coin } from '@cosmjs/stargate'
import { EdgeCurrencyInfo } from 'edge-core-js/types'

import { makeOuterPlugin } from '../../common/innerPlugin'
import type { CosmosTools } from '../CosmosTools'
import type {
  CosmosNetworkInfo,
  TransferOpts,
  UpgradedRegistry
} from '../cosmosTypes'
import { MsgSend } from './thorchain/proto/thorchain/v1/x/thorchain/types/msg_send'

const upgradeRegistryAndCreateMethods = (
  registry: Registry
): UpgradedRegistry => {
  registry.register('/types.MsgSend', MsgSend)
  const transfer = (opts: TransferOpts): EncodeObject => {
    const { amount, fromAddress, toAddress } = opts
    const msg = {
      typeUrl: '/types.MsgSend',
      value: MsgSend.encode(
        MsgSend.fromPartial({
          fromAddress: fromBech32(fromAddress).data,
          toAddress: fromBech32(toAddress).data,
          amount: [coin(amount, 'rune')]
        })
      ).finish()
    }
    return msg
  }

  return {
    methods: { transfer },
    registry
  }
}

const networkInfo: CosmosNetworkInfo = {
  bech32AddressPrefix: 'thor',
  bip39Path: `m/44'/931'/0'/0/0`,
  pluginMnemonicKeyName: 'thorchainMnemonic',
  rpcNode: 'https://rpc.ninerealms.com',
  upgradeRegistryAndCreateMethods
}

const currencyInfo: EdgeCurrencyInfo = {
  currencyCode: 'RUNE',
  displayName: 'THORChain',
  pluginId: 'thorchain',
  walletType: 'wallet:thorchain',

  // Explorers:
  addressExplorer: 'https://viewblock.io/thorchain/address/%s',
  transactionExplorer: 'https://viewblock.io/thorchain/tx/%s',

  denominations: [
    {
      name: 'RUNE',
      multiplier: '100000000',
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

export const thorchain = makeOuterPlugin<CosmosNetworkInfo, CosmosTools>({
  currencyInfo,
  networkInfo,

  checkEnvironment() {
    if (global.BigInt == null) {
      throw new Error('Thorchain requires BigInt support')
    }
  },

  async getInnerPlugin() {
    return await import(
      /* webpackChunkName: "thorchain" */
      '../CosmosTools'
    )
  }
})
