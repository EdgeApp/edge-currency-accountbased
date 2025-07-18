import { makeAssertLog } from 'assert-log'
import { expect } from 'chai'
import { describe, it } from 'mocha'

import { makeLifecycleManager } from '../../src/common/lifecycleManager'
import { snooze } from '../../src/common/utils'

describe('makeLifecycleManager', () => {
  it('starts and returns the resource', async () => {
    const log = makeAssertLog()

    const manager = makeLifecycleManager<string>({
      async onStart() {
        log('start')
        return 'ok'
      },
      async onStop(value) {
        log(`stop ${value}`)
      }
    })

    const promises = Promise.all([manager.get(), manager.get()])
    expect(await promises).to.deep.equal(['ok', 'ok'])
    log.assert('start') // Only one start call

    expect(await manager.get()).to.equal('ok')
    log.assert() // No additonal calls

    manager.stop()
    manager.stop()
    expect(await manager.get()).to.equal('ok')
    log.assert('stop ok', 'start') // Only one stop call
  })

  it('cancels startup if stop is called', async () => {
    const log = makeAssertLog()

    const manager = makeLifecycleManager<string>({
      async onStart() {
        await snooze(1)
        log('start')
        return 'ok'
      },
      async onStop(value) {
        log(`stop ${value}`)
      }
    })

    // Queue up a `stop` promise:
    await manager.get()
    log.assert('start')
    manager.stop()

    // Cancel startup:
    const p = manager.get()
    manager.stop()
    expect(await p).to.equal(undefined)
    log.assert('stop ok') // The "start" hasn't been logged yet.
    await log.waitFor(1).assert('start')
  })

  it('handles startup failure', async () => {
    const log = makeAssertLog()

    const manager = makeLifecycleManager({
      async onStart() {
        throw new Error('boom')
      },
      async onStop() {},
      onError(error) {
        log(String(error))
      }
    })
    expect(await manager.get()).to.equal(undefined)
    log.assert('Error: boom')
  })

  it('handles stop failure', async () => {
    const log = makeAssertLog()

    const manager = makeLifecycleManager({
      async onStart() {},
      async onStop() {
        throw new Error('boom')
      },
      onError(error) {
        log(String(error))
      }
    })

    await manager.get()
    manager.stop()
    await log.waitFor(1).assert('Error: boom')
  })
})
