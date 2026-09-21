import { sha3_256 } from '@noble/hashes/sha3.js'
import { utf8ToBytes } from '@noble/hashes/utils.js'
import { ml_dsa65 } from '@noble/post-quantum/ml-dsa.js'
import { expect } from 'chai'
import { describe, it } from 'mocha'
import { base16 } from 'rfc4648'

import {
  encodeCanonicalCbor,
  encodeUvarint,
  lengthPrefixed
} from '../../src/animica/animicaCbor'
import {
  addressFromPublicKey,
  keypairFromSeed
} from '../../src/animica/animicaCrypto'
import {
  AnimicaChainParams,
  AnimicaTransfer,
  makeSignBytes,
  makeSignHash,
  makeSigningPreimage,
  makeTransferBody,
  signTransfer,
  txidFromEnvelope
} from '../../src/animica/animicaTx'
import fixtures from '../fixtures/animicaFixtures.json'

const hex = (bytes: Uint8Array): string => base16.stringify(bytes).toLowerCase()

/** ML-DSA-65 (FIPS 204) sizes. */
const PUBLIC_KEY_LENGTH = 1952
const SIGNATURE_LENGTH = 3309

describe('Animica canonical CBOR', function () {
  it('uses the shortest integer encoding', function () {
    expect(hex(encodeCanonicalCbor(0))).equals('00')
    expect(hex(encodeCanonicalCbor(23))).equals('17')
    expect(hex(encodeCanonicalCbor(24))).equals('1818')
    expect(hex(encodeCanonicalCbor(255))).equals('18ff')
    expect(hex(encodeCanonicalCbor(256))).equals('190100')
    expect(hex(encodeCanonicalCbor(65536))).equals('1a00010000')
    expect(hex(encodeCanonicalCbor(BigInt('4294967296')))).equals(
      '1b0000000100000000'
    )
    expect(hex(encodeCanonicalCbor(BigInt('18446744073709551615')))).equals(
      '1bffffffffffffffff'
    )
  })

  it('rejects integers the format cannot carry', function () {
    expect(() => encodeCanonicalCbor(-1)).throws()
    expect(() => encodeCanonicalCbor(1.5)).throws()
    expect(() => encodeCanonicalCbor(BigInt(-1))).throws()
    expect(() => encodeCanonicalCbor(BigInt('18446744073709551616'))).throws()
  })

  it('sorts map keys by their encoded bytes', function () {
    // Shorter keys first, then byte order: "v" < "gas" < "from" < "validAfter"
    expect(
      hex(encodeCanonicalCbor({ validAfter: 1, v: 2, gas: 3, from: 4 }))
    ).equals(
      'a4' +
        '6176' +
        '02' +
        '63676173' +
        '03' +
        '6466726f6d' +
        '04' +
        '6a76616c69644166746572' +
        '01'
    )
  })

  it('encodes integer map keys as integers', function () {
    const map = new Map<number | string, string>([
      [7, 'x'],
      [1, 'y']
    ])
    expect(hex(encodeCanonicalCbor(map))).equals(
      'a2' + '01' + '6179' + '07' + '6178'
    )
  })

  it('keeps integer and text keys distinct', function () {
    // 1 encodes as 01 and "1" as 6131, so both may share a map:
    const map = new Map<number | string, string>([
      ['1', 'y'],
      [1, 'x']
    ])
    expect(hex(encodeCanonicalCbor(map))).equals(
      'a2' + '01' + '6178' + '6131' + '6179'
    )
  })

  it('encodes byte strings, text strings and arrays', function () {
    expect(hex(encodeCanonicalCbor([new Uint8Array([1, 2]), 'hi', []]))).equals(
      '83' + '420102' + '626869' + '80'
    )
  })

  it('encodes LEB128 varints and length prefixes', function () {
    expect(hex(encodeUvarint(0))).equals('00')
    expect(hex(encodeUvarint(127))).equals('7f')
    expect(hex(encodeUvarint(128))).equals('8001')
    expect(hex(encodeUvarint(0x1003))).equals('8320')
    expect(hex(encodeUvarint(3511060514))).equals('a2909a8a0d')
    expect(hex(lengthPrefixed(utf8ToBytes('tx')))).equals('027478')
    expect(hex(lengthPrefixed(new Uint8Array(0)))).equals('00')
  })
})

