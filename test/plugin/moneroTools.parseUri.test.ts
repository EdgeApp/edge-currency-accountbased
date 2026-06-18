import { assert } from 'chai'

import { MoneroTools } from '../../src/monero/MoneroTools'

// A real-looking standard mainnet address. parseUri is stubbed below, so the
// value only needs to round-trip through publicAddress.
const ADDRESS =
  '44AFFq5kSiGBoZ4NMDwYtN18obc8AemS33DBLWs3H7otXft3XjrpDtQGv7SqSsaBYBb98uNbr2VBBEt7f2wfn3RVGQBEP3A'

// Build a MoneroTools instance with only the pieces parseUri touches, plus a
// cppBridge.parseUri stub that echoes back a fixed paymentId.
const makeTools = (paymentId: string): MoneroTools =>
  Object.assign(Object.create(MoneroTools.prototype), {
    currencyInfo: { pluginId: 'monero' },
    networkInfo: { networkType: 'MAINNET' },
    builtinTokens: {},
    cppBridge: {
      parseUri: async () => ({
        address: ADDRESS,
        amount: '0',
        paymentId,
        recipientName: '',
        txDescription: ''
      })
    }
  }) as unknown as MoneroTools

describe('MoneroTools.parseUri payment id handling', () => {
  it('accepts a monero: URI with no payment id', async () => {
    const parsed = await makeTools('').parseUri(`monero:${ADDRESS}`)
    assert.equal(parsed.publicAddress, ADDRESS)
  })

  it('rejects a standalone payment id instead of dropping it', async () => {
    let thrownName: string | undefined
    try {
      await makeTools('deadbeefdeadbeef').parseUri(
        `monero:${ADDRESS}?tx_payment_id=deadbeefdeadbeef`
      )
    } catch (error: unknown) {
      thrownName = error instanceof Error ? error.name : undefined
    }
    assert.equal(thrownName, 'UnsupportedPaymentIdError')
  })
})
