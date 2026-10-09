import { assert } from 'chai'
import { describe, it } from 'mocha'

import { asSuiBalance, checkSuiBalances } from '../../src/sui/suiTypes'

// What a node returned for an address holding 14917824207:
const WRAPPED_BALANCE = '340282366920938463463374607429894374056'

const TOTAL_SUPPLY = '10000000000000000000'
const asBalance = asSuiBalance(TOTAL_SUPPLY)

describe('asSuiBalance', function () {
  it('accepts balances up to the SUI supply', function () {
    for (const balance of ['0', '14917824207', '10000000000000000000']) {
      assert.equal(asBalance(balance), balance)
    }
  })

  it('rejects balances above the SUI supply', function () {
    assert.throws(() => asBalance(WRAPPED_BALANCE))
    assert.throws(() => asBalance('10000000000000000001'))
    assert.throws(() => asBalance('18446744073709551615'))
  })

  it('rejects values that are not unsigned integers', function () {
    for (const balance of ['', '-1', '1.5', '0x10', 14917824207, undefined]) {
      assert.throws(() => asBalance(balance))
    }
  })
})

describe('checkSuiBalances', function () {
  const usdc =
    '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC'

  it('accepts an answer with a valid SUI total', function () {
    checkSuiBalances(
      [
        { coinType: '0x2::sui::SUI', totalBalance: '14917824207' },
        { coinType: usdc, totalBalance: '1000000' }
      ],
      TOTAL_SUPPLY
    )
    checkSuiBalances([], TOTAL_SUPPLY)
  })

  it('rejects an answer with a wrapped SUI total', function () {
    assert.throws(() =>
      checkSuiBalances(
        [
          { coinType: usdc, totalBalance: '1000000' },
          { coinType: '0x2::sui::SUI', totalBalance: WRAPPED_BALANCE }
        ],
        TOTAL_SUPPLY
      )
    )
  })

  it('accepts other coin types above u64', function () {
    // Two full `Supply<T>` mints of one coin type, held by one address:
    checkSuiBalances(
      [
        { coinType: '0x2::sui::SUI', totalBalance: '14917824207' },
        { coinType: '0xabc::coin::COIN', totalBalance: '36893488147419103230' }
      ],
      TOTAL_SUPPLY
    )
  })
})
