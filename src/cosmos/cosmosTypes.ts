import { Chain } from '@chain-registry/types'
import { EncodeObject, Registry } from '@cosmjs/proto-signing'
import { Coin, HttpEndpoint, StargateClient } from '@cosmjs/stargate'
import {
  asCodec,
  asMaybe,
  asNumber,
  asObject,
  asOptional,
  asString,
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
  chainInfo: {
    data: Chain
    name: string
    url: string
  }
  defaultTransactionFee?: Coin // Charged by the network but not included in transaction body
  nativeDenom: string
  pluginMnemonicKeyName: string
  rpcNode: HttpEndpoint
  archiveNode: HttpEndpoint
}

export const txQueryStrings = [
  `coin_spent.spender`,
  `coin_received.receiver`
] as const

export const asCosmosWalletOtherData = asObject({
  archivedTxLastCheckTime: asMaybe(asNumber, 0),
  'coin_spent.spender': asMaybe(asString),
  'coin_received.receiver': asMaybe(asString)
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
  getMaxTx: (makeTxParams: MakeTxParams) => Promise<string>
}

export interface CosmosClients {
  queryClient: ReturnType<StargateClient['forceGetQueryClient']>
  stargateClient: StargateClient
  // Using the comet client directly allows us to control the paging
  cometClient: ReturnType<StargateClient['forceGetCometClient']>
}

const asCoin = asObject({
  denom: asString,
  amount: asString
})

export const asCosmosTxOtherParams = asObject({
  gasFeeCoin: asCoin,
  gasLimit: asString,
  unsignedTxHex: asString
})

export type CosmosTxOtherParams = ReturnType<typeof asCosmosTxOtherParams>

export interface CosmosFee {
  gasFeeCoin: Coin
  gasLimit: string
  networkFee: string
}

// This is the same the sdk 'Coin' but separation is necessary since we want to be able to use negative amounts that the sdk doesn't support
export interface CosmosCoin {
  denom: string
  amount: string
}
