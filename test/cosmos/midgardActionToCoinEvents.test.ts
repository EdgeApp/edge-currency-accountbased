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

const DEPOSIT_SENDER = 'thor1dc5s9xqgpuvzwvlaqqh7zkd02llvd88468a0fz'

// Real THORChain MsgDeposit whose swap memo failed to execute (a Maya memo
// misrouted to THORChain; the RUNE-DASH ticket). Midgard reports these as
// their own `type: 'failed'` action — status stays 'success', and the
// metadata.failed object carries no networkFees — with the full deposit
// amount in `in` even though it never moved. Source: thorchain Midgard
// actions API, txid 12581E...D65758, raw and uncleaned.
const failedDeposit = asMidgardActionResponse({
  date: '1784338251324347561',
  height: '27050815',
  in: [
    {
      address: DEPOSIT_SENDER,
      coins: [{ amount: '582794500000', asset: 'THOR.RUNE' }],
      txID: '12581E59B4A350D32A4123744B2407CCA68A071A8A68A8A45CDFC0759BD65758'
    }
  ],
  metadata: {
    failed: {
      code: '99',
      memo: '=:d:Xm1rpLaZrvku1XEB25PXRohSTYdxbdfkgK:0/5/0:ej:75',
      reason:
        "failed to execute message; message index: 0: invalid memo: 2 errors occurred:\n\t* internal error\n\t* MEMO: =:d:Xm1rpLaZrvku1XEB25PXRohSTYdxbdfkgK:0/5/0:ej:75\nPARSE FAILURE(S): cannot parse 'Xm1rpLaZrvku1XEB25PXRohSTYdxbdfkgK' as an Address: Xm1rpLaZrvku1XEB25PXRohSTYdxbdfkgK is not recognizable\n\n: internal error"
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
  // a real send (the RUNE-DASH ticket: a -5,827 RUNE "send" that never
  // debited the balance).
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
    assert.isFalse(changes.some(c => c.amount === '-582794500000'))
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
