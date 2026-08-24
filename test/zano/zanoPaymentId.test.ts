import {
  createIntegratedAddress,
  splitIntegratedAddress
} from '@zano-project/zano-utils-js'
import { assert } from 'chai'

import { resolvePaymentIdDestination } from '../../src/zano/zanoPaymentId'

// The golden master address from the seed phrase tests:
const PLAIN =
  'ZxCErvJMYURjo2LcMJzj5SM7N1YADhuy3hZqiaqvpkBhHWWZBxyTDm1aNpd8ZRfVJVVy3FncPDrGygB4gik9jhJv36cJT4HSg'
const PID = 'aabbccddeeff0011'
const OTHER_PID = '1100ffeeddccbbaa'

describe('resolvePaymentIdDestination', () => {
  it('folds a payment id into a plain address', () => {
    const resolved = resolvePaymentIdDestination(PLAIN, PID)

    // Lossless: the integrated address is exactly the (address, id) pair,
    // so it splits back to what went in:
    const split = splitIntegratedAddress(resolved)
    assert.equal(split.masterAddress, PLAIN)
    assert.equal(split.paymentId, PID)
  })

  it('accepts an uppercase id and produces the same address', () => {
    assert.equal(
      resolvePaymentIdDestination(PLAIN, PID.toUpperCase()),
      resolvePaymentIdDestination(PLAIN, PID)
    )
  })

  it('returns an integrated address unchanged when the id agrees', () => {
    const integrated = createIntegratedAddress(PLAIN, PID)

    assert.equal(resolvePaymentIdDestination(integrated, PID), integrated)
    assert.equal(
      resolvePaymentIdDestination(integrated, PID.toUpperCase()),
      integrated
    )
  })

  it('detects integrated input before creating', () => {
    // The library hazard the resolver guards: `createIntegratedAddress`
    // accepts an integrated address and silently replaces its embedded id
    // with the one supplied. Pin the library behavior first, so this test
    // fails loudly if it ever changes:
    const integrated = createIntegratedAddress(PLAIN, PID)
    const replaced = splitIntegratedAddress(
      createIntegratedAddress(integrated, OTHER_PID)
    )
    assert.equal(replaced.masterAddress, PLAIN)
    assert.equal(replaced.paymentId, OTHER_PID)

    // The resolver must therefore never reach create for integrated input:
    // agreement returns the original string, disagreement throws (covered
    // below), and neither path may silently rewrite the id.
    assert.equal(resolvePaymentIdDestination(integrated, PID), integrated)
  })

  it('rejects an integrated address carrying a different id', () => {
    const integrated = createIntegratedAddress(PLAIN, PID)

    assert.throws(
      () => resolvePaymentIdDestination(integrated, OTHER_PID),
      /different payment id/
    )
  })

  it('rejects ids an integrated address cannot encode', () => {
    // Not padded, not truncated: a transformed id would not match the
    // receiver's crediting ledger.
    for (const bad of [
      'aabb', // too short
      'aabbccddeeff001122', // 9 bytes
      '00'.repeat(16), // 16 bytes, the legacy length
      'aabbccddeeff001g', // non-hex
      ''
    ]) {
      assert.throws(
        () => resolvePaymentIdDestination(PLAIN, bad),
        /integrated deposit address/,
        `expected rejection for ${JSON.stringify(bad)}`
      )
    }
  })
})
