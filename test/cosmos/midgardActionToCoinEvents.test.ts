import { Event } from '@cosmjs/stargate'
import { assert } from 'chai'
import { describe, it } from 'mocha'

import { reduceCoinEventsForAddress } from '../../src/cosmos/cosmosUtils'
import { midgardActionToCoinEvents } from '../../src/cosmos/engine/MidgardEngine'
import { thorchainAssetToDenom } from '../../src/cosmos/engine/ThorchainEngine'
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

const RUJI_SENDER = 'thor1qjzfutd45uxczjakm5m69ytm63pua0qyh0dhch'
const RUJI_RECIPIENT = 'thor1v8ppstuf6e3x0r4glqc68d5jqcs2tf38cg2q6y'

// A real THORChain token send, where Midgard names RUJI "X/RUJI" and the
// secured USDT it swaps into "ETH-USDT-0X...".
// Source: thorchain Midgard actions API, txid FBB394...D08839, verbatim.
const rujiSend = asMidgardActionResponse({
  date: '1790907697419049955',
  height: '28065109',
  in: [
    {
      address: RUJI_SENDER,
      coins: [{ amount: '7136000000', asset: 'X/RUJI' }],
      txID: 'FBB39400452DA7FB636EE7057F49255E7576B09C115A30BC284AD61BAED08839'
    }
  ],
  metadata: {
    send: {
      code: '0',
      memo: '=:ETH-USDT:thor1qjzfutd45uxczjakm5m69ytm63pua0qyh0dhch:1495487238',
      networkFees: [{ amount: '20000000', asset: 'X/RUJI' }],
      reason: ''
    }
  },
  out: [
    {
      address: RUJI_RECIPIENT,
      coins: [{ amount: '7136000000', asset: 'X/RUJI' }],
      txID: 'FBB39400452DA7FB636EE7057F49255E7576B09C115A30BC284AD61BAED08839'
    },
    {
      address: RUJI_SENDER,
      coins: [
        {
          amount: '1525160700',
          asset: 'ETH-USDT-0XDAC17F958D2EE523A2206206994597C13D831EC7'
        }
      ],
      txID: 'FBB39400452DA7FB636EE7057F49255E7576B09C115A30BC284AD61BAED08839'
    }
  ],
  pools: [],
  status: 'success',
  type: 'send'
})

const RUJI_BUYER = 'thor14c90cu0j65pjygsmdu2fsjlfawwm46cl4qp4er'

// A real swap into the same token, which Midgard names "THOR.RUJI" here.
// Source: thorchain Midgard actions API, txid CAD5DB...8EE4DA, verbatim.
const rujiSwap = asMidgardActionResponse({
  date: '1790914179747877085',
  height: '28066166',
  in: [
    {
      address: RUJI_BUYER,
      coins: [{ amount: '28000000', asset: 'THOR.RUNE' }],
      txID: 'CAD5DBA534D91C6E397FBF908DCAFAC057DEB3DF8D87FE7EF24D65B3528EE4DA'
    }
  ],
  metadata: {
    swap: {
      memo: '=:THOR.RUJI:thor14c90cu0j65pjygsmdu2fsjlfawwm46cl4qp4er:99392017/0/1:w1:0',
      networkFees: []
    }
  },
  out: [
    {
      address: RUJI_BUYER,
      coins: [{ amount: '102465997', asset: 'THOR.RUJI' }],
      txID: ''
    }
  ],
  pools: ['THOR.RUJI'],
  status: 'success',
  type: 'swap'
})

const AUTO_SENDER = 'thor1n5u0dt8mdj6dua7l4pgksv52zw58wqkyn60ufx'
const AUTO_RECIPIENT = 'thor10a24usyt30rxll566wpfvw6tqnnurh8zqzyvfg'

