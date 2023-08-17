import { EdgeCurrencyInfo, EdgeMemo, EdgeSpendInfo } from 'edge-core-js/types'

import { validateMemos } from './validateMemos'

/**
 * Upgrades the memo fields inside an EdgeSpendTarget,
 * since we need to be runtime-compatible with legacy core versions.
 */
export function upgradeMemos(
  spendInfo: EdgeSpendInfo,
  currencyInfo: EdgeCurrencyInfo
): EdgeSpendInfo {
  const { memoType } = currencyInfo

  const legacyMemos: EdgeMemo[] = []

  // If this chain supports legacy memos, grab those:
  if (memoType === 'hex' || memoType === 'number' || memoType === 'text') {
    for (const target of spendInfo.spendTargets) {
      if (target.memo != null) {
        legacyMemos.push({
          type: memoType,
          value: target.memo
        })
      } else if (target.uniqueIdentifier != null) {
        legacyMemos.push({
          type: memoType,
          value: target.uniqueIdentifier
        })
      } else if (typeof target.otherParams?.uniqueIdentifier === 'string') {
        legacyMemos.push({
          type: memoType,
          value: target.otherParams.uniqueIdentifier
        })
      }
    }
  }

  // If we don't have modern memos, use the legacy ones:
  const out: EdgeSpendInfo = {
    ...spendInfo,
    memos: spendInfo.memos ?? legacyMemos
  }

  validateMemos(out, currencyInfo)
  return out
}
