import { assert } from 'chai'
import {
  EdgeCorePluginOptions,
  EdgeCurrencyPlugin,
  EdgeCurrencyTools,
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
        const factory = edgeCorePlugins[pluginId]
        const plugin: EdgeCurrencyPlugin = factory(makeOpts())
        tools = await plugin.makeCurrencyTools()
      })

      it('derives the Exodus-matching EVM address from an imported seed', async function () {
        const keys = await tools.derivePublicKey({
          id: 'id',
          keys: { [mnemonicKey]: MNEMONIC },
          type: `wallet:${pluginId}`
        })
        assert.equal(keys.publicKey, EXPECTED_EVM_ADDRESS)
      })
    })
  }
})
