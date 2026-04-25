import { assert } from 'chai'
import { describe, it } from 'mocha'

import { decodeZip321Memo } from '../../src/zcash/ZcashTools'

// ZIP-321 memo encoding: base64url, no `=` padding, ≤ 512 decoded bytes.
// https://zips.z.cash/zip-0321
describe('decodeZip321Memo', function () {
  it('decodes a ZNS:CLAIM ASCII payload', function () {
    // base64url of "ZNS:CLAIM:edge:test"
    const encoded = 'Wk5TOkNMQUlNOmVkZ2U6dGVzdA'
    assert.equal(
      decodeZip321Memo(encoded).toString('utf8'),
      'ZNS:CLAIM:edge:test'
    )
  })

  it('handles base64url-specific characters (- and _)', function () {
    // base64 of "subjects?_d>" is "c3ViamVjdHM/X2Q+" (uses + and /)
    // base64url of the same is "c3ViamVjdHM_X2Q-" (- and _)
    const encoded = 'c3ViamVjdHM_X2Q-'
    assert.equal(decodeZip321Memo(encoded).toString('utf8'), 'subjects?_d>')
  })

  it('handles input that needs no padding', function () {
    // base64url of "abcd" — exactly 4 char output, no padding needed
    const encoded = 'YWJjZA'
    assert.equal(decodeZip321Memo(encoded).toString('utf8'), 'abcd')
  })

  it('handles input that needs 1-byte padding', function () {
    // base64url of "abc" → 4 chars with 1 missing pad
    const encoded = 'YWJj'
    assert.equal(decodeZip321Memo(encoded).toString('utf8'), 'abc')
  })

  it('handles input that needs 2-byte padding', function () {
    // base64url of "ab" → 3 chars with 2 missing pads
    const encoded = 'YWI'
    assert.equal(decodeZip321Memo(encoded).toString('utf8'), 'ab')
  })

  it('decodes binary bytes correctly', function () {
    // base64url of bytes [0x01, 0x02, 0x03, 0xff]
    const encoded = 'AQID_w'
    const decoded = decodeZip321Memo(encoded)
    assert.deepEqual(Array.from(decoded), [0x01, 0x02, 0x03, 0xff])
  })

  it('returns empty buffer for empty input', function () {
    assert.equal(decodeZip321Memo('').length, 0)
  })
})
