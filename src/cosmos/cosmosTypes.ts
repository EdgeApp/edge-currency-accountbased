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
  shapeshiftApiName: string
  rpcNode: string
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

export const asCosmosWalletOtherData = asObject({
  newestTxid: asMaybe(asString),
  newestTxidIndex: asMaybe(asNumber)
})
export type CosmosWalletOtherData = ReturnType<typeof asCosmosWalletOtherData>

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
  const asKeys = asObject({
    [`${pluginId}Mnemonic`]: asString
  })

  return asCodec(
    raw => {
      const from = asKeys(raw)
      return {
        mnemonic: from[`${pluginId}Mnemonic`]
      }
    },
    clean => {
      return {
        [`${pluginId}Mnemonic`]: clean.mnemonic
      }
    }
  )
}
