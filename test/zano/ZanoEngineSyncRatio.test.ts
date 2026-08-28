import { assert } from 'chai'
import { describe, it } from 'mocha'

import { ZanoEngine } from '../../src/zano/ZanoEngine'
import { ZanoTools } from '../../src/zano/ZanoTools'
import { makeFakeZanoEngine } from '../fake/fakeZanoEngine'

interface FakeStatus {
  current_daemon_height: number
  current_wallet_height: number
  progress: number
  wallet_state: number
}

interface TestEngine {
  engine: ZanoEngine
  /** Every (ratio, walletHeight, daemonHeight) the tracker was handed. */
  ratios: Array<[number, number, number]>
  /** How many times the synced branch ran its full-sync work. */
  syncedPasses: () => number
  /** How many times the catch-up branch consulted the checkpoint. */
  checkpointPasses: () => number
  tick: (status: FakeStatus) => Promise<void>
}

async function makeEngine(): Promise<TestEngine> {
  let status: FakeStatus = {
    current_daemon_height: 0,
    current_wallet_height: 0,
    progress: 0,
    wallet_state: 2
  }
  const tools = {
    zano: {
      getWalletStatus: async () => status,
      whitelistAssets: async () => {}
    }
  } as unknown as ZanoTools

  const engine = await makeFakeZanoEngine({ tools })
  ;(engine as any).engineOn = true
  ;(engine as any).nativeId = { get: async () => 0, stop: () => {} }
  ;(engine as any).sendKeysToNative = null

  let synced = 0
  ;(engine as any).queryBalance = async () => {}
  ;(engine as any).queryTransactions = async () => {}
  ;(engine as any).storeWalletFile = async () => {
    synced++
  }
  let checkpoints = 0
  ;(engine as any).checkpointCatchup = async () => {
    checkpoints++
  }

  const ratios: Array<[number, number, number]> = []
  ;(engine as any).syncTracker.updateBlockRatio = (
    ratio: number,
    walletHeight: number,
    daemonHeight: number
  ) => {
    ratios.push([ratio, walletHeight, daemonHeight])
  }

  return {
    engine,
    ratios,
    syncedPasses: () => synced,
    checkpointPasses: () => checkpoints,
    tick: async next => {
      status = next
      await engine.syncNetwork({ privateKeys: {} })
    }
  }
}

const catchingUp = (
  walletHeight: number,
  daemonHeight: number,
  progress: number,
  walletState = 1
): FakeStatus => ({
  current_daemon_height: daemonHeight,
  current_wallet_height: walletHeight,
  progress,
  wallet_state: walletState
})

