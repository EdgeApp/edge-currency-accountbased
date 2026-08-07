import { assert } from 'chai'

import { deriveAddressFromMnemonic } from '../../src/zano/zanoMnemonic'
import { ZanoTools } from '../../src/zano/ZanoTools'

interface BridgeCall {
  method: string
  args: unknown[]
}

interface FakeOpts {
  /** Overrides the address the native library reports, to force a mismatch. */
  address?: string
  errorCode?: string
}

/**
 * Builds `ZanoTools` without running its constructor, which needs a native
 * module. `io.random` is counter-based so the storage path and the seed do
 * not come out identical.
 */
const makeTools = (calls: BridgeCall[], opts: FakeOpts = {}): ZanoTools => {
  let counter = 0

  const zano = {
    init: async (...args: unknown[]) => {
      calls.push({ method: 'init', args })
      return {}
    },
    getSeedPhraseInfo: async (mnemonic: string, seedPassword: string) => {
      calls.push({
        method: 'getSeedPhraseInfo',
        args: [mnemonic, seedPassword]
      })
      return {
        error_code: opts.errorCode ?? 'OK',
        response_data: {
          address: opts.address ?? deriveAddressFromMnemonic(mnemonic)
        }
      }
    },
    // Anything that would write a wallet file. Reaching these is the bug.
    generateSeedPhrase: async (...args: unknown[]) => {
      calls.push({ method: 'generateSeedPhrase', args })
      throw new Error('generateSeedPhrase must not be called')
    },
    generate: async (...args: unknown[]) => {
      calls.push({ method: 'generate', args })
      throw new Error('generate must not be called')
    },
    open: async (...args: unknown[]) => {
      calls.push({ method: 'open', args })
      throw new Error('open must not be called')
    },
    restore: async (...args: unknown[]) => {
      calls.push({ method: 'restore', args })
      throw new Error('restore must not be called')
    }
  }

  return Object.assign(Object.create(ZanoTools.prototype), {
    builtinTokens: {},
    currencyInfo: { pluginId: 'zano', walletType: 'wallet:zano' },
    io: {
      random: (size: number) => {
        const out = new Uint8Array(size)
        out[size - 1] = ++counter
        return out
      }
    },
    networkInfo: { walletRpcAddress: 'http://example.invalid' },
    zano
  }) as ZanoTools
}

/** Methods that create or touch a wallet file on disk. */
const FILE_METHODS = ['generateSeedPhrase', 'generate', 'open', 'restore']

describe('ZanoTools.createPrivateKey', () => {
  it('never writes a wallet file', async () => {
    // The vulnerability: `generateSeedPhrase` used to write a wallet file
    // encrypted with the empty string, purely to obtain a seed phrase.
    const calls: BridgeCall[] = []
    const tools = makeTools(calls)

    await tools.createPrivateKey('wallet:zano')

    const touched = calls.filter(call => FILE_METHODS.includes(call.method))
    assert.deepEqual(touched, [])
  })

  it('returns a usable key set', async () => {
    const calls: BridgeCall[] = []
    const tools = makeTools(calls)

    const keys = await tools.createPrivateKey('wallet:zano')

    assert.lengthOf(String(keys.zanoMnemonic).split(' '), 26)
    assert.match(String(keys.zanoStoragePath), /^[0-9A-F]{64}$/)
    assert.isUndefined(keys.zanoPassphrase)
    // The storage path must not be derived from the same entropy as the seed:
    assert.notEqual(keys.zanoStoragePath, keys.zanoMnemonic)
  })

  it('makes no native calls at all', async () => {
    // Creating a wallet is not a reason to start the SDK. The phrase is
    // self-checked offline, and `ZanoEngine` compares the native address
    // against it on every start.
    const calls: BridgeCall[] = []
    const tools = makeTools(calls)

    await tools.createPrivateKey('wallet:zano')

    assert.deepEqual(calls, [])
  })

  it('rejects the wrong wallet type', async () => {
    const tools = makeTools([])
    await assertRejects(
      async () => await tools.createPrivateKey('wallet:monero'),
      /InvalidWalletType/
    )
  })
})

