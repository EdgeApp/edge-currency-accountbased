import { expect } from 'chai'
import { describe, it } from 'mocha'
import { Horizon, Keypair } from 'stellar-sdk'

// Regression guard for the recurring XLM engine-start crash
// `undefined is not an object (evaluating 'new Horizon.Server')`.
//
// The Stellar plugin builds its Horizon servers with `new Horizon.Server()`
// (StellarTools constructor). That call has broken twice when the bundled
// stellar-sdk did not expose the `Horizon` namespace: first from a v13
// default-import (#1060), then from a bundle built against a stale stellar-sdk
// (pre-v13 has no `Horizon` namespace, so the named import binds undefined).
//
// This test fails whenever stellar-sdk resolves to a version/shape without a
// usable Horizon namespace, so a Horizon-less build is caught by `npm test`
// instead of shipping as a runtime toast.
describe('stellar-sdk module resolution', function () {
  it('exposes the Horizon namespace', function () {
    expect(Horizon).to.be.an('object')
  })

  it('exposes Horizon.Server as a constructor', function () {
    expect(Horizon.Server).to.be.a('function')
  })

  it('exposes Keypair as a constructor', function () {
    expect(Keypair).to.be.a('function')
  })
})
