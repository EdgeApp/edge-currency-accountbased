// @flow

import { assert } from 'chai'
import {
  type EdgeCorePluginOptions,
  type EdgeCurrencyPlugin,
  makeFakeIos
} from 'edge-core-js'
import { before, describe, it } from 'mocha'

import * as Factories from '../../src/index.js'
import { expectRejection } from '../expectRejection.js'
import fixtures from './fixtures.js'

for (const fixture of fixtures) {
  let plugin: EdgeCurrencyPlugin

  const CurrencyPluginFactory = Factories[fixture['factory']]
  const WALLET_TYPE = fixture['WALLET_TYPE']

  const [fakeIo] = makeFakeIos(1)
  const opts: EdgeCorePluginOptions = {
    io: { ...fakeIo, random: size => fixture['key'] }
  }

  describe(`parseUri for Wallet type ${WALLET_TYPE}`, function () {
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
    it('ripple.com invalid URI handler', function () {
      return expectRejection(
        Promise.resolve(
          plugin.parseUri(
            fixture['parseUri']['ripple.com invalid uri handler'][0]
          )
        )
      )
    })

    it('ripple.com invalid URI domain', function () {
      return expectRejection(
        Promise.resolve(
          plugin.parseUri(
            fixture['parseUri']['ripple.com invalid uri domain'][0]
          )
        )
      )
    })

    it('ripple.com invalid URI path', function () {
      return expectRejection(
        Promise.resolve(
          plugin.parseUri(fixture['parseUri']['ripple.com invalid uri path'][0])
        )
      )
    })

    it('ripple.com invalid URI param', function () {
      return expectRejection(
        Promise.resolve(
          plugin.parseUri(
            fixture['parseUri']['ripple.com invalid uri param'][0]
          )
        )
      )
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
      if (parsedUri.metadata == null) throw new Error('No metadata')
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
      if (parsedUri.metadata == null) throw new Error('No metadata')
      assert.equal(
        parsedUri.metadata.name,
        fixture['parseUri']['ripple.com uri address with amount & label'][4]
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