/**
 * The signing vector from the Animica wallet-integration spec, built with a
 * throwaway seed and verified against the live node's admission path.
 */
describe('Animica transaction signing', function () {
  const vector = fixtures.signing
  const chain: AnimicaChainParams = {
    chainId: vector.chainId,
    genesisHash: base16.parse(vector.genesisHash),
    forkId: vector.forkId
  }
  const keypair = keypairFromSeed(base16.parse(vector.seed))
  const transfer: AnimicaTransfer = {
    chainId: vector.chainId,
    from: base16.parse(vector.fromDigest),
    to: sha3_256(utf8ToBytes(vector.toLabel)),
    amount: BigInt(vector.amount),
    data: new Uint8Array(0),
    gasPrice: BigInt(vector.gasPrice),
    gasLimit: BigInt(vector.gasLimit),
    validAfter: vector.validAfter,
    validUntil: vector.validUntil,
    salt: base16.parse(vector.salt)
  }
  const body = makeTransferBody(transfer)

  it('derives the test key and addresses', function () {
    expect(hex(keypair.publicKey.slice(0, 16))).equals(vector.publicKeyPrefix)
    expect(hex(sha3_256(keypair.publicKey))).equals(vector.fromDigest)
    expect(addressFromPublicKey(keypair.publicKey)).equals(vector.address)
    expect(hex(transfer.to)).equals(vector.toDigest)
  })

  it('encodes the body canonically', function () {
    expect(hex(encodeCanonicalCbor(body))).equals(vector.body)
  })

  it('builds the signing preimage', function () {
    const preimage = makeSigningPreimage(body, chain)
    expect(preimage.length).equals(vector.preimageLength)
    expect(hex(preimage)).equals(vector.preimagePrefix + vector.body)
  })

  it('wraps the preimage into sign_bytes', function () {
    const signBytes = makeSignBytes(makeSigningPreimage(body, chain), chain)
    expect(signBytes.length).equals(vector.signBytesLength)
    expect(hex(signBytes).startsWith(vector.signBytesPrefix)).equals(true)
  })

  it('hashes to the documented sign_hash', function () {
    expect(hex(makeSignHash(body, chain))).equals(vector.signHash)
  })

  it('produces an envelope whose signature verifies', function () {
    const { envelope, txid } = signTransfer(transfer, chain, keypair)
    expect(envelope.length).equals(vector.envelopeLength)
    expect(hex(envelope).startsWith(vector.envelopePrefix)).equals(true)
    expect(hex(txid)).equals(hex(txidFromEnvelope(envelope)))
    expect(txid.length).equals(32)

    // The signature map sorts as alg < sig < pubkey, so the envelope ends
    // with `"sig" bstr(3309) "pubkey" bstr(1952)`:
    const pubkeyTail = 7 + 3 + PUBLIC_KEY_LENGTH // key, bstr head, bytes
    const sig = envelope.slice(
      envelope.length - pubkeyTail - SIGNATURE_LENGTH,
      envelope.length - pubkeyTail
    )
    expect(hex(envelope.slice(-PUBLIC_KEY_LENGTH))).equals(
      hex(keypair.publicKey)
    )
    expect(
      ml_dsa65.verify(sig, makeSignHash(body, chain), keypair.publicKey)
    ).equals(true)

    // A flipped bit must not verify:
    const bad = Uint8Array.from(sig)
    bad[0] ^= 0x01
    expect(
      ml_dsa65.verify(bad, makeSignHash(body, chain), keypair.publicKey)
    ).equals(false)
  })

  it('supports hedged signing with caller-provided entropy', function () {
    const a = signTransfer(transfer, chain, keypair, new Uint8Array(32))
    const b = signTransfer(transfer, chain, keypair, new Uint8Array(32).fill(1))
    expect(a.envelope.length).equals(vector.envelopeLength)
    expect(b.envelope.length).equals(vector.envelopeLength)
    expect(hex(a.envelope)).not.equals(hex(b.envelope))
    expect(hex(a.txid)).not.equals(hex(b.txid))
  })
})
