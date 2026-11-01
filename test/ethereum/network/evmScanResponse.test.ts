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
    if (!('status' in clean) || clean.status !== '2') {
      assert.fail('expected the status "2" success shape')
    }
    assert.lengthOf(clean.result, 1)
  })

  it('keeps the error shape for status "0"', function () {
    const clean = asEvmScanResponse(asArray(asUnknown))({
      message: 'No transactions found',
      result: [],
      status: '0'
    })
    assert.isTrue('status' in clean && clean.status === '0')
  })

  it('keeps the JSON-RPC error on a rejected proxy call', function () {
    // Captured 2026-11-01 from api.etherscan.io eth_sendRawTransaction:
    const captured = {
      error: { code: -32000, message: 'typed transaction too short' },
      id: 1,
      jsonrpc: '2.0'
    }
    const clean = asEvmScanResponse(asUnknown)(captured)
    if (!('error' in clean)) assert.fail('expected the JSON-RPC shape')
    assert.deepEqual(clean.error, captured.error)
  })

  it('keeps the result on an accepted proxy call', function () {
    const clean = asEvmScanResponse(asUnknown)({
      id: 1,
      jsonrpc: '2.0',
      result: '0x92a4'
    })
    if (!('error' in clean)) assert.fail('expected the JSON-RPC shape')
    assert.isUndefined(clean.error)
    assert.strictEqual(clean.result, '0x92a4')
  })
})
