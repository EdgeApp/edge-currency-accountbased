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
    assert.equal(isCurrencyCode('.BTC'), true)
    assert.equal(isCurrencyCode('BTC.'), true)
    assert.equal(isCurrencyCode('BTC_USDC'), true)
    assert.equal(isCurrencyCode('BTC+USDC'), true)
    assert.equal(isCurrencyCode('BTC=USDC'), true)
    assert.equal(isCurrencyCode('BTC*USDC'), true)
    assert.equal(isCurrencyCode('BTC\\USDC'), true)
    assert.equal(isCurrencyCode('BTC/USDC'), true)
    assert.equal(isCurrencyCode('_USDC'), true)
    assert.equal(isCurrencyCode('USDC_'), true)
    assert.equal(isCurrencyCode('-USDC'), true)
    assert.equal(isCurrencyCode('USDC-'), true)
  })
  it(`isCurrencyCode false`, function () {
    assert.equal(isCurrencyCode(' BTC'), false)
    assert.equal(isCurrencyCode(' BTC'), false)
    assert.equal(isCurrencyCode('  BTC'), false)
    assert.equal(isCurrencyCode('  BTC '), false)
    assert.equal(isCurrencyCode('  BTC  '), false)
    assert.equal(isCurrencyCode('BTC\\ '), false)
  })
})
