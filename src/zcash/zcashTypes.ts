import {
  asArray,
  asBoolean,
  asCodec,
  asMaybe,
  asNumber,
  asObject,
  asOptional,
  asString,
  asTuple,
  asValue,
  Cleaner
} from 'cleaners'
import { EdgeAddress } from 'edge-core-js/types'
import type { BalanceEvent } from 'react-native-zcash'

import { asWalletInfo } from '../common/types'

type ZcashNetworkName = 'mainnet' | 'testnet'

export interface ZcashNetworkInfo {
  rpcNode: {
    networkName: ZcashNetworkName
    defaultHost: string
    defaultPort: number
  }
  defaultNetworkFee: string
}

const asCachedEdgeAddresses = asTuple<EdgeAddress[]>(
  asObject({
    addressType: asValue('unifiedAddress'),
    publicAddress: asString
  }),
  asObject({
    addressType: asValue('saplingAddress'),
    publicAddress: asString
  }),
  asObject({
    addressType: asValue('transparentAddress'),
    publicAddress: asString
  })
)
export type CachedEdgeAddresses = ReturnType<typeof asCachedEdgeAddresses>

export const asZcashWalletOtherData = asObject({
  cachedAddresses: asMaybe(asCachedEdgeAddresses),
  isSdkInitializedOnDisk: asMaybe(asBoolean, false),
  /** Guards the one-time Ironwood post-upgrade SDK initialization. */
  isPostUpgradeInitialized: asMaybe(asBoolean, false),
  /**
   * Txids of Orchard->Ironwood migration transactions this engine created
   * (note split + transfers), used to label them in the transaction list.
   * The SDK's Transaction type carries no migration flag, so the engine
   * tracks its own.
   */
  migrationTxids: asMaybe(asArray(asString), () => [])
})

export type ZcashWalletOtherData = ReturnType<typeof asZcashWalletOtherData>

//
// Orchard -> Ironwood migration (engine-level shapes, consumed by the GUI
// through wallet.otherMethods — kept independent of the SDK's enums so SDK
// churn doesn't ripple into the GUI).
//

export const asZcashMigrationStatus = asObject({
  /**
   * notNeeded: no Orchard funds (or pre-activation) — show nothing.
   * required: Orchard funds present and no confirmed plan — prompt the user.
   * scheduled: note split and/or signed schedule in motion — show progress.
   * complete: everything migrated.
   * error: a transfer needs attention (stale/invalid) — offer retry.
   */
  state: asValue('notNeeded', 'required', 'scheduled', 'complete', 'error'),
  completedTransfers: asMaybe(asNumber, 0),
  totalTransfers: asMaybe(asNumber, 0),
  remainingOrchardZatoshi: asMaybe(asString, '0'),
  hasOverdueTransfers: asMaybe(asBoolean, false),
  isSynced: asMaybe(asBoolean, false),
  /** Height after which the next pre-signed transfer becomes executable. */
  nextTransferReadyAtHeight: asOptional(asNumber)
})
export type ZcashMigrationStatus = ReturnType<typeof asZcashMigrationStatus>

export const asZcashMigrationTransferDisplay = asObject({
  id: asString,
  amountZatoshi: asString,
  nextExecutableAfterHeight: asNumber,
  expiryHeight: asNumber
})

export const asZcashMigrationPlan = asObject({
  strategy: asValue('privacy', 'immediate'),
  transfers: asArray(asZcashMigrationTransferDisplay),
  estimatedDurationHours: asNumber,
  /** Sum of the transfer amounts. */
  totalAmountZatoshi: asString,
  /**
   * The note-split preparation fee (zero when no split is needed). The SDK
   * does not expose per-transfer fees at proposal time, so this is the only
   * fee component known up front.
   */
  noteSplitFeeZatoshi: asString,
  noteSplitRequired: asBoolean,
  /** Opaque; round-tripped to submitNoteSplit exactly as proposed. */
  noteSplitProposalBase64: asOptional(asString),
  /** Opaque; round-tripped to signAndStoreMigrationSchedule as proposed. */
  scheduleBase64: asString
})
export type ZcashMigrationPlan = ReturnType<typeof asZcashMigrationPlan>

export type ZcashBalances = Omit<
  BalanceEvent,
  'availableZatoshi' | 'totalZatoshi'
>

export const asZecPublicKey = asObject({
  birthdayHeight: asNumber,
  publicKey: asString
})

export type SafeZcashWalletInfo = ReturnType<typeof asSafeZcashWalletInfo>
export const asSafeZcashWalletInfo = asWalletInfo(asZecPublicKey)

export interface ZcashPrivateKeys {
  mnemonic: string
  birthdayHeight: number
}
export const asZcashPrivateKeys = (
  pluginId: string
): Cleaner<ZcashPrivateKeys> => {
  const asKeys = asObject({
    [`${pluginId}Mnemonic`]: asString,
    [`${pluginId}BirthdayHeight`]: asNumber
  })

  return asCodec(
    raw => {
      const clean = asKeys(raw)
      return {
        mnemonic: clean[`${pluginId}Mnemonic`] as string,
        birthdayHeight: clean[`${pluginId}BirthdayHeight`] as number
      }
    },
    clean => {
      return {
        [`${pluginId}Mnemonic`]: clean.mnemonic,
        [`${pluginId}BirthdayHeight`]: clean.birthdayHeight
      }
    }
  )
}

//
// Info Payload
//

export const asZcashInfoPayload = asObject({
  rpcNode: asOptional(
    asObject({
      networkName: asValue('mainnet', 'testnet'),
      defaultHost: asString,
      defaultPort: asNumber
    })
  )
})
export type ZcashInfoPayload = ReturnType<typeof asZcashInfoPayload>
