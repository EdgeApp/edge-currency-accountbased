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

describe('getCurrentAddress signing session', function () {
  it('unlocks for the read and re-locks afterwards', async function () {
    const calls: string[] = []
    let unlocked = false
    const sdk: any = {
      configureSecureAccountStorage: async () => ({}),
      invoke: async () => JSON.stringify({ ok: true, result: {} }),
      walletRegistryExists: async () => false,
      listWallets: async () => [],
      restoreWallet: async () => 'wallet-1',
      getWalletSigningStatus: async () => ({
        protectionEnabled: true,
        unlocked
      }),
      enableWalletSigningProtection: async () => ({
        protectionEnabled: true,
        unlocked
      }),
      unlockWalletSigning: async () => {
        unlocked = true
        calls.push('unlock')
      },
      lockWalletSigning: async () => {
        unlocked = false
        calls.push('lock')
      },
      getCurrentReceiveAddress: async () => {
        // The SDK resolves the account key only through an unlocked session.
        if (!unlocked) throw new Error('Watch-only account key not found')
        calls.push('read')
        return 'zs1probe'
      },
      createSynchronizer: () => ({
        subscribe: () => undefined,
        balance: null,
        transactions: [],
        start: async () => undefined,
        close: async () => undefined
      }),
      getLightdEndpointPoolDiagnostics: async () => ({}),
      setLightdEndpoint: async () => ({}),
      setLightdEndpointPool: async () => ({}),
      getSyncStatus: async () => ({ targetHeight: 0 }),
      getSpendabilityStatus: async () => ({}),
      exportSaplingViewingKey: async () => 'zxviews1probe'
    }

    const io = wrapPiratechainNative(() => sdk)
    const sync = await io.makeSynchronizer({
      name: 'PROBE',
      mnemonic: 'x',
      birthdayHeight: 1,
      signingCredential: 'cred'
    } as any)

    const address = await sync.getCurrentAddress()

    expect(address).to.equal('zs1probe')
    // The read must sit between an unlock and a re-lock, or a fresh device
    // gets "Watch-only account key not found" on its first address lookup.
    expect(calls.slice(-3)).to.deep.equal(['unlock', 'read', 'lock'])
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
