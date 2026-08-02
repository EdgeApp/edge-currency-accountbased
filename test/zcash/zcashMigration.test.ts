import { expect } from 'chai'
import { describe, it } from 'mocha'

import {
  isIronwoodMigrationSpend,
  mapMigrationStatus,
  MIN_SWEEP_ZATOSHI
} from '../../src/zcash/zcashMigration'
import { asZcashMigrationStatus } from '../../src/zcash/zcashTypes'

describe('zcash migration helpers', function () {
  describe('mapMigrationStatus', function () {
    /** Post-activation, synced, a sweep-worthy balance. */
    const active = {
      isSynced: true,
      orchardAvailableZatoshi: '5000000',
      networkBlockHeight: 3500000,
      activationHeight: 3428143
    }

    it('sweep-worthy orchard funds -> required', function () {
      const status = mapMigrationStatus(active)
      expect(status.state).equals('required')
      expect(status.remainingOrchardZatoshi).equals('5000000')
    })

    it('zero orchard -> notNeeded', function () {
      const status = mapMigrationStatus({
        ...active,
        orchardAvailableZatoshi: '0'
      })
      expect(status.state).equals('notNeeded')
    })

    it('dust at the sweep floor -> notNeeded', function () {
      const status = mapMigrationStatus({
        ...active,
        orchardAvailableZatoshi: MIN_SWEEP_ZATOSHI
      })
      expect(status.state).equals('notNeeded')
    })

    it('just above the sweep floor -> required', function () {
      const status = mapMigrationStatus({
        ...active,
        orchardAvailableZatoshi: '10001'
      })
      expect(status.state).equals('required')
    })

    it('pre-activation height -> notNeeded even with funds', function () {
      const status = mapMigrationStatus({
        ...active,
        networkBlockHeight: 3428142
      })
      expect(status.state).equals('notNeeded')
    })

    it('activation height reached exactly -> required', function () {
      const status = mapMigrationStatus({
        ...active,
        networkBlockHeight: 3428143
      })
      expect(status.state).equals('required')
    })

    it('unknown activation height -> notNeeded', function () {
      const status = mapMigrationStatus({ ...active, activationHeight: null })
      expect(status.state).equals('notNeeded')
    })

    it('not synced -> notNeeded', function () {
      const status = mapMigrationStatus({ ...active, isSynced: false })
      expect(status.state).equals('notNeeded')
      expect(status.isSynced).equals(false)
    })

    it('output round-trips through the GUI cleaner', function () {
      const status = mapMigrationStatus(active)
      expect(asZcashMigrationStatus(status)).deep.equals(status)
    })
  })

  describe('isIronwoodMigrationSpend', function () {
    const target = { publicAddress: 'u1abc', nativeAmount: '1000' }

    it('detects the top-level migration flag', function () {
      expect(
        isIronwoodMigrationSpend({
          tokenId: null,
          spendTargets: [target],
          otherParams: { ironwoodMigration: true }
        })
      ).equals(true)
    })

    it('treats an ordinary spend as non-migration', function () {
      expect(
        isIronwoodMigrationSpend({ tokenId: null, spendTargets: [target] })
      ).equals(false)
      expect(
        isIronwoodMigrationSpend({
          tokenId: null,
          spendTargets: [target],
          otherParams: { zip321Uri: 'zcash:u1abc' }
        })
      ).equals(false)
    })

    it('ignores a per-target flag, which the send scene overwrites', function () {
      expect(
        isIronwoodMigrationSpend({
          tokenId: null,
          spendTargets: [
            { ...target, otherParams: { ironwoodMigration: true } }
          ]
        })
      ).equals(false)
    })

    it('requires a strict true, not a truthy value', function () {
      expect(
        isIronwoodMigrationSpend({
          tokenId: null,
          spendTargets: [target],
          otherParams: { ironwoodMigration: 'yes' }
        })
      ).equals(false)
    })
  })
})
