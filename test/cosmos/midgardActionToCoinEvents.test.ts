import { Event } from '@cosmjs/stargate'
import { assert } from 'chai'
import { describe, it } from 'mocha'

import { reduceCoinEventsForAddress } from '../../src/cosmos/cosmosUtils'
import { midgardActionToCoinEvents } from '../../src/cosmos/engine/MidgardEngine'
import { MidgardActionResponse } from '../../src/cosmos/midgardTypes'

const SENDER = 'maya1pac6fe5jdmkpnpnmyye8geqn72v4dsncy7qm36'
const RECIPIENT = 'maya1ut0p7veh9l4sdezk2yn7ypuhqml2adfmezydlh'
const OTHER = 'maya1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq'

// Real MAYAChain send that reverted on-chain with "insufficient funds" but is
// still reported by Midgard with the full amount in both `in` and `out`.
// Source: the CACAO Balance ticket / midgard.mayachain.info actions API.
const failedSend: MidgardActionResponse = {
  date: '1782920131538096319',
  height: '17270898',
  in: [
    {
      address: SENDER,
      coins: [{ amount: '12128369999999', asset: 'MAYA.CACAO' }],
      txID: 'CADADEA87F920A0650FD438A40D415FD61EA8FD80390D4821F8758C19C0A9380'
    }
  ],
  metadata: {
    send: {
      memo: '',
      networkFees: [{ amount: '2000000000', asset: 'MAYA.CACAO' }]
    }
  },
  out: [
    {
      address: RECIPIENT,
      coins: [{ amount: '12128369999999', asset: 'MAYA.CACAO' }],
      txID: 'CADADEA87F920A0650FD438A40D415FD61EA8FD80390D4821F8758C19C0A9380'
    }
  ],
  status: 'failed'
}

const successfulSend: MidgardActionResponse = {
  ...failedSend,
  metadata: {
    send: {
      memo: 'gm',
      networkFees: [{ amount: '2000000000', asset: 'MAYA.CACAO' }]
    }
  },
  status: 'success'
}

const netChange = (events: Event[], address: string): string | undefined =>
  reduceCoinEventsForAddress(events, address).find(c => c.denom === 'cacao')
    ?.amount

describe('midgardActionToCoinEvents', function () {
  it('ignores a failed transaction for the intended recipient', function () {
    const events = midgardActionToCoinEvents(failedSend, RECIPIENT)
    // The recipient never received anything and paid no fee, so there must be
    // no balance change to record (this is the bug being fixed: it previously
    // showed a bogus +12128369999999 receive).
    assert.deepEqual(events, [])
    assert.deepEqual(reduceCoinEventsForAddress(events, RECIPIENT), [])
  })

  it('records only the burned fee against the signer of a failed transaction', function () {
    const events = midgardActionToCoinEvents(failedSend, SENDER)
    // The signer's balance dropped only by the burned network fee, not the
    // full reverted send amount (matches failed EVM transaction behavior).
    assert.equal(netChange(events, SENDER), '-2000000000')
  })

  it('ignores a failed transaction for an unrelated address', function () {
    const events = midgardActionToCoinEvents(failedSend, OTHER)
    assert.deepEqual(events, [])
  })

  it('records the full receive for a successful transaction', function () {
    const events = midgardActionToCoinEvents(successfulSend, RECIPIENT)
    assert.equal(netChange(events, RECIPIENT), '12128369999999')
  })

  it('records the full send for a successful transaction', function () {
    const events = midgardActionToCoinEvents(successfulSend, SENDER)
    assert.equal(netChange(events, SENDER), '-12128369999999')
  })
})
