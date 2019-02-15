// @flow

import { describe, it, before } from 'mocha'
import * as Factories from '../../src/index.js'
import { assert } from 'chai'
import fixtures from './fixtures.json'

for (const fixture of fixtures) {
  const CurrencyPluginFactory = Factories[fixture['factory']]
  const WALLET_TYPE = fixture['WALLET_TYPE']

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

  describe(`parseUri for Wallet type ${WALLET_TYPE}`, function () {
    let plugin

    before('Plugin', function (done) {
      CurrencyPluginFactory.makePlugin(opts).then(currencyPlugin => {
        assert.equal(
          currencyPlugin.currencyInfo.currencyCode,
          fixture['Test Currency code']
        )
        plugin = currencyPlugin
        done()
      })
    })
    it('ripple.com invalid URI handler', function (done) {
      plugin.parseUri(fixture['parseUri']['ripple.com invalid uri handler'][0]).then(() => {
        assert.equal(0, 1)
        done()
      }).catch(e => {
        done()
      })
    })

    it('ripple.com invalid URI domain', function (done) {
      plugin.parseUri(fixture['parseUri']['ripple.com invalid uri domain'][0]).then(() => {
        assert.equal(0, 1)
        done()
      }).catch(e => {
        done()
      })
    })

    it('ripple.com invalid URI path', function (done) {
      plugin.parseUri(fixture['parseUri']['ripple.com invalid uri path'][0]).then(() => {
        assert.equal(0, 1)
        done()
      }).catch(e => {
        done()
      })
    })

    it('ripple.com invalid URI param', function (done) {
      plugin.parseUri(fixture['parseUri']['ripple.com invalid uri param'][0]).then(() => {
        assert.equal(0, 1)
        done()
      }).catch(e => {
        done()
      })
    })

    // Ripple.com valid URIs
    it('ripple.com uri address', async function () {
      const parsedUri = await plugin.parseUri(
        fixture['parseUri']['ripple.com uri address'][0]
      )
      assert.equal(
        parsedUri.publicAddress,
        fixture['parseUri']['ripple.com uri address'][1]
      )
      assert.equal(parsedUri.nativeAmount, undefined)
      assert.equal(parsedUri.currencyCode, undefined)
    })
    it('ripple.com uri address with amount', async function () {
      const parsedUri = await plugin.parseUri(
        fixture['parseUri']['ripple.com uri address with amount'][0]
      )
      assert.equal(
        parsedUri.publicAddress,
        fixture['parseUri']['ripple.com uri address with amount'][1]
      )
      assert.equal(
        parsedUri.nativeAmount,
        fixture['parseUri']['ripple.com uri address with amount'][2]
      )
      assert.equal(
        parsedUri.currencyCode,
        fixture['parseUri']['ripple.com uri address with amount'][3]
      )
    })
    it('ripple.com uri address with unique identifier', async function () {
      const parsedUri = await plugin.parseUri(
        fixture['parseUri']['ripple.com uri address with unique identifier'][0]
      )
      assert.equal(
        parsedUri.publicAddress,
        fixture['parseUri']['ripple.com uri address with unique identifier'][1]
      )
      assert.equal(
        parsedUri.uniqueIdentifier,
        fixture['parseUri']['ripple.com uri address with unique identifier'][2]
      )
    })
    it('ripple.com uri address with amount & label', async function () {
      const parsedUri = await plugin.parseUri(
        fixture['parseUri']['ripple.com uri address with amount & label'][0]
      )
      assert.equal(
        parsedUri.publicAddress,
        fixture['parseUri']['ripple.com uri address with amount & label'][1]
      )
      assert.equal(
        parsedUri.nativeAmount,
        fixture['parseUri']['ripple.com uri address with amount & label'][2]
      )
      assert.equal(
        parsedUri.currencyCode,
        fixture['parseUri']['ripple.com uri address with amount & label'][3]
      )
      assert.equal(
        parsedUri.metadata.name,
        fixture['parseUri']['ripple.com uri address with amount & label'][4]
      )
    })
    it('ripple.com uri address with amount, label & message', async function () {
      const parsedUri = await plugin.parseUri(
        fixture['parseUri']['ripple.com uri address with amount & label'][0]
      )
      assert.equal(
        parsedUri.publicAddress,
        fixture['parseUri']['ripple.com uri address with amount & label'][1]
      )
      assert.equal(
        parsedUri.nativeAmount,
        fixture['parseUri']['ripple.com uri address with amount & label'][2]
      )
      assert.equal(
        parsedUri.currencyCode,
        fixture['parseUri']['ripple.com uri address with amount & label'][3]
      )
      assert.equal(
        parsedUri.metadata.name,
        fixture['parseUri']['ripple.com uri address with amount & label'][4]
      )
      assert.equal(
        parsedUri.metadata.message,
        fixture['parseUri']['ripple.com uri address with amount & label'][5]
      )
    })
    it('ripple.com uri address with unsupported param', async function () {
      const parsedUri = await plugin.parseUri(
        fixture['parseUri']['ripple.com uri address with amount & label'][0]
      )
      assert.equal(
        parsedUri.publicAddress,
        fixture['parseUri']['ripple.com uri address with amount & label'][1]
      )
      assert.equal(
        parsedUri.nativeAmount,
        fixture['parseUri']['ripple.com uri address with amount & label'][2]
      )
      assert.equal(
        parsedUri.currencyCode,
        fixture['parseUri']['ripple.com uri address with amount & label'][3]
      )
    })
  })
}
