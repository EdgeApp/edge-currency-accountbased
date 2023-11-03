import { fromBech32 } from '@cosmjs/encoding'
import { EncodeObject, Registry } from '@cosmjs/proto-signing'
import { coin } from '@cosmjs/stargate'

import { TransferOpts, UpgradedRegistry } from './cosmosTypes'
import { MsgSend } from './info/proto/thorchainrune/thorchain/v1/x/thorchain/types/msg_send'

export const upgradeRegistryAndCreateMethods = (
  pluginId: string
): UpgradedRegistry => {
  const registry = new Registry()

  switch (pluginId) {
    case 'thorchainrune': {
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
    default:
      throw new Error('Unsupported pluginId')
  }
}