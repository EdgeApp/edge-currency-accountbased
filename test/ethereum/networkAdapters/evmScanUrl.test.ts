import { assert } from 'chai'
import { describe, it } from 'mocha'

import { makeEvmScanUrl } from '../../../src/ethereum/networkAdapters/evmScanUrl'

const cmd = '?module=account&action=txlistinternal&address=0xabc'

describe('makeEvmScanUrl', function () {
  it('names the chain with `chainid` on etherscan.io', function () {
    assert.equal(
      makeEvmScanUrl('https://api.etherscan.io', cmd, 1),
      'https://api.etherscan.io/v2/api?chainid=1&module=account&action=txlistinternal&address=0xabc'
    )
  })

  it('names the chain with `chain_id` on hosted Blockscout', function () {
    assert.equal(
      makeEvmScanUrl('https://api.blockscout.com', cmd, 4663),
      'https://api.blockscout.com/v2/api?chain_id=4663&module=account&action=txlistinternal&address=0xabc'
    )
  })

  it('names no chain on a self-hosted Blockscout', function () {
    assert.equal(
      makeEvmScanUrl('https://robinhoodchain.blockscout.com', cmd, 4663),
      'https://robinhoodchain.blockscout.com/api?module=account&action=txlistinternal&address=0xabc'
    )
  })

  it('opens the query itself when the command does not', function () {
    assert.equal(
      makeEvmScanUrl('https://api.blockscout.com', '', 4663),
      'https://api.blockscout.com/v2/api?chain_id=4663'
    )
  })
})
