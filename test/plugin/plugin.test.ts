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
import { expectRejection } from '../expectRejection'
import { fakeLog } from '../fake/fakeLog'
import fixtures from './fixtures'

for (const fixture of fixtures) {
  // @ts-expect-error
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
    // @ts-expect-error
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    io: { ...fakeIo, fetch, fetchCors: fetch, random: size => fixture.key },
    log: fakeLog,
    nativeIo: {},
    pluginDisklet: fakeIo.disklet
  }
  // @ts-expect-error
  const factory = edgeCorePlugins[fixture.pluginId]
  const plugin: EdgeCurrencyPlugin = factory(opts)

  describe(`Info for Wallet type ${WALLET_TYPE}`, function () {
    it('Test Currency code', function () {
      assert.equal(
        plugin.currencyInfo.currencyCode,
        fixture['Test Currency code']
      )
    })
  })

  describe(`createPrivateKey for Wallet type ${WALLET_TYPE}`, function () {
    before('Tools', async function () {
      return await plugin.makeCurrencyTools().then(result => {
        tools = result
      })
    })

    it('Test Currency code', function () {
      assert.equal(
        plugin.currencyInfo.currencyCode,
        fixture['Test Currency code']
      )
    })

    it('Create valid key', async function () {
      const keys = await tools.createPrivateKey(WALLET_TYPE)
      assert.isDefined(keys)
      assert.equal(typeof keys[keyName], 'string')
      const length = keys[keyName].length
      assert.equal(length, fixture.key_length)
    })
  })

  describe(`derivePublicKey for Wallet type ${WALLET_TYPE}`, function () {
    before('Tools', async function () {
      return await plugin.makeCurrencyTools().then(async result => {
        tools = result
        keys = await tools.createPrivateKey(WALLET_TYPE)
      })
    })

    it('Valid private key', async function () {
      keys = await tools.derivePublicKey({
        id: 'id',
        // @ts-expect-error
        keys: { [keyName]: keys[keyName], [mnemonicName]: fixture.mnemonic },
        type: WALLET_TYPE
      })
      assert.equal(keys[address], fixture.xpub)
    })

    it('Invalid key name', async function () {
      return await expectRejection(
        // @ts-expect-error
        tools.derivePublicKey(fixture['Invalid key name'])
      )
    })

    it('Invalid wallet type', async function () {
      return await expectRejection(
        // @ts-expect-error
        tools.derivePublicKey(fixture['Invalid wallet type'])
      )
    })
  })

  describe(`parseUri for Wallet type ${WALLET_TYPE}`, function () {
    before('Tools', async function () {
      return await plugin.makeCurrencyTools().then(result => {
        tools = result
      })
    })
    it('address only', async function () {
      const parsedUri = await tools.parseUri(
        fixture.parseUri['address only'][0]
      )
      assert.equal(parsedUri.publicAddress, fixture.parseUri['address only'][1])
      assert.equal(parsedUri.nativeAmount, undefined)
      assert.equal(parsedUri.currencyCode, undefined)
    })
    if (fixture.parseUri['checksum address only'] != null)
      it('checksum address only', async function () {
        const parsedUri = await tools.parseUri(
          // @ts-expect-error
          fixture.parseUri['checksum address only'][0]
        )
        assert.equal(
          parsedUri.publicAddress,
          // @ts-expect-error
          fixture.parseUri['checksum address only'][1]
        )
      })
    if (fixture.parseUri['invalid checksum address only'] != null)
      it('invalid checksum address only', async function () {
        return await expectRejection(
          // @ts-expect-error
          tools.parseUri(fixture.parseUri['invalid checksum address only'][0])
        )
      })
    it('invalid address', async function () {
      return await expectRejection(
        tools.parseUri(fixture.parseUri['invalid address'][0])
      )
    })
    it('invalid address', async function () {
      return await expectRejection(
        tools.parseUri(fixture.parseUri['invalid address'][1])
      )
    })
    it('invalid address', async function () {
      return await expectRejection(
        tools.parseUri(fixture.parseUri['invalid address'][2])
      )
    })
    it('uri address', async function () {
      const parsedUri = await tools.parseUri(fixture.parseUri['uri address'][0])
      assert.equal(parsedUri.publicAddress, fixture.parseUri['uri address'][1])
      assert.equal(parsedUri.nativeAmount, undefined)
      assert.equal(parsedUri.currencyCode, undefined)
    })
    it('uri address with amount', async function () {
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
    it('uri address with unique identifier', async function () {
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
    it('uri address with unique identifier and without network prefix', async function () {
      const parsedUri = await tools.parseUri(
        fixture.parseUri[
          'uri address with unique identifier and without network prefix'
        ][0]
      )
      assert.equal(
        parsedUri.publicAddress,
        fixture.parseUri[
          'uri address with unique identifier and without network prefix'
        ][1]
      )
      assert.equal(
        parsedUri.uniqueIdentifier,
        fixture.parseUri[
          'uri address with unique identifier and without network prefix'
        ][3]
      )
    })
    it('uri address with amount & label', async function () {
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
    it('uri address with amount, label & message', async function () {
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
    it('uri address with unsupported param', async function () {
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

    /*
    interface TestCase {
      args: any[],
      output: {
        [key: string]: any;
      }
    }
    */
    ;[
      'address only with provided currency code',
      'uri eip681 payment address',
      'uri eip681 payment address with pay prefix',
      'uri eip681 payment address using scientific notation',
      'uri eip681 transfer contract invocation',
      'RenBrige Gateway uri address with amount, label & message',
      'RenBrige Gateway uri address'
    ].forEach(function (caseName) {
      // @ts-expect-error
      const caseFixtures = fixture.parseUri[caseName]

      if (caseFixtures == null) return

      it(caseName, async function () {
        // @ts-expect-error
        const parsedUri = await tools.parseUri(...caseFixtures.args)

        Object.entries(caseFixtures.output).forEach(([key, value]) => {
          if (caseName === 'address only with provided currency code')
            console.log(';;', parsedUri)

          if (key === 'metadata') {
            // @ts-expect-error
            Object.keys(parsedUri[key]).forEach(metaKey => {
              // @ts-expect-error
              if (parsedUri[key][metaKey] === undefined)
                // @ts-expect-error
                // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
                delete parsedUri[key][metaKey]
            })
          }
          // @ts-expect-error
          assert.deepEqual(parsedUri[key], value)
        })
      })
    })
  })

  describe(`encodeUri for Wallet type ${WALLET_TYPE}`, function () {
    before('Tools', async function () {
      return await plugin.makeCurrencyTools().then(result => {
        tools = result
      })
    })
    it('address only', async function () {
      const encodedUri = await tools.encodeUri(
        // @ts-expect-error
        fixture.encodeUri['address only'][0]
      )
      assert.equal(encodedUri, fixture.encodeUri['address only'][1])
    })
    it('weird address', async function () {
      const encodedUri = await tools.encodeUri(
        // @ts-expect-error
        fixture.encodeUri['weird address'][0]
      )
      assert.equal(encodedUri, fixture.encodeUri['weird address'][1])
    })
    it('invalid address 0', async function () {
      return await expectRejection(
        tools.encodeUri(fixture.encodeUri['invalid address'][0])
      )
    })
    it('invalid address 1', async function () {
      return await expectRejection(
        tools.encodeUri(fixture.encodeUri['invalid address'][1])
      )
    })
    it('invalid address 2', async function () {
      return await expectRejection(
        tools.encodeUri(fixture.encodeUri['invalid address'][2])
      )
    })
    it('address & amount', async function () {
      const encodedUri = await tools.encodeUri(
        // @ts-expect-error
        fixture.encodeUri['address & amount'][0]
      )
      assert.equal(encodedUri, fixture.encodeUri['address & amount'][1])
    })
    it('address, amount, and label', async function () {
      const encodedUri = await tools.encodeUri(
        // @ts-expect-error
        fixture.encodeUri['address, amount, and label'][0]
      )
      assert.equal(
        encodedUri,
        fixture.encodeUri['address, amount, and label'][1]
      )
    })
    it('address, amount, label, & message', async function () {
      const encodedUri = await tools.encodeUri(
        // @ts-expect-error
        fixture.encodeUri['address, amount, label, & message'][0]
      )
      assert.equal(
        encodedUri,
        fixture.encodeUri['address, amount, label, & message'][1]
      )
    })
  })
}
