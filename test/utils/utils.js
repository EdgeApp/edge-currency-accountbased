import { describe, it, before } from 'mocha'
import { assert } from 'chai'
import { asyncWaterfall, snooze, snoozeReject } from '../../src/common/utils.js'

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
