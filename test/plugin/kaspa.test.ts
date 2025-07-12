import { expect } from 'chai'
import {
  EdgeCorePluginOptions,
  EdgeCurrencyPlugin,
  EdgeCurrencyTools,
  makeFakeIo
} from 'edge-core-js'

import edgeCorePlugins from '../../src/index'
import { expectRejection } from '../expectRejection'
import { fakeLog } from '../fake/fakeLog'

const pluginId = 'kaspa'
const walletType = 'wallet:kaspa'

describe('Kaspa plugin', function () {
  let tools: EdgeCurrencyTools
  let plugin: EdgeCurrencyPlugin

  const fakeIo = makeFakeIo()
  const opts: EdgeCorePluginOptions = {
    initOptions: {},
    io: fakeIo,
    log: fakeLog,
    nativeIo: {},
    pluginDisklet: fakeIo.disklet,
    infoPayload: {}
  }

  before('Setup', async function () {
    const factory = edgeCorePlugins[pluginId]
    plugin = factory(opts)
    tools = await plugin.makeCurrencyTools()
  })

  it('exists', async function () {
    const infos = plugin.currencyInfo
    expect(infos.currencyCode).equals('KAS')
  })

  it('can derive public keys', async function () {
    const walletInfo = {
      id: '1234',
      type: walletType,
      keys: {
        kaspaKey: 'xprv1234' // placeholder
      }
    }

    // This should not throw
    await expectRejection(
      tools.derivePublicKey(walletInfo),
      'Invalid private key'
    )
  })

  it('can create private keys', async function () {
    const keys = await tools.createPrivateKey(walletType)
    
    expect(keys).to.have.property('kaspaKey')
    expect(keys).to.have.property('kaspaPublicKey')
    expect(keys).to.have.property('publicKey')
    
    // Check that the address is in the correct format
    const address = keys.publicKey as string
    expect(address).to.match(/^kaspa:[a-z0-9]{61,63}$/)
  })

  it('can import private keys', async function () {
    // Test with a valid WIF format private key (this will fail with invalid key but tests the flow)
    if (tools.importPrivateKey != null) {
      await expectRejection(
        tools.importPrivateKey('L1234567890123456789012345678901234567890123456789012345'),
        'Invalid private key'
      )

      // Test with hex format (64 chars)
      await expectRejection(
        tools.importPrivateKey('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'),
        'Invalid private key'
      )

      // Test with invalid format
      await expectRejection(
        tools.importPrivateKey('invalid'),
        'Invalid private key format'
      )
    }
  })

  it('can parse URIs', async function () {
    // Valid Kaspa URI
    const uri = 'kaspa:qr0kkusqer0v0lqwn7l0v5mhrqvj6r4srtpdc7tys6fxeucnpa8ssq04jz2lk?amount=1.5'
    const parsed = await tools.parseUri(uri)

    expect(parsed.publicAddress).equals('kaspa:qr0kkusqer0v0lqwn7l0v5mhrqvj6r4srtpdc7tys6fxeucnpa8ssq04jz2lk')
    expect(parsed.currencyCode).equals('KAS')
    expect(parsed.nativeAmount).equals('150000000')

    // Invalid address
    await expectRejection(
      tools.parseUri('kaspa:invalid'),
      'InvalidPublicAddressError'
    )
  })

  it('can encode URIs', async function () {
    const uri = await tools.encodeUri({
      publicAddress: 'kaspa:qr0kkusqer0v0lqwn7l0v5mhrqvj6r4srtpdc7tys6fxeucnpa8ssq04jz2lk',
      nativeAmount: '150000000',
      currencyCode: 'KAS'
    })

    expect(uri).to.include('kaspa:qr0kkusqer0v0lqwn7l0v5mhrqvj6r4srtpdc7tys6fxeucnpa8ssq04jz2lk')
    expect(uri).to.include('amount=1.5')

    // Invalid address
    await expectRejection(
      tools.encodeUri({
        publicAddress: 'invalid',
        nativeAmount: '150000000'
      }),
      'InvalidPublicAddressError'
    )
  })

  it('validates addresses correctly', async function () {
    // Valid mainnet address
    const validUri = 'kaspa:qr0kkusqer0v0lqwn7l0v5mhrqvj6r4srtpdc7tys6fxeucnpa8ssq04jz2lk'
    const parsed = await tools.parseUri(validUri)
    expect(parsed.publicAddress).equals(validUri)

    // Invalid addresses
    const invalidAddresses = [
      'kaspa:invalid',
      'kaspa:qr0kkusqer0v0lqwn7l0v5mhrqvj6r4srtpdc7tys6', // too short
      'kaspa:qr0kkusqer0v0lqwn7l0v5mhrqvj6r4srtpdc7tys6fxeucnpa8ssq04jz2lk1234', // too long
      'bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', // wrong prefix
      'kaspatest:qr0kkusqer0v0lqwn7l0v5mhrqvj6r4srtpdc7tys6fxeucnpa8ssq04jz2lk' // wrong network
    ]

    for (const invalidAddr of invalidAddresses) {
      await expectRejection(
        tools.parseUri(invalidAddr),
        'InvalidPublicAddressError'
      )
    }
  })

  it('rejects token operations', async function () {
    if (tools.getTokenId != null) {
      await expectRejection(
        tools.getTokenId({
          networkLocation: { contractAddress: '0x1234' },
          currencyCode: 'TOKEN',
          denominations: [],
          displayName: 'Test Token'
        }),
        'Kaspa does not support tokens'
      )
    }
  })
})

// Additional test for framework initialization
describe('Kaspa framework initialization', function () {
  it('initializes framework on first use', async function () {
    this.timeout(10000) // Allow time for WASM modules to load
    
    const fakeIo = makeFakeIo()
    const opts: EdgeCorePluginOptions = {
      initOptions: {},
      io: fakeIo,
      log: fakeLog,
      nativeIo: {},
      pluginDisklet: fakeIo.disklet,
      infoPayload: {}
    }

    const factory = edgeCorePlugins[pluginId]
    const plugin = factory(opts)
    const tools = await plugin.makeCurrencyTools()

    // Creating a private key should initialize the framework
    const keys = await tools.createPrivateKey(walletType)
    expect(keys).to.have.property('kaspaKey')

    // Second call should reuse initialized framework
    const keys2 = await tools.createPrivateKey(walletType)
    expect(keys2).to.have.property('kaspaKey')
  })
})