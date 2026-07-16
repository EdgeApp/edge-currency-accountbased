import { add, gt } from 'biggystring'
import type { MigrationState } from 'react-native-zcash'

import { ZcashBalances, ZcashMigrationStatus } from './zcashTypes'

/**
 * The spendable balance reported to the GUI: every shielded pool's available
 * value. Transparent funds are excluded (they get autoshielded).
 *
 * During an Orchard -> Ironwood migration the SDK is expected to exclude
 * schedule-committed notes from `orchardAvailableZatoshi` as it locks them,
 * so no double-accounting happens here. If that SDK contract turns out to be
 * wrong, subtract the unbroadcast scheduled amount in this one place.
 */
export function computeAvailableZatoshi(balances: ZcashBalances): string {
  return add(
    add(balances.saplingAvailableZatoshi, balances.orchardAvailableZatoshi),
    balances.ironwoodAvailableZatoshi
  )
}

/**
 * Maps the SDK's migration state union onto the engine-level status the GUI
 * consumes. Pure, so the mapping table is unit-testable.
 */
export function mapMigrationStatus(opts: {
  state: MigrationState
  hasOverdueTransfers: boolean
  isSynced: boolean
  orchardTotalZatoshi: string
}): ZcashMigrationStatus {
  const { state, hasOverdueTransfers, isSynced, orchardTotalZatoshi } = opts
  const base = {
    completedTransfers: 0,
    totalTransfers: 0,
    remainingOrchardZatoshi: orchardTotalZatoshi,
    hasOverdueTransfers,
    isSynced,
    nextTransferReadyAtHeight: undefined
  }

  switch (state.state) {
    case 'notStarted':
      // Nothing to do until there are Orchard funds to move:
      return {
        ...base,
        state: gt(orchardTotalZatoshi, '0') ? 'required' : 'notNeeded'
      }
    case 'readyToPropose':
      // Split confirmed (or unnecessary) but no schedule confirmed yet — the
      // user still needs to review and approve a plan:
      return { ...base, state: 'required' }
    case 'splitPendingConfirmation':
      return { ...base, state: 'scheduled' }
    case 'inProgress': {
      const { progress } = state
      return {
        ...base,
        state: 'scheduled',
        completedTransfers: progress.completedTransfers,
        totalTransfers: progress.totalTransfers,
        remainingOrchardZatoshi: progress.remainingOrchardZatoshi,
        nextTransferReadyAtHeight: progress.nextTransferReadyAtHeight
      }
    }
    case 'requiresAttention':
      // syncRequiredBeforeNext is a normal pause, not an error — the sync
      // loop clears it by syncing. The other reasons need a refresh/retry.
      return {
        ...base,
        state:
          state.attention.reason === 'syncRequiredBeforeNext'
            ? 'scheduled'
            : 'error'
      }
    case 'complete':
      return { ...base, state: 'complete' }
  }
}

export type MigrationAction = 'none' | 'execute' | 'refreshStale'

/**
 * Decides what the sync loop should do for the migration this cycle.
 * Pure decision matrix (unit-tested); the engine gathers the inputs.
 */
export function decideMigrationAction(opts: {
  state: MigrationState
  hasInvalidTransfers: boolean
  isSyncRequiredBeforeNextTransfer: boolean
  networkBlockHeight: number
  /** An execute/refresh/broadcast is already in flight or queued: */
  isBusy: boolean
}): MigrationAction {
  const {
    state,
    hasInvalidTransfers,
    isSyncRequiredBeforeNextTransfer,
    networkBlockHeight,
    isBusy
  } = opts
  if (isBusy) return 'none'

  switch (state.state) {
    case 'inProgress': {
      if (hasInvalidTransfers) return 'refreshStale'
      if (isSyncRequiredBeforeNextTransfer) return 'none'
      const readyAt = state.progress.nextTransferReadyAtHeight
      if (readyAt == null || readyAt <= networkBlockHeight) return 'execute'
      return 'none'
    }
    case 'requiresAttention':
      switch (state.attention.reason) {
        case 'syncRequiredBeforeNext':
          return 'none' // clears itself as the wallet syncs
        case 'invalidTransfer':
        case 'transferExpired':
          return 'refreshStale' // re-anchor/re-prove/re-sign (needs the seed)
      }
    // eslint-disable-next-line no-fallthrough
    default:
      return 'none'
  }
}