describe('ZanoTools.importPrivateKey', () => {
  let mnemonic: string

  beforeEach(async () => {
    const keys = await makeTools([]).createPrivateKey('wallet:zano')
    mnemonic = String(keys.zanoMnemonic)
  })

  it('makes no native calls without a passphrase', async () => {
    // `parseUri` runs this against every scanned payload to decide whether it
    // is a private key, so it must stay offline.
    const calls: BridgeCall[] = []
    const tools = makeTools(calls)

    await tools.importPrivateKey(mnemonic)

    assert.deepEqual(calls, [])
  })

  it('stores the normalized mnemonic', async () => {
    const tools = makeTools([])

    // Scanners and hand-typed input arrive with arbitrary spacing, and the
    // wallet-file password is derived from the stored phrase.
    const messy = `  ${mnemonic.replace(/ /g, '   ')}  `
    const keys = await tools.importPrivateKey(messy)

    assert.equal(keys.zanoMnemonic, mnemonic)
  })

  it('rejects things that are not seed phrases', async () => {
    const tools = makeTools([])
    for (const input of [
      '',
      'like like like',
      'ZxDFpn4k7xVYyc9VZ3LphrJbkpc46xfREace5bme1aXiMzKPAHA8jsTWcHSXhv9AdodSaoGXK9Mg7bk3ec4FkQrj357fZPWZX',
      'https://edge.app',
      mnemonic.replace('like', 'notazanoword')
    ]) {
      await assertRejects(async () => await tools.importPrivateKey(input))
    }
  })

  it('uses the native library when a passphrase is supplied', async () => {
    const calls: BridgeCall[] = []
    const tools = makeTools(calls, { address: 'ZxAnyAddress' })

    const keys = await tools.importPrivateKey(mnemonic, {
      passphrase: 'hunter2'
    })

    assert.equal(keys.zanoPassphrase, 'hunter2')
    const checks = calls.filter(call => call.method === 'getSeedPhraseInfo')
    assert.deepEqual(checks[0].args, [mnemonic, 'hunter2'])
  })

  it('rejects a passphrase the native library will not validate', async () => {
    const tools = makeTools([], { address: '' })
    await assertRejects(
      async () =>
        await tools.importPrivateKey(mnemonic, { passphrase: 'hunter2' }),
      /Unable to validate mnemonic/
    )
  })

  it('passes the storage path through unchanged', async () => {
    const tools = makeTools([])
    const keys = await tools.importPrivateKey(mnemonic, { storagePath: 'AB' })
    assert.equal(keys.zanoStoragePath, 'AB')
  })
})

describe('ZanoTools.derivePublicKey', () => {
  let mnemonic: string

  beforeEach(async () => {
    const keys = await makeTools([]).createPrivateKey('wallet:zano')
    mnemonic = String(keys.zanoMnemonic)
  })

  it('derives offline without a passphrase', async () => {
    // `makeMemoryWallet` calls this before any engine exists.
    const calls: BridgeCall[] = []
    const tools = makeTools(calls)

    const { publicKey } = await tools.derivePublicKey({
      id: 'a',
      type: 'wallet:zano',
      keys: { zanoMnemonic: mnemonic, zanoStoragePath: 'AB' }
    })

    assert.equal(publicKey, deriveAddressFromMnemonic(mnemonic))
    assert.deepEqual(calls, [])
  })

  it('uses the native library with a passphrase', async () => {
    const calls: BridgeCall[] = []
    const tools = makeTools(calls, { address: 'ZxPassphraseAddress' })

    const { publicKey } = await tools.derivePublicKey({
      id: 'a',
      type: 'wallet:zano',
      keys: {
        zanoMnemonic: mnemonic,
        zanoPassphrase: 'hunter2',
        zanoStoragePath: 'AB'
      }
    })

    assert.equal(publicKey, 'ZxPassphraseAddress')
    const checks = calls.filter(call => call.method === 'getSeedPhraseInfo')
    assert.deepEqual(checks[0].args, [mnemonic, 'hunter2'])
  })

  it('rejects the wrong wallet type', async () => {
    const tools = makeTools([])
    await assertRejects(
      async () =>
        await tools.derivePublicKey({
          id: 'a',
          type: 'wallet:monero',
          keys: { zanoMnemonic: mnemonic, zanoStoragePath: 'AB' }
        }),
      /InvalidWalletType/
    )
  })
})

/** Chai's `assert.throws` does not handle promises. */
async function assertRejects(
  fn: () => Promise<unknown>,
  match?: RegExp
): Promise<void> {
  try {
    await fn()
  } catch (error: unknown) {
    if (match != null) {
      assert.match(String(error), match)
    }
    return
  }
  assert.fail('Expected the call to reject')
}
