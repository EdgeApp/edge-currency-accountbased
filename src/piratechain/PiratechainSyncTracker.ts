import { SyncEngine, SyncTracker } from '../common/SyncTracker'

const BLOCK_PROGRESS_WEIGHT = 0.895
const BALANCE_PROGRESS_WEIGHT = 0.005
const TRANSACTION_PROGRESS_WEIGHT = 0.1
const THROTTLE_UPDATE_MS = 1000

/**
 * A sync status tracker that works block-by-block.
 */
export interface PiratechainSyncTracker extends SyncTracker {
  updateBlockProgress: (opts: {
    birthdayHeight: number
    lastDownloadedHeight: number
    networkBlockHeight: number
  }) => void

  /** Once we sync the chain, we still need to grab the balance: */
  updateBalanceRatio: (ratio: number) => void

  /** Once we sync the chain, we still need to grab history: */
  updateTransactionRatio: (ratio: number) => void
}

export function makePiratechainSyncTracker(
  engine: SyncEngine
): PiratechainSyncTracker {
  let blocksDownloaded = 0
  let blocksNeeded = 1 // Must be > 0 for division
  let balanceRatio = 0
  let transactionRatio = 0
  let lastTotalRatio = 0
  let lastUpdate = new Date()

  function calculateStatus(): number {
    // Avoid rounding issues by treating 1 as special:
    if (
      blocksDownloaded === blocksNeeded &&
      balanceRatio === 1 &&
      transactionRatio === 1
    ) {
      return 1
    }

    return (
      (blocksDownloaded / blocksNeeded) * BLOCK_PROGRESS_WEIGHT +
      balanceRatio * BALANCE_PROGRESS_WEIGHT +
      transactionRatio * TRANSACTION_PROGRESS_WEIGHT
    )
  }

  function maybeSendUpdate(): void {
    const totalRatio = calculateStatus()

    // Don't go backwards:
    if (totalRatio <= lastTotalRatio) return

    // Throttle updates:
    const now = new Date()
    if (
      totalRatio === 1 ||
      now.valueOf() - lastUpdate.valueOf() > THROTTLE_UPDATE_MS
    ) {
      engine.sendSyncStatus(totalRatio)
      lastTotalRatio = totalRatio
      lastUpdate = now
    }
  }

  const out: PiratechainSyncTracker = {
    resetSync() {
      blocksDownloaded = 0
      blocksNeeded = 1
      balanceRatio = 0
      transactionRatio = 0
      lastTotalRatio = 0
      lastUpdate = new Date()
    },

    updateBlockProgress({
      birthdayHeight,
      lastDownloadedHeight,
      networkBlockHeight
    }) {
      blocksNeeded = Math.max(1, networkBlockHeight - birthdayHeight)
      blocksDownloaded = Math.min(
        blocksNeeded,
        lastDownloadedHeight - birthdayHeight
      )
      maybeSendUpdate()
    },

    updateBalanceRatio(ratio) {
      balanceRatio = ratio
      maybeSendUpdate()
    },

    updateTransactionRatio(ratio) {
      // Don't go backwards or past 1:
      if (ratio > transactionRatio) transactionRatio = Math.min(ratio, 1)
      maybeSendUpdate()
    }
  }

  return out
}
