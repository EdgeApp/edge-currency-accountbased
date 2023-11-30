import { fromBech32 } from '@cosmjs/encoding'
import { EncodeObject, Registry } from '@cosmjs/proto-signing'
import { MsgSend } from 'cosmjs-types/cosmos/bank/v1beta1/tx'

import { DepositOpts, TransferOpts, UpgradedRegistry } from './cosmosTypes'
import { assetFromString } from './cosmosUtils'
import { MsgDeposit } from './info/proto/thorchainrune/thorchain/v1/x/thorchain/types/msg_deposit'
import { MsgSend as ThorchainRuneMsgSend } from './info/proto/thorchainrune/thorchain/v1/x/thorchain/types/msg_send'

export const upgradeRegistryAndCreateMethods = (
  pluginId: string
): UpgradedRegistry => {
  const registry = new Registry()

  // Base Cosmos actions
  let transfer = (opts: TransferOpts): EncodeObject => {
    const { amount, fromAddress, toAddress } = opts
    const msg = {
      typeUrl: '/cosmos.bank.v1beta1.MsgSend',
      value: MsgSend.encode(
        MsgSend.fromPartial({
          fromAddress,
          toAddress,
          amount
        })
      ).finish()
    }
    return msg
  }

  // Special cases
  switch (pluginId) {
    case 'thorchainrune': {
      const depositTypeUrl = '/types.MsgDeposit'
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
      registry.register(transferTypeUrl, ThorchainRuneMsgSend)

      transfer = (opts: TransferOpts): EncodeObject => {
        const { amount, fromAddress, toAddress } = opts
        const msg = {
          typeUrl: transferTypeUrl,
          value: ThorchainRuneMsgSend.encode(
            ThorchainRuneMsgSend.fromPartial({
              fromAddress: fromBech32(fromAddress).data,
              toAddress: fromBech32(toAddress).data,
              amount
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
  }

  return {
    methods: { transfer },
    registry
  }
}
