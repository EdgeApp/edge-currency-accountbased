import { fromBech32 } from '@cosmjs/encoding'
import { EncodeObject, Registry } from '@cosmjs/proto-signing'
import { coin } from '@cosmjs/stargate'

import { DepositOpts, TransferOpts, UpgradedRegistry } from './cosmosTypes'
import { assetFromString } from './cosmosUtils'
import { MsgDeposit } from './info/proto/thorchainrune/thorchain/v1/x/thorchain/types/msg_deposit'
import { MsgSend } from './info/proto/thorchainrune/thorchain/v1/x/thorchain/types/msg_send'

export const upgradeRegistryAndCreateMethods = (
  pluginId: string
): UpgradedRegistry => {
  const registry = new Registry()

  switch (pluginId) {
    case 'thorchainrune': {
      const depositTypeUrl = '/types.MsgSend'
      registry.register(depositTypeUrl, MsgDeposit)
      const deposit = (opts: DepositOpts): EncodeObject => {
        const { assets, memo, signer } = opts

        const coins = assets.map(coin => {
          return {
            ...coin,
            asset: assetFromString(coin.asset)
          }
        })

        const msg = {
          typeUrl: depositTypeUrl,
          value: MsgDeposit.encode(
            MsgDeposit.fromPartial({
              coins,
              memo,
              signer: fromBech32(signer).data
            })
          ).finish()
        }
        return msg
      }

      const transferTypeUrl = '/types.MsgSend'
      registry.register(transferTypeUrl, MsgSend)

      const transfer = (opts: TransferOpts): EncodeObject => {
        const { amount, fromAddress, toAddress } = opts
        const msg = {
          typeUrl: transferTypeUrl,
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
        methods: { deposit, transfer },
        registry
      }
    }
    default:
      throw new Error('Unsupported pluginId')
  }
}
