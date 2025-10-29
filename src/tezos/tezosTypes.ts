import {
  asArray,
  asMaybe,
  asNumber,
  asObject,
  asOptional,
  asString
} from 'cleaners'

import { asWalletInfo } from '../common/types'

export interface TezosNetworkInfo {
  tezosRpcNodes: string[]
  tezosApiServers: string[]
  fee: {
    burn: string
    reveal: string
    transaction: string
  }
  limit: {
    gas: string
    storage: string
  }
}

export const asTezosWalletOtherData = asObject({
  numberTransactions: asMaybe(asNumber, 0)
})

export type TezosWalletOtherData = ReturnType<typeof asTezosWalletOtherData>

export const asXtzGetTransaction = asObject({
  level: asNumber,
  timestamp: asString,
  hash: asString,
  sender: asObject({
    address: asString
  }),
  bakerFee: asNumber,
  allocationFee: asNumber,
  target: asObject({
    address: asString
  }),
  amount: asNumber,
  status: asString
})

export type XtzGetTransaction = ReturnType<typeof asXtzGetTransaction>

export interface UriTransaction {
  kind: 'transaction'
  amount: string
  destination: string
}

export interface HeadInfo {
  protocol: string
  chain_id: string
  hash: string
  level: number
  proto: number
  predecessor: string
  timestamp: string
  validation_pass: number
  operation_hash: string
  fitness: any
  context: string
  priority: number
  proof_of_work_nonce: string
  signature: string
}

export interface TezosReveal {
  kind: 'reveal'
  source: string
  fee: string
  counter: string | number
  gas_limit: string | number
  storage_limit: string | number
  public_key: string
}

export interface TezosTransaction {
  kind: 'transaction'
  source: string
  fee: string
  counter: string | number
  gas_limit: string | number
  storage_limit: string | number
  amount: string | number
  destination: string
  parameters?: string
}

export interface TezosOrigination {
  kind: 'origination'
  source: string
  fee: string
  counter: string | number
  gas_limit: string | number
  storage_limit: string | number
  manager_pubkey: string
  balance: string | number
  spendable: true
  delegatable: true
  delegate?: string
}

export interface TezosDelegation {
  kind: 'delegation'
  source: string
  fee: string
  counter: string | number
  gas_limit: string | number
  storage_limit: string | number
  delegate?: string
}

export type TezosOperation =
  | TezosReveal
  | TezosTransaction
  | TezosOrigination
  | TezosDelegation

export type TezosOperations = TezosOperation[]

export interface OperationsContainer {
  opbytes: string
  opOb: {
    branch: string
    contents: TezosOperations
    signature?: string
  }
}

export type SafeTezosWalletInfo = ReturnType<typeof asSafeTezosWalletInfo>
export const asSafeTezosWalletInfo = asWalletInfo(
  asObject({
    publicKey: asString,
    publicKeyEd: asString
  })
)

export type TezosPrivateKeys = ReturnType<typeof asTezosPrivateKeys>
export const asTezosPrivateKeys = asObject({
  mnemonic: asString
})

//
// Info Payload
//

export const asTezosInfoPayload = asObject({
  tezosRpcNodes: asOptional(asArray(asString)),
  tezosApiServers: asOptional(asArray(asString))
})
export type TezosInfoPayload = ReturnType<typeof asTezosInfoPayload>
