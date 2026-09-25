import { expect } from 'chai'
import { describe, it } from 'mocha'

import { makeSerialQueue } from '../../src/common/promiseUtils'

describe('makeSerialQueue', function () {
  it('runs tasks one at a time, in order', async function () {
    const queue = makeSerialQueue()
    const events: string[] = []
    let running = 0
    const task = (name: string) => async (): Promise<string> => {
      running++
      expect(running).equals(1)
      events.push(`start ${name}`)
      await new Promise(resolve => setTimeout(resolve, 1))
      events.push(`end ${name}`)
      running--
      return name
    }
    const results = await Promise.all([
      queue(task('a')),
      queue(task('b')),
      queue(task('c'))
    ])
    expect(results).deep.equals(['a', 'b', 'c'])
    expect(events).deep.equals([
      'start a',
      'end a',
      'start b',
      'end b',
      'start c',
      'end c'
    ])
  })

  it('keeps running after a task rejects', async function () {
    const queue = makeSerialQueue()
    const failure = new Error('failure')
    const failed = queue(async () => {
      throw failure
    })
    const next = queue(async () => 'next')
    const error = await failed.then(
      () => undefined,
      (error: unknown) => error
    )
    expect(error).equals(failure)
    expect(await next).equals('next')
    expect(await queue(async () => 'later')).equals('later')
  })
})
