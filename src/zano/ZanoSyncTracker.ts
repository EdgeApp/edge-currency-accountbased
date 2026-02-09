import type { EdgeSyncStatus } from 'edge-core-js/types'

import { SyncEngine, SyncTracker } from '../common/SyncTracker'

const SYNC_PROGRESS_WEIGHT = 0.85
const BALANCE_PROGRESS_WEIGHT = 0.05
const TRANSACTION_PROGRESS_WEIGHT = 0.1

/**
 * A sync status tracker that works block-by-block.
 */
export interface ZanoSyncTracker extends SyncTracker {
  updateBalanceRatio: (ratio: number) => void
  updateBlockRatio: (
    ratio: number,
    walletHeight: number,
    daemonHeight: number
  ) => void
  updateHistoryRatio: (ratio: number) => void
}

/**
 * Creates a Sync
 */
export function makeZanoSyncTracker(engine: SyncEngine): ZanoSyncTracker {
  let balanceRatio = 0
  let blockRatio = 0
  let blockRatioDetail: [number, number] = [0, 1]
  let historyRatio = 0
  let lastTotalRatio = 0

  function calculateStatus(): EdgeSyncStatus {
    // Avoid rounding issues by treating 1 as special:
    if (balanceRatio === 1 && blockRatio === 1 && historyRatio === 1) {
      return {
        totalRatio: 1,
        blockRatio: blockRatioDetail
      }
    }

    return {
      totalRatio:
        balanceRatio * BALANCE_PROGRESS_WEIGHT +
        blockRatio * SYNC_PROGRESS_WEIGHT +
        historyRatio * TRANSACTION_PROGRESS_WEIGHT,
      blockRatio: blockRatioDetail
    }
  }

  function maybeSendUpdate(): void {
    const status = calculateStatus()

    // Update every 1% change
    const flooredPrevProgress = Math.floor(lastTotalRatio * 100)
    const flooredNewProgress = Math.floor(status.totalRatio * 100)

    if (status.totalRatio === 1 || flooredNewProgress > flooredPrevProgress) {
      engine.sendSyncStatus(status)
    }

    lastTotalRatio = status.totalRatio
  }

  const out: ZanoSyncTracker = {
    resetSync() {
      balanceRatio = 0
      blockRatio = 0
      historyRatio = 0
      lastTotalRatio = 0
    },

    updateBalanceRatio(ratio) {
      balanceRatio = ratio
      maybeSendUpdate()
    },

    updateBlockRatio(ratio, walletHeight, daemonHeight) {
      blockRatio = ratio
      blockRatioDetail = [walletHeight, Math.max(1, daemonHeight)]
      maybeSendUpdate()
    },

    updateHistoryRatio(ratio) {
      historyRatio = ratio
      maybeSendUpdate()
    }
  }

  return out
}
