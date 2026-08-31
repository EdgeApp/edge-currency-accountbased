import type { EdgeSyncStatus } from 'edge-core-js/types'

import { SyncEngine, SyncTracker } from '../common/SyncTracker'

const THROTTLE_UPDATE_MS = 1000

export interface DashshieldedSyncTracker extends SyncTracker {
  updateProgress: (percent: number) => void
}

export function makeDashshieldedSyncTracker(
  engine: SyncEngine
): DashshieldedSyncTracker {
  let seenFirstUpdate = false
  let lastTotalRatio = 0
  let lastUpdate = new Date()

  const out: DashshieldedSyncTracker = {
    resetSync() {
      seenFirstUpdate = false
      lastTotalRatio = 0
      lastUpdate = new Date()
    },

    updateProgress(progressPercent: number): void {
      if (!seenFirstUpdate) {
        seenFirstUpdate = true
        if (progressPercent !== 100) return
      }

      const status: EdgeSyncStatus = {
        totalRatio: progressPercent / 100
      }

      if (status.totalRatio <= lastTotalRatio) return

      const now = new Date()
      if (
        status.totalRatio === 1 ||
        now.valueOf() - lastUpdate.valueOf() > THROTTLE_UPDATE_MS
      ) {
        engine.sendSyncStatus(status)
        lastTotalRatio = status.totalRatio
        lastUpdate = now
      }
    }
  }

  return out
}