// A real send of a token whose denom has a dot in it.
// Source: thorchain Midgard actions API, txid E6F890...852146, verbatim.
const autoSend = asMidgardActionResponse({
  date: '1788018137399630360',
  height: '27608244',
  in: [
    {
      address: AUTO_SENDER,
      coins: [{ amount: '2753266246496', asset: 'THOR.AUTO' }],
      txID: 'E6F8903506502466028CC9A3F397B3CF066E3C7B08F88D13C742289CA3852146'
    }
  ],
  metadata: {
    send: {
      code: '0',
      memo: '',
      networkFees: [{ amount: '20000000', asset: 'THOR.AUTO' }],
      reason: ''
    }
  },
  out: [
    {
      address: AUTO_RECIPIENT,
      coins: [{ amount: '2753266246496', asset: 'THOR.AUTO' }],
      txID: 'E6F8903506502466028CC9A3F397B3CF066E3C7B08F88D13C742289CA3852146'
    }
  ],
  pools: [],
  status: 'success',
  type: 'send'
})

const thorChanges = (
  action: MidgardActionResponse,
  address: string
): Array<{ amount: string; denom: string }> =>
  reduceCoinEventsForAddress(
    midgardActionToCoinEvents(
      action,
      address,
      THOR_FALLBACK_FEES,
      thorchainAssetToDenom
    ),
    address
  )

describe('thorchainAssetToDenom', function () {
  it('maps every Midgard name for a token to its bank denom', function () {
    const cases: Array<[string, string]> = [
      ['THOR.RUNE', 'rune'],
      ['rune', 'rune'],
      ['THOR.TCY', 'tcy'],
      ['TCY', 'tcy'],
      ['THOR.RUJI', 'x/ruji'],
      ['X/RUJI', 'x/ruji'],
      ['THOR.AUTO', 'thor.auto'],
      ['THOR.LQDY', 'thor.lqdy'],
      ['BTC-BTC', 'btc-btc'],
      ['ETH-ETH', 'eth-eth'],
      ['SOL-SOL', 'sol-sol'],
      ['X/STAKING-TCY', 'x/staking-tcy'],
      ['X/STAKING-X/RUJI', 'x/staking-x/ruji'],
      ['X/BRUNE', 'x/brune'],
      ['X/STAKING-X/BRUNE', 'x/staking-x/brune']
    ]
    for (const [asset, denom] of cases) {
      assert.equal(thorchainAssetToDenom(asset), denom, asset)
    }
  })
})

describe('midgardActionToCoinEvents on THORChain tokens', function () {
  it('records a token send named by its raw denom', function () {
    assert.deepEqual(thorChanges(rujiSend, RUJI_RECIPIENT), [
      { denom: 'x/ruji', amount: '7136000000' }
    ])
    assert.deepEqual(thorChanges(rujiSend, RUJI_SENDER), [
      { denom: 'x/ruji', amount: '-7136000000' },
      {
        denom: 'eth-usdt-0xdac17f958d2ee523a2206206994597c13d831ec7',
        amount: '1525160700'
      }
    ])
  })

  it('records a swap into a token named with a chain prefix', function () {
    assert.deepEqual(thorChanges(rujiSwap, RUJI_BUYER), [
      { denom: 'rune', amount: '-28000000' },
      { denom: 'x/ruji', amount: '102465997' }
    ])
  })

  it('records a token whose denom has a dot in it', function () {
    assert.deepEqual(thorChanges(autoSend, AUTO_SENDER), [
      { denom: 'thor.auto', amount: '-2753266246496' }
    ])
    assert.deepEqual(thorChanges(autoSend, AUTO_RECIPIENT), [
      { denom: 'thor.auto', amount: '2753266246496' }
    ])
  })

  it('still strips the chain prefix by default', function () {
    // MAYAChain keeps the plain mapping, so a prefixed name is cut down to
    // its code rather than treated as a denom:
    const events = midgardActionToCoinEvents(successfulSend, RECIPIENT)
    assert.deepEqual(reduceCoinEventsForAddress(events, RECIPIENT), [
      { denom: 'cacao', amount: '12128369999999' }
    ])
  })
})
