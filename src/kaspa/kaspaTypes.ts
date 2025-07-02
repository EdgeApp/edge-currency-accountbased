import {
  asArray,
  asMaybe,
  asNumber,
  asObject,
  asOptional,
  asString
} from 'cleaners'

import { asSafeCommonWalletInfo } from '../common/types'

export interface KaspaNetworkInfo {
  kaspaServers: string[]
  kaspaExplorerServers: string[]
}

export interface KaspaWalletOtherData {
  lastSyncedIndex: number
  addressDerivationLimit: number
}

export const asKaspaWalletOtherData = asObject({
  lastSyncedIndex: asMaybe(asNumber, 0),
  addressDerivationLimit: asMaybe(asNumber, 20)
})

export type SafeKaspaWalletInfo = ReturnType<typeof asSafeKaspaWalletInfo>
export const asSafeKaspaWalletInfo = asSafeCommonWalletInfo

export type KaspaPrivateKeys = ReturnType<typeof asKaspaPrivateKeys>
export const asKaspaPrivateKeys = asObject({
  kaspaKey: asString,
  kaspaMnemonic: asString
})

//
// Info Payload
//

export const asKaspaInfoPayload = asObject({
  kaspaServers: asOptional(asArray(asString)),
  kaspaExplorerServers: asOptional(asArray(asString))
})
export type KaspaInfoPayload = ReturnType<typeof asKaspaInfoPayload>