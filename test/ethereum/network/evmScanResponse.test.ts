import { assert } from 'chai'
import { asArray, asUnknown } from 'cleaners'
import { describe, it } from 'mocha'

import { asEvmScanResponse } from '../../../src/ethereum/networkAdapters/EvmScanAdapter'

describe('EvmScanAdapter response cleaner', function () {
  it("accepts Blockscout's partially indexed reply as a success", function () {
    // Captured 2026-09-03 from robinhoodchain.blockscout.com txlistinternal:
    const captured = {
      message:
        'Some internal transactions within this block range have not yet been processed',
      result: [{ transactionHash: '0x7db4', value: '11497349198206467' }],
      status: '2'
    }
    const clean = asEvmScanResponse(asArray(asUnknown))(captured)
    assert.equal(clean.status, '2')
    assert.lengthOf(clean.result as unknown[], 1)
  })

  it('keeps the error shape for status "0"', function () {
    const clean = asEvmScanResponse(asArray(asUnknown))({
      message: 'No transactions found',
      result: [],
      status: '0'
    })
    assert.equal(clean.status, '0')
  })
})
