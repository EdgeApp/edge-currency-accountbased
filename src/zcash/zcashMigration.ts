import { add } from 'biggystring'

import { ZcashBalances } from './zcashTypes'

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
