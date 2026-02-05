import type { EdgeTokenId } from 'edge-core-js/types'

/**
 * Abstracts the ability to return a sync status,
 * since different chains track their sync status in different ways.
 */
export interface SyncTracker {
  /** The base currency engine calls this on resync. */
  resetSync: () => void

  /** The base currency engine calls this when it gets a balance update. */
  balanceComplete?: (tokenId: EdgeTokenId) => void
}

/**
 * Just the parts of currency engine the SyncTracker has access to,
 * to avoid a circular dependency.
 */
export interface SyncEngine {
  enabledTokenIds: EdgeTokenId[]

  sendSyncStatus: (status: number) => void
}

/**
 * A sync status tracker that works token-by-token.
 */
export interface TokenSyncTracker extends SyncTracker {
  // Update a single token, checking the current state first:
  updateBalanceRatio: (tokenId: EdgeTokenId, ratio: number) => void
  updateHistoryRatio: (
    tokenId: EdgeTokenId,
    ratio: number,
    minStep?: number
  ) => void

  // Forces all ratios to a certain value (usually 1):
  setBalanceRatios: (tokenIds: EdgeTokenId[], ratio: number) => void
  setHistoryRatios: (tokenIds: EdgeTokenId[], ratio: number) => void
}

export function makeTokenSyncTracker(engine: SyncEngine): TokenSyncTracker {
  // Each tokenId can be a 0-1 value:
  const balanceRatios = new Map<EdgeTokenId, number>()
  const historyRatios = new Map<EdgeTokenId, number>()

  function getSyncStatus(): number {
    const activeTokenIds = [null, ...engine.enabledTokenIds]
    const perTokenSlice = 1 / activeTokenIds.length
    let totalRatio = 0
    let numComplete = 0
    for (const tokenId of activeTokenIds) {
      const balanceStatus = balanceRatios.get(tokenId) ?? 0
      const txStatus = historyRatios.get(tokenId) ?? 0
      totalRatio += ((balanceStatus + txStatus) / 2) * perTokenSlice
      if (balanceStatus === 1 && txStatus === 1) {
        numComplete++
      }
    }

    // Avoid rounding issues by returning a literal "1":
    if (numComplete === activeTokenIds.length) {
      return 1
    }

    return totalRatio
  }

  const out: TokenSyncTracker = {
    resetSync() {
      balanceRatios.clear()
      historyRatios.clear()
    },

    balanceComplete(tokenId) {
      out.updateBalanceRatio(tokenId, 1)
    },

    setBalanceRatios(tokenIds, ratio) {
      for (const tokenId of tokenIds) balanceRatios.set(tokenId, ratio)
      engine.sendSyncStatus(getSyncStatus())
    },

    setHistoryRatios(tokenIds, ratio) {
      for (const tokenId of tokenIds) historyRatios.set(tokenId, ratio)
      engine.sendSyncStatus(getSyncStatus())
    },

    updateBalanceRatio(tokenId, ratio) {
      ratio = Math.max(0, Math.min(1, ratio))

      // Don't go backwards:
      const lastRatio = balanceRatios.get(tokenId) ?? 0
      if (ratio <= lastRatio) return

      balanceRatios.set(tokenId, ratio)
      engine.sendSyncStatus(getSyncStatus())
    },

    updateHistoryRatio(tokenId, ratio, minStep) {
      ratio = Math.max(0, Math.min(1, ratio))

      // Don't go backwards:
      const lastRatio = historyRatios.get(tokenId) ?? 0
      if (ratio <= lastRatio) return

      // Bail out if the step is too small:
      if (minStep != null && ratio - lastRatio < minStep && ratio < 1) return

      historyRatios.set(tokenId, ratio)
      engine.sendSyncStatus(getSyncStatus())
    }
  }

  return out
}
