import { assert } from 'chai'
import {
  EdgeCorePluginOptions,
  EdgeCurrencyPlugin,
  EdgeCurrencyTools,
  JsonObject,
  makeFakeIo
} from 'edge-core-js'
import { before, describe, it } from 'mocha'
import fetch from 'node-fetch'

import edgeCorePlugins from '../../src/index'
import { fakeLog } from '../fake/fakeLog'

// A 12-word seed and the receive address it yields on EVM wallets (Exodus,
// MetaMask, Trust) which all derive at coin type 60. Ethereum, Polygon and
// Avalanche C-Chain are all EVM, so importing this seed into Edge must produce
// the same address on each. Avalanche was the regression (it derived at coin
// type 9000); Ethereum and Polygon are the chains the report flagged as most
// important, so they are locked here too.
const MNEMONIC =
  'room soda device label bicycle hill fork nest lion knee purpose hen'
const EXPECTED_EVM_ADDRESS = '0x21D45Fd06e291C49AbFa135460DE827b6579Cef5'

// What the same seed yields at Avalanche's old coin type 9000. Wallets created
// before the correction hold a private key derived at that path, so they must
// keep resolving to this address.
const LEGACY_AVAX_ADDRESS = '0xc0Ee5411B61513Bea1853692463e28D6c32A0b50'

const makeOpts = (): EdgeCorePluginOptions => {
  const fakeIo = makeFakeIo()
  return {
    infoPayload: {},
    initOptions: {},
    io: { ...fakeIo, fetch, fetchCors: fetch },
    log: fakeLog,
    nativeIo: {},
    pluginDisklet: fakeIo.disklet
  }
}

const makeTools = async (
  pluginId: keyof typeof edgeCorePlugins
): Promise<EdgeCurrencyTools> => {
  const factory = edgeCorePlugins[pluginId]
  const plugin: EdgeCurrencyPlugin = factory(makeOpts())
  return await plugin.makeCurrencyTools()
}

/** `EdgeCurrencyTools.importPrivateKey` is optional, but EVM plugins have it. */
const importPrivateKey = async (
  tools: EdgeCurrencyTools,
  userInput: string
): Promise<JsonObject> => {
  if (tools.importPrivateKey == null) {
    throw new Error('Plugin does not support importPrivateKey')
  }
  return await tools.importPrivateKey(userInput)
}

const CASES = [
  { pluginId: 'ethereum', mnemonicKey: 'ethereumMnemonic' },
  { pluginId: 'polygon', mnemonicKey: 'polygonMnemonic' },
  { pluginId: 'avalanche', mnemonicKey: 'avalancheMnemonic' }
] as const

describe('EVM derivation parity (coin type 60)', function () {
  for (const { pluginId, mnemonicKey } of CASES) {
    describe(pluginId, function () {
      let tools: EdgeCurrencyTools

      before('Tools', async function () {
        tools = await makeTools(pluginId)
      })

      it('derives the Exodus-matching EVM address from an imported seed', async function () {
        const importedKeys = await importPrivateKey(tools, MNEMONIC)
        assert.equal(importedKeys[mnemonicKey], MNEMONIC)
        assert.equal(importedKeys.derivationPath, "m/44'/60'/0'/0/0")

        const keys = await tools.derivePublicKey({
          id: 'id',
          keys: importedKeys,
          type: `wallet:${pluginId}`
        })
        assert.equal(keys.publicKey, EXPECTED_EVM_ADDRESS)
      })
    })
  }
})

describe('Avalanche legacy wallets', function () {
  let tools: EdgeCurrencyTools

  before('Tools', async function () {
    tools = await makeTools('avalanche')
  })

  it('keeps the coin type 9000 address when no path was saved', async function () {
    // The shape of a wallet created before the plugin saved `derivationPath`:
    // its stored private key was derived at coin type 9000, so re-deriving the
    // public key on a new device has to land on the same address.
    const keys = await tools.derivePublicKey({
      id: 'id',
      keys: { avalancheMnemonic: MNEMONIC },
      type: 'wallet:avalanche'
    })
    assert.equal(keys.publicKey, LEGACY_AVAX_ADDRESS)
  })

  it('derives the private key at the saved path', async function () {
    const importedKeys = await importPrivateKey(tools, MNEMONIC)
    const publicKeys = await tools.derivePublicKey({
      id: 'id',
      // Only the private key, as if the mnemonic were never saved:
      keys: { avalancheKey: importedKeys.avalancheKey },
      type: 'wallet:avalanche'
    })
    assert.equal(
      publicKeys.publicKey.toLowerCase(),
      EXPECTED_EVM_ADDRESS.toLowerCase()
    )
  })
})
