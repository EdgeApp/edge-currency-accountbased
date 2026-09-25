import { expect } from 'chai'
import { describe, it } from 'mocha'

import {
  broadcastUntilKnown,
  isAmbiguousBroadcastError,
  isKnownTransactionError,
  toDisplayTxid
} from '../../src/piratechain/piratechainIo'

describe('toDisplayTxid', function () {
  it('reverses the byte order the SDK broadcasts with', function () {
    // The pair a live send produced: the broadcast return value, and the
    // hash the transaction list and the block explorer both use.
    const broadcast =
      '11093b347d8e40165a7586241072fff7faa910cd2c4f7f23e9d0e9b90e2c1920'
    const onChain =
      '20192c0eb9e9d0e9237f4f2ccd10a9faf7ff72102486755a16408e7d343b0911'
    expect(toDisplayTxid(broadcast)).equals(onChain)
  })

  it('reverses the byte order an unconfirmed listing carries', function () {
    // The pair one live send produced: the hash the transaction list reported
    // while the send was unconfirmed, and the hash it reported for the same
    // send once it landed in block 4147153, which is the hash the block
    // explorer resolves.
    const unconfirmed =
      'f14bd6bedaddb8e218422c8ba7a5190092089fc0f415d9d71a42ce2bf2ffdf28'
    const confirmed =
      '28dffff22bce421ad7d915f4c09f08920019a5a78b2c4218e2b8dddabed64bf1'
    expect(toDisplayTxid(unconfirmed)).equals(confirmed)
  })

  it('round-trips', function () {
    const txid =
      '20192c0eb9e9d0e9237f4f2ccd10a9faf7ff72102486755a16408e7d343b0911'
    expect(toDisplayTxid(toDisplayTxid(txid))).equals(txid)
  })

  it('lower-cases a mixed-case hash', function () {
    expect(
      toDisplayTxid(
        '00112233445566778899AABBCCDDEEFF00112233445566778899aabbccddeeff'
      )
    ).equals('ffeeddccbbaa99887766554433221100ffeeddccbbaa99887766554433221100')
  })

  it('passes through anything that is not a 32-byte hash', function () {
    expect(toDisplayTxid('')).equals('')
    expect(toDisplayTxid('not-a-txid')).equals('not-a-txid')
    expect(toDisplayTxid('abcd')).equals('abcd')
  })
})

// The error RJ's send surfaced, verbatim, though the send went through:
const h2Error = new Error(
  'Broadcast failed: Status error: status: Internal, message: "h2 protocol error: error reading a body from connection", details: [], metadata: MetadataMap { headers: {"server": "nginx/1.18.0 (Ubuntu)", "date": "Thu, 24 Sep 2026 04:58:09 GMT", "content-type": "application/grpc"} }'
)
// How the SDK wraps a node's rejection of a transaction it already holds:
const inMempoolError = new Error(
  'Broadcast failed: Network error: Broadcast failed: 18: txn-already-in-mempool (code -26)'
)
const badTxnsError = new Error(
  'Broadcast failed: Sync error: NON_RETRYABLE: Broadcast failed: bad-txns-sapling-duplicate-nullifier (code -26)'
)

describe('isAmbiguousBroadcastError', function () {
  it('flags a connection that dropped while reading the answer', function () {
    expect(isAmbiguousBroadcastError(h2Error)).equals(true)
  })

  it('flags the other in-flight gRPC statuses', function () {
    for (const code of ['Unavailable', 'Unknown', 'DeadlineExceeded']) {
      expect(
        isAmbiguousBroadcastError(
          new Error(
            `Broadcast failed: Status error: status: ${code}, message: ""`
          )
        )
      ).equals(true)
    }
  })

  it('leaves definite answers alone', function () {
    expect(isAmbiguousBroadcastError(badTxnsError)).equals(false)
    expect(isAmbiguousBroadcastError(inMempoolError)).equals(false)
    expect(
      isAmbiguousBroadcastError(
        new Error(
          'Broadcast failed: Status error: status: InvalidArgument, message: ""'
        )
      )
    ).equals(false)
    expect(
      isAmbiguousBroadcastError(
        new Error('ERR_SYNC_FINALIZING: Wallet sync is finalizing')
      )
    ).equals(false)
  })
})

