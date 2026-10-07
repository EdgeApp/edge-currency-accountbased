import { assert } from 'chai'
import { before, describe, it } from 'mocha'

import { asyncWaterfall } from '../../src/common/promiseUtils'
import { snooze, snoozeReject } from '../../src/common/utils'

describe(`Utils testing`, function () {
  before('', function (done) {
    done()
  })

  it('Async Waterfall 1', async function () {
    const funcs = [
      async () => {
        await snooze(3000)
        return 1
      },
      async () => {
        await snooze(2000)
        return 2
      },
      async () => {
        await snooze(200)
        return 3
      }
    ]
    const result = await asyncWaterfall(funcs, 250)
    assert.equal(result, 3)
  })

  it('Async Waterfall 2', async function () {
    const funcs = [
      async () => {
        await snooze(3000)
        return 1
      },
      async () => {
        await snooze(400)
        return 2
      },
      async () => {
        await snoozeReject(1000)
        return 3
      }
    ]
    const result = await asyncWaterfall(funcs, 250)
    assert.equal(result, 2)
  })

  it('Async Waterfall 3', async function () {
    const funcs = [
      async () => {
        await snoozeReject(50)
        return 1
      },
      async () => {
        await snoozeReject(50)
        return 2
      },
      async () => {
        await snooze(200)
        return 3
      }
    ]
    const result = await asyncWaterfall(funcs, 250)
    assert.equal(result, 3)
  })

  it('Async Waterfall 4', async function () {
    const funcs = [
      async () => {
        await snoozeReject(50)
        return 1
      },
      async () => {
        await snoozeReject(50)
        return 2
      },
      async () => {
        await snooze(500)
        return 3
      }
    ]
    const result = await asyncWaterfall(funcs, 250)
    assert.equal(result, 3)
  })
})

describe('asyncWaterfall rejections', function () {
  const fail = (ms: number, message: string) => async (): Promise<number> => {
    await snooze(ms)
    throw new Error(message)
  }

  it('never leaves a rejection unhandled, even after it is decided', async function () {
    const unhandled: unknown[] = []
    const listener = (reason: unknown): void => {
      unhandled.push(reason)
    }
    process.on('unhandledRejection', listener)
    try {
      // A times out, then fails while B, the last, still runs; B fails later.
      // This is how two failing RPC servers used to crash the Edge CLI engine.
      await asyncWaterfall([fail(30, 'A'), fail(60, 'B')], 10).then(
        () => assert.fail('should reject'),
        (error: Error) => assert.equal(error.message, 'B')
      )
      // After the decision: a late failure, and a late success.
      await asyncWaterfall([async () => 1, fail(20, 'late')], 1)
      await asyncWaterfall(
        [
          fail(5, 'early'),
          async () => {
            await snooze(30)
            return 2
          }
        ],
        1
      )
      await snooze(100)
    } finally {
      process.off('unhandledRejection', listener)
    }
    assert.deepEqual(unhandled, [])
  })

  it('rejects with the last error, treats a throwing function as a failure, and allows none', async function () {
    // Throws before returning a promise, as a careless adapter might.
    // eslint-disable-next-line @typescript-eslint/promise-function-async
    const throwing = (): Promise<number> => {
      throw new Error('sync')
    }
    await asyncWaterfall([fail(5, 'first'), throwing], 50).then(
      () => assert.fail('should reject'),
      (error: Error) => assert.equal(error.message, 'sync')
    )
    assert.equal(await asyncWaterfall([throwing, async () => 7], 50), 7)
    assert.equal(await asyncWaterfall([]), undefined)
  })

  it('lets an earlier, slower function still win', async function () {
    const result = await asyncWaterfall(
      [
        async () => {
          await snooze(40)
          return 'slow first'
        },
        async () => {
          await snooze(500)
          return 'second'
        }
      ],
      10
    )
    assert.equal(result, 'slow first')
  })
})
