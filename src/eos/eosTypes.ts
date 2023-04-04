import { asMaybe, asNumber, asObject, asOptional, asString } from 'cleaners'

import { asWalletInfo } from '../common/types'

export interface EosNetworkInfo {
  chainId: string
  eosActivationServers: string[]
  eosDfuseServers: string[]
  eosHyperionNodes: string[]
  eosNodes: string[]
  powerUpServers: string[]
  uriProtocol: string
}

export const eosOtherMethodNames = [
  'getActivationCost',
  'getActivationSupportedCurrencies',
  'validateAccount'
] as const

export interface EosTransaction {
  block_time: string
  block_num: number
  account_action_seq: number
  trx_id: string
  act: {
    authorization: any
    data: {
      from: string
      to: string
      memo: string
      amount: number
      symbol: string
    }
    account: string
    name: string
  }
  '@timestamp': string
  producer: string
  parent: number
  global_sequence: number
  notified: string[]
}

export interface EosAction {
  act: {
    authorization: any
    data: {
      from: string
      to: string
      memo: string
      amount: number
      symbol: string
    }
    account: string
    name: string
  }
  '@timestamp': string
  block_num: number
  producer: string
  trx_id: string
  parent: number
  global_sequence: number
  notified: string[]
}

export const asEosWalletOtherData = asObject({
  accountName: asMaybe(asString, ''),
  lastQueryActionSeq: asMaybe(asObject(asNumber), {}),
  highestTxHeight: asMaybe(asObject(asNumber), {}),
  lastFreePowerUp: asMaybe(asNumber, 0)
})

export type EosWalletOtherData = ReturnType<typeof asEosWalletOtherData>

export interface ReferenceBlock {
  ref_block_num: number
  ref_block_prefix: number
}

export interface AccountResources {
  cpu: number
  net: number
}

export type SafeEosWalletInfo = ReturnType<typeof asSafeEosWalletInfo>
export const asSafeEosWalletInfo = asWalletInfo(
  asObject({
    publicKey: asString,
    ownerPublicKey: asOptional(asString)
  })
)

export type EosPrivateKeys = ReturnType<typeof asEosPrivateKeys>
export const asEosPrivateKeys = asObject({
  eosOwnerKey: asOptional(asString),
  eosKey: asString
})
