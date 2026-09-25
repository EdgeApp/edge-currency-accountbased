import { expect } from 'chai'
import { describe, it } from 'mocha'

import { toDisplayTxid } from '../../src/piratechain/piratechainIo'

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
