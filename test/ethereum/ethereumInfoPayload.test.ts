import { assert } from 'chai'
import { describe, it } from 'mocha'

import { asEthereumInfoPayload } from '../../src/ethereum/ethereumTypes'

const networkFees = { default: { minPriorityFee: '100000000' } }

/**
 * The info server outlives app versions, so its adapter lists can name types
 * an app no longer has. Ethereum's still lists BlockCypher, which accb removed
 * in 4.97.0; rejecting the payload over it left every newer app on Ethereum's
 * built-in adapters, with no way to change them remotely.
 */
describe('asEthereumInfoPayload adapter lists', function () {
  it('skips an adapter type this version does not know', function () {
    const payload = asEthereumInfoPayload({
      networkAdapterConfigs: [
        { type: 'rpc', servers: ['https://ethereum-rpc.publicnode.com'] },
        { type: 'blockcypher', servers: ['https://api.blockcypher.com'] },
        { type: 'evmscan', servers: ['https://api.etherscan.io'] }
      ],
      networkFees
    })

    assert.deepEqual(
      payload.networkAdapterConfigs?.map(config => config.type),
      ['rpc', 'evmscan']
    )
    assert.equal(payload.networkFees?.default.minPriorityFee, '100000000')
  })

  it('keeps the built-in adapters when no entry is readable', function () {
    const payload = asEthereumInfoPayload({
      networkAdapterConfigs: [
        { type: 'blockcypher', servers: ['https://api.blockcypher.com'] },
        { type: 'rpc' }
      ],
      networkFees
    })

    assert.isUndefined(payload.networkAdapterConfigs)
    assert.equal(payload.networkFees?.default.minPriorityFee, '100000000')
  })
})
