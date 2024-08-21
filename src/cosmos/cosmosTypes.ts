import type { EncodeObject, Registry } from '@cosmjs/proto-signing'
import type {
  AuthExtension,
  BankExtension,
  Coin,
  HttpEndpoint,
  IbcExtension,
  QueryClient,
  StakingExtension,
  StargateClient,
  TxExtension
} from '@cosmjs/stargate'
import {
  asArray,
  asCodec,
  asMaybe,
  asNumber,
  asObject,
  asOptional,
  asString,
  asUnknown,
  asValue,
  Cleaner
} from 'cleaners'
import { EdgeTransaction } from 'edge-core-js/types'

import {
  asWalletInfo,
  MakeTxParams,
  WalletConnectPayload
} from '../common/types'

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

export interface IBCTransferOpts {
  amount: Coin
  fromAddress: string
  toAddress: string
  memo?: string
  channel: string
  port: string
}

export interface CosmosMethods {
  deposit?: (opts: DepositOpts) => EncodeObject
  ibcTransfer: (opts: IBCTransferOpts) => EncodeObject
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
    chainName: string
    url: string
  }
  defaultChainId: string
  defaultTransactionFeeUrl?: HttpEndpoint
  nativeDenom: string
  pluginMnemonicKeyName: string
  rpcNode: HttpEndpoint
  // If no archive node, the rpc node will be used and only grab transaction in a limited range
  archiveNodes?: Array<{
    blockTimeRangeSeconds: {
      start: number
      end?: number
    }
    endpoint: HttpEndpoint
  }>
}
const asHttpEndpoint = asObject({
  url: asString,
  headers: asObject({ asString })
})

export const txQueryStrings = [
  `coin_spent.spender`,
  `coin_received.receiver`
] as const

const asLocalTxQueryParams = asObject({
  newestTxid: asMaybe(asString)
})

export const asCosmosWalletOtherData = asObject({
  archivedTxLastCheckTime: asMaybe(asNumber, 0),
  'coin_spent.spender': asMaybe(asLocalTxQueryParams, () => ({
    newestTxid: undefined
  })),
  'coin_received.receiver': asMaybe(asLocalTxQueryParams, () => ({
    newestTxid: undefined
  }))
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
  parseWalletConnectV2Payload: (
    payload: CosmosWcRpcPayload
  ) => Promise<WalletConnectPayload>
}

export interface CosmosClients {
  queryClient: QueryClient &
    AuthExtension &
    BankExtension &
    StakingExtension &
    TxExtension &
    IbcExtension
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

export const asThornodeNetwork = asObject({
  // bond_reward_rune: asString, // '17257435059176',
  // burned_bep_2_rune: asString, // '47115838110346964',
  // burned_erc_20_rune: asString, // '1653783031763036',
  // effective_security_bond: asString, // '6621166637606310',
  // gas_spent_rune: asString, // '119414731966742',
  // gas_withheld_rune: asString, // '159093044870164',
  native_outbound_fee_rune: asString, // '2000000',
  native_tx_fee_rune: asString // '2000000',
  // outbound_fee_multiplier: asString, // '15000',
  // rune_price_in_tor: asString, // '649194931',
  // tns_fee_per_block_rune: asString, // '20',
  // tns_register_fee_rune: asString, // '1000000000',
  // tor_price_in_rune: asString, // '15403694',
  // total_bond_units: asString, // '22182160',
  // total_reserve: asString, // '8596638591565880',
  // vaults_migrating: false
})

/**
 * WalletConnect payloads
 */
export const asCosmosWcGetAccountsRpcPayload = asObject({
  method: asValue('cosmos_getAccounts'),
  params: asObject({})
})
const asSignDirect = asValue('cosmos_signDirect')
export const asCosmosWcSignDirectRpcPayload = asObject({
  method: asSignDirect,
  params: asObject({
    signerAddress: asString,
    signDoc: asObject({
      chainId: asString,
      accountNumber: asString,
      authInfoBytes: asString,
      bodyBytes: asString
    })
  })
})
export const asCosmosWcSignAminoRpcPayload = asObject({
  method: asValue('cosmos_signAmino'),
  params: asObject({
    signerAddress: asString,
    signDoc: asObject({
      chain_id: asString,
      account_number: asString,
      sequence: asString,
      memo: asString,
      msgs: asArray(
        asObject({
          type: asString,
          value: asUnknown
        })
      ),
      fee: asObject({
        amount: asArray(asObject({ denom: asString, amount: asString })),
        gas: asString
      })
    })
  })
})

export type CosmosWcRpcPayload =
  | ReturnType<typeof asCosmosWcGetAccountsRpcPayload>
  | ReturnType<typeof asCosmosWcSignDirectRpcPayload>
  | ReturnType<typeof asCosmosWcSignAminoRpcPayload>

export interface IbcChannel {
  channel: string
  port: string
}

//
// Info Payload
//

export const asCosmosInfoPayload = asObject({
  rpcNode: asOptional(asHttpEndpoint),
  archiveNodes: asOptional(asHttpEndpoint)
})
export type CosmosInfoPayload = ReturnType<typeof asCosmosInfoPayload>
