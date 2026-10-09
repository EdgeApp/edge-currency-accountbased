import type { BalanceChange, GasCostSummary } from '@mysten/sui/client'
import type { SignatureWithBytes } from '@mysten/sui/cryptography'
import { SUI_TYPE_ARG } from '@mysten/sui/utils'
import { gt } from 'biggystring'
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
   * The whole SUI supply, in mist. Genesis mints it once and then destroys the
   * `Supply<SUI>`, so no address can ever hold more.
   */
  totalSupply: string

  /**
   * Nodes for balances, fees, and broadcasts. These may be pruned, since none
   * of those operations reach back into history.
   */
  rpcNodes: string[]

  /**
   * Nodes that index every transaction digest of an address back to its first.
   * Transaction queries must begin here: the engine walks history from the
   * oldest transaction, and a node without the full index rejects both that
   * walk and any cursor older than its retention window. These nodes may still
   * have pruned the transactions themselves, which `graphqlNodes` covers.
   */
  rpcNodesArchival: string[]

  /**
   * GraphQL RPC services holding every transaction in full. History sync
   * loads transactions here by digest when a node in `rpcNodesArchival` lists
   * them but has pruned their contents.
   */
  graphqlNodes: string[]

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
  graphqlNodes: asOptional(asArray(asString)),
  maxRequestsPerSecond: asOptional(asNumber)
})
export type SuiInfoPayload = ReturnType<typeof asSuiInfoPayload>

/**
 * A native SUI total as a node reports it, checked against the network's
 * `totalSupply`. A node whose owner index has gone negative reports the
 * deficit wrapped around `u128`, which lands far above the supply.
 */
export const asSuiBalance =
  (totalSupply: string): Cleaner<string> =>
  raw => {
    const balance = asString(raw)
    if (!/^\d+$/.test(balance) || gt(balance, totalSupply)) {
      throw new TypeError(`Invalid Sui balance: ${balance}`)
    }
    return balance
  }

/**
 * Throws if a node's `getAllBalances` answer has an impossible SUI total.
 * Other coin types pass unchecked, because they have no ceiling to check
 * against: a module can mint through several `Supply<T>`, each a `u64`, so an
 * address total can honestly exceed `u64`. Rejecting those would fail every
 * node's answer for a wallet that anyone sent such a coin to.
 */
export const checkSuiBalances = (
  balances: Array<{ coinType: string; totalBalance: string }>,
  totalSupply: string
): void => {
  const asBalance = asSuiBalance(totalSupply)
  for (const { coinType, totalBalance } of balances) {
    if (coinType === SUI_TYPE_ARG) asBalance(totalBalance)
  }
}

/**
 * The parts of a transaction that history sync reads. A JSON-RPC
 * `SuiTransactionBlockResponse` already has this shape, and a transaction
 * loaded from GraphQL is converted into it.
 */
export interface SuiHistoryTx {
  digest: string
  checkpoint?: string | null
  timestampMs?: string | null
  rawTransaction?: string
  effects?: { gasUsed: GasCostSummary } | null
  balanceChanges?: BalanceChange[] | null
}

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
