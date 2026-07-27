import { Event } from '@cosmjs/stargate'
import { assert } from 'chai'
import { describe, it } from 'mocha'

import { reduceCoinEventsForAddress } from '../../src/cosmos/cosmosUtils'
import { midgardActionToCoinEvents } from '../../src/cosmos/engine/MidgardEngine'
import {
  asMidgardActionResponse,
  MidgardActionResponse
} from '../../src/cosmos/midgardTypes'

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
  status: 'failed',
  type: 'send'
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

const DEPOSIT_SENDER = 'thor1awtcehl2tq4jg0js9tdsx623a8k3a2nqcce4el'

// A real THORChain MsgDeposit that failed to execute, from an unrelated
// third-party integration (note the `-_/t1` affiliate — not ours). Midgard
// reports these as their own `type: 'failed'` action: the status stays
// 'success', the metadata.failed object carries no networkFees, and the full
// deposit amount is still listed in `in` even though it never moved.
// Source: thorchain Midgard actions API, txid D3A914...57CDA9, verbatim.
const failedDeposit = asMidgardActionResponse({
  date: '1784826777907554968',
  height: '27128571',
  in: [
    {
      address: DEPOSIT_SENDER,
      coins: [{ amount: '49856548000', asset: 'THOR.RUNE' }],
      txID: 'D3A9148F8A242FF64D16C1656B48A2E7B58FB8FA90C69070EF4E9FEA8757CDA9'
    }
  ],
  metadata: {
    failed: {
      code: '5',
      memo: '=:e:0x566bc53a9648FC5f4a01DDA944EE91B66Dc8CE13:10940295/0/0:-_/t1:0/70',
      reason: 'failed to execute message; message index: 0: insufficient funds'
    }
  },
  out: [],
  pools: [],
  status: 'success',
  type: 'failed'
})

// THORChain's standard native fee, as passed by the engine's
// getMidgardTransactionFee fallback.
const THOR_FALLBACK_FEES = [{ amount: '2000000', asset: 'rune' }]

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

  // A `type: 'failed'` deposit reverted on-chain even though its status reads
  // 'success'. Treating it by status alone recorded the full deposit amount as
  // a real send, leaving a large outgoing transaction in history against a
  // balance that never moved.
  it('records only the fallback fee for the signer of a failed deposit', function () {
    const events = midgardActionToCoinEvents(
      failedDeposit,
      DEPOSIT_SENDER,
      THOR_FALLBACK_FEES
    )
    const runeChange = reduceCoinEventsForAddress(events, DEPOSIT_SENDER).find(
      c => c.denom === 'rune'
    )?.amount
    assert.equal(runeChange, '-2000000')
  })

  it('never records the full deposit amount for a failed deposit', function () {
    const events = midgardActionToCoinEvents(
      failedDeposit,
      DEPOSIT_SENDER,
      THOR_FALLBACK_FEES
    )
    const changes = reduceCoinEventsForAddress(events, DEPOSIT_SENDER)
    assert.isFalse(changes.some(c => c.amount === '-49856548000'))
  })

  it('emits nothing for a failed deposit without a fallback fee', function () {
    // Base MidgardEngine subclasses with a zero fee produce a zero event,
    // which reduceCoinEventsForAddress filters out entirely.
    const events = midgardActionToCoinEvents(failedDeposit, DEPOSIT_SENDER)
    assert.deepEqual(reduceCoinEventsForAddress(events, DEPOSIT_SENDER), [])
  })

  it('ignores a failed deposit for an unrelated address', function () {
    const events = midgardActionToCoinEvents(
      failedDeposit,
      OTHER,
      THOR_FALLBACK_FEES
    )
    assert.deepEqual(events, [])
  })
})
