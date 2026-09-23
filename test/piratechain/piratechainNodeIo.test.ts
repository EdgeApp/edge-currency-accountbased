import { expect } from 'chai'
import { mkdtempSync, statSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

import { wrapPiratechainNative } from '../../src/piratechain/piratechainIo'

const EXPECTED_SURFACE = [
  'deriveViewingKey',
  'getLatestNetworkHeight',
  'isValidAddress',
  'makeSynchronizer'
]

/**
 * A stand-in for the SDK class, so these cases pin the behaviour that moved
 * out of `makePiratechainIo` during the Node extraction rather than restating
 * the SDK's own contract.
 */
function makeFakeSdk(): any {
  return {
    configureSecureAccountStorage: async () => ({}),
    invoke: async (requestJson: string) =>
      JSON.stringify({ ok: true, result: {} }),
    validateAddress: async () => ({ isValid: true }),
    walletRegistryExists: async () => true,
    listWallets: async () => []
  }
}

describe('wrapPiratechainNative', function () {
  it('does not build the SDK until something needs it', function () {
    let built = 0
    wrapPiratechainNative(() => {
      built++
      return makeFakeSdk()
    })
    expect(built).to.equal(0)
  })

  it('builds the SDK at most once', async function () {
    let built = 0
    const io = wrapPiratechainNative(() => {
      built++
      return makeFakeSdk()
    })

    await io.isValidAddress('zs1test')
    await io.isValidAddress('zs1other')

    expect(built).to.equal(1)
  })

  it('exposes the documented surface', function () {
    const io = wrapPiratechainNative(() => makeFakeSdk())
    for (const member of EXPECTED_SURFACE) {
      expect(io, member).to.have.property(member)
    }
  })
})

describe('makePiratechainIo (node)', function () {
  it('creates its document directory and returns the same surface', function () {
    const documentDirectory = join(
      mkdtempSync(join(tmpdir(), 'accb-pcn-')),
      'native',
      'piratechain'
    )
    // Required lazily: this module pulls in the N-API addon, which only exists
    // once `build-native-host` has run in the piratechain-native checkout.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const nodeIo = require('../../src/piratechain/piratechainIo.node')
    const io = nodeIo.makePiratechainIo({ documentDirectory })

    for (const member of EXPECTED_SURFACE) {
      expect(io, member).to.have.property(member)
    }
    expect(statSync(documentDirectory).isDirectory()).to.equal(true)
  })
})
