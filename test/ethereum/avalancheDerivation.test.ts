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
// MetaMask, Trust) which all derive at coin type 60. Avalanche C-Chain is EVM,
// so importing this seed into Edge must produce the same address.
const MNEMONIC =
  'room soda device label bicycle hill fork nest lion knee purpose hen'
const EXPECTED_EVM_ADDRESS = '0x21D45Fd06e291C49AbFa135460DE827b6579Cef5'

describe('Avalanche derivation parity', function () {
  let tools: EdgeCurrencyTools

  before('Tools', async function () {
    const fakeIo = makeFakeIo()
    const opts: EdgeCorePluginOptions = {
      infoPayload: {},
      initOptions: {},
      io: { ...fakeIo, fetch, fetchCors: fetch },
      log: fakeLog,
      nativeIo: {},
      pluginDisklet: fakeIo.disklet
    }
    const factory = edgeCorePlugins.avalanche
    const plugin: EdgeCurrencyPlugin = factory(opts)
    tools = await plugin.makeCurrencyTools()
  })

  it('derives the EVM (coin type 60) address from an imported seed', async function () {
    const keys = await tools.derivePublicKey({
      id: 'id',
      keys: { avalancheMnemonic: MNEMONIC },
      type: 'wallet:avalanche'
    })
    assert.equal(keys.publicKey, EXPECTED_EVM_ADDRESS)
  })
})
