import { assert } from 'chai'
import { describe, it } from 'mocha'

import { isCurrencyCode } from '../../src/common/tokenHelpers'

describe(`Token Helpers testing`, function () {
  it(`isCurrencyCode true`, function () {
    assert.equal(isCurrencyCode('BTC'), true)
    assert.equal(isCurrencyCode('USDC'), true)
    assert.equal(isCurrencyCode('USDC.e'), true)
    assert.equal(isCurrencyCode('xBOO'), true)
    assert.equal(isCurrencyCode('BSC-USD'), true)
    assert.equal(isCurrencyCode('1INCH'), true)
    assert.equal(isCurrencyCode('T'), true)
    assert.equal(isCurrencyCode('VERYLONGCODE'), true)
  })
  it(`isCurrencyCode false`, function () {
    assert.equal(isCurrencyCode('.BTC'), false)
    assert.equal(isCurrencyCode('BTC.'), false)
    assert.equal(isCurrencyCode('BTC_USDC'), false)
    assert.equal(isCurrencyCode('BTC+USDC'), false)
    assert.equal(isCurrencyCode('BTC=USDC'), false)
    assert.equal(isCurrencyCode('BTC*USDC'), false)
    assert.equal(isCurrencyCode('BTC\\USDC'), false)
    assert.equal(isCurrencyCode('BTC/USDC'), false)
    assert.equal(isCurrencyCode('_USDC'), false)
    assert.equal(isCurrencyCode('USDC_'), false)
    assert.equal(isCurrencyCode('-USDC'), false)
    assert.equal(isCurrencyCode('USDC-'), false)
  })
})
