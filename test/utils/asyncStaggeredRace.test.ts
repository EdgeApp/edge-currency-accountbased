import { expect } from 'chai'
import { describe, it } from 'mocha'

import { asyncStaggeredRace } from '../../src/common/promiseUtils' // adjust path

// Helper to simulate async fetch tasks
const fakeFetch =
  (value: string, delay: number, fail = false) =>
  async () => {
    return await new Promise<string>((resolve, reject) => {
      setTimeout(() => {
        if (fail) reject(new Error(`fail ${value}`))
        else resolve(value)
      }, delay)
    })
  }

describe('asyncStaggeredRace', () => {
  it('resolves immediately if first task succeeds', async () => {
    const result = await asyncStaggeredRace([fakeFetch('a', 10)], 50)
    expect(result).to.equal('a')
  })

  it('resolves with second task if first fails', async () => {
    const tasks = [fakeFetch('a', 0, true), fakeFetch('b', 10)]
    const result = await asyncStaggeredRace(tasks, 50)
    expect(result).to.equal('b')
  })

  it('resolves with third task if first two fail', async () => {
    const delay = 10
    const tasks = [
      fakeFetch('a', 0 * delay, true),
      fakeFetch('b', 1 * delay, true),
      fakeFetch('c', 2 * delay)
    ]
    const result = await asyncStaggeredRace(tasks, 50)
    expect(result).to.equal('c')
  })

  it('resolves with third task if first fails and the second takes too long', async () => {
    const delay = 10
    const fuzzFactor = 500
    const tasks = [
      fakeFetch('a', 0 * delay, true),
      fakeFetch('b', 1 * delay, true),
      fakeFetch('c', 2 * delay + fuzzFactor),
      fakeFetch('d', 3 * delay)
    ]
    const result = await asyncStaggeredRace(tasks, 50)
    expect(result).to.equal('d')
  })

  it('rejects if all tasks fail', async () => {
    const delay = 10
    const tasks = [
      fakeFetch('a', 0 * delay, true),
      fakeFetch('b', 1 * delay, true),
      fakeFetch('c', 2 * delay, true)
    ]
    try {
      await asyncStaggeredRace(tasks, 50)
      throw new Error('Expected function to reject, but it resolved')
    } catch (err: any) {
      expect(err).to.be.instanceOf(Error)
      expect(err.message).to.equal('fail c')
    }
  })
})
