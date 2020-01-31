// @flow

import { assert } from 'chai'
import {
  type EdgeCorePluginOptions,
  type EdgeCurrencyPlugin,
  type EdgeCurrencyTools,
  makeFakeIo
} from 'edge-core-js'
import { before, describe, it } from 'mocha'

import edgeCorePlugins from '../../src/index.js'
import { expectRejection } from '../expectRejection.js'
import { fakeLog } from '../fakeLog.js'
import fixtures from './fixtures.js'

for (const fixture of fixtures) {
  let keys
  let tools: EdgeCurrencyTools

  const WALLET_TYPE = fixture.WALLET_TYPE
  // if (WALLET_TYPE !== 'wallet:ethereum' && WALLET_TYPE !== 'wallet:rsk') continue
  const keyName = WALLET_TYPE.split('wallet:')[1].split('-')[0] + 'Key'
  const mnemonicName =
    WALLET_TYPE.split('wallet:')[1].split('-')[0] + 'Mnemonic'
  const address = 'publicKey'

  const fakeIo = makeFakeIo()
  const opts: EdgeCorePluginOptions = {
    initOptions: {},
    io: { ...fakeIo, random: size => fixture.key },
    log: fakeLog,
    nativeIo: {},
    pluginDisklet: fakeIo.disklet
  }
  const factory = edgeCorePlugins[fixture.pluginName]
  const plugin: EdgeCurrencyPlugin = factory(opts)

  describe(`Info for Wallet type ${WALLET_TYPE}`, function() {
    it('Test Currency code', function() {
      assert.equal(
        plugin.currencyInfo.currencyCode,
        fixture['Test Currency code']
      )
    })
  })

  describe(`createPrivateKey for Wallet type ${WALLET_TYPE}`, function() {
    before('Tools', function() {
      return plugin.makeCurrencyTools().then(result => {
        tools = result
      })
    })

    it('Test Currency code', function() {
      assert.equal(
        plugin.currencyInfo.currencyCode,
        fixture['Test Currency code']
      )
    })

    it('Create valid key', async function() {
      const keys = await tools.createPrivateKey(WALLET_TYPE)
      assert.equal(!keys, false)
      assert.equal(typeof keys[keyName], 'string')
      const length = keys[keyName].length
      assert.equal(length, fixture.key_length)
    })
  })

  describe(`derivePublicKey for Wallet type ${WALLET_TYPE}`, function() {
    before('Tools', function() {
      return plugin.makeCurrencyTools().then(async result => {
        tools = result
        keys = await tools.createPrivateKey(WALLET_TYPE)
      })
    })

    it('Valid private key', async function() {
      keys = await tools.derivePublicKey({
        id: 'id',
        keys: { [keyName]: keys[keyName], [mnemonicName]: fixture.mnemonic },
        type: WALLET_TYPE
      })
      assert.equal(keys[address], fixture.xpub)
    })

    it('Invalid key name', function() {
      return expectRejection(tools.derivePublicKey(fixture['Invalid key name']))
    })

    it('Invalid wallet type', function() {
      return expectRejection(
        tools.derivePublicKey(fixture['Invalid wallet type'])
      )
    })
  })

  describe(`parseUri for Wallet type ${WALLET_TYPE}`, function() {
    before('Tools', function() {
      return plugin.makeCurrencyTools().then(result => {
        tools = result
      })
    })
    it('address only', async function() {
      const parsedUri = await tools.parseUri(
        fixture.parseUri['address only'][0]
      )
      assert.equal(parsedUri.publicAddress, fixture.parseUri['address only'][1])
      assert.equal(parsedUri.nativeAmount, undefined)
      assert.equal(parsedUri.currencyCode, undefined)
    })
    it('invalid address', function() {
      return expectRejection(
        tools.parseUri(fixture.parseUri['invalid address'][0])
      )
    })
    it('invalid address', function() {
      return expectRejection(
        tools.parseUri(fixture.parseUri['invalid address'][1])
      )
    })
    it('invalid address', function() {
      return expectRejection(
        tools.parseUri(fixture.parseUri['invalid address'][2])
      )
    })
    it('uri address', async function() {
      const parsedUri = await tools.parseUri(fixture.parseUri['uri address'][0])
      assert.equal(parsedUri.publicAddress, fixture.parseUri['uri address'][1])
      assert.equal(parsedUri.nativeAmount, undefined)
      assert.equal(parsedUri.currencyCode, undefined)
    })
    it('uri address with amount', async function() {
      const parsedUri = await tools.parseUri(
        fixture.parseUri['uri address with amount'][0]
      )
      assert.equal(
        parsedUri.publicAddress,
        fixture.parseUri['uri address with amount'][1]
      )
      assert.equal(
        parsedUri.nativeAmount,
        fixture.parseUri['uri address with amount'][2]
      )
      assert.equal(
        parsedUri.currencyCode,
        fixture.parseUri['uri address with amount'][3]
      )
    })
    it('uri address with unique identifier', async function() {
      const parsedUri = await tools.parseUri(
        fixture.parseUri['uri address with unique identifier'][0]
      )
      assert.equal(
        parsedUri.publicAddress,
        fixture.parseUri['uri address with unique identifier'][1]
      )
      assert.equal(
        parsedUri.uniqueIdentifier,
        fixture.parseUri['uri address with unique identifier'][3]
      )
    })
    it('uri address with amount & label', async function() {
      const parsedUri = await tools.parseUri(
        fixture.parseUri['uri address with amount & label'][0]
      )
      assert.equal(
        parsedUri.publicAddress,
        fixture.parseUri['uri address with amount & label'][1]
      )
      assert.equal(
        parsedUri.nativeAmount,
        fixture.parseUri['uri address with amount & label'][2]
      )
      assert.equal(
        parsedUri.currencyCode,
        fixture.parseUri['uri address with amount & label'][3]
      )
      if (parsedUri.metadata == null) throw new Error('No metadata')
      assert.equal(
        parsedUri.metadata.name,
        fixture.parseUri['uri address with amount & label'][4]
      )
    })
    it('uri address with amount, label & message', async function() {
      const parsedUri = await tools.parseUri(
        fixture.parseUri['uri address with amount & label'][0]
      )
      assert.equal(
        parsedUri.publicAddress,
        fixture.parseUri['uri address with amount & label'][1]
      )
      assert.equal(
        parsedUri.nativeAmount,
        fixture.parseUri['uri address with amount & label'][2]
      )
      assert.equal(
        parsedUri.currencyCode,
        fixture.parseUri['uri address with amount & label'][3]
      )
      if (parsedUri.metadata == null) throw new Error('No metadata')
      assert.equal(
        parsedUri.metadata.name,
        fixture.parseUri['uri address with amount & label'][4]
      )
    })
    it('uri address with unsupported param', async function() {
      const parsedUri = await tools.parseUri(
        fixture.parseUri['uri address with amount & label'][0]
      )
      assert.equal(
        parsedUri.publicAddress,
        fixture.parseUri['uri address with amount & label'][1]
      )
      assert.equal(
        parsedUri.nativeAmount,
        fixture.parseUri['uri address with amount & label'][2]
      )
      assert.equal(
        parsedUri.currencyCode,
        fixture.parseUri['uri address with amount & label'][3]
      )
    })
  })

  describe(`encodeUri for Wallet type ${WALLET_TYPE}`, function() {
    before('Tools', function() {
      return plugin.makeCurrencyTools().then(result => {
        tools = result
      })
    })
    it('address only', async function() {
      const encodedUri = await tools.encodeUri(
        fixture.encodeUri['address only'][0]
      )
      assert.equal(encodedUri, fixture.encodeUri['address only'][1])
    })
    it('weird address', async function() {
      const encodedUri = await tools.encodeUri(
        fixture.encodeUri['weird address'][0]
      )
      assert.equal(encodedUri, fixture.encodeUri['weird address'][1])
    })
    it('invalid address 0', function() {
      return expectRejection(
        tools.encodeUri(fixture.encodeUri['invalid address'][0])
      )
    })
    it('invalid address 1', function() {
      return expectRejection(
        tools.encodeUri(fixture.encodeUri['invalid address'][1])
      )
    })
    it('invalid address 2', function() {
      return expectRejection(
        tools.encodeUri(fixture.encodeUri['invalid address'][2])
      )
    })
    it('address & amount', async function() {
      const encodedUri = await tools.encodeUri(
        fixture.encodeUri['address & amount'][0]
      )
      assert.equal(encodedUri, fixture.encodeUri['address & amount'][1])
    })
    it('address, amount, and label', async function() {
      const encodedUri = await tools.encodeUri(
        fixture.encodeUri['address, amount, and label'][0]
      )
      assert.equal(
        encodedUri,
        fixture.encodeUri['address, amount, and label'][1]
      )
    })
    it('address, amount, label, & message', async function() {
      const encodedUri = await tools.encodeUri(
        fixture.encodeUri['address, amount, label, & message'][0]
      )
      assert.equal(
        encodedUri,
        fixture.encodeUri['address, amount, label, & message'][1]
      )
    })
  })
}
