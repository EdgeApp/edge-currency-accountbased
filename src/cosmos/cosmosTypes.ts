import { EncodeObject, Registry } from '@cosmjs/proto-signing'
import { Coin } from '@cosmjs/stargate'
import {
  asArray,
  asCodec,
  asMaybe,
  asNumber,
  asObject,
  asString,
  asTuple,
  asValue,
  Cleaner
} from 'cleaners'

import { asWalletInfo } from '../common/types'

export interface TransferOpts {
  amount: string
  fromAddress: string
  toAddress: string
}

export interface CosmosMethods {
  transfer: (opts: TransferOpts) => EncodeObject
}

export interface UpgradedRegistry {
  methods: CosmosMethods
  registry: Registry
}

export interface CosmosNetworkInfo {
  bech32AddressPrefix: string
  bip39Path: string
  chainId: string
  defaultTransactionFee: Coin
  pluginMnemonicKeyName: string
  rpcNode: string
  upgradeRegistryAndCreateMethods: (registry: Registry) => UpgradedRegistry
}

const asShapeshiftTx = asObject({
  txid: asString,
  // blockHash: string
  blockHeight: asNumber,
  timestamp: asNumber,
  // confirmations: number
  fee: asObject({
    amount: asString,
    denom: asString
  }),
  // gasUsed: string
  // gasWanted: string
  // index: number
  memo: asMaybe(asString),
  // value: string
  messages: asTuple(
    asObject({
      // index: string
      // origin: string
      from: asString,
      to: asString,
      type: asValue('send'),
      value: asObject({
        amount: asString,
        denom: asString
      })
    })
  )
})
export type ShapeshiftTx = ReturnType<typeof asShapeshiftTx>

export const asShapeshiftResponse = asObject({
  cursor: asMaybe(asString),
  txs: asArray(asMaybe(asShapeshiftTx))
})

//
// Wallet Info and Keys:
//

export type SafeCosmosWalletInfo = ReturnType<typeof asSafeCosmosWalletInfo>
export const asSafeCosmosWalletInfo = asWalletInfo(
  asObject({ bech32Address: asString, publicKey: asString })
)

export interface CosmosPrivateKeys {
  mnemonic: string
}
export const asCosmosPrivateKeys = (
  pluginId: string
): Cleaner<CosmosPrivateKeys> => {
  // Type hacks:
  type PluginId = 'x'
  type FromKeys = {
    [key in `${PluginId}Mnemonic`]: string
  }
  const _pluginId = pluginId as PluginId
  // Derived cleaners from the generic parameter:
  const asFromKeys: Cleaner<FromKeys> = asObject({
    [`${_pluginId}Mnemonic`]: asString
  }) as Cleaner<any>

  return asCodec(
    (value: unknown) => {
      const from = asFromKeys(value)
      const to: CosmosPrivateKeys = {
        mnemonic: from[`${_pluginId}Mnemonic`]
      }
      return to
    },
    cosmosPrivateKey => {
      return {
        [`${_pluginId}Mnemonic`]: cosmosPrivateKey.mnemonic
      }
    }
  )
}
