import { expect } from 'chai'
import type { EdgeSyncStatus, EdgeTokenId } from 'edge-core-js/types'
import { describe, it } from 'mocha'

import type { SyncEngine } from '../../src/common/SyncTracker'
import { makeTokenSyncTracker } from '../../src/common/SyncTracker'

function makeFakeEngine(enabledTokenIds: EdgeTokenId[] = []): {
  engine: SyncEngine
  statuses: EdgeSyncStatus[]
} {
  const statuses: EdgeSyncStatus[] = []
  const engine: SyncEngine = {
    enabledTokenIds,
    sendSyncStatus(status) {
      statuses.push(status)
    }
  }

  return { engine, statuses }
}

describe('SyncTracker', () => {
  describe('makeTokenSyncTracker', () => {
    it('should allow balance to complete after history completes', () => {
      const { engine, statuses } = makeFakeEngine([])
      const tracker = makeTokenSyncTracker(engine)

      tracker.updateHistoryRatio(null, 1)
      expect(statuses).to.have.length(1)
      expect(statuses[0].totalRatio).to.equal(0.5)

      tracker.updateBalanceRatio(null, 1)
      expect(statuses).to.have.length(2)
      expect(statuses[1].totalRatio).to.equal(1)

      // Monotonic: should not emit when going backwards:
      tracker.updateBalanceRatio(null, 0.9)
      expect(statuses).to.have.length(2)
    })

    it('should clamp ratios and never go backwards', () => {
      const { engine, statuses } = makeFakeEngine([])
      const tracker = makeTokenSyncTracker(engine)

      // Clamp high values:
      tracker.updateBalanceRatio(null, 2)
      expect(statuses).to.have.length(1)
      expect(statuses[0].totalRatio).to.equal(0.5)

      // Clamp negative values:
      tracker.updateHistoryRatio(null, -1)
      expect(statuses).to.have.length(1)

      // Make some progress, then attempt to go back:
      tracker.updateHistoryRatio(null, 0.2)
      expect(statuses).to.have.length(2)
      tracker.updateHistoryRatio(null, 0.1)
      expect(statuses).to.have.length(2)
    })

    it('should respect minStep unless the ratio is complete', () => {
      const { engine, statuses } = makeFakeEngine([])
      const tracker = makeTokenSyncTracker(engine)

      tracker.updateHistoryRatio(null, 0.9375, 0.1)
      expect(statuses).to.have.length(1)
      expect(statuses[0].totalRatio).to.equal(0.9375 * 0.5)

      tracker.updateHistoryRatio(null, 0.96875, 0.1)
      expect(statuses).to.have.length(1)

      tracker.updateHistoryRatio(null, 1, 0.1)
      expect(statuses).to.have.length(2)
      expect(statuses[1].totalRatio).to.equal(0.5)
    })

    it('should return a literal 1 when all tokens are complete', () => {
      const tokenIds: EdgeTokenId[] = [null, 'token-a', 'token-b']
      const { engine, statuses } = makeFakeEngine(['token-a', 'token-b'])
      const tracker = makeTokenSyncTracker(engine)

      tracker.setBalanceRatios(tokenIds, 1)
      tracker.setHistoryRatios(tokenIds, 1)

      expect(statuses).to.have.length(2)
      expect(statuses[1]).to.deep.equal({ totalRatio: 1 })
    })
  })
})
