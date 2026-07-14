import { assert } from 'chai'
import { describe, it } from 'mocha'

import { reduceCoinEventsForAddress } from '../../src/cosmos/cosmosUtils'
import { midgardActionToCoinEvents } from '../../src/cosmos/engine/MidgardEngine'
import { asMidgardActionsResponse } from '../../src/cosmos/midgardTypes'
import liveActions from './fixtures/mayachainActions_maya1ut0p7v.json'

// The exact address from the CACAO Balance ticket, and a snapshot of what
// midgard.mayachain.info returned for `?address=<that address>` on 2026-07-13.
// This proves the fix against real production data, not just a hand-built
// fixture: the wallet was the recipient of 5 failed sends (bogus receives) plus
// 2 genuinely-successful actions.
const TASK_ADDRESS = 'maya1ut0p7veh9l4sdezk2yn7ypuhqml2adfmezydlh'

// Replicates the OLD (buggy) behavior: build spent/received events from every
// in/out sub-action regardless of the action status.
const legacyEvents = (action: any): any[] => {
  const events: any[] = []
  const push = (
    address: string,
    asset: string,
    amount: string,
    type: string
  ): void => {
    const parts = asset.split('.')
    const code = parts[1] ?? parts[0]
    events.push({
      type,
      attributes: [
        {
          key: 'amount',
          value: `${amount.replace('-', '')}${code.toLowerCase()}`
        },
        {
          key: type === 'coin_received' ? 'receiver' : 'spender',
          value: address
        }
      ]
    })
  }
  for (const s of action.in)
    for (const c of s.coins) push(s.address, c.asset, c.amount, 'coin_spent')
  for (const s of action.out)
    for (const c of s.coins) push(s.address, c.asset, c.amount, 'coin_received')
  return events
}

describe('Midgard fix against live task address', function () {
  const { actions } = asMidgardActionsResponse(liveActions)

  it('has the expected mix of live actions (2 success, 5 failed)', function () {
    const failed = actions.filter(a => a.status === 'failed').length
    const success = actions.filter(a => a.status === 'success').length
    assert.equal(actions.length, 7)
    assert.equal(failed, 5)
    assert.equal(success, 2)
  })

  it('OLD behavior credited every failed action as a receive (the bug)', function () {
    const bogus = actions
      .filter(a => a.status === 'failed')
      .map(a => reduceCoinEventsForAddress(legacyEvents(a), TASK_ADDRESS))
      .filter(net =>
        net.some(c => !c.amount.startsWith('-') && c.amount !== '0')
      )
    // All 5 failed sends would have shown a positive (incoming) balance change.
    assert.equal(bogus.length, 5)
  })

  it('NEW behavior drops every failed action for this recipient', function () {
    for (const action of actions.filter(a => a.status === 'failed')) {
      const events = midgardActionToCoinEvents(action, TASK_ADDRESS)
      assert.deepEqual(events, [], `failed action should be dropped`)
      assert.deepEqual(reduceCoinEventsForAddress(events, TASK_ADDRESS), [])
    }
  })

  it('NEW behavior still records the successful receives', function () {
    const kept = actions
      .filter(a => a.status === 'success')
      .map(a =>
        reduceCoinEventsForAddress(
          midgardActionToCoinEvents(a, TASK_ADDRESS),
          TASK_ADDRESS
        )
      )
      .filter(net => net.length > 0)
    // Both successful actions still produce a real balance change.
    assert.equal(kept.length, 2)
  })
})
