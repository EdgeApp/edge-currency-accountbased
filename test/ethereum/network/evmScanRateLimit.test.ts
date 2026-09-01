import { assert } from 'chai'
import { describe, it } from 'mocha'

import { isEvmScanRateLimitResponse } from '../../../src/ethereum/networkAdapters/EvmScanAdapter'

describe('EvmScanAdapter rate limit classification', function () {
  it('classifies the public Blockscout throttle reply', function () {
    // Captured 2026-09-01 from https://robinhoodchain.blockscout.com/api
    // during a two-simulator sync on one IP:
    const captured = {
      message:
        'Too many requests. Increase limits now at https://dev.blockscout.com',
      result: null,
      status: '0'
    } as const
    assert.isTrue(isEvmScanRateLimitResponse(captured))
  })

  it('classifies the Etherscan throttle replies', function () {
    assert.isTrue(
      isEvmScanRateLimitResponse({
        message: 'NOTOK',
        result: 'Max calls per sec rate limit reached (5/sec)',
        status: '0'
      })
    )
    assert.isTrue(
      isEvmScanRateLimitResponse({
        message: 'NOTOK',
        result: 'Max rate limit reached',
        status: '0'
      })
    )
  })

  it('leaves ordinary empty-result replies alone', function () {
    assert.isFalse(
      isEvmScanRateLimitResponse({
        message: 'No transactions found',
        result: [],
        status: '0'
      })
    )
    assert.isFalse(
      isEvmScanRateLimitResponse({
        message: 'NOTOK',
        result: 'Error! Invalid address format',
        status: '0'
      })
    )
  })
})
