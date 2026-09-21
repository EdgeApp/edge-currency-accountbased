import { bech32m } from '@scure/base'
import { expect } from 'chai'
import {
  EdgeCorePluginOptions,
  EdgeCurrencyTools,
  makeFakeIo
} from 'edge-core-js'
import { before, describe, it } from 'mocha'
import { base16 } from 'rfc4648'

import { decodeAddress, isValidAddress } from '../../src/animica/animicaCrypto'
import plugins from '../../src/index'
import { expectRejection } from '../expectRejection'
import { fakeLog } from '../fake/fakeLog'
import fixtures from '../fixtures/animicaFixtures.json'

const { hd, mnemonic } = fixtures
const address = hd[0].address
const otherAddress = hd[1].address

const fakeIo = makeFakeIo()
const pluginOptions: EdgeCorePluginOptions = {
  infoPayload: {},
  initOptions: {},
  io: fakeIo,
  log: fakeLog,
  nativeIo: {},
  pluginDisklet: fakeIo.disklet
}

/** Builds a syntactically valid bech32m string with a chosen payload. */
const encodeAddress = (hrp: string, payload: Uint8Array): string =>
  bech32m.encode(hrp, bech32m.toWords(payload), 90)

const payload = (algId: number, digestLength = 32): Uint8Array => {
  const out = new Uint8Array(2 + digestLength)
  out[0] = algId >> 8
  out[1] = algId & 0xff
  return out
}

describe('Animica addresses', function () {
  it('decodes ML-DSA-65 account addresses', function () {
    const { algId, digest } = decodeAddress(address)
    expect(algId).equals(0x1003)
    expect(base16.stringify(digest).toLowerCase()).equals(hd[0].publicKeySha3)
    expect(address.startsWith('anim1zqp')).equals(true)
    expect(address).lengthOf(66)
  })

  it('accepts contract and other account scheme ids', function () {
    expect(isValidAddress(encodeAddress('anim', payload(0x0000)))).equals(true)
    expect(isValidAddress(encodeAddress('anim', payload(0x1000)))).equals(true)
    expect(isValidAddress(encodeAddress('anim', payload(0x1fff)))).equals(true)
  })

  it('rejects malformed addresses', function () {
    // Bad checksum:
    expect(isValidAddress(address.slice(0, -1) + 'x')).equals(false)
    // Mixed case:
    expect(
      isValidAddress(address.toUpperCase().slice(0, 10) + address.slice(10))
    ).equals(false)
    // Wrong prefix:
    expect(isValidAddress(encodeAddress('test', payload(0x1003)))).equals(false)
    // Wrong payload length:
    expect(isValidAddress(encodeAddress('anim', payload(0x1003, 31)))).equals(
      false
    )
    expect(isValidAddress(encodeAddress('anim', payload(0x1003, 33)))).equals(
      false
    )
    // Unknown scheme id:
    expect(isValidAddress(encodeAddress('anim', payload(0x0001)))).equals(false)
    expect(isValidAddress(encodeAddress('anim', payload(0x2000)))).equals(false)
    // bech32 rather than bech32m, and plain junk:
    expect(isValidAddress('bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4')).equals(
      false
    )
    expect(isValidAddress('')).equals(false)
  })
})

describe('Animica URIs', function () {
  let tools: EdgeCurrencyTools

  before(async function () {
    tools = await plugins.animica(pluginOptions).makeCurrencyTools()
  })

  it('parses a bare address', async function () {
    const parsed = await tools.parseUri(address)
    expect(parsed.publicAddress).equals(address)
    expect(parsed.nativeAmount).equals(undefined)
    expect(parsed.currencyCode).equals(undefined)
  })

  it('parses an animica: URI', async function () {
    const parsed = await tools.parseUri(`animica:${address}`)
    expect(parsed.publicAddress).equals(address)
  })

  it('parses an amount in ANM', async function () {
    const parsed = await tools.parseUri(`animica:${address}?amount=12.34567`)
    expect(parsed.publicAddress).equals(address)
    expect(parsed.nativeAmount).equals('12345670000')
    expect(parsed.currencyCode).equals('ANM')
  })

  it('parses a label and message', async function () {
    const parsed = await tools.parseUri(
      `animica:${address}?amount=1.5&label=Johnny%20Animica&message=Hello%20World`
    )
    expect(parsed.nativeAmount).equals('1500000000')
    expect(parsed.metadata?.name).equals('Johnny Animica')
    expect(parsed.metadata?.notes).equals('Hello World')
  })

  it('rejects other networks and invalid addresses', async function () {
    await expectRejection(tools.parseUri(`bitcoin:${address}`))
    await expectRejection(tools.parseUri(address.slice(0, -1)))
    await expectRejection(
      tools.parseUri(encodeAddress('anim', payload(0x2000)))
    )
    await expectRejection(tools.parseUri('animica:'))
  })

  it('recognizes private keys for sweeping', async function () {
    const fromMnemonic = await tools.parseUri(mnemonic)
    expect(fromMnemonic.privateKeys).deep.equals([mnemonic])
    expect(fromMnemonic.publicAddress).equals(undefined)

    const fromSeed = await tools.parseUri(hd[0].seed)
    expect(fromSeed.privateKeys).deep.equals([hd[0].seed])
  })

  it('encodes a bare address', async function () {
    expect(await tools.encodeUri({ publicAddress: address })).equals(address)
  })

  it('encodes an amount in ANM', async function () {
    expect(
      await tools.encodeUri({
        publicAddress: address,
        nativeAmount: '1230000000'
      })
    ).equals(`animica:${address}?amount=1.23`)
    expect(
      await tools.encodeUri({
        publicAddress: otherAddress,
        nativeAmount: '1',
        currencyCode: 'ANM'
      })
    ).equals(`animica:${otherAddress}?amount=0.000000001`)
  })

  it('encodes a label and message', async function () {
    expect(
      await tools.encodeUri({
        publicAddress: address,
        nativeAmount: '1230',
        label: 'Johnny Animica',
        message: 'Hello World, I miss you !'
      })
    ).equals(
      `animica:${address}?amount=0.00000123&label=Johnny%20Animica&message=Hello%20World,%20I%20miss%20you%20!`
    )
  })

  it('rejects encoding invalid addresses', async function () {
    await expectRejection(
      tools.encodeUri({ publicAddress: address.slice(0, -1) })
    )
    await expectRejection(
      tools.encodeUri({ publicAddress: encodeAddress('test', payload(0x1003)) })
    )
    await expectRejection(
      tools.encodeUri({
        publicAddress: address,
        nativeAmount: '1',
        currencyCode: 'XYZ'
      })
    )
  })
})
