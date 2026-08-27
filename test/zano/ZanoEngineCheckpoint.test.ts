import { assert } from 'chai'
import { describe, it } from 'mocha'

import { ZanoEngine } from '../../src/zano/ZanoEngine'
import { makeFakeZanoEngine } from '../fake/fakeZanoEngine'

const INTERVAL_MS = 5 * 60 * 1000

interface TestEngine {
  checkpoint: (walletHeight: number) => Promise<void>
  engine: ZanoEngine
  /** How many times the lifecycle manager was cycled. */
  restarts: () => number
}

async function makeEngine(
  opts: { nativeIo?: unknown } = {}
): Promise<TestEngine> {
  const engine = await makeFakeZanoEngine(opts)
  // The single-flight gate is shared across engines; isolate each test:
  ;(ZanoEngine as any).checkpointInFlight = false

  // A recording lifecycle stub: `stop` then `get` is one checkpoint cycle.
  let stops = 0
  ;(engine as any).nativeId = {
    get: async () => 0,
    stop: () => {
      stops++
    }
  }

  return {
    engine,
    checkpoint: async (walletHeight: number) => {
      await (engine as any).checkpointCatchup(walletHeight)
    },
    restarts: () => stops
  }
}

/** Runs `body` with Date.now pinned to a mutable clock. */
async function withClock(
  body: (advance: (ms: number) => void) => Promise<void>
): Promise<void> {
  const realNow = Date.now
  let now = 1_700_000_000_000
  Date.now = () => now
  try {
    await body(ms => {
      now += ms
    })
  } finally {
    Date.now = realNow
  }
}

describe('ZanoEngine.checkpointCatchup', () => {
  it('does not checkpoint on first sight of a catching-up wallet', async () => {
    // The wallet just loaded from disk; there is nothing new to persist.
    await withClock(async () => {
      const t = await makeEngine()
      await t.checkpoint(100)
      assert.equal(t.restarts(), 0)
    })
  })

  it('checkpoints once the interval elapses with progress made', async () => {
    await withClock(async advance => {
      const t = await makeEngine()
      await t.checkpoint(100)
      advance(INTERVAL_MS + 1000)
      await t.checkpoint(5000)
      assert.equal(t.restarts(), 1)
    })
  })

  it('does not checkpoint before the interval', async () => {
    await withClock(async advance => {
      const t = await makeEngine()
      await t.checkpoint(100)
      advance(INTERVAL_MS / 2)
      await t.checkpoint(5000)
      assert.equal(t.restarts(), 0)
    })
  })

  it('does not restart a stalled wallet', async () => {
    // Height frozen -- daemon offline or scan stuck. Cycling the wallet
    // would persist nothing and churn forever.
    await withClock(async advance => {
      const t = await makeEngine()
      await t.checkpoint(100)
      advance(INTERVAL_MS + 1000)
      await t.checkpoint(100)
      assert.equal(t.restarts(), 0)
    })
  })

  it('defers while a spend is in flight, then fires next tick', async () => {
    // `broadcastTx` resolves a native id, then awaits the transfer on it. A
    // checkpoint restart in that window closes the handle out from under
    // the broadcast, so the checkpoint must wait -- but only until the
    // spend clears, not for another whole interval.
    await withClock(async advance => {
      const t = await makeEngine()
      await t.checkpoint(100)
      advance(INTERVAL_MS + 1000)
      ;(t.engine as any).spendPending = true
      await t.checkpoint(5000)
      assert.equal(t.restarts(), 0)
      ;(t.engine as any).spendPending = false
      await t.checkpoint(6000)
      assert.equal(t.restarts(), 1)
    })
  })

  it('discards its gates when a resync races the restart', async () => {
    // resyncBlockchain zeroes the gates and bumps the generation while the
    // checkpoint awaits its reopen. Writing the pre-resync height back
    // would gate the rebuilt wallet at a tip it has not re-reached,
    // disabling checkpoints for the entire rescan.
    await withClock(async advance => {
      const t = await makeEngine()
      // Model resyncBlockchain firing inside the checkpoint's await:
      ;(t.engine as any).nativeId.get = async () => {
        const raw = t.engine as any
        raw.lastCheckpointTime = 0
        raw.lastCheckpointHeight = 0
        raw.storeGeneration = Number(raw.storeGeneration) + 1
        return 0
      }
      await t.checkpoint(100)
      advance(INTERVAL_MS + 1000)
      await t.checkpoint(5000)
      assert.equal(t.restarts(), 1)
      // The gates stay reset -- the rebuilt wallet baselines fresh:
      assert.equal((t.engine as any).lastCheckpointTime, 0)
      assert.equal((t.engine as any).lastCheckpointHeight, 0)
    })
  })

  it('baselines fresh for each catch-up episode', async () => {
    // Reaching synced forgets the gates, so a later dip back into catch-up
    // does not fire a restart on its first tick off stale time and height.
    await withClock(async advance => {
      const t = await makeEngine()
      await t.checkpoint(100)
      advance(INTERVAL_MS + 1000)
      ;(t.engine as any).resetCatchupCheckpoint()
      await t.checkpoint(9000)
      assert.equal(t.restarts(), 0)
    })
  })

  it('never checkpoints when the native module is Android', async () => {
    // Android's reader-writer lock policy turns the SDK's close-during-scan
    // lock inversion into a permanent deadlock, so catch-up checkpointing
    // is disabled there until the SDK reorders close_wallet.
    await withClock(async advance => {
      const t = await makeEngine({
        nativeIo: {
          zano: { documentDirectory: '/data/user/0/co.edgesecure.app/files' }
        }
      })
      await t.checkpoint(100)
      advance(INTERVAL_MS + 1000)
      await t.checkpoint(5000)
      advance(INTERVAL_MS + 1000)
      await t.checkpoint(9000)
      assert.equal(t.restarts(), 0)
    })
  })

  it('runs one checkpoint cycle at a time across engines', async () => {
    // Every wallet baselines its clock at login, so first cycles land
    // together. While one engine's reopen is still pending, another
    // engine's due checkpoint defers -- and retries on its next tick once
    // the gate clears, without waiting out a fresh interval.
    await withClock(async advance => {
      const a = await makeEngine()
      const b = await makeEngine()
      // Make A's reopen hang, holding the shared gate:
      let releaseA: (value: number) => void = () => {}
      ;(a.engine as any).nativeId.get = async () =>
        await new Promise<number>(resolve => {
          releaseA = resolve
        })
      await a.checkpoint(100)
      await b.checkpoint(100)
      advance(INTERVAL_MS + 1000)
      const pending = a.checkpoint(5000) // fires, hangs in reopen
      await b.checkpoint(5000) // due, but deferred by the gate
      assert.equal(b.restarts(), 0)

      releaseA(0)
      await pending
      await b.checkpoint(6000) // next tick: gate clear, fires immediately
      assert.equal(b.restarts(), 1)
      assert.equal(a.restarts(), 1)
    })
  })

  it('resets its clock after a checkpoint', async () => {
    await withClock(async advance => {
      const t = await makeEngine()
      await t.checkpoint(100)
      advance(INTERVAL_MS + 1000)
      await t.checkpoint(5000)
      // More progress immediately after: still inside the new interval.
      await t.checkpoint(6000)
      assert.equal(t.restarts(), 1)
      advance(INTERVAL_MS + 1000)
      await t.checkpoint(7000)
      assert.equal(t.restarts(), 2)
    })
  })
})
