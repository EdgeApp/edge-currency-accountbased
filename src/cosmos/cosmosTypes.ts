import { EncodeObject, Registry } from '@cosmjs/proto-signing'
import { Coin, HttpEndpoint, StargateClient } from '@cosmjs/stargate'
import {
  asCodec,
  asMaybe,
  asObject,
  asOptional,
  asString,
  asTuple,
  asValue,
  Cleaner
} from 'cleaners'
import { EdgeTransaction } from 'edge-core-js/types'

import { asWalletInfo, MakeTxParams } from '../common/types'

export interface DepositOpts {
  assets: Array<{
    asset: string
    amount: string
    decimals: string
  }>
  memo: string
  signer: string
}

export interface TransferOpts {
  amount: Coin[]
  fromAddress: string
  toAddress: string
}

export interface CosmosMethods {
  deposit?: (opts: DepositOpts) => EncodeObject
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
  defaultTransactionFee?: Coin // Charged by the network but not included in transaction body
  nativeDenom: string
  pluginMnemonicKeyName: string
  rpcNode: HttpEndpoint
}

export const txQueryStrings = [`transfer.sender`, `transfer.recipient`] as const

export const asCosmosWalletOtherData = asObject({
  'transfer.sender': asMaybe(asString),
  'transfer.recipient': asMaybe(asString)
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

export interface CosmosInitOptions {
  ninerealmsClientId?: string
}

export const asCosmosInitOptions = asObject({
  ninerealmsClientId: asOptional(asString)
})

export interface CosmosOtherMethods {
  makeTx: (makeTxParams: MakeTxParams) => Promise<EdgeTransaction>
}

export const asTransfer = asObject({
  type: asValue('transfer'),
  attributes: asTuple(
    asObject({
      key: asValue('recipient'),
      value: asString
    }),
    asObject({
      key: asValue('sender'),
      value: asString
    }),
    asObject({
      key: asValue('amount'),
      value: asString /* '100000000rune' */
    })
  )
})

export interface TransferEvent {
  sender: string
  recipient: string
  coin: Coin
}

export interface CosmosClients {
  stargateClient: StargateClient
  // Using the tendermint client directly allows us to control the paging
  tendermintClient: ReturnType<StargateClient['forceGetTmClient']>
}

export const asCosmosTxOtherParams = asObject({
  unsignedTxHex: asString
})

export type CosmosTxOtherParams = ReturnType<typeof asCosmosTxOtherParams>

export interface CosmosFee {
  networkFee: string
}