describe('ZanoEngine sync ratio', () => {
  it('does not read a fresh wallet as synced off its ready state', async () => {
    // The SDK reports wallet_state "ready" from open until the refresh
    // worker's first pass. The regression this guards: one poll in that
    // window latched the ratio at 1 while a restored wallet still had
    // weeks of blocks to scan, and ran the synced branch's store and
    // checkpoint reset mid-scan.
    const t = await makeEngine()

    await t.tick(catchingUp(1000, 5001, 0, 2))

    assert.deepEqual(t.ratios, [[0, 1000, 5000]])
    assert.equal(t.syncedPasses(), 0)
    assert.equal(t.checkpointPasses(), 1)
  })

  it('stays monotonic across restarts that reset SDK progress', async () => {
    // The SDK's `progress` restarts at zero on every refresh pass - after
    // each checkpoint reopen, and on reconnects - and measures only the
    // remaining gap. The episode baseline must keep the ratio climbing
    // through those resets:
    const t = await makeEngine()

    await t.tick(catchingUp(1000, 5001, 0))
    await t.tick(catchingUp(3000, 5001, 50))
    // A checkpoint reopen reset the SDK's progress; heights kept moving:
    await t.tick(catchingUp(3500, 5001, 12))
    await t.tick(catchingUp(4500, 5001, 25))

    const values = t.ratios.map(([ratio]) => ratio)
    assert.deepEqual(values, [0, 0.5, 0.625, 0.875])
  })

  it('reports synced only when the wallet height reaches the tip', async () => {
    const t = await makeEngine()

    await t.tick(catchingUp(4500, 5001, 90))
    await t.tick(catchingUp(5000, 5001, 99))

    assert.deepEqual(t.ratios[t.ratios.length - 1], [1, 5000, 5000])
    assert.equal(t.syncedPasses(), 1)

    // New blocks arrive later: a fresh episode baselines at the current
    // height instead of dragging the old baseline along:
    await t.tick(catchingUp(5000, 5601, 3))
    assert.deepEqual(t.ratios[t.ratios.length - 1], [0, 5000, 5600])
  })

  it('measures a new wallet from its birthday, not from height zero', async () => {
    // A restored wallet reports height ~0 until its first pull skips
    // straight to the account birthday, and the SDK's session progress
    // stays 0 through that skip because its own meter starts at the
    // birthday too. The work to be done is birthday-to-tip: with a
    // birthday at 75000 and the tip at 100000, reaching 80000 is 20% --
    // not the ~75% a zero baseline would show the moment the skip lands:
    const t = await makeEngine()

    await t.tick(catchingUp(1, 100001, 0, 2))
    await t.tick(catchingUp(75000, 100001, 0))
    await t.tick(catchingUp(80000, 100001, 20))
    await t.tick(catchingUp(87500, 100001, 50))

    const values = t.ratios.map(([ratio]) => ratio)
    assert.deepEqual(values, [0, 0, 0.2, 0.5])
  })

  it('holds the baseline through a reorg-sized dip', async () => {
    // A checkpoint reopen re-fetches a block chunk, and a reorg detaches up
    // to a week of blocks; the SDK re-scans both in place. Rebasing on
    // those would restart the measurement, and clearing the freeze would
    // report zero until the chase caught up again - the sawtooth this
    // baseline exists to remove:
    const t = await makeEngine()

    await t.tick(catchingUp(50000, 100001, 0))
    await t.tick(catchingUp(75000, 100001, 50))
    // The reopened wallet reports a slightly lower height:
    await t.tick(catchingUp(74900, 100001, 0))
    await t.tick(catchingUp(80000, 100001, 10))

    const values = t.ratios.map(([ratio]) => ratio)
    assert.equal(values[1], 0.5)
    assert.isAbove(values[2], 0.49)
    assert.equal(values[3], 0.6)
  })

  it('never reports a negative ratio', async () => {
    // Non-negativity must not rest on the rebase check running first:
    const t = await makeEngine()

    await t.tick(catchingUp(50000, 100001, 0))
    await t.tick(catchingUp(60000, 100001, 20))
    // A reorg deeper than the episode's own progress:
    await t.tick(catchingUp(49000, 100001, 0))

    assert.equal(t.ratios[t.ratios.length - 1][0], 0)
  })

  it('rebases the episode when a resync drops the wallet height', async () => {
    // A rebuilt wallet restarts at genesis and skips to its birthday, far
    // below any baseline the previous episode held, so it gets a fresh
    // episode - including a fresh chase, so the skip is not counted as
    // work done:
    const t = await makeEngine()

    await t.tick(catchingUp(80000, 100001, 80))
    await t.tick(catchingUp(1, 100001, 0))
    await t.tick(catchingUp(50000, 100001, 0))
    await t.tick(catchingUp(55000, 100001, 10))

    const values = t.ratios.map(([ratio]) => ratio)
    assert.equal(values[1], 0)
    assert.equal(values[2], 0)
    assert.equal(values[3], 0.1)
  })

  it('treats a disconnected daemon as not synced', async () => {
    // Daemon height zero means "not connected", which must neither divide
    // by zero nor read as "wallet is past the tip":
    const t = await makeEngine()

    await t.tick(catchingUp(1000, 0, 0, 2))

    assert.deepEqual(t.ratios, [[0, 1000, 0]])
    assert.equal(t.syncedPasses(), 0)
  })
})
