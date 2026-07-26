import { expect } from 'chai'
import { describe, it } from 'mocha'

import { computeAvailableZatoshi } from '../../src/zcash/zcashUtils'

const balances = {
  transparentAvailableZatoshi: '10',
  transparentTotalZatoshi: '20',
  saplingAvailableZatoshi: '100',
  saplingTotalZatoshi: '200',
  orchardAvailableZatoshi: '1000',
  orchardTotalZatoshi: '2000',
  ironwoodAvailableZatoshi: '10000',
  ironwoodTotalZatoshi: '20000'
}

describe('zcash utils', function () {
  describe('computeAvailableZatoshi', function () {
    it('sums the shielded pools and excludes transparent', function () {
      expect(computeAvailableZatoshi(balances)).equals('11100')
    })
  })
})
