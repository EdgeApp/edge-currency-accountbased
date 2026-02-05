import { SyncEngine, SyncTracker } from '../common/SyncTracker'

const SYNC_PROGRESS_WEIGHT = 0.85
const BALANCE_PROGRESS_WEIGHT = 0.05
const TRANSACTION_PROGRESS_WEIGHT = 0.1

/**
 * A sync status tracker that works block-by-block.
 */
export interface ZanoSyncTracker extends SyncTracker {
  updateBalanceRatio: (ratio: number) => void
  updateBlockRatio: (ratio: number) => void
  updateHistoryRatio: (ratio: number) => void
}

/**
 * Creates a Sync
 */
export function makeZanoSyncTracker(engine: SyncEngine): ZanoSyncTracker {
  let balanceRatio = 0
  let blockRatio = 0
  let historyRatio = 0
  let lastTotalRatio = 0

  function calculateStatus(): number {
    // Avoid rounding issues by treating 1 as special:
    if (balanceRatio === 1 && blockRatio === 1 && historyRatio === 1) {
      return 1
    }

    return (
      balanceRatio * BALANCE_PROGRESS_WEIGHT +
      blockRatio * SYNC_PROGRESS_WEIGHT +
      historyRatio * TRANSACTION_PROGRESS_WEIGHT
    )
  }

  function maybeSendUpdate(): void {
    const totalRatio = calculateStatus()

    // Update every 1% change
    const flooredPrevProgress = Math.floor(lastTotalRatio * 100)
    const flooredNewProgress = Math.floor(totalRatio * 100)

    if (totalRatio === 1 || flooredNewProgress > flooredPrevProgress) {
      engine.sendSyncStatus(totalRatio)
    }

    lastTotalRatio = totalRatio
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

    updateBlockRatio(ratio) {
      blockRatio = ratio
      maybeSendUpdate()
    },

    updateHistoryRatio(ratio) {
      historyRatio = ratio
      maybeSendUpdate()
    }
  }

  return out
}
