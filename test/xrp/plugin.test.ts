import { assert, expect } from 'chai'
import {
  EdgeCorePluginOptions,
  EdgeCurrencyPlugin,
  EdgeCurrencyTools,
  makeFakeIo
} from 'edge-core-js'
import { before, describe, it } from 'mocha'

import edgeCorePlugins from '../../src/index'
import { expectRejection } from '../expectRejection'
import { fakeLog } from '../fakeLog'
import fixtures from './fixtures'

for (const fixture of fixtures) {
  let tools: EdgeCurrencyTools

  const WALLET_TYPE = fixture.WALLET_TYPE

  const fakeIo = makeFakeIo()
  const opts: EdgeCorePluginOptions = {
    initOptions: {},
    // @ts-expect-error
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    io: { ...fakeIo, random: size => fixture.key },
    log: fakeLog,
    nativeIo: {},
    pluginDisklet: fakeIo.disklet
  }
  // @ts-expect-error
  const factory = edgeCorePlugins[fixture.pluginId]
  const plugin: EdgeCurrencyPlugin = factory(opts)

  describe(`parseUri for Wallet type ${WALLET_TYPE}`, function () {
    before('Tools', async function () {
      expect(plugin.currencyInfo.currencyCode).equals(
        fixture['Test Currency code']
      )
      return await plugin.makeCurrencyTools().then(async currencyTools => {
        tools = currencyTools
      })
    })
    it('ripple.com invalid URI handler', async function () {
      return await expectRejection(
        tools.parseUri(fixture.parseUri['ripple.com invalid uri handler'][0])
      )
    })

    it('ripple.com invalid URI domain', async function () {
      return await expectRejection(
        tools.parseUri(fixture.parseUri['ripple.com invalid uri domain'][0])
      )
    })

    it('ripple.com invalid URI path', async function () {
      return await expectRejection(
        tools.parseUri(fixture.parseUri['ripple.com invalid uri path'][0])
      )
    })

    it('ripple.com invalid URI param', async function () {
      return await expectRejection(
        tools.parseUri(fixture.parseUri['ripple.com invalid uri param'][0])
      )
    })

    // X-Address valid
    it('x-address', async function () {
      const parsedUri = await tools.parseUri(fixture.parseUri['x-address'][0])
      assert.equal(parsedUri.publicAddress, fixture.parseUri['x-address'][1])
      assert.equal(parsedUri.uniqueIdentifier, fixture.parseUri['x-address'][2])
      assert.equal(parsedUri.nativeAmount, undefined)
      assert.equal(parsedUri.currencyCode, undefined)
    })

    // Ripple.com valid URIs
    it('ripple.com uri address', async function () {
      const parsedUri = await tools.parseUri(
        fixture.parseUri['ripple.com uri address'][0]
      )
      assert.equal(
        parsedUri.publicAddress,
        fixture.parseUri['ripple.com uri address'][1]
      )
      assert.equal(parsedUri.nativeAmount, undefined)
      assert.equal(parsedUri.currencyCode, undefined)
    })
    it('ripple.com uri address with amount', async function () {
      const parsedUri = await tools.parseUri(
        fixture.parseUri['ripple.com uri address with amount'][0]
      )
      assert.equal(
        parsedUri.publicAddress,
        fixture.parseUri['ripple.com uri address with amount'][1]
      )
      assert.equal(
        parsedUri.nativeAmount,
        fixture.parseUri['ripple.com uri address with amount'][2]
      )
      assert.equal(
        parsedUri.currencyCode,
        fixture.parseUri['ripple.com uri address with amount'][3]
      )
    })
    it('ripple.com uri address with unique identifier', async function () {
      const parsedUri = await tools.parseUri(
        fixture.parseUri['ripple.com uri address with unique identifier'][0]
      )
      assert.equal(
        parsedUri.publicAddress,
        fixture.parseUri['ripple.com uri address with unique identifier'][1]
      )
      assert.equal(
        parsedUri.uniqueIdentifier,
        fixture.parseUri['ripple.com uri address with unique identifier'][2]
      )
    })
    it('ripple.com uri address with amount & label', async function () {
      const parsedUri = await tools.parseUri(
        fixture.parseUri['ripple.com uri address with amount & label'][0]
      )
      assert.equal(
        parsedUri.publicAddress,
        fixture.parseUri['ripple.com uri address with amount & label'][1]
      )
      assert.equal(
        parsedUri.nativeAmount,
        fixture.parseUri['ripple.com uri address with amount & label'][2]
      )
      assert.equal(
        parsedUri.currencyCode,
        fixture.parseUri['ripple.com uri address with amount & label'][3]
      )
      if (parsedUri.metadata == null) throw new Error('No metadata')
      assert.equal(
        parsedUri.metadata.name,
        fixture.parseUri['ripple.com uri address with amount & label'][4]
      )
    })
    it('ripple.com uri address with amount, label & message', async function () {
      const parsedUri = await tools.parseUri(
        fixture.parseUri['ripple.com uri address with amount & label'][0]
      )
      assert.equal(
        parsedUri.publicAddress,
        fixture.parseUri['ripple.com uri address with amount & label'][1]
      )
      assert.equal(
        parsedUri.nativeAmount,
        fixture.parseUri['ripple.com uri address with amount & label'][2]
      )
      assert.equal(
        parsedUri.currencyCode,
        fixture.parseUri['ripple.com uri address with amount & label'][3]
      )
      if (parsedUri.metadata == null) throw new Error('No metadata')
      assert.equal(
        parsedUri.metadata.name,
        fixture.parseUri['ripple.com uri address with amount & label'][4]
      )
    })
    it('ripple.com uri address with unsupported param', async function () {
      const parsedUri = await tools.parseUri(
        fixture.parseUri['ripple.com uri address with amount & label'][0]
      )
      assert.equal(
        parsedUri.publicAddress,
        fixture.parseUri['ripple.com uri address with amount & label'][1]
      )
      assert.equal(
        parsedUri.nativeAmount,
        fixture.parseUri['ripple.com uri address with amount & label'][2]
      )
      assert.equal(
        parsedUri.currencyCode,
        fixture.parseUri['ripple.com uri address with amount & label'][3]
      )
    })
  })
}
