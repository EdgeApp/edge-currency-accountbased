// @flow

import { assert } from 'chai'
import { before, describe, it } from 'mocha'

import * as Factories from '../../src/index.js'
import fixtures from './fixtures.js'

for (const fixture of fixtures) {
  const CurrencyPluginFactory = Factories[fixture['factory']]
  const WALLET_TYPE = fixture['WALLET_TYPE']
  // if (WALLET_TYPE !== 'wallet:ethereum') continue
  const keyName = WALLET_TYPE.split('wallet:')[1].split('-')[0] + 'Key'
  const address = 'publicKey'

  const opts = {
    io: {
      random: size => fixture['key'],
      console: {
        info: console.log,
        warn: console.log,
        error: console.log
      }
    }
  }

  describe(`Info for Wallet type ${WALLET_TYPE}`, function () {
    let plugin = {}

    before('Plugin', function (done) {
      CurrencyPluginFactory.makePlugin(opts).then(currencyPlugin => {
        plugin = currencyPlugin
        done()
      })
    })

    it('Test Currency code', function () {
      assert.equal(
        plugin.currencyInfo.currencyCode,
        fixture['Test Currency code']
      )
    })
  })

  describe(`createPrivateKey for Wallet type ${WALLET_TYPE}`, function () {
    let plugin

    before('Plugin', function (done) {
      CurrencyPluginFactory.makePlugin(opts).then(currencyPlugin => {
        plugin = currencyPlugin
        done()
      })
    })

    it('Test Currency code', function () {
      assert.equal(
        plugin.currencyInfo.currencyCode,
        fixture['Test Currency code']
      )
    })

    it('Create valid key', async function () {
      const keys = await plugin.createPrivateKey(WALLET_TYPE)
      assert.equal(!keys, false)
      assert.equal(typeof keys[keyName], 'string')
      const length = keys[keyName].length
      assert.equal(length, fixture['key_length'])
    })
  })

  describe(`derivePublicKey for Wallet type ${WALLET_TYPE}`, function () {
    let plugin
    let keys

    before('Plugin', function () {
      return CurrencyPluginFactory.makePlugin(opts).then(
        async currencyPlugin => {
          assert.equal(
            currencyPlugin.currencyInfo.currencyCode,
            fixture['Test Currency code']
          )
          plugin = currencyPlugin
          keys = await plugin.createPrivateKey(WALLET_TYPE)
        }
      )
    })

    it('Valid private key', async function () {
      keys = await plugin.derivePublicKey({
        type: WALLET_TYPE,
        keys: { [keyName]: keys[keyName] }
      })
      assert.equal(keys[address], fixture['xpub'])
    })

    it('Invalid key name', function (done) {
      plugin
        .derivePublicKey(fixture['Invalid key name'])
        .then(() => {
          assert.equal(0, 1)
          done()
        })
        .catch(e => {
          done()
        })
    })

    it('Invalid wallet type', function (done) {
      plugin
        .derivePublicKey(fixture['Invalid wallet type'])
        .then(() => {
          assert.equal(0, 1)
          done()
        })
        .catch(e => {
          done()
        })
    })
  })

  describe(`parseUri for Wallet type ${WALLET_TYPE}`, function () {
    let plugin

    before('Plugin', function () {
      CurrencyPluginFactory.makePlugin(opts).then(currencyPlugin => {
        assert.equal(
          currencyPlugin.currencyInfo.currencyCode,
          fixture['Test Currency code']
        )
        plugin = currencyPlugin
      })
    })
    it('address only', async function () {
      const parsedUri = await plugin.parseUri(
        fixture['parseUri']['address only'][0]
      )
      assert.equal(
        parsedUri.publicAddress,
        fixture['parseUri']['address only'][1]
      )
      assert.equal(parsedUri.nativeAmount, undefined)
      assert.equal(parsedUri.currencyCode, undefined)
    })
    it('invalid address', function (done) {
      plugin
        .parseUri(fixture['parseUri']['invalid address'][0])
        .then(() => {
          assert.equal(0, 1)
          done()
        })
        .catch(e => {
          done()
        })
    })
    it('invalid address', function (done) {
      plugin
        .parseUri(fixture['parseUri']['invalid address'][1])
        .then(() => {
          assert.equal(0, 1)
          done()
        })
        .catch(e => {
          done()
        })
    })
    it('invalid address', function (done) {
      plugin
        .parseUri(fixture['parseUri']['invalid address'][2])
        .then(() => {
          assert.equal(0, 1)
          done()
        })
        .catch(e => {
          done()
        })
    })
    it('uri address', async function () {
      const parsedUri = await plugin.parseUri(
        fixture['parseUri']['uri address'][0]
      )
      assert.equal(
        parsedUri.publicAddress,
        fixture['parseUri']['uri address'][1]
      )
      assert.equal(parsedUri.nativeAmount, undefined)
      assert.equal(parsedUri.currencyCode, undefined)
    })
    it('uri address with amount', async function () {
      const parsedUri = await plugin.parseUri(
        fixture['parseUri']['uri address with amount'][0]
      )
      assert.equal(
        parsedUri.publicAddress,
        fixture['parseUri']['uri address with amount'][1]
      )
      assert.equal(
        parsedUri.nativeAmount,
        fixture['parseUri']['uri address with amount'][2]
      )
      assert.equal(
        parsedUri.currencyCode,
        fixture['parseUri']['uri address with amount'][3]
      )
    })
    it('uri address with unique identifier', async function () {
      const parsedUri = await plugin.parseUri(
        fixture['parseUri']['uri address with unique identifier'][0]
      )
      assert.equal(
        parsedUri.publicAddress,
        fixture['parseUri']['uri address with unique identifier'][1]
      )
      assert.equal(
        parsedUri.uniqueIdentifier,
        fixture['parseUri']['uri address with unique identifier'][3]
      )
    })
    it('uri address with amount & label', async function () {
      const parsedUri = await plugin.parseUri(
        fixture['parseUri']['uri address with amount & label'][0]
      )
      assert.equal(
        parsedUri.publicAddress,
        fixture['parseUri']['uri address with amount & label'][1]
      )
      assert.equal(
        parsedUri.nativeAmount,
        fixture['parseUri']['uri address with amount & label'][2]
      )
      assert.equal(
        parsedUri.currencyCode,
        fixture['parseUri']['uri address with amount & label'][3]
      )
      assert.equal(
        parsedUri.metadata.name,
        fixture['parseUri']['uri address with amount & label'][4]
      )
    })
    it('uri address with amount, label & message', async function () {
      const parsedUri = await plugin.parseUri(
        fixture['parseUri']['uri address with amount & label'][0]
      )
      assert.equal(
        parsedUri.publicAddress,
        fixture['parseUri']['uri address with amount & label'][1]
      )
      assert.equal(
        parsedUri.nativeAmount,
        fixture['parseUri']['uri address with amount & label'][2]
      )
      assert.equal(
        parsedUri.currencyCode,
        fixture['parseUri']['uri address with amount & label'][3]
      )
      assert.equal(
        parsedUri.metadata.name,
        fixture['parseUri']['uri address with amount & label'][4]
      )
      assert.equal(
        parsedUri.metadata.message,
        fixture['parseUri']['uri address with amount & label'][5]
      )
    })
    it('uri address with unsupported param', async function () {
      const parsedUri = await plugin.parseUri(
        fixture['parseUri']['uri address with amount & label'][0]
      )
      assert.equal(
        parsedUri.publicAddress,
        fixture['parseUri']['uri address with amount & label'][1]
      )
      assert.equal(
        parsedUri.nativeAmount,
        fixture['parseUri']['uri address with amount & label'][2]
      )
      assert.equal(
        parsedUri.currencyCode,
        fixture['parseUri']['uri address with amount & label'][3]
      )
    })
  })

  describe(`encodeUri for Wallet type ${WALLET_TYPE}`, function () {
    let plugin

    before('Plugin', function () {
      return CurrencyPluginFactory.makePlugin(opts).then(currencyPlugin => {
        plugin = currencyPlugin
      })
    })
    it('address only', async function () {
      const encodedUri = await plugin.encodeUri(
        fixture['encodeUri']['address only'][0]
      )
      assert.equal(encodedUri, fixture['encodeUri']['address only'][1])
    })
    it('weird address', async function () {
      const encodedUri = await plugin.encodeUri(
        fixture['encodeUri']['weird address'][0]
      )
      assert.equal(encodedUri, fixture['encodeUri']['weird address'][1])
    })
    it('invalid address 0', function (done) {
      plugin
        .encodeUri(fixture['encodeUri']['invalid address'][0])
        .then(() => {
          assert.equal(0, 1)
          done()
        })
        .catch(e => {
          done()
        })
    })
    it('invalid address 1', function (done) {
      plugin
        .encodeUri(fixture['encodeUri']['invalid address'][1])
        .then(() => {
          assert.equal(0, 1)
          done()
        })
        .catch(e => {
          done()
        })
    })
    it('invalid address 2', function (done) {
      plugin
        .encodeUri(fixture['encodeUri']['invalid address'][2])
        .then(() => {
          assert.equal(0, 1)
          done()
        })
        .catch(e => {
          done()
        })
    })
    it('address & amount', async function () {
      const encodedUri = await plugin.encodeUri(
        fixture['encodeUri']['address & amount'][0]
      )
      assert.equal(encodedUri, fixture['encodeUri']['address & amount'][1])
    })
    it('address, amount, and label', async function () {
      const encodedUri = await plugin.encodeUri(
        fixture['encodeUri']['address, amount, and label'][0]
      )
      assert.equal(
        encodedUri,
        fixture['encodeUri']['address, amount, and label'][1]
      )
    })
    it('address, amount, label, & message', async function () {
      const encodedUri = await plugin.encodeUri(
        fixture['encodeUri']['address, amount, label, & message'][0]
      )
      assert.equal(
        encodedUri,
        fixture['encodeUri']['address, amount, label, & message'][1]
      )
    })
  })
}
