import type { EdgeSyncStatus } from 'edge-core-js/types'

import { SyncEngine, SyncTracker } from './SyncTracker'

const SYNC_PROGRESS_WEIGHT = 0.85
const BALANCE_PROGRESS_WEIGHT = 0.05
const TRANSACTION_PROGRESS_WEIGHT = 0.1

// Push a sync-status update at least this often while progress is still moving,
// even within a single 1% step. Without this, a slow chain (e.g. monerod over
// the Nym mixnet, where 1% can be many thousands of blocks) looks frozen for
// minutes between whole-percent boundaries.
const SYNC_STATUS_INTERVAL_MS = 1000

/**
 * A sync status tracker that works block-by-block.
 */
export interface WeightedSyncTracker extends SyncTracker {
  updateBalanceRatio: (ratio: number) => void
  updateBlockRatio: (
    ratio: number,
    walletHeight: number,
    daemonHeight: number
  ) => void
  updateHistoryRatio: (ratio: number) => void
}

/**
 * Creates a weighted sync tracker that blends block, balance,
 * and history progress into a single ratio.
 */
export function makeWeightedSyncTracker(
  engine: SyncEngine
): WeightedSyncTracker {
  let balanceRatio = 0
  let blockRatio = 0
  let blockRatioDetail: [number, number] = [0, 1]
  let historyRatio = 0
  let lastTotalRatio = 0
  let lastSentTime = 0

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
    const now = Date.now()

    // Update on completion, on every 1% change, or — when progress is still
    // moving — at least once per SYNC_STATUS_INTERVAL_MS so slow syncs show
    // steady movement instead of appearing frozen between 1% boundaries.
    const flooredPrevProgress = Math.floor(lastTotalRatio * 100)
    const flooredNewProgress = Math.floor(status.totalRatio * 100)
    const progressMoved = status.totalRatio > lastTotalRatio

    if (
      status.totalRatio === 1 ||
      flooredNewProgress > flooredPrevProgress ||
      (progressMoved && now - lastSentTime >= SYNC_STATUS_INTERVAL_MS)
    ) {
      engine.sendSyncStatus(status)
      lastSentTime = now
    }

    lastTotalRatio = status.totalRatio
  }

  const out: WeightedSyncTracker = {
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
