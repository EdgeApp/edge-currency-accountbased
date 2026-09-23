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

/**
 * An SDK double that answers every method, so these cases pin only the
 * Sapling-parameter behaviour rather than the whole SDK surface.
 */
function makeAnsweringSdk(calls: string[]): any {
  const synchronizer = {
    subscribe: () => () => undefined,
    start: async () => undefined,
    close: async () => undefined,
    balance: null,
    transactions: []
  }
  return new Proxy(
    {},
    {
      get(_target, name: string) {
        if (name === 'then') return undefined
        if (name === 'invoke')
          return async () => JSON.stringify({ ok: true, result: {} })
        if (name === 'createSynchronizer') return () => synchronizer
        if (name === 'walletRegistryExists') return async () => false
        if (name === 'restoreWallet') return async () => 'wallet-1'
        if (name === 'getWalletSigningStatus')
          return async () => ({ protectionEnabled: true, unlocked: false })
        return async () => {
          calls.push(name)
          return {}
        }
      }
    }
  )
}

const synchronizerConfig: any = {
  name: 'PROBE',
  mnemonic: 'x',
  birthdayHeight: 1,
  signingCredential: 'cred'
}

/** Lets the fire-and-forget parameter setup at sync start settle. */
async function settle(): Promise<void> {
  for (let i = 0; i < 5; i++)
    await new Promise(resolve => setImmediate(resolve))
}

describe('Sapling parameters', function () {
  it('never asks what platform it is on when no step is injected', async function () {
    // The Node path injects nothing. Loading React Native there would fail
    // outright, so make any attempt to load it fail this test.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Module = require('module')
    const original = Module._load
    const attempts: string[] = []
    Module._load = function (request: string) {
      if (request === 'react-native') {
        attempts.push(request)
        throw new Error('react-native is not loadable under Node')
      }
      return original.apply(this, arguments)
    }
    try {
      const calls: string[] = []
      const io = wrapPiratechainNative(() => makeAnsweringSdk(calls))
      await io.makeSynchronizer(synchronizerConfig)
      await settle()
      expect(attempts).to.deep.equal([])
      expect(calls).to.not.include('initializeSaplingParameters')
    } finally {
      Module._load = original
    }
  })

  it('runs an injected step once, with the SDK, and caches success', async function () {
    const calls: string[] = []
    const seen: unknown[] = []
    const sdk = makeAnsweringSdk(calls)
    const io = wrapPiratechainNative(() => sdk, {
      configureSaplingParams: async received => {
        seen.push(received)
      }
    })
    await io.makeSynchronizer(synchronizerConfig)
    await io.makeSynchronizer({ ...synchronizerConfig, name: 'PROBE2' })
    await settle()
    expect(seen).to.have.lengthOf(1)
    expect(seen[0]).to.equal(sdk)
  })

  it('retries an injected step that failed', async function () {
    let attempts = 0
    const io = wrapPiratechainNative(() => makeAnsweringSdk([]), {
      configureSaplingParams: async () => {
        attempts++
        if (attempts === 1) throw new Error('download failed')
      }
    })
    await io.makeSynchronizer(synchronizerConfig)
    await settle()
    await io.makeSynchronizer({ ...synchronizerConfig, name: 'PROBE2' })
    await settle()
    expect(attempts).to.equal(2)
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
