import type { SignatureWithBytes } from '@mysten/sui/cryptography'
import {
  asArray,
  asCodec,
  asNumber,
  asObject,
  asOptional,
  asString,
  Cleaner
} from 'cleaners'
import type {
  EdgeAssetAction,
  EdgeMemo,
  EdgeMetadata,
  EdgeTransaction,
  EdgeTxAction,
  EdgeTxSwap
} from 'edge-core-js/types'

import { MakeTxParams } from '../common/types'

export interface SuiNetworkInfo {
  network: 'mainnet' | 'testnet'
  pluginMnemonicKeyName: string

  /**
   * Nodes for balances, fees, and broadcasts. These may be pruned, since none
   * of those operations reach back into history.
   */
  rpcNodes: string[]

  /**
   * Nodes verified to serve full history. Transaction queries must begin here:
   * the engine walks history from the oldest transaction, and a pruned node
   * rejects both that walk and any cursor older than its retention window.
   */
  rpcNodesArchival: string[]

  /**
   * Per-node request ceiling, shared by every wallet in the app. A single
   * wallet is latency-bound well under this; it only binds when several
   * wallets sync at once and would otherwise trip a provider's limiter.
   */
  maxRequestsPerSecond: number
}

//
// Info Payload
//

export const asSuiInfoPayload = asObject({
  rpcNodes: asOptional(asArray(asString)),
  rpcNodesArchival: asOptional(asArray(asString)),
  maxRequestsPerSecond: asOptional(asNumber)
})
export type SuiInfoPayload = ReturnType<typeof asSuiInfoPayload>

export const asSuiWalletOtherData = asObject({
  latestTxidFrom: asOptional(asString),
  latestTxidTo: asOptional(asString)
})
export type SuiWalletOtherData = ReturnType<typeof asSuiWalletOtherData>

//
// Wallet Info and Keys:
//

export interface SuiPrivateKeys {
  mnemonic?: string
  privateKey?: string
  displayKey?: string
}
export const asSuiPrivateKeys = (pluginId: string): Cleaner<SuiPrivateKeys> => {
  const asKeys = asObject({
    [`${pluginId}Mnemonic`]: asOptional(asString),
    [`${pluginId}Key`]: asOptional(asString),
    [`${pluginId}KeyDisplay`]: asOptional(asString)
  })

  return asCodec(
    raw => {
      const from = asKeys(raw)
      return {
        mnemonic: from[`${pluginId}Mnemonic`],
        privateKey: from[`${pluginId}Key`],
        displayKey: from[`${pluginId}KeyDisplay`]
      }
    },
    clean => {
      return {
        [`${pluginId}Mnemonic`]: clean.mnemonic,
        ...(clean.privateKey != null
          ? { [`${pluginId}Key`]: clean.privateKey }
          : {}),
        ...(clean.displayKey != null
          ? { [`${pluginId}KeyDisplay`]: clean.displayKey }
          : {})
      }
    }
  )
}

export const asSuiUnsignedTx = asObject({
  unsignedBase64: asString
})

export const asSuiSignedTx = asObject<SignatureWithBytes>({
  bytes: asString,
  signature: asString
})

//
// Other Methods Types:
//

export interface MakeTxMetadata {
  assetAction?: EdgeAssetAction
  savedAction?: EdgeTxAction
  metadata?: EdgeMetadata
  swapData?: EdgeTxSwap
  memos?: EdgeMemo[]
}

export interface SuiOtherMethods {
  makeTx: (params: MakeTxParams) => Promise<EdgeTransaction>
}
