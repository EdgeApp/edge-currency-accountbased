import { expect } from 'chai'
import { describe, it } from 'mocha'
import type { MigrationState } from 'react-native-zcash'

import {
  computeAvailableZatoshi,
  decideMigrationAction,
  mapMigrationStatus
} from '../../src/zcash/zcashMigration'
import {
  asZcashMigrationPlan,
  asZcashMigrationStatus
} from '../../src/zcash/zcashTypes'

const balances = {
  transparentAvailableZatoshi: '10',
  transparentTotalZatoshi: '20',
  saplingAvailableZatoshi: '100',
  saplingTotalZatoshi: '200',
  orchardAvailableZatoshi: '1000',
  orchardTotalZatoshi: '2000',
  ironwoodAvailableZatoshi: '10000',
  ironwoodTotalZatoshi: '20000'
}

const inProgress: MigrationState = {
  state: 'inProgress',
  progress: {
    completedTransfers: 2,
    totalTransfers: 5,
    remainingOrchardZatoshi: '300000000',
    nextTransferReadyAtHeight: 2600000
  }
}

describe('zcash migration helpers', function () {
  describe('computeAvailableZatoshi', function () {
    it('sums the shielded pools and excludes transparent', function () {
      expect(computeAvailableZatoshi(balances)).equals('11100')
    })
  })

  describe('mapMigrationStatus', function () {
    const base = {
      hasOverdueTransfers: false,
      isSynced: true,
      orchardTotalZatoshi: '5000'
    }

    it('notStarted with orchard funds -> required', function () {
      const status = mapMigrationStatus({
        ...base,
        state: { state: 'notStarted' }
      })
      expect(status.state).equals('required')
    })

    it('notStarted without orchard funds -> notNeeded', function () {
      const status = mapMigrationStatus({
        ...base,
        orchardTotalZatoshi: '0',
        state: { state: 'notStarted' }
      })
      expect(status.state).equals('notNeeded')
    })

    it('readyToPropose -> required (plan not yet confirmed)', function () {
      const status = mapMigrationStatus({
        ...base,
        state: { state: 'readyToPropose' }
      })
      expect(status.state).equals('required')
    })

    it('splitPendingConfirmation -> scheduled', function () {
      const status = mapMigrationStatus({
        ...base,
        state: { state: 'splitPendingConfirmation' }
      })
      expect(status.state).equals('scheduled')
    })

    it('inProgress -> scheduled with progress fields', function () {
      const status = mapMigrationStatus({ ...base, state: inProgress })
      expect(status.state).equals('scheduled')
      expect(status.completedTransfers).equals(2)
      expect(status.totalTransfers).equals(5)
      expect(status.remainingOrchardZatoshi).equals('300000000')
      expect(status.nextTransferReadyAtHeight).equals(2600000)
    })

    it('requiresAttention(syncRequiredBeforeNext) -> scheduled', function () {
      const status = mapMigrationStatus({
        ...base,
        state: {
          state: 'requiresAttention',
          attention: { reason: 'syncRequiredBeforeNext' }
        }
      })
      expect(status.state).equals('scheduled')
    })

    it('requiresAttention(invalidTransfer) -> error', function () {
      const status = mapMigrationStatus({
        ...base,
        state: {
          state: 'requiresAttention',
          attention: { reason: 'invalidTransfer', transferId: 'abc' }
        }
      })
      expect(status.state).equals('error')
    })

    it('requiresAttention(transferExpired) -> error', function () {
      const status = mapMigrationStatus({
        ...base,
        state: {
          state: 'requiresAttention',
          attention: { reason: 'transferExpired' }
        }
      })
      expect(status.state).equals('error')
    })

    it('complete -> complete', function () {
      const status = mapMigrationStatus({
        ...base,
        state: { state: 'complete' }
      })
      expect(status.state).equals('complete')
    })

    it('output round-trips through its cleaner', function () {
      const status = mapMigrationStatus({ ...base, state: inProgress })
      expect(asZcashMigrationStatus(status)).deep.equals(status)
    })
  })

  describe('decideMigrationAction', function () {
    const base = {
      hasInvalidTransfers: false,
      isSyncRequiredBeforeNextTransfer: false,
      networkBlockHeight: 2600001,
      isBusy: false
    }

    it('does nothing while busy', function () {
      const action = decideMigrationAction({
        ...base,
        state: inProgress,
        isBusy: true
      })
      expect(action).equals('none')
    })

    it('executes a height-due transfer', function () {
      expect(decideMigrationAction({ ...base, state: inProgress })).equals(
        'execute'
      )
    })

    it('waits when the next transfer is not yet due', function () {
      const action = decideMigrationAction({
        ...base,
        networkBlockHeight: 2599999,
        state: inProgress
      })
      expect(action).equals('none')
    })

    it('executes when no ready height is reported', function () {
      const state: MigrationState = {
        state: 'inProgress',
        progress: {
          completedTransfers: 0,
          totalTransfers: 1,
          remainingOrchardZatoshi: '1'
        }
      }
      expect(decideMigrationAction({ ...base, state })).equals('execute')
    })

    it('refreshes stale transfers when invalid', function () {
      const action = decideMigrationAction({
        ...base,
        hasInvalidTransfers: true,
        state: inProgress
      })
      expect(action).equals('refreshStale')
    })

    it('waits for sync when the SDK requires it', function () {
      const action = decideMigrationAction({
        ...base,
        isSyncRequiredBeforeNextTransfer: true,
        state: inProgress
      })
      expect(action).equals('none')
    })

    it('refreshes on invalidTransfer attention', function () {
      const action = decideMigrationAction({
        ...base,
        state: {
          state: 'requiresAttention',
          attention: { reason: 'invalidTransfer', transferId: 'abc' }
        }
      })
      expect(action).equals('refreshStale')
    })

    it('refreshes on transferExpired attention', function () {
      const action = decideMigrationAction({
        ...base,
        state: {
          state: 'requiresAttention',
          attention: { reason: 'transferExpired' }
        }
      })
      expect(action).equals('refreshStale')
    })

    it('waits on syncRequiredBeforeNext attention', function () {
      const action = decideMigrationAction({
        ...base,
        state: {
          state: 'requiresAttention',
          attention: { reason: 'syncRequiredBeforeNext' }
        }
      })
      expect(action).equals('none')
    })

    it('does nothing in terminal or pre-plan states', function () {
      for (const state of [
        { state: 'notStarted' },
        { state: 'splitPendingConfirmation' },
        { state: 'readyToPropose' },
        { state: 'complete' }
      ] as MigrationState[]) {
        expect(decideMigrationAction({ ...base, state })).equals('none')
      }
    })
  })

  describe('asZcashMigrationPlan', function () {
    it('round-trips a full plan', function () {
      const plan = {
        strategy: 'privacy' as const,
        transfers: [
          {
            id: 't1',
            amountZatoshi: '350000000',
            nextExecutableAfterHeight: 2600100,
            expiryHeight: 2610000
          }
        ],
        estimatedDurationHours: 24,
        totalAmountZatoshi: '350000000',
        noteSplitFeeZatoshi: '15000',
        noteSplitRequired: true,
        noteSplitProposalBase64: 'cHJvcG9zYWw=',
        scheduleBase64: 'c2NoZWR1bGU='
      }
      expect(asZcashMigrationPlan(plan)).deep.equals(plan)
    })

    it('rejects a plan without the opaque schedule', function () {
      expect(() =>
        asZcashMigrationPlan({
          strategy: 'immediate',
          transfers: [],
          estimatedDurationHours: 0,
          totalAmountZatoshi: '0',
          noteSplitFeeZatoshi: '0',
          noteSplitRequired: false
        })
      ).throws()
    })
  })
})