describe('isKnownTransactionError', function () {
  it('accepts the answers for a transaction the node already holds', function () {
    expect(isKnownTransactionError(inMempoolError)).equals(true)
    for (const reason of [
      'already in mempool',
      '18: already in mempool',
      'txn-already-in-mempool',
      'Transaction already in block chain'
    ]) {
      expect(
        isKnownTransactionError(
          new Error(`Broadcast failed: ${reason} (code -27)`)
        )
      ).equals(true)
    }
  })

  it('rejects look-alikes', function () {
    expect(isKnownTransactionError(badTxnsError)).equals(false)
    expect(isKnownTransactionError(h2Error)).equals(false)
    expect(
      isKnownTransactionError(
        new Error('Broadcast failed: not already in mempool (code -26)')
      )
    ).equals(false)
    expect(isKnownTransactionError(new Error('txn-already-in-mempool'))).equals(
      false
    )
  })
})

describe('broadcastUntilKnown', function () {
  const delaysMs = [2000, 4000, 8000]

  /** Plays back one outcome per broadcast, recording each pause. */
  function makeBroadcast(outcomes: Array<Error | undefined>): {
    broadcast: () => Promise<void>
    sleep: (ms: number) => Promise<void>
    attempts: () => number
    pauses: number[]
  } {
    let attempts = 0
    const pauses: number[] = []
    return {
      broadcast: async () => {
        const outcome = outcomes[attempts++]
        if (outcome != null) throw outcome
      },
      sleep: async ms => {
        pauses.push(ms)
      },
      attempts: () => attempts,
      pauses
    }
  }

  it('broadcasts once when the node accepts', async function () {
    const run = makeBroadcast([undefined])
    await broadcastUntilKnown(run.broadcast, delaysMs, run.sleep)
    expect(run.attempts()).equals(1)
    expect(run.pauses).deep.equals([])
  })

  it('rebroadcasts after a dropped answer until the node accepts', async function () {
    const run = makeBroadcast([h2Error, h2Error, undefined])
    await broadcastUntilKnown(run.broadcast, delaysMs, run.sleep)
    expect(run.attempts()).equals(3)
    expect(run.pauses).deep.equals([2000, 4000])
  })

  it('succeeds when a rebroadcast finds the transaction already there', async function () {
    const run = makeBroadcast([h2Error, inMempoolError])
    await broadcastUntilKnown(run.broadcast, delaysMs, run.sleep)
    expect(run.attempts()).equals(2)
  })

  it('succeeds when the first answer is the node already holding it', async function () {
    const run = makeBroadcast([inMempoolError])
    await broadcastUntilKnown(run.broadcast, delaysMs, run.sleep)
    expect(run.attempts()).equals(1)
  })

  it('throws a definite rejection at once', async function () {
    const run = makeBroadcast([badTxnsError])
    await expectRejection(
      broadcastUntilKnown(run.broadcast, delaysMs, run.sleep),
      badTxnsError
    )
    expect(run.attempts()).equals(1)
    expect(run.pauses).deep.equals([])
  })

  it('keeps the unknown outcome when every rebroadcast stays unknown', async function () {
    const lastError = new Error(
      'Broadcast failed: Status error: status: Unavailable, message: ""'
    )
    const run = makeBroadcast([h2Error, h2Error, h2Error, lastError])
    await expectRejection(
      broadcastUntilKnown(run.broadcast, delaysMs, run.sleep),
      h2Error
    )
    expect(run.attempts()).equals(4)
    expect(run.pauses).deep.equals(delaysMs)
  })

  it('keeps the unknown outcome when a rebroadcast is rejected', async function () {
    // The rejection can come from the first broadcast having landed, so it
    // proves nothing about whether the send went through:
    const run = makeBroadcast([h2Error, badTxnsError])
    await expectRejection(
      broadcastUntilKnown(run.broadcast, delaysMs, run.sleep),
      h2Error
    )
    expect(run.attempts()).equals(2)
  })
})

async function expectRejection(
  promise: Promise<unknown>,
  expected: Error
): Promise<void> {
  const error = await promise.then(
    () => undefined,
    (error: unknown) => error
  )
  expect(error).equals(expected)
}
